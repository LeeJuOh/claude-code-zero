---
name: claw-mo-reset
description: "Clear and reset mo markdown viewer session. Use when user wants a fresh start, clear mo cache, or reset doc viewer."
allowed-tools: Bash, Read
---

# claw-mo-reset

Clear the mo markdown viewer session for the current project.

## Steps

1. Read port from `${PLUGIN_DATA_DIR}/config.json` using project key (`git rev-parse --show-toplevel`)
2. No config → tell user no mo server is configured, stop
3. Run `echo "y" | mo --clear -p PORT`

## Gotchas

- Always pipe `y` to `mo --clear` — it prompts for confirmation and will hang without it.
