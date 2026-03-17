# Color Palette

Semantic color definitions for vision-powers reports. Single source of truth for color meaning across all report types.

## Status Colors

| Role | CSS Variable | Light Mode | Dark Mode | Usage |
|------|-------------|------------|-----------|-------|
| Success | `--success` | `#16a34a` | `#34d399` | Added, working, passed, low risk, covered, confirmed |
| Warning | `--warning` | `#d97706` | `#fbbf24` | Modified, in progress, medium risk, uncertain, cognitive debt |
| Danger | `--danger` | `#dc2626` | `#f87171` | Removed, broken, high/critical risk, gap, failed |
| Info | `--info` / `--accent` | `#0891b2` | `#22d3ee` | Context, informational, current state, inferred |

These four colors carry consistent meaning across ALL report types. Never use success-green for "modified" or warning-amber for "deleted."

## Node Colors

For Mermaid diagrams and multi-category content where status colors are not appropriate:

| Role | CSS Variable | Light Mode | Dark Mode |
|------|-------------|------------|-----------|
| Primary category | `--node-a` | `#0891b2` | `#22d3ee` |
| Secondary category | `--node-b` | `#059669` | `#34d399` |
| Tertiary category | `--node-c` | `#d97706` | `#fbbf24` |

## Report-Specific Color Mappings

Each report type maps the shared status colors to domain-specific meanings:

### Diff Visual
- Red (`--danger`): Removed / deleted
- Green (`--success`): Added / new
- Amber (`--warning`): Modified / changed
- Blue (`--info`): Context / informational

### Plan Visual
- Blue (`--info`): Current state / existing
- Green (`--success`): Planned / proposed
- Amber (`--warning`): Concern / needs attention
- Red (`--danger`): Gap / missing / risk

### Project Recap
- Green (`--success`): Working / stable / shipped
- Blue (`--info`): In progress / informational
- Amber (`--warning`): Cognitive debt / needs attention
- Red (`--danger`): Broken / blocked / high severity

### Agent Extension Visual
- Red (`--danger`): Critical risk
- Orange (`--danger-high`): High risk
- Amber (`--warning`): Medium risk / Warning
- Green (`--success`): Low risk / Pass
- Blue (`--info`): Info / Context

## Accent Palettes

See `anti-slop-rules.md` for approved accent palette pairs and dark mode variants. The accent color (`--accent`) is chosen per-report and must come from the approved list.

## Customization

To adapt for brand consistency:
1. Override `--accent`, `--node-a/b/c` in the template `:root` CSS variables
2. Status colors (`--success/warning/danger`) should remain semantically consistent
3. See `anti-slop-rules.md` for dark mode variant mappings
