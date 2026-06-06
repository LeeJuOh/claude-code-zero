# Diagram Density Rules

Keep each diagram **light**; when the budget is exceeded, split it into multiple diagrams. `artifact-gate.js` **enforces** the limits in this file.

## Complexity budget per type

| Item | Max | If exceeded |
|---|---|---|
| Total nodes | 9 | Split into 2: overview + detail |
| Total arrows / transitions | 12 | Group-abstract, then sub-diagram |
| accent (focal) count | **2** | Re-select focal |
| sequence lifelines | 5 | Remove less important actors |
| swimlane lanes | 5 | Merge mergeable lanes |
| quadrant items | 12 | Show top 12 only |
| ER entities | 8 | Split per sub-domain |
| nested levels | 6 | Flatten or sub-diagram |
| tree depth | 4 | Collapse middle levels |
| layer stack | 6 | Split into two stacks |
| venn circles | 3 | Visual limit |
| pyramid layers | 6 | Top 6 layers only |

## Focal rule

- Apply accent to **only 1-2** elements
- 4+ accents = focal not yet decided → redesign
- Accent over 30% of total nodes = redesign

## Split rule

When over the complexity budget:
1. 1 overview diagram (max 5 nodes, only the core relationships)
2. N detail diagrams (linked from overview via click links)

## Table vs diagram decision

- 2-column comparison → table
- 3-column table that conveys the information adequately → table
- Diagram only when the relationships between nodes are the **point**

## Length cap

- Max 15 diagrams total per HTML report
- Max 10 diagrams per markdown report
