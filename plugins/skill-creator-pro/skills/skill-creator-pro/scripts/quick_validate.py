#!/usr/bin/env python3
"""Quick validation for skills -- checks SKILL.md structure and frontmatter."""

import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None


def validate_skill(skill_path):
    """Basic validation of a skill. Returns (valid, message)."""
    skill_path = Path(skill_path)

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return False, "SKILL.md not found"

    content = skill_md.read_text()
    if not content.startswith("---"):
        return False, "No YAML frontmatter found"

    match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return False, "Invalid frontmatter format"

    frontmatter_text = match.group(1)

    if yaml is not None:
        try:
            frontmatter = yaml.safe_load(frontmatter_text)
            if not isinstance(frontmatter, dict):
                return False, "Frontmatter must be a YAML dictionary"
        except yaml.YAMLError as e:
            return False, f"Invalid YAML in frontmatter: {e}"
    else:
        frontmatter = {}
        for line in frontmatter_text.split("\n"):
            if ":" in line and not line.startswith(" ") and not line.startswith("\t"):
                key = line.split(":")[0].strip()
                frontmatter[key] = True

    allowed = {
        "name", "description", "license", "allowed-tools",
        "metadata", "compatibility", "argument-hint",
        "disable-model-invocation", "user-invocable",
        "model", "context", "agent", "hooks",
        "effort", "paths", "skills", "shell",
    }
    unexpected = set(frontmatter.keys()) - allowed
    if unexpected:
        return False, (
            f"Unexpected key(s) in frontmatter: {', '.join(sorted(unexpected))}. "
            f"Allowed: {', '.join(sorted(allowed))}"
        )

    name = frontmatter.get("name", "")
    if isinstance(name, str) and name.strip():
        name = name.strip()
        if not re.match(r"^[a-z0-9-]+$", name):
            return False, f"Name '{name}' should be kebab-case"
        if name.startswith("-") or name.endswith("-") or "--" in name:
            return False, f"Name '{name}' has invalid hyphen placement"
        if len(name) > 64:
            return False, f"Name too long ({len(name)} chars, max 64)"

    description = frontmatter.get("description", "")
    if isinstance(description, str) and description.strip():
        description = description.strip()
        if "<" in description or ">" in description:
            return False, "Description cannot contain angle brackets (< or >)"
        if len(description) > 1024:
            return False, f"Description too long ({len(description)} chars, max 1024)"

    return True, "Skill is valid!"


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python quick_validate.py <skill_directory>")
        sys.exit(1)

    valid, message = validate_skill(sys.argv[1])
    print(message)
    sys.exit(0 if valid else 1)
