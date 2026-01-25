# Repository Overview

This repository is a **personal marketplace** for Claude Code features (plugins, skills, agents).
Develop new features and manage deployments through `marketplace.json`.

## Directory Structure

- **Marketplace definition**: `.claude-plugin/marketplace.json` at the root
- **Source code (workspace)**: `plugins/<plugin-name>/`
- **Reference materials**: `references/`
    - This is where external open-source code is stored.
    - **IMPORTANT**: Only read files from this folder when the user explicitly specifies them using `@references/...` syntax. Do NOT explore this folder on your own.

## 🛠️ Development Workflow

### 1. Analysis (User-Directed Analysis)

The user will provide:
- The implementation goal
- **Specific reference files** to consult

Example: "Create a review agent. Refer to logic in @references/other-plugin/agent.md"

**Your task:**
- Read ONLY the specified files
- Understand the structure and logic from those files
