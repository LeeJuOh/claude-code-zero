# Release Workflow (Tagging on main)

## Plugin Rename Handling

When renaming a plugin (e.g., `extension-wiki` → `agent-extension-wiki`):

1. Update the `name` and `source` fields in `marketplace.json`.
2. Bump the version (at least minor) to signal the change.
3. Update the `description` if scope has changed.

## Tagging on main

When the user requests a tag on `main`:

1. **Sync with remote** — Run `git fetch origin` first. Check latest tag with `git tag --sort=-v:refname | head -3` and verify both branches are not behind remote (`git log develop..origin/develop --oneline`). Pull or rebase if behind. Then run `git log develop..main --oneline` — if any commits exist (hotfixes made directly on main), merge main → develop first (`git checkout develop && git merge main --no-ff`) before proceeding.
2. **Compare branches** — Run `git log main..develop --oneline` and `git diff main..develop --stat` to list all changes.
3. **Ask about marketplace update** — Show each plugin's current version and what changed since `main`. Ask which plugins should have their version bumped and by how much.
4. **Update on develop** — Update `marketplace.json` for selected plugins. Commit (e.g., `release: bump versions for <tag>`).
5. **Merge to main** — Switch to `main` and merge `develop` (no fast-forward: `git merge --no-ff develop`).
6. **Create tag** — Create the annotated tag on `main` (e.g., `git tag -a v1.5.0 -m "v1.5.0"`).
7. **Switch back** — Return to `develop`.
8. **Confirm push** — Ask the user before pushing `main`, `develop`, and the tag to remote.
