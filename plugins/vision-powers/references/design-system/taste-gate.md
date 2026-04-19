# Taste Gate — Pre-output Checklist

The checklist that diagram-generator output must pass **before** entering the final report. `scripts/taste-gate.js` runs this file's rules converted into JSON.

## Type fit
- [ ] Does the type match the section's intent? (re-check diagram-type-selection.md)
- [ ] Could a 3-column table convey the same information? → if so, **drop the diagram**

## Remove test
- [ ] Can the reader still understand if one node is removed? → that node is **unnecessary**
- [ ] Do two nodes always travel together? → **merge into one**
- [ ] Is the arrow obvious from layout alone? → **drop the arrow**
- [ ] Does the label already signal via color/shape? → **drop the label**

## Signal
- [ ] accent (focal) ≤ 2?
- [ ] Does the legend cover every type used, with no useless entries?
- [ ] Within the complexity budget (density-rules.md)?

## Technical (parser stability)
- [ ] Opaque mask on arrow labels? (without it, the line passes through the label)
- [ ] No `writing-mode: vertical`?
- [ ] No `rgba()` / `rgb()` in Mermaid classDef? (parser breakage)
- [ ] No `color:` in classDef? (breaks dark mode — use CSS overrides)
- [ ] No `{}[]<>&` in sequenceDiagram message?
- [ ] No `<br/>` in stateDiagram-v2?

## Typography
- [ ] Person/node names = body sans (no mono)?
- [ ] Technical content (ports, URLs, paths, field types) = mono?
- [ ] No JetBrains Mono?

## Automation

`scripts/taste-gate.js` automates the **programmatically verifiable items** from the checklist above:

- Mermaid syntax validation (rgba / color / special-character detection)
- accent count
- node/arrow count
- Complexity budget violation detection

Items requiring manual judgment (Remove test, Type fit) are indirectly enforced by inclusion in the system prompts of section-analyzer and diagram-generator.

## On violation

1. Automated validation fails → re-invoke diagram-generator (that section only, max 2 retries)
2. Still failing after 2 retries → **exclude** that section's diagram, log a warning + continue report generation
