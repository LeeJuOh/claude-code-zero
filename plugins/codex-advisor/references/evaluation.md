# Double-Check Evaluation Framework

Two readers share this file, and the split between them is what keeps the double-check
honest:

- The **Verifier** subagent (`agents/verifier.md`) reads *Classifications* and the one
  task section its payload names — **Code findings**, **Prose results**, or
  **Rescue diff**. It classifies items and stops there.
- The **main session** reads *Reporting*. It collects the verdicts, applies the
  counting rules, and writes the report. It does not judge, and it does not re-judge.

The rules live here rather than inside each skill so that changing how a verdict is
reached is one edit, not five that drift apart.

## Classifications

Six labels reach the report, from three different deciders. Who decides is fixed,
because that is the part a biased party could otherwise quietly take over.

**The Verifier decides these four**, per item:

| Label | When |
|---|---|
| **Agreed** | The evidence read shows the problem is real as described |
| **Disputed** | The evidence read shows it is not — a guard, a type, a path never taken |
| **Nuanced** | True as far as it goes, but context the item omits changes what to do about it |
| **Unverifiable** | Nothing within reach settled it; `evidence` says what was missing |

A dispute needs counter-evidence, not doubt. Absence reported by a lossy tool — a
WebFetch summary that simply does not mention the claim — is not counter-evidence, so
it lands on Unverifiable.

**Two item kinds do not take those four labels**, because the four answer "is this
claim of Codex's true?" and these items are not claims of Codex's — the Verifier raised
them itself, about what Codex left out or did unasked. Labelling a gap `Agreed` reads as
an approval of the gap, and it would land in the agreement tally as a point in Codex's
favour, which is the opposite of what it means.

| Item ids | Labels | When |
|---|---|---|
| `missing-N` (research) | **Confirmed** | The approved scope really does go unanswered |
| | **Refuted** | A second read found it answered after all |
| `side-effect-N` (rescue diff) | **Harmless** | The unrequested change costs nothing in reach |
| | **Harmful** | It breaks, removes, or risks something |

These carry `severity: null` unless the evidence itself sets one, and they are reported
and counted on their own lines, never inside agreement.

**The citation script decides these two**, before any Verifier runs, and they never go
to a Verifier at all:

- **False Positive** — the cited file or line range does not exist (script status
  `missing`). Codex hallucinated the location.
- **Uncited** — the finding names no concrete `file:line` (status `uncited`), so there
  is nothing to check against. Verification is deferred, not failed.

The script also assigns **Unverifiable** (reason `worktree-drift`) to every finding
citing a file the working tree has changed since the reviewed ref, whether or not the
cited line still exists — a verdict read from different code than the one reviewed
would be a verdict about nothing.

**The main session records one label** it cannot avoid recording: **Unverified** — the
Verifier call failed, or the hook refused the payload. No one judged the item. The
main session does not judge it in the Verifier's place; it says so in the report, and
the user can ask for a rerun against the same payload path.

## Code findings

Applies to `mode: findings` — review and adversarial, where the script already cut
Codex's output into numbered findings.

- Return exactly one verdict per `items[].id`: every id the payload gave, no id it did
  not give, none twice. This is the one mode where a skipped item is detectable, which
  is why the ids are fixed in advance.
- `severity` is the payload's value copied through, `null` when the payload has none.
- Judge against the code in `repo_root` at the `citation` range, reading enough around
  it to see what governs the cited lines.
- `existence.status: ok` means only that the file and the line range exist. It says
  nothing about whether the finding is right.

## Prose results

Applies to `mode: whole` (rescue read-only) and `mode: doc` (verify, research), where
Codex answered in prose and no fixed item list exists.

- The material arrives either inline as `codex_output` (rescue read-only) or as paths
  to read — `codex_result`, `prompt_file`, and `document` when present. The main
  session never read those paths, which is what keeps the material out of the author's
  context.
- Split the result into the distinct points it makes — one claim, finding, or
  recommendation per item — and id them `item-1`, `item-2`, … in the order they appear.
  Nobody numbered them in advance, so a point you skip is a point nobody judged; work
  through the result end to end before assigning verdicts.
- `severity` carries through whatever Codex attached to that point (`P1`, `P2`), and is
  `null` where Codex attached none.
- **verify only**: the items are the points listed under Codex's P1 and P2 headings.
  The verdict line above them ("PASS/FAIL because …") is Codex's own conclusion about
  the document, not a point to judge, so it is not an item. Counting it as one would
  give it `severity: null` on every run, and rule 3 below would then fail every
  verification for a reason that has nothing to do with the document.
- Checking the citations is yours here too: the quoted passage, the section reference,
  the URL. Open URLs the material cites, and only those.
- **research only**: `prompt_file` is the scope the user approved in the preview. A
  core part of that scope the result does not cover is an item of its own, id
  `missing-1`, `missing-2`, …, labelled `Confirmed` or `Refuted` (never one of the four),
  with `evidence` naming the part of the scope that is absent. Judge against that file, never against what the topic seems to imply —
  research runs on a topic alone, with no `document`, and the approved scope is the
  only fixed thing to compare against.

## Rescue diff

Applies to `mode: diff` — a rescue run that wrote code, judged by what the diff
actually does.

- `prompt_file` holds the task in the user's own words, usually as prose mixing
  several requirements. Split it into the requirements it states, id them `req-1`,
  `req-2`, … in order, and judge each against `diff`: met is Agreed, missed or departed
  from is Disputed, met only under a condition the task did not state is Nuanced, and
  not decidable from the diff is Unverifiable.
- The diff is the whole of what the run changed, including files git was not tracking.
  Read around it in `repo_root` when the diff alone does not show whether a change
  holds together.
- A change the diff makes that no requirement asked for is its own item, id
  `side-effect-1`, `side-effect-2`, …, labelled `Harmless` or `Harmful` (never one of the
  four) on what it costs within reach.

## Reporting

The main session's half. Everything here is counting and transcription.

### Collecting verdicts

Match verdicts to items by id. When a group's returned ids do not line up with what
the payload gave — one missing, one invented, one repeated, or the object not matching
the schema — the whole group is **Unverifiable** with reason `contract-violation`.
Extra `missing-N` and `side-effect-N` ids are the exception: their task sections allow
them, in those modes only.

Script labels (False Positive, Uncited, drift Unverifiable) are transcribed as the
script reported them. Checking them again would mean reading the source, which is the
author reading its own code to grade a review of it.

### Author note

When the main session disagrees with a verdict, the verdict stays exactly as the
Verifier wrote it, and the disagreement goes beneath it on one line:

    Author note (main session): <the disagreement, and what it rests on>

The label says whose opinion it is so the user can weigh both and decide. The verdict
is never edited, replaced, or quietly softened — an author who can rewrite the verdict
is the judge again. And the note is written only after the verdicts are in, never sent
toward a Verifier still running.

### PASS/FAIL

`codex-verify` reports a verdict; the other four report the tally only. The verdict is
a count, not a judgment:

1. Any item with `severity: P1` classified Agreed or Nuanced → **FAIL**.
2. Any `P1` item Unverifiable → **FAIL**, reason `unverified P1`.
3. Any group left `Unverified`, or any item whose severity cannot be known — `null`, or
   lost to `contract-violation` → **FAIL**, reason `unverified`.
4. Any `side-effect-N` labelled Harmful → **FAIL**, reason `harmful side effect`. Rule 3
   does not apply to `missing-N` and `side-effect-N`: their `severity: null` is the normal
   case, not a lost value.
5. Otherwise → **PASS**.

Rules 2 and 3 exist because a review that did not happen is not a review that passed.
A run where the Verifier could not be launched fails loudly rather than reporting a
clean bill from an empty tally.

### Agreement

Report one agreement line over the items that actually got judged — Agreed, Disputed,
and Nuanced. Unverifiable and Unverified are counted separately and never fold into
agreement, because they measure the review's reach, not Codex's accuracy. `missing-N` and
`side-effect-N` stay out of it too, on their own lines: they are not verdicts on anything
Codex claimed, so a rate computed over them would answer no question anyone asked.

| Level | Criteria |
|-------|---------|
| **High** | >80% of judged items Agreed, no disputed P1 |
| **Partial** | 50–80% Agreed, or disputes only on non-P1 items |
| **Disagreement** | <50% Agreed, or a disputed P1 |

## No Auto-Fix Rule

After presenting results, do not fix or modify code. The user must explicitly request
changes.

Correct flow: present findings → wait for user → fix only what they ask for.

## Save Results

Write the report to `${CLAUDE_PLUGIN_DATA}/reviews/<type>-<YYYYMMDD-HHMMSS>.md`.

Types: `review`, `adversarial`, `rescue`, `verify`, `research`.

Create `${CLAUDE_PLUGIN_DATA}/reviews/` if it doesn't exist: `mkdir -p ${CLAUDE_PLUGIN_DATA}/reviews`

Standard format:

    # Codex <Type> — <date>

    ## Scope
    <what was analyzed>
    Verifier: fresh subagent (<N> groups)
    Working tree changed since the review: <files>   <- only when the script reported drift

    ## Codex Output
    <preserved verbatim>

    ## Verdicts

    ### Agreed
    - [F1] <finding>: <evidence>

    ### Disputed
    - [F2] <finding>: <evidence>

    ### Nuanced
    - [F3] <finding>: <evidence>

    ### Unverifiable
    - [F4] <finding>: <what was missing>

    ### Not judged
    - [F5] False Positive — cited <file:line> does not exist
    - [F6] Uncited — no concrete citation
    - [group 3] Unverified — Verifier call failed

    ### Gaps in the Codex result        <- research only, when there are any
    - [missing-1] Confirmed — <the part of the approved scope left unanswered>

    ### Unrequested changes             <- rescue --write only, when there are any
    - [side-effect-1] Harmless — <what the diff changed that no requirement asked for>

    ## Summary
    - Agreed: N | Disputed: N | Nuanced: N | Unverifiable: N | Unverified: N
    - Agreement: <High|Partial|Disagreement> (N/M judged)
    - Gaps: Confirmed N | Refuted N              <- research only
    - Unrequested changes: Harmless N | Harmful N    <- rescue --write only
    - Script: False Positive N | Uncited N
