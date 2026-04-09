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

3. **Check existing config**: Read `${PLUGIN_DATA_DIR}/config.json`. If an entry exists for this project:
   - Show current groups and port
   - Ask: "Config already exists — update existing groups or start fresh?"
   - **Update**: Skip to step 6 with current groups pre-populated (user can add/remove/rename)
   - **Start fresh**: Continue from step 4

4. **Scan markdown files**:
   ```bash
   find "$PROJECT_ROOT" -name '*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/vendor/*' 2>/dev/null | wc -l
   ```
   Warn if 500+.

5. **List directories with .md files**:
   ```bash
   find "$PROJECT_ROOT" -name '*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/vendor/*' 2>/dev/null | sed "s|$PROJECT_ROOT/||" | cut -d/ -f1 | sort -u
   ```

6. **Suggest groups** based on the directories found in step 5:
   - For each directory found, get the file count and suggest a group named after that directory:
     ```bash
     find "$PROJECT_ROOT/DIRNAME" -name '*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/vendor/*' 2>/dev/null | wc -l
     ```
   - If root `.md` files exist, suggest group `default` with `*.md`
   - Use the actual directory name as the group name — don't rename or merge unless obvious (e.g., a single top-level dir with 1 file might be skipped)
   - Always show file counts so the user can see what each pattern covers

7. **AskUserQuestion**: Present suggested groups and port together. Example:
   ```
   Detected these groups in your project:
   
   - docs: docs/**/*.md (23 files)
   - plans: plans/*.md (5 files)  
   - default: *.md (3 files)
   
   Port: 6342 (auto-assigned from path hash)
   
   Proceed with these? Let me know if you want to add, remove, or change anything.
   ```

8. **Save config** to `${PLUGIN_DATA_DIR}/config.json` (create file if needed, merge if exists). Use v2 `groups` format.

9. **Offer to start**: "Setup complete! Want me to start the server with `/claw-mo-up`?"

## Gotchas

- **`**/*.md` can explode**: Projects with vendored code may contain thousands of .md files. Always show the count before accepting broad patterns. Guide users toward specific directory patterns.
- **Group names become URL paths**: Keep them simple lowercase, no spaces or special chars.
