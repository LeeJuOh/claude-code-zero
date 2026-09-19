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

    compare_golden("verify-prompt.txt", heredoc_payload(verify), args.update_golden)
    compare_golden("research-prompt.txt", heredoc_payload(research), args.update_golden)

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
        check(len(readonly.strip().splitlines()) == 4,
              "read-only autonomy_policy should keep the reporting and follow-through lines only")

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

    if failures:
        for f in failures:
            print("FAIL: %s" % f)
        return 1
    print("prompt blocks OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
