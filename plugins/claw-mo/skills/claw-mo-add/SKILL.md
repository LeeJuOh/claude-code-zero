---
name: claw-mo-add
description: "Add watch pattern to mo markdown viewer. Use when user wants to add more files or directories to doc viewer."
allowed-tools: Bash, Read, Write
argument-hint: "<glob-pattern>"
---

# claw-mo-add

Add a watch pattern to the current project's mo configuration.

Pattern from `$ARGUMENTS`.

## Steps

1. Read config from `${PLUGIN_DATA_DIR}/config.json` for current project key (`git rev-parse --show-toplevel`)
2. No config → tell user to run `/claw-mo-setup` first, stop
3. Append pattern to the config's patterns array
4. Save updated config
5. If server running (`mo --status --json`): `mo -w '<pattern>' -p PORT --no-open`
6. Confirm what was added
