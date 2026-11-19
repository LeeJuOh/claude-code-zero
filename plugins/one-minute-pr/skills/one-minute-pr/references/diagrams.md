# Diagrams

Draw the changed flow from the diff. If the repo, the PR, or the conversation already has a diagram that fits the change, use it as it is.

To make a new diagram, use the first option that works:

1. Use a tool requested by the user or specified by the repo if it is available and the forge can display its output.
2. Otherwise, write a Mermaid diagram if the forge renders Mermaid.
3. Otherwise, draw a text diagram in a fenced `text` block.

Do not create an HTML page for the PR. Upload an image diagram to the PR, as with screenshots.

When you draw with option 2 or 3, follow these rules:

- Draw one diagram for each idea.
- Draw the unchanged neighbors that the change touches, so the reviewer sees what it can affect.
- Highlight only the one or two connections that the change is about.
