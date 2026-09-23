# vision-powers

vision-powers turns verbose AI output — diffs, plugins, documents, answers — into visual artifacts
a human can grasp at a glance; each sibling skill owns one input slice, and all share a design
system and a gate. It exists because prose flattens the relationships, hierarchies, and proportions
that HTML and diagrams preserve — a thesis vision-powers held before Thariq Shihipar's essay *The
unreasonable effectiveness of HTML* validated it.

## Language

### Artifact and delivery

**Visual artifact**:
An HTML or markdown file that re-presents verbose input as something navigable — TL;DR, callouts,
diagrams, tables, images, structure; the deliverable. HTML and markdown differ only in rendering
medium, not ambition: markdown that passes the source through unre-structured is a failure.
_Avoid_: report, summary (a summary compresses; an artifact re-structures without losing
substance); "diagram-rich" read as one diagram per section (it means the right visual used
generously — callouts and tables for prose, diagrams for spatial information, charts for data).

**Channel**:
Where a visual artifact is rendered and delivered, and which visual identity it carries:
**Artifact** (built-in artifact-design look, inline SVG and HTML+CSS, published URL) or **Local**
(design-system look, Mermaid, saved as a file). Orthogonal to format — either format can ride
either channel.
_Avoid_: mode (that is presentation register — see **Mode**), output type, target.

**Artifact channel**:
Delivery of a visual artifact as a published claude.ai page through Claude Code's Artifacts
feature — the default for HTML on an artifact-capable account, with non-capable sessions falling
back to Local and a force-local override for analytical charts or zoom/pan ([[0009]]). The design
brief is delegated to the harness's built-in artifact-design skill, while source passthrough,
build-time grounding, and the Gate's content checks stay with the skill ([[0007]]).
_Avoid_: unqualified "artifact" for this feature (in this repo that means the **Visual artifact**;
say "Artifact channel", "Artifact publish", or "claude.ai page").

**Content-only republish**:
Publishing an edited, already-designed Artifact-channel fragment back to its same claude.ai link
(report-manager, fact-check). The design is baked into the fragment, so the artifact-design skill
is not loaded again.

**Mode**:
The document's presentation register: **explainer** (teaching/learning prose) or **structural**
(architecture/structure); sections follow the document's mode, with rare overrides. diff-visual is
explainer by default because it is a **Catch-up**, not a review dashboard ([[0010]]).

**Readability** vs **Visibility**:
The two axes a report is judged on. Readability is how it reads when you read it (line length,
prose preservation, cell density, diagram-text legibility); Visibility is how it reads when you
skim it (hierarchy, where the eye lands first, whether a diagram lands its point at a glance).
_Avoid_: collapsing the two; "legibility" for Visibility (legibility is one input to Readability).

### Re-structuring

**Linear dump**:
Verbose prose or markdown read top-to-bottom with no structure — the failure mode the artifact
exists to fix, and what the HTML-effectiveness thesis says markdown "flattens" into.

**Re-structuring (not compression)**:
The north star: original substance is preserved byte-for-byte and only its shape changes, from flat
prose to scaffolding. Compressing a body to a one-line summary is the **cardinal sin** — the
flattening the skill exists to undo.

**Explainer scaffolding**:
The structure that makes a linear dump navigable — TL;DR box, collapsible steps, tabbed snippets,
comparison tables, diagrams, margin glossary — applied without dropping content.

**Structured block**:
A scaffolding element that re-presents source verbatim in a typed layout (split-diff,
annotated-code, data-model, api-endpoint, file-tree). Unlike a diagram (which abstracts
relationships) or a callout (which the model writes), its factual content is the source itself,
lifted unchanged ([[0005]]).

**Slop**:
Landing-page aesthetics inappropriate for explainer docs — glassmorphism, double-bezel cards,
spring/staggered motion, bento grids, forced dark mode, icon libraries, gradient-clipped text —
mined from references but explicitly rejected. Adding slop is how a skill makes output worse than
bare model.

### Leverage

**Leverage vs delegation**:
The skill's governing tension: **delegation** hands taste and layout to the model, which does them
better than a rigid template; **leverage** is what the skill adds so output beats bare model — three
things: design brief, source passthrough, gate ([[0002]]). Delegate everything and the skill is
pointless; fragment too much and it loses to bare model.

**Design brief**:
The design-system reference set offered to the model as a palette or menu (reading width, Korean
font, one accent, component options), never as a rigid fill-in template.

**Gate**:
An unattended, mechanical safety net run after authoring that checks what the model can't merely be
asked to guarantee; it reads the HTML as text, so a pass says nothing about whether the page
renders. A request without a gate is a wish ([[0002]]).

**Build-time grounding** (true-by-construction):
Leverage that fills a structured block by mechanical extraction from the source, never retyped by
the model, so its facts are correct by construction rather than by later checking; the model
contributes only selection and the prose around the block. It sharpens, not replaces, the Gate
([[0005]]).

### Diagrams

**Diagram-type selection** vs **Rendering technique**:
Diagram-type selection is the channel-agnostic decision of which diagram a section needs — the
13-type menu and case-to-diagram mapping, the durable authoring asset. Rendering technique is how
the chosen diagram is drawn: Mermaid (Local and md) or inline SVG / HTML+CSS (Artifact)
([[0009]]).
_Avoid_: calling Mermaid "the diagrams"; conflating the choice with the drawing.

**Relational diagram** vs **Analytical chart**:
The line that decides whether a diagram renders well without Mermaid. A relational diagram's
meaning is connections (flow, tree, hierarchy, sequence), which hand-authored inline SVG draws
well; an analytical chart's meaning is position or scale on axes (quadrant, scatter, xy-chart,
timeline), which needs Mermaid's coordinate accuracy and degrades to a table on the Artifact
channel ([[0009]]).
_Avoid_: graph, plot (both overloaded).

**Diagram grounding**:
Making a diagram's nodes and edges correspond to things that actually exist — the diagram-layer
analogue of **Build-time grounding**. vision-powers grounds diagrams to real code by authoring
discipline (every node label and edge endpoint drawn from names already tied to a `file:line`), not
by the Gate — the knowing "wish"-grade exception [[0011]] records.
_Avoid_: conflating with **Internal consistency** (that is only the weaker half).

**Internal consistency** (of a diagram):
The one grounding property the Gate can enforce mechanically: every edge endpoint resolves to a node
declared in the same diagram. It is checked only on Local-channel HTML, where the Mermaid topology
is parseable, and says nothing about whether the diagram matches real code ([[0011]]).
_Avoid_: calling this "topology validation" as if it grounded to code; it is well-formedness only.

**Phantom node**:
A dashed node or edge in a diff-visual before/after diagram marking an element that was removed or
moved. Its caption states the fact only ("removed", "moved to X"), never a verdict ([[0010]]).

### Catch-up

**Catch-up**:
What diff-visual delivers: bringing a reader who does not know the system up to where they can judge
the change — Background, Intuition, Literate diff, Quiz — read before review and never stating
whether the change is good. The axis is "does the reader know this system", not "who wrote it"
([[0010]]).
_Avoid_: review, summary, overview.

**Literate diff**:
The Code section of a Catch-up: the change walked in understanding order as prose around structured
blocks lifted by extraction, not file by file. When the change altered dependencies, a before/after
dependency picture stating facts without verdicts comes first.
_Avoid_: split-diff (that is one structured-block type, not the section), file map.

**Quiz**:
Five medium-difficulty questions closing a Catch-up that the reader must understand the change to
answer — no gotchas, options length-matched so formatting leaks nothing. A speed regulator for the
reader's own "pass before you push or approve" rule, never a gate ([[0003]]).
_Avoid_: test, exam, checkpoint, gate.
