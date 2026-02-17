---
name: plugin-bookmarks
description: |
  Manage bookmarks of third-party Claude Code plugins you want to remember.

  Trigger phrases: "bookmark plugin", "save plugin", "list bookmarks",
  "show my plugin wishlist", "add plugin to wishlist", "remove bookmark",
  "what plugins did I save", "plugin bookmarks".

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
      "description": "<short-description>"
    }
  }
}
```

**Initialization**: If `wishlist.json` does not exist, create it with `{"plugins": {}}`.

### Operations

#### 1. list

Show all bookmarked plugins in a table:

```
| Name | Description | URL |
|------|-------------|-----|
```

If empty, say "No bookmarks yet."

#### 2. add

Required: `name`, `url`.
Optional: `description` (ask user if not provided).

- Read `wishlist.json`
- Add entry to `plugins` object
- Write back
- Confirm with the added entry

If the plugin already exists, ask user whether to update it.

#### 3. remove

- Read `wishlist.json`
- If name not found, show available bookmarks and ask user to pick
- Remove entry from `plugins` object
- Write back
- Confirm removal

### Detection

Determine the operation from the user's message:
- "list", "show", "what plugins" -> **list**
- "add", "save", "bookmark" + plugin info -> **add**
- "remove", "delete", "forget" -> **remove**

If unclear, use AskUserQuestion to clarify.
