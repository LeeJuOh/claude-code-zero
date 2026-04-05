# marketplace.json Schema

Location: `.claude-plugin/marketplace.json`

## Top-level fields

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Marketplace identifier (kebab-case) |
| `owner` | Yes | `{ "name": "...", "email": "..." }` |
| `plugins` | Yes | Array of plugin entries |
| `metadata.description` | No | Marketplace description |
| `metadata.pluginRoot` | No | Base path prepended to relative plugin sources |

## Plugin entry fields

| Field | Required | Description |
|---|---|---|
| `name` | Yes | kebab-case identifier |
| `source` | Yes | `"./path"` (local) or source object (external) |
| `version` | No | SemVer — set here for local, in plugin.json for external |
| `description` | No | One-line summary |
| `category` | No | e.g., `"lab"` for experimental plugins |
| `tags` | No | Array of keyword strings |

## Source types

- **Local**: `"./plugins/foo"` — must start with `./`, no `../`
- **GitHub**: `{"source": "github", "repo": "owner/repo", "ref": "branch", "sha": "..."}`
- **Git URL**: `{"source": "url", "url": "https://...", "ref": "...", "sha": "..."}`
- **Git subdirectory**: `{"source": "git-subdir", "url": "...", "path": "subdir/path"}`
- **npm**: `{"source": "npm", "package": "...", "version": "...", "registry": "..."}`
