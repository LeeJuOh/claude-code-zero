# Claude Code Zero

Personal marketplace for Claude Code plugins, skills, and agents.

## Structure

```
.
├── .claude-plugin/
│   └── marketplace.json     # Plugin registry
├── plugins/                  # Your production code (Git-committed)
└── references/              # Learning materials (Git-ignored)
```

## Quick Start

### 1. Clone reference materials (optional)

```bash
mkdir -p references
cd references
git clone https://github.com/example/some-plugin.git
```

### 2. Develop your plugin

```bash
mkdir -p plugins/my-plugin
cd plugins/my-plugin
# Create your plugin files
```

### 3. Register and validate

Edit `.claude-plugin/marketplace.json`:

```json
{
  "plugins": [
    {
      "id": "my-plugin",
      "name": "My Plugin",
      "version": "1.0.0",
      "type": "skill",
      "description": "Plugin description",
      "entry": "plugins/my-plugin/SKILL.md"
    }
  ]
}
```

Validate:

```bash
claude plugin validate .
```

## Development Guide

See [CLAUDE.md](CLAUDE.md) for detailed development workflow and guidelines.

## License

MIT License - see [LICENSE](LICENSE)