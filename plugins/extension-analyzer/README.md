# Extension Analyzer

Analyze Claude Code extensions (plugins, skills, commands, hooks, agents, MCP servers, rules) and generate visual reports with risk assessment and quality scores.

## Features

- **Full Analysis**: 7-category evaluation with weighted scoring (A-F grades)
- **Security Audit**: Permission model analysis, tool scope audit, hook script security, MCP trust boundaries
- **Architecture Review**: Component relationships, data flow, state management
- **Usage Guide Generation**: Auto-extracted triggers, arguments, prerequisites, install commands
- **Visual Scoring**: Per-category scores with visual bars

## Usage

### Analyze a local plugin

```
analyze ./plugins/my-plugin
```

### Analyze an installed plugin

```
analyze my-plugin
```

### Analyze from GitHub

```
analyze github.com/owner/repo
```

### Security audit only

```
security audit ./plugins/my-plugin
```

### Quick overview

```
overview ./plugins/my-plugin
```

## Analysis Modes

| Mode | Output |
|------|--------|
| `analyze` (default) | Full 7-category report with scores |
| `security` | Security & permissions only |
| `overview` | Identity + component inventory only |

## Architecture

```
[SKILL] extension-analyzer (orchestrator)
  ├── Phase 1: Discovery (Glob scan)
  ├── Phase 2: Metadata (Read files)
  ├── Phase 3: Parallel analysis
  │   ├── [AGENT] security-auditor
  │   └── [AGENT] feature-architect
  └── Phase 4: Report assembly
```

## Scoring Categories

| Category | Weight |
|----------|--------|
| Identity & Overview | 5% |
| Functionality | 20% |
| Usage Guide | 10% |
| Dependencies | 10% |
| Security & Permissions | 30% |
| Architecture | 10% |
| Quality | 15% |

## License

MIT
