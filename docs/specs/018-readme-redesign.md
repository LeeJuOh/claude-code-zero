# README redesign

Status: Implemented on 2026-11-20.

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

The user then placed toolbox and notebooklm-connector after these five, in that order. The user described claw-mo, claw-mux, vibeproxy-kit, and rubber-duck-tutor as rarely used and experimental. Keep those four available in a lower experimental section. All four remain available.

## Published layout

The two marketplace READMEs introduce the same seven plugins in the same order, followed by a short list of experimental plugins. Each core entry links to the plugin README. Both languages list the skills shipped under each core plugin. The demo stays above installation, and the marketplace install remains the first option.

Each core plugin README opens with its purpose and a concrete reason to use it. The existing usage and configuration sections remain specific to the plugin. For one-minute-pr, the author identified the original problem: long agent-written PR and MR descriptions made it hard to tell what needed review. The introduction uses that experience directly.

## Research scope

The [issue](../issues/018-readme-redesign.md) links the research notes for all seven plugins. They connect articles from llm-wiki to the original text or local reference repository. The outside examples explain the problem. Claims about plugin behavior come from the shipped components.

## Demo investigation

On the signed-in English README, Chrome reported that the page's media policy blocked the attachment address in the HTML video tag. Both READMEs now keep their original attachment URLs on separate Markdown lines. GitHub renders each as a player with a media host that the page allows. Anonymous requests to the original attachment URLs returned 404 during investigation. That was a separate observation.
