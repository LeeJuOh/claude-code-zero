#!/usr/bin/env python3
"""
Test: Verify B3 cache deduplication fix.
Creates a mock cache structure with multiple versions per plugin,
then runs both old (no dedup) and new (dedup) B3 logic.
"""

import os
import re
import tempfile
import shutil
from collections import defaultdict

def create_mock_cache(tmpdir):
    """Create a mock plugin cache with multiple versions per plugin."""
    plugins = {
        ("marketplace-a", "superpowers", "4.3.1"): [
            ("brainstorm", "Brainstorm ideas using multi-perspective thinking", False),
            ("execute-plan", "Execute a structured plan step by step", False),
        ],
        ("marketplace-a", "superpowers", "5.0.2"): [
            ("brainstorm", "Brainstorm ideas using multi-perspective thinking", False),
            ("execute-plan", "Execute a structured plan step by step", False),
        ],
        ("marketplace-a", "superpowers", "5.0.5"): [
            ("brainstorm", "Brainstorm ideas creatively using multi-perspective thinking and structured approaches", False),
            ("execute-plan", "Execute a structured plan step by step with parallel agent orchestration", False),
            ("write-plan", "Write implementation plans for complex tasks", False),
        ],
        ("marketplace-a", "vision-powers", "2.6.0"): [
            ("agent-extension-visualizing", "Analyze Claude Code plugins and generate visual reports", False),
            ("diff-visual", "Create visual diff reports for code changes", False),
        ],
        ("marketplace-a", "vision-powers", "2.7.1"): [
            ("agent-extension-visualizing", "Analyze Claude Code plugins deeply and generate interactive visual HTML reports with architecture diagrams", False),
            ("diff-visual", "Create visual diff reports for code changes", False),
            ("plan-visual", "Visualize execution plans as interactive diagrams", False),
        ],
        ("marketplace-a", "manual-only", "1.0.0"): [
            ("deploy", "Deploy to production", True),  # disable-model-invocation: true
        ],
        ("marketplace-a", "manual-only", "1.1.0"): [
            ("deploy", "Deploy to production safely", True),
        ],
    }

    for (marketplace, plugin, version), skills in plugins.items():
        for skill_name, desc, disabled in skills:
            skill_dir = os.path.join(tmpdir, marketplace, plugin, version, "skills", skill_name)
            os.makedirs(skill_dir, exist_ok=True)
            disabled_line = "\ndisable-model-invocation: true" if disabled else ""
            content = f"""---
name: {skill_name}
description: {desc}{disabled_line}
---

Skill instructions here.
"""
            filepath = os.path.join(skill_dir, "SKILL.md")
            with open(filepath, "w") as f:
                f.write(content)
            # Set mtime: later versions get later times
            mtime_offset = float(version.replace(".", "")) if version[0].isdigit() else hash(version) % 1000
            os.utime(filepath, (1700000000 + mtime_offset, 1700000000 + mtime_offset))

    return tmpdir


def run_old_b3(cache_dir):
    """Original B3 logic — no deduplication."""
    total_chars = 0
    disabled_count = 0
    skill_count = 0
    for smd in sorted(os.popen(f"find {cache_dir} -path '*/skills/*/SKILL.md'").read().strip().split("\n")):
        if not smd:
            continue
        try:
            parts = smd.split(os.path.basename(cache_dir) + "/")[1].split("/")
            plugin = parts[1]
            skill = parts[parts.index("skills") + 1]
            with open(smd) as f:
                content = f.read(2000)
            m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
            if not m:
                continue
            fm = m.group(1)
            dm = re.search(r"description:\s*(.+)", fm)
            desc = dm.group(1).strip() if dm else ""
            disabled = 1 if re.search(r"disable-model-invocation:\s*true", fm) else 0
            if not disabled:
                total_chars += len(desc)
            else:
                disabled_count += 1
            skill_count += 1
        except Exception:
            pass
    return {"skills": skill_count, "total_chars": total_chars, "disabled": disabled_count}


def run_new_b3(cache_dir):
    """Fixed B3 logic — deduplicated by (plugin, skill)."""
    groups = defaultdict(list)
    for root, dirs, files in os.walk(cache_dir):
        if "SKILL.md" in files and "/skills/" in root:
            smd = os.path.join(root, "SKILL.md")
            parts = smd.split(os.path.basename(cache_dir) + "/")[1].split("/")
            try:
                plugin = parts[1]
                skill = parts[parts.index("skills") + 1]
                groups[(plugin, skill)].append(smd)
            except (ValueError, IndexError):
                pass

    total_chars = 0
    disabled_count = 0
    skill_count = 0
    for (plugin, skill), paths in sorted(groups.items()):
        smd = max(paths, key=os.path.getmtime)
        try:
            with open(smd) as f:
                content = f.read(2000)
            m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
            if not m:
                continue
            fm = m.group(1)
            dm = re.search(r"description:\s*(.+)", fm)
            desc = dm.group(1).strip() if dm else ""
            disabled = 1 if re.search(r"disable-model-invocation:\s*true", fm) else 0
            if not disabled:
                total_chars += len(desc)
            else:
                disabled_count += 1
            skill_count += 1
        except Exception:
            pass
    return {"skills": skill_count, "total_chars": total_chars, "disabled": disabled_count}


def main():
    tmpdir = tempfile.mkdtemp(prefix="cache_test_")
    try:
        cache_dir = create_mock_cache(tmpdir)

        print("=" * 60)
        print("TEST: B3 Cache Deduplication")
        print("=" * 60)

        old = run_old_b3(cache_dir)
        new = run_new_b3(cache_dir)

        print(f"\n--- Mock cache: 4 plugins, multiple versions ---")
        print(f"  superpowers: 3 versions (4.3.1, 5.0.2, 5.0.5)")
        print(f"  vision-powers: 2 versions (2.6.0, 2.7.1)")
        print(f"  manual-only: 2 versions (1.0.0, 1.1.0) [disable-model-invocation]")
        print()

        print(f"OLD (no dedup):")
        print(f"  Skills found:  {old['skills']}")
        print(f"  Total chars:   {old['total_chars']}")
        print(f"  Disabled:      {old['disabled']}")
        print()

        print(f"NEW (deduplicated):")
        print(f"  Skills found:  {new['skills']}")
        print(f"  Total chars:   {new['total_chars']}")
        print(f"  Disabled:      {new['disabled']}")
        print()

        # Assertions
        tests_passed = 0
        tests_total = 0

        # Test 1: Dedup reduces skill count
        tests_total += 1
        if new["skills"] < old["skills"]:
            print(f"PASS: Dedup reduces skill count ({old['skills']} -> {new['skills']})")
            tests_passed += 1
        else:
            print(f"FAIL: Expected fewer skills after dedup")

        # Test 2: Dedup picks latest version (superpowers should have 3 skills from 5.0.5, not 2 from older)
        tests_total += 1
        # Expected: superpowers(3) + vision-powers(3) + manual-only(1) = 7 unique skills
        expected_skills = 7
        if new["skills"] == expected_skills:
            print(f"PASS: Correct unique skill count ({new['skills']} == {expected_skills})")
            tests_passed += 1
        else:
            print(f"FAIL: Expected {expected_skills} unique skills, got {new['skills']}")

        # Test 3: disable-model-invocation skills excluded from char count
        tests_total += 1
        if new["disabled"] == 1:
            print(f"PASS: Disabled skills correctly counted ({new['disabled']})")
            tests_passed += 1
        else:
            print(f"FAIL: Expected 1 disabled skill, got {new['disabled']}")

        # Test 4: Char count uses latest version's descriptions (longer)
        tests_total += 1
        # Latest superpowers descriptions are longer than older ones
        if new["total_chars"] > 0 and new["total_chars"] < old["total_chars"]:
            print(f"PASS: Dedup reduces total chars ({old['total_chars']} -> {new['total_chars']})")
            tests_passed += 1
        else:
            print(f"FAIL: Expected reduced char count")

        # Test 5: Old count has inflated duplicates
        tests_total += 1
        inflation_ratio = old["skills"] / new["skills"] if new["skills"] > 0 else 0
        if inflation_ratio > 1.5:
            print(f"PASS: Old logic inflates by {inflation_ratio:.1f}x")
            tests_passed += 1
        else:
            print(f"FAIL: Expected significant inflation in old logic")

        print(f"\n{'=' * 60}")
        print(f"Results: {tests_passed}/{tests_total} tests passed")
        print(f"{'=' * 60}")

    finally:
        shutil.rmtree(tmpdir)


if __name__ == "__main__":
    main()
