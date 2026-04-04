---
name: claw-mo-setup
description: "Configure mo markdown viewer for current project. Use when user wants to set up doc watching, configure mo patterns, initialize claw-mo for a project, or set up markdown viewer."
allowed-tools: Bash, AskUserQuestion, Read, Write
---

# claw-mo-setup

Configure mo markdown viewer with group-based watch patterns for the current project.

For config schema, port logic, and groups: read `${PLUGIN_DIR}/references/shared.md`

## Steps

1. **Prerequisites check**
   - `command -v mo >/dev/null 2>&1` → if missing: `brew install k1LoW/tap/mo`, stop
   - If `$CMUX_SURFACE_ID` is not set: mention that cmux (https://cmux.dev) provides a built-in browser panel alongside the terminal — ideal for viewing docs while coding. Brief one-liner, don't push.

2. **Detect project root**: `git rev-parse --show-toplevel` (fallback: `$PWD`)

3. **Scan markdown files**:
   ```bash
   find "$PROJECT_ROOT" -name '*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/vendor/*' 2>/dev/null | wc -l
   ```
   Warn if 500+.

4. **List directories with .md files**:
   ```bash
   find "$PROJECT_ROOT" -name '*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/vendor/*' 2>/dev/null | sed "s|$PROJECT_ROOT/||" | cut -d/ -f1 | sort -u
   ```

5. **Suggest groups** based on common patterns found:
   - `docs/` exists → suggest group `docs` with `docs/**/*.md`
   - `plans/` or `docs/plan/` exists → suggest group `plans`
   - `specs/` or `docs/spec/` exists → suggest group `specs`
   - Root `.md` files exist → suggest group `default` with `*.md`
   - Always include suggestions but let user modify

6. **AskUserQuestion**: Present suggested groups and port together. Example:
   ```
   Detected these groups in your project:
   
   - docs: docs/**/*.md (23 files)
   - plans: plans/*.md (5 files)  
   - default: *.md (3 files)
   
   Port: 6342 (auto-assigned from path hash)
   
   Proceed with these? Let me know if you want to add, remove, or change anything.
   ```

7. **Save config** to `${PLUGIN_DATA_DIR}/config.json` (create file if needed, merge if exists). Use v2 `groups` format.

8. **Offer to start**: "Setup complete! Want me to start the server with `/claw-mo-up`?"

## Gotchas

- **`**/*.md` can explode**: Projects with vendored code may contain thousands of .md files. Always show the count before accepting broad patterns. Guide users toward specific directory patterns.
- **Group names become URL paths**: Keep them simple lowercase, no spaces or special chars.
- **Existing config**: If config already exists for this project, show current groups and ask if they want to update or start fresh.
