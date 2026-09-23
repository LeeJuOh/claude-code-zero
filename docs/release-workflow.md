# Release Workflow (Tagging on main)

## Plugin Rename Handling

When renaming a plugin (e.g., `extension-wiki` → `agent-extension-wiki`):

1. Update the `name` and `source` fields in `marketplace.json`.
2. Bump the version (at least minor) to signal the change.
3. Update the `description` if scope has changed.

## Tagging on main

Tags live on `main` only, formatted `v<major>.<minor>.<patch>`. Bump the tag's minor when any released plugin got a minor or major bump, otherwise its patch (v1.83.0 shipped codex-advisor 5.0.0; v1.83.1 shipped 5.0.2).

When the user requests a tag on `main`:

1. **Sync with remote** — Run `git fetch origin` first. Check latest tag with `git tag --sort=-v:refname | head -3` and verify both branches are not behind remote (`git log develop..origin/develop --oneline`). Pull or rebase if behind. Then run `git log develop..main --oneline` — if any commits exist (hotfixes made directly on main), merge main → develop first (`git checkout develop && git merge main --no-ff`) before proceeding.
2. **Compare branches** — Run `git log main..develop --oneline` and `git diff main..develop --stat` to list all changes.
3. **Check version bumps** — Every plugin changed since `main` has a version bump in `marketplace.json` (bumps land in the commits that change the plugin). Bump any that is missing in a commit on `develop`.
4. **Merge to main** — Switch to `main` and merge `develop` (no fast-forward: `git merge --no-ff develop`).
5. **Create tag** — Create the annotated tag on `main` (e.g., `git tag -a v1.5.0 -m "v1.5.0"`).
6. **Switch back** — Return to `develop`.
7. **Confirm push** — Ask the user before pushing `main`, `develop`, and the tag to remote.
