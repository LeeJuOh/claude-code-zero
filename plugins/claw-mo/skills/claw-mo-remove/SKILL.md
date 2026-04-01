---
name: claw-mo-remove
description: "Remove watch pattern from mo markdown viewer. Use when user wants to stop watching files or remove patterns from doc viewer."
allowed-tools: Bash, Read, Write
argument-hint: "<glob-pattern>"
---

# claw-mo-remove

Remove a watch pattern from the current project's mo configuration.

Pattern from `$ARGUMENTS`.

## Steps

1. Read config from `${PLUGIN_DATA_DIR}/config.json` for current project key (`git rev-parse --show-toplevel`)
2. No config → tell user no config exists, stop
3. Remove pattern from the config's patterns array
4. Save updated config
5. If server running: `mo --unwatch '<pattern>' -p PORT`
6. Confirm what was removed
