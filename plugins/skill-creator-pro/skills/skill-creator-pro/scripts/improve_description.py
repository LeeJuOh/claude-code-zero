#!/usr/bin/env python3
"""Improve a skill description based on trigger evaluation results.

Uses Claude with extended thinking to generate improved descriptions
that trigger more accurately.
"""

import argparse
import json
import re
import sys
from pathlib import Path

import anthropic

from scripts.utils import parse_skill_md


def improve_description(
    client: anthropic.Anthropic,
    skill_name: str,
    skill_content: str,
    current_description: str,
    trigger_results: dict,
    history: list[dict],
    model: str,
    test_results: dict | None = None,
    log_dir: Path | None = None,
    iteration: int | None = None,
) -> str:
    """Call Claude to improve the description based on trigger results."""
    failed_triggers = [
        r for r in trigger_results["results"]
        if r["should_trigger"] and not r["pass"]
    ]
    false_triggers = [
        r for r in trigger_results["results"]
        if not r["should_trigger"] and not r["pass"]
    ]

    train_score = f"{trigger_results['summary']['passed']}/{trigger_results['summary']['total']}"
    if test_results:
        test_score = f"{test_results['summary']['passed']}/{test_results['summary']['total']}"
        scores_summary = f"Train: {train_score}, Test: {test_score}"
    else:
        scores_summary = f"Train: {train_score}"

    prompt = f"""You are optimizing a skill description for a Claude Code skill called "{skill_name}".

The description appears in Claude's "available_skills" list. When a user sends a query, Claude decides whether to invoke the skill based on the title and description. Write a description that triggers for relevant queries and doesn't trigger for irrelevant ones.

Current description:
"{current_description}"

Current scores ({scores_summary}):
"""
    if failed_triggers:
        prompt += "FAILED TO TRIGGER (should have triggered but didn't):\n"
        for r in failed_triggers:
            prompt += f'  - "{r["query"]}" (triggered {r["triggers"]}/{r["runs"]} times)\n'
        prompt += "\n"

    if false_triggers:
        prompt += "FALSE TRIGGERS (triggered but shouldn't have):\n"
        for r in false_triggers:
            prompt += f'  - "{r["query"]}" (triggered {r["triggers"]}/{r["runs"]} times)\n'
        prompt += "\n"

    if history:
        prompt += "PREVIOUS ATTEMPTS (do NOT repeat -- try something structurally different):\n\n"
        for h in history:
            train_s = f"{h.get('train_passed', h.get('passed', 0))}/{h.get('train_total', h.get('total', 0))}"
            test_s = f"{h.get('test_passed', '?')}/{h.get('test_total', '?')}" if h.get('test_passed') is not None else None
            score_str = f"train={train_s}" + (f", test={test_s}" if test_s else "")
            prompt += f'<attempt {score_str}>\n'
            prompt += f'Description: "{h["description"]}"\n'
            if "results" in h:
                prompt += "Train results:\n"
                for r in h["results"]:
                    status = "PASS" if r["pass"] else "FAIL"
                    prompt += f'  [{status}] "{r["query"][:80]}" (triggered {r["triggers"]}/{r["runs"]})\n'
            prompt += "</attempt>\n\n"

    prompt += f"""
Skill content (for context):
{skill_content}

Write a new description that triggers more accurately. Tips:
- Use imperative form: "Use this skill for..." not "this skill does..."
- Focus on user intent, not implementation details
- Make it distinctive so it competes well with other skills
- Be slightly "pushy" to combat undertriggering
- Generalize from failures to broader categories, don't list specific queries
- Keep under 200 words (description has a 1024 character hard limit)
- Be creative across iterations -- try different structures and wordings

Respond with only the new description in <new_description> tags."""

    response = client.messages.create(
        model=model,
        max_tokens=16000,
        thinking={"type": "enabled", "budget_tokens": 10000},
        messages=[{"role": "user", "content": prompt}],
    )

    thinking_text = ""
    text = ""
    for block in response.content:
        if block.type == "thinking":
            thinking_text = block.thinking
        elif block.type == "text":
            text = block.text

    match = re.search(r"<new_description>(.*?)</new_description>", text, re.DOTALL)
    description = match.group(1).strip().strip('"') if match else text.strip().strip('"')

    transcript: dict = {
        "iteration": iteration,
        "prompt": prompt,
        "thinking": thinking_text,
        "response": text,
        "parsed_description": description,
        "char_count": len(description),
        "over_limit": len(description) > 1024,
    }

    if len(description) > 1024:
        shorten_prompt = f"Your description is {len(description)} characters, exceeding the 1024 character limit. Rewrite under 1024 characters. Respond with only the description in <new_description> tags."
        shorten_response = client.messages.create(
            model=model,
            max_tokens=16000,
            thinking={"type": "enabled", "budget_tokens": 10000},
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": text},
                {"role": "user", "content": shorten_prompt},
            ],
        )

        shorten_text = ""
        for block in shorten_response.content:
            if block.type == "text":
                shorten_text = block.text

        match = re.search(r"<new_description>(.*?)</new_description>", shorten_text, re.DOTALL)
        description = match.group(1).strip().strip('"') if match else shorten_text.strip().strip('"')
        transcript["rewrite_description"] = description

    transcript["final_description"] = description

    if log_dir:
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / f"improve_iter_{iteration or 'unknown'}.json"
        log_file.write_text(json.dumps(transcript, indent=2))

    return description


def main():
    parser = argparse.ArgumentParser(description="Improve a skill description")
    parser.add_argument("--eval-results", required=True)
    parser.add_argument("--skill-path", required=True)
    parser.add_argument("--history", default=None)
    parser.add_argument("--model", required=True)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    skill_path = Path(args.skill_path)
    if not (skill_path / "SKILL.md").exists():
        print(f"Error: No SKILL.md at {skill_path}", file=sys.stderr)
        sys.exit(1)

    trigger_results = json.loads(Path(args.eval_results).read_text())
    history = json.loads(Path(args.history).read_text()) if args.history else []

    name, _, content = parse_skill_md(skill_path)
    current_description = trigger_results["description"]

    client = anthropic.Anthropic()
    new_description = improve_description(
        client=client,
        skill_name=name,
        skill_content=content,
        current_description=current_description,
        trigger_results=trigger_results,
        history=history,
        model=args.model,
    )

    output = {
        "description": new_description,
        "history": history + [{
            "description": current_description,
            "passed": trigger_results["summary"]["passed"],
            "failed": trigger_results["summary"]["failed"],
            "total": trigger_results["summary"]["total"],
            "results": trigger_results["results"],
        }],
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
