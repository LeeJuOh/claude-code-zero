# README redesign

Status: Paused during grilling at the user's request on 2026-11-20. Implementation is not approved. Resume from [the handoff](../handoff/018-readme-resume.md).

## Goal

Help visitors choose a plugin and reach its first useful result. Review the marketplace READMEs and plugin READMEs using technical-writing and unslop guidance, with examples from the repositories referenced by llm-wiki.

## User direction

The user supplied this ranking on 2026-11-20:

1. codex-advisor
2. one-minute-pr
3. worktree-plus
4. vision-powers
5. skill-creator-pro

Use this featured order. Do not infer usage frequency from the ranking.

The user then placed toolbox and notebooklm-connector after these five, in that order. The user described claw-mo, claw-mux, vibeproxy-kit, and rubber-duck-tutor as rarely used and experimental. Keep those four available in a lower experimental section. No removal was requested. The public section labels remain undecided.

## Open decisions

- Decide the introduction format and length after the problem, intent, and outcome are settled.
- Decide the marketplace introduction, installation path, and demo placement.
- Decide the common plugin README structure and justified exceptions.
- Decide how to keep English and Korean marketplace content aligned.

## Presentation history

The user initially accepted a compact selection table, then clarified that introductions must convey the problem, intent, and outcome. A one-sentence limit is not a final requirement. Placement of installation instructions and demos remains open.

## Subsequent content direction

The user clarified that brevity is not the objective by itself. Each introduction must explain the problem, the reason for the approach, and the intended outcome. The final length and presentation remain open after this clarification.

For one-minute-pr, the user identified long, verbose agent-written PR and MR bodies as the personal motivation and said articles informed the design. Lead with that experience. Do not imply a novel invention or claim that everyone follows this approach. Spec 017 identifies Hugo's article on evidence-bearing PRs and Colin Breck's criticism of context-free AI summaries among its sources. Proposed wording remains subject to the ongoing interview.

## Research scope

Search the existing llm-wiki collection for articles and repositories related to the problems addressed by all seven core plugins. Follow wiki links to local original articles and reference repositories. Use those sources to strengthen the explanation of why each plugin exists. This is not a broad search for new external material, a feature expansion, or a popularity ranking. Present researched wording one plugin at a time during grilling.

## Evidence

- The current marketplace README gives all 11 plugins extended problem-and-solution sections. one-minute-pr appears tenth.
- The marketplace lists context-health-visual, which is absent from the current vision-powers skills directory.
- README.ko.md omits codex-transfer from its codex-advisor command list while README.md includes it.
- Reference repositories include mattpocock/skills, cursor/plugins/pstack, emilkowalski/skills, and addyosmani/agent-skills. Compare current upstream content with local references before adopting details.

## Demo investigation

The user reports that the embedded video previously worked. Chrome reproduces an unavailable-media error in the develop README. Opening the English attachment directly in the signed-in browser reaches the video. Chrome media diagnostics identify H.264 and AAC tracks and record playback initialization. Anonymous HTTP requests to both language-specific attachment URLs return 404. These observations do not establish deletion, an encoding defect, or an access-policy cause.

## Related issue

[Implementation tasks](../issues/018-readme-redesign.md).
