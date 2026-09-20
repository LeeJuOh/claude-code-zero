#!/usr/bin/env python3
"""Check the prompt blocks the task-path skills send to Codex.

PROMPT_FILE is the seam these skills are judged on: whatever Codex reads is
exactly what the SKILL.md tells Claude to write. For verify and research the
payload is a heredoc, so it can be compared byte for byte against a golden; for
rescue the model assembles it, so the checkable artefact is the block bodies the
skill tells it to copy.

Run it after editing any task-path SKILL.md:

  python3 evals/check-prompt-blocks.py [--update-golden]

`--update-golden` rewrites the golden files from the current SKILL.md — use it
only when a payload change is the point of the edit, and read the diff first.
"""
import argparse
import io
import os
import re
import sys

EVALS_DIR = os.path.dirname(os.path.realpath(__file__))
PLUGIN_DIR = os.path.dirname(EVALS_DIR)
GOLDEN_DIR = os.path.join(EVALS_DIR, "golden")

# Phrases that invite Codex to check in before acting. A question is a silent
# failure on the task path: the companion rejects the request and the turn still
# reports `completed`. Matched on word boundaries so "without asking first" and
# "the task" do not count.
ASK_FIRST_PHRASES = ["call out", "before taking", "ask first", "ask the user",
                     "require confirmation"]

# The four prompt-passing skills. Preview is their only window onto the
# hypothesis classification, which is Claude's judgement and so cannot be
# checked from a golden -- a flag that skipped the preview would close the one
# window there is, and resuming a Codex thread would carry the previous turn's
# hypotheses past the rule entirely.
PREVIEW_SKILLS = ["codex-adversarial", "codex-rescue", "codex-research", "codex-verify"]

# Hypothesis exclusion applies to the skills that judge -- handing a reviewer
# the cause makes it confirm that cause. rescue builds instead, so its task
# text is the order, not a claim, and travels verbatim.
REVIEW_SKILLS = ["codex-adversarial", "codex-research", "codex-verify"]

# The skills whose Phase 4 hands judgement to a Verifier subagent. The main
# session is the author of the code under review, so every string that would put
# it back in the judge's seat -- reading the cited source, writing its own
# classification -- has to stay gone once S5a removed it.
VERIFIER_SKILLS = ["codex-review", "codex-adversarial", "codex-rescue"]

# Tools review and adversarial used to poll a background launch with. Neither
# exists in Claude Code, so an instruction naming one is an instruction that
# cannot be followed; waiting is a completion notification now.
ABSENT_WAIT_TOOLS = ["BashOutput", "KillShell", "TaskOutput"]

# Phrases that put the main session back in the judge's seat.
SELF_JUDGE_PHRASES = ["Read ONLY the file:line", "Read ONLY files", "Self-verified",
                      "Cross-Model", "Additional Findings"]

# verify grew a positional focus argument. Runs without it must still produce
# the pre-S2 payload byte for byte, so the golden keeps the no-focus form and
# this line is stripped before the comparison.
VERIFY_FOCUS_PREFIX = "Pay particular attention to:"

failures = []


def check(ok, message):
    if not ok:
        failures.append(message)


def read(path):
    return io.open(os.path.join(PLUGIN_DIR, path), encoding="utf-8").read()


def heredoc_payload(text):
    """The `cat > "$PROMPT_FILE" <<'EOF'` body — what lands in PROMPT_FILE."""
    m = re.search(r'cat > "\$PROMPT_FILE" <<\'EOF\'\n(.*?)\nEOF\n', text, re.S)
    return m.group(1) + "\n" if m else None


def xml_fences(text):
    return re.findall(r"```xml\n(.*?)```", text, re.S)


def tags(block):
    return re.findall(r"^<([a-z_]+)>$", block, re.M)


def drop_line(payload, prefix):
    """Payload minus the one line starting with `prefix` (None if absent)."""
    lines = payload.split("\n")
    hits = [l for l in lines if l.startswith(prefix)]
    if len(hits) != 1:
        return None
    return "\n".join(l for l in lines if not l.startswith(prefix))


def compare_golden(name, payload, update):
    path = os.path.join(GOLDEN_DIR, name)
    if update:
        io.open(path, "w", encoding="utf-8").write(payload)
        return
    golden = io.open(path, encoding="utf-8").read()
    check(payload == golden, "%s differs from golden %s" % (name, path))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--update-golden", action="store_true")
    args = ap.parse_args()

    verify = read("skills/codex-verify/SKILL.md")
    research = read("skills/codex-research/SKILL.md")
    rescue = read("skills/codex-rescue/SKILL.md")

    # verify: the focus line is optional at run time, so the golden holds the
    # payload a focus-less run produces and the placeholder is checked separately.
    verify_payload = heredoc_payload(verify)
    no_focus = drop_line(verify_payload, VERIFY_FOCUS_PREFIX)
    check(no_focus is not None,
          "verify payload should carry exactly one %r line" % VERIFY_FOCUS_PREFIX)
    check("<literal focus text from Phase 1" in verify_payload,
          "verify focus line should be filled from the Phase 1 focus text")
    compare_golden("verify-prompt.txt", no_focus or verify_payload, args.update_golden)
    compare_golden("research-prompt.txt", heredoc_payload(research), args.update_golden)

    # The preview is the only check on the hypothesis rule, so nothing may skip
    # it and no skill may continue an earlier Codex thread around it.
    for name in PREVIEW_SKILLS:
        text = read("skills/%s/SKILL.md" % name)
        check("--no-preview" not in text, "%s still offers --no-preview" % name)
    # rescue is a build path: its <task> is the order itself, so the rule would
    # delete the job along with the cause claim. The premise line in its
    # autonomy_policy covers the wrong-order case instead.
    for name in REVIEW_SKILLS:
        text = read("skills/%s/SKILL.md" % name)
        check("Excluded (hypothesis)" in text,
              "%s preview does not show the excluded hypotheses" % name)
        check("Hypothesis exclusion" in text,
              "%s has no hypothesis exclusion rule in Phase 1" % name)
    check("--no-preview" not in read("README.md"), "README still documents --no-preview")
    for name in ("codex-verify", "codex-research"):
        check("resume" not in read("skills/%s/SKILL.md" % name),
              "%s still resumes a Codex thread" % name)

    # research: grounding_rules duplicated structured_output_contract's
    # facts/inferences split, so it is gone from the payload and the preview.
    check(research.count("grounding_rules") == 0,
          "research still mentions grounding_rules")

    # rescue: three overlapping blocks collapsed into one autonomy policy.
    for gone in ("completeness_contract", "verification_loop", "action_safety"):
        check(rescue.count(gone) == 0, "rescue still mentions %s" % gone)

    fences = xml_fences(rescue)
    tagsets = [tags(f) for f in fences]
    check(["autonomy_policy"] in tagsets, "rescue has no standalone autonomy_policy block")
    check(["grounding_rules"] in tagsets, "rescue has no grounding_rules block")
    check(any(t == ["task", "autonomy_policy"] for t in tagsets),
          "rescue Phase 1.5 preview does not show <task> + <autonomy_policy>")

    policies = [f for f, t in zip(fences, tagsets) if t == ["autonomy_policy"]]
    check(len(policies) == 2,
          "expected the full and read-only autonomy_policy forms, found %d" % len(policies))
    if policies:
        full = max(policies, key=len)
        readonly = min(policies, key=len)
        for phrase in ASK_FIRST_PHRASES:
            found = re.findall(r"\b%s\b" % re.escape(phrase), full, re.I)
            check(not found, "autonomy_policy invites a check-in: %r" % phrase)
        check(full.count("already approved") == 1,
              "autonomy_policy should settle scope once with 'already approved'")
        check(full.count("Never end with a question") == 1,
              "autonomy_policy should say 'Never end with a question' once")
        check(len(readonly.strip().splitlines()) == 6,
              "read-only autonomy_policy should keep the reporting, follow-through, question and premise lines")
        check(readonly.count("Never end with a question") == 1,
              "read-only autonomy_policy should say 'Never end with a question' once")
        # A wrong premise is the one failure Phase 4 cannot see: it checks that
        # the requested change landed, not that it was the right change.
        for form, label in ((full, "autonomy_policy"), (readonly, "read-only autonomy_policy")):
            check(form.count("stated cause does not hold") == 1,
                  "%s should ask Codex to report a premise that does not hold" % label)
        check("make the requested change anyway" in full,
              "autonomy_policy should keep the requested change when the premise fails")

    # Provenance: every retained block names the guide and section it came from,
    # so the next model guide tells us what to re-sync.
    check("Using GPT-5.6" in rescue and "Using GPT-6 Astra" in rescue,
          "rescue autonomy_policy has no source note")
    check("gpt-5-4-prompting" in rescue, "rescue grounding_rules has no source note")
    for name, text, expected in (
        ("research", research, ["task", "structured_output_contract", "research_mode", "citation_rules"]),
        ("verify", verify, ["task", "structured_output_contract", "grounding_rules", "completeness_contract"]),
    ):
        note = re.search(r"# Block provenance —.*?(?=\ncat )", text, re.S)
        check(note is not None, "%s has no block provenance note" % name)
        if note:
            for tag in expected:
                check(re.search(r"^#   %s\b" % tag, note.group(0), re.M) is not None,
                      "%s provenance note does not cover %s" % (name, tag))

    # S5a: the main session runs the script and the subagent, and judges nothing.
    for name in VERIFIER_SKILLS:
        text = read("skills/%s/SKILL.md" % name)
        lines = text.split("\n")
        check(len(lines) <= 500, "%s is %d lines, over the 500-line editing bound"
              % (name, len(lines)))
        check(re.search(r"^disallowed-tools:.*\bSendMessage\b", text, re.M) is not None,
              "%s frontmatter does not remove SendMessage" % name)
        check(re.search(r"^allowed-tools:.*\bAgent\b", text, re.M) is not None,
              "%s cannot launch a Verifier without Agent in allowed-tools" % name)
        check("scripts/prepare-verifier.py" in text,
              "%s never runs prepare-verifier.py" % name)
        check("subagent_type: codex-advisor:verifier" in text,
              "%s does not name the Verifier by its plugin-qualified type" % name)
        check('subagent_type: fork' not in text,
              "%s would launch the Verifier as a fork, inheriting this session" % name)
        check("Author note (main session)" in text,
              "%s does not tell the main session to leave the verdict alone" % name)
        for phrase in SELF_JUDGE_PHRASES:
            check(phrase not in text, "%s still says %r" % (name, phrase))

    # R1: review and adversarial waited on tools Claude Code does not have.
    for name in ["codex-review", "codex-adversarial"]:
        text = read("skills/%s/SKILL.md" % name)
        for tool in ABSENT_WAIT_TOOLS:
            check(tool not in text, "%s still names the absent tool %s" % (name, tool))
        check("wait-timeout" not in text, "%s still caps the wait" % name)
        check("completion notification" in text,
              "%s does not say how Phase 3 learns the run finished" % name)

    if failures:
        for f in failures:
            print("FAIL: %s" % f)
        return 1
    print("prompt blocks OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
