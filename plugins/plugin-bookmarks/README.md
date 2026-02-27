# plugin-bookmarks

Bookmark third-party Claude Code plugins you want to remember. No installation management, no status checks -- just names and links.

## Features

- **list**: Show all bookmarked plugins with install hints
- **add**: Save a plugin name + URL (auto-derives install command from URL)
- **remove**: Delete a bookmark
- **show-install**: Display install commands for bookmarked plugins

## Data

Bookmarks are stored in `~/.claude/claude-code-zero/plugin-bookmarks/data/wishlist.json`. Each entry includes `name`, `url`, `description`, and an optional `installHint` field with the install command. Data is stored outside the plugin directory to persist across plugin updates.
