---
name: claw-mo-setup
disable-model-invocation: true
description: "Configure mo markdown viewer for the current project. Use when the user wants to set up doc watching, configure mo patterns, initialize claw-mo for a project, or set up markdown viewer groups."
allowed-tools: Bash, AskUserQuestion, Read, Write
---

# claw-mo-setup

Configure mo markdown viewer with group-based watch patterns for the current project.

For config schema, port logic, and groups: read `${CLAUDE_PLUGIN_ROOT}/references/shared.md`

## Steps

1. **Prerequisites check**
   - `command -v mo >/dev/null 2>&1` → if missing: `brew install k1LoW/tap/mo`, stop
   - If `$CMUX_SURFACE_ID` is not set: mention that cmux (https://cmux.dev) provides a built-in browser panel alongside the terminal — ideal for viewing docs while coding. Brief one-liner, don't push.

2. **Detect project root**: `git rev-parse --show-toplevel` (fallback: `$PWD`)

3. **Check existing config**: Read `${CLAUDE_PLUGIN_DATA}/config.json`. If an entry exists for this project:
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
   - If a top-level directory is huge, do not blindly suggest `DIRNAME/**/*.md`. Inspect one level deeper and propose narrower subgroups when that better matches the actual content (for example `raw/articles/**/*.md` but not `raw/**/*.md` when `raw/repos/**` dominates)
   - If root `.md` files exist, suggest group `default` with `*.md`
   - Use the actual directory name as the group name — don't rename or merge unless obvious (e.g., a single top-level dir with 1 file might be skipped)
   - Always show file counts so the user can see what each pattern covers, and explicitly call out directories you are excluding because the watch scope would be too large

7. **AskUserQuestion**: Present suggested groups and port together. Example:
   ```
   Detected these groups in your project:
   
   - docs: docs/**/*.md (23 files)
   - plans: plans/*.md (5 files)  
   - default: *.md (3 files)
   
   Port: 6342 (auto-assigned from path hash)
   
   Proceed with these? Let me know if you want to add, remove, or change anything.
   ```

8. **Save config** to `${CLAUDE_PLUGIN_DATA}/config.json` (create file if needed, merge if exists). Use v2 `groups` format. Include `"autosync": true` on new entries so PostToolUse adds newly-written .md files to the running mo server without `/claw-mo-up`.

9. **Offer to start**: "Setup complete! Want me to start the server with `/claw-mo-up`?"
   - If a mo server is already running on `$PORT` (e.g., from a previous setup in this project), note that `/claw-mo-up` will apply the new config by clearing and rebuilding — since configured patterns changed, this is expected.
   - Also mention: "Autosync is on by default — when I write .md files here they'll show up in mo automatically while the server is running. Turn off per project via `/claw-mo-manage` → Server control → Toggle autosync."

## Gotchas

- **`**/*.md` can explode**: Projects with vendored code may contain thousands of .md files. Always show the count before accepting broad patterns. Guide users toward specific directory patterns.
- **Large top-level directories need one more pass**: If a directory contains a massive subtree, inspect its immediate children before suggesting patterns. Otherwise Claude tends to recommend broad watches like `raw/**/*.md` that swamp mo with irrelevant files.
- **Group names become URL paths**: Keep them simple lowercase, no spaces or special chars.
- **Changing config while a server is running**: `/claw-mo-up` reconciles by detecting drift and running `printf 'y\n' | mo --clear` then rebuilding. Tell the user this is the expected side effect of reconfiguring, not a bug.
- **autosync defaults to true**: every new config entry ships with `"autosync": true`. The field is only read by the PostToolUse hook; no runtime effect when the server is stopped. Users can disable per project via `/claw-mo-manage`.
