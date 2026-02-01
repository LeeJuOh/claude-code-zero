# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

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

**Do NOT:**
- Randomly explore the `references/` folder
- Search for files without user direction

### 2. Implementation

- Create a new directory under `plugins/`
- Write code based on the analyzed logic, tailored to requirements
- **IMPORTANT**: Never modify files in `references/` folder

### 3. Registration and Validation

- Register the plugin in `marketplace.json`
- Run `claude plugin validate .` to verify

## Coding Style and Naming

- **Language**: Always write all plugin content in **English** (SKILL.md, agent.md, README.md, comments, descriptions, etc.)
- **Plugin names**: `kebab-case` (e.g., `notebook-researcher`, `code-reviewer`)
- **Version management**: Semantic Versioning (1.0.0)
- **Description**: Write `description` field clearly and concisely

## Common Commands

- **Marketplace validation**: `claude plugin validate .`
- **Local testing**: `claude --plugin-dir ./plugins/<plugin-name>`

## Important Notes

### Why User-Directed Analysis?

1. **Token efficiency**: Avoid wasting tokens on unnecessary file exploration
2. **Precision**: Focus only on relevant reference code
3. **User control**: User knows best which implementations to reference

### .gitignore Configuration

The `references/` folder is git-ignored. This means:
- External repositories cloned into `references/` will NOT be committed
- This keeps your repository clean while allowing local file access
- Only content in `plugins/` will be committed to Git

### Plugin Development Flow

1. User specifies reference files to analyze (e.g., `@references/example/core.py`)
2. You read and understand ONLY those specified files
3. Create your implementation in `plugins/<new-plugin>/`
4. Register in `marketplace.json` when ready to deploy
5. Validate with `claude plugin validate .`

### Directory Separation

- `references/` = Learning materials (Git-ignored, user-directed reading only)
- `plugins/` = Your production code (Git-committed, deployable)