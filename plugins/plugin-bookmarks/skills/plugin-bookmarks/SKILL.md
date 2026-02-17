---
name: plugin-bookmarks
description: |
  Manage bookmarks of third-party Claude Code plugins you want to remember.

  Trigger phrases: "bookmark plugin", "save plugin", "list bookmarks",
  "show my plugin wishlist", "add plugin to wishlist", "remove bookmark",
  "what plugins did I save", "plugin bookmarks",
  "install command", "how to install", "설치 명령어", "설치 방법".

  Do NOT use for: installing plugins, validating plugins, or plugin development.
allowed-tools:
  - Read
  - Write
  - AskUserQuestion
---

# Plugin Bookmarks

Save and manage bookmarks of third-party Claude Code plugins.

## Instructions

### Storage

Location: `${SKILL_ROOT}/data/wishlist.json`

Schema:
```json
{
  "plugins": {
    "<plugin-name>": {
      "name": "<plugin-name>",
      "url": "<marketplace-or-repo-url>",
      "description": "<short-description>",
      "installHint": "<install-command-or-null>"
    }
  }
}
```

`installHint` is optional. If absent or `null`, the install command is unknown.

**Initialization**: If `wishlist.json` does not exist, create it with `{"plugins": {}}`.

### URL Heuristics

When determining `installHint`, apply the first matching pattern.
These are **best-effort guesses** — always show the candidate to the user for confirmation.

| Pattern | URL shape | installHint |
|---------|-----------|-------------|
| A: plugin inside a marketplace repo | `github.com/{owner}/{repo}/tree/{branch}/{plugin}` | `/plugin marketplace add {owner}/{repo}` + `/plugin install {plugin}@{owner}-{repo}` |
| B: marketplace repo root | `github.com/{owner}/{repo}` (no `/tree/`) | `/plugin marketplace add {owner}/{repo}` then browse and install individual plugins |
| C: other git host | `gitlab.com/...` or URL ending in `.git` | `/plugin marketplace add {full-url}` |
| D: unrecognizable | anything else | `null` (prompt user for manual input) |

Note: Pattern A derives the marketplace name as `{owner}-{repo}`. The actual name depends on the repo's `marketplace.json` and may differ.

### Operations

#### 1. list

Show all bookmarked plugins in a table:

```
| Name | Description | Install | URL |
|------|-------------|---------|-----|
```

- `Install` column: show `installHint` value. If absent or `null`, show `—`.
- For multi-line hints, show only the key command abbreviated.
- If empty, say "No bookmarks yet."

#### 2. add

Required: `name`, `url`.
Optional: `description` (ask user if not provided).

- Read `wishlist.json`
- Collect `name`, `url`, `description`
- Derive `installHint` candidate using URL Heuristics
  - If a candidate is found, show it to the user and ask to confirm (yes / edit / skip)
  - If no candidate (Pattern D), ask user whether to enter one manually
- Build the complete entry (including final `installHint` or `null` if skipped)
- Add entry to `plugins` object and write back
- Confirm with the added entry

If the plugin already exists, ask user whether to update it.

#### 3. remove

- Read `wishlist.json`
- If name not found, show available bookmarks and ask user to pick
- Remove entry from `plugins` object
- Write back
- Confirm removal

#### 4. show-install

Show install commands for bookmarked plugins.

- Read `wishlist.json`
- If a specific plugin is named:
  - Show its `installHint`
  - If `installHint` is absent or `null`, derive one using URL Heuristics, show to user, and ask to confirm. If confirmed, save to `wishlist.json` and write back.
- If no plugin is specified:
  - Show a list of all plugins with their `installHint` (or `—` if unknown)

### Detection

Determine the operation from the user's message:
- "list", "show", "what plugins" -> **list**
- "add", "save", "bookmark" + plugin info -> **add**
- "remove", "delete", "forget" -> **remove**
- "install command", "how to install", "설치 명령어", "설치 방법" -> **show-install**

If unclear, use AskUserQuestion to clarify.
