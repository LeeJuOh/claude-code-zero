---
name: claw-mo-stop
description: "Stop mo markdown viewer server for current project. Use when user wants to stop mo, shut down doc viewer, or kill mo server."
allowed-tools: Bash, Read
---

# claw-mo-stop

Stop the mo markdown viewer server for the current project.

## Steps

1. Read port from `${PLUGIN_DATA_DIR}/config.json` using project key (`git rev-parse --show-toplevel`)
2. No config → tell user no mo server is configured for this project, stop
3. Run `mo --shutdown -p PORT`
