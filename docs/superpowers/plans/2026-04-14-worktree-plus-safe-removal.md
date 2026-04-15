# worktree-plus Safe Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make worktree-plus removal semantics safer: gate branch deletion on upstream existence, remove the `rm -rf` fallback, and document the policy.

---

## Direction Change

**Original direction (v1 — rejected):** `worktree-create.sh`가 메타데이터 파일(`.worktree-plus-meta`)을 워크트리에 생성하고, `worktree-remove.sh`가 이를 읽어 `creation_mode`(`local-reuse`, `remote-track`, `new-from-base`)에 따라 브랜치 삭제 여부와 unpreserved commit 범위를 결정. 문제: 메타데이터 파일 자체가 untracked file이 되어 제거를 영구 블락하는 자기참조 버그 + 불필요한 복잡성.

**Revised direction (v2):** create hook 수정 없음. remove hook에서 git-native 상태(upstream 존재 여부)만으로 판단:

| 조건 | unpreserved commit 체크 | 브랜치 삭제 |
|------|------------------------|------------|
| upstream 있음 | `upstream..HEAD` | 허용 |
| upstream 없음 | 스킵 (브랜치 보존되므로 커밋 안전) | 안 함 |

트레이드오프: `new-from-base`로 만들고 push 안 한 브랜치는 워크트리 제거 후에도 로컬에 남음. 실수로 삭제하는 것보다 나음.

---

## File Structure

**Modify:**
- `plugins/worktree-plus/hooks/scripts/worktree-remove.sh` — branch deletion을 upstream 존재 여부로 게이팅, `rm -rf` fallback 제거
- `plugins/worktree-plus/README.md` — 제거 정책 문서화

**Do not modify:**
- `plugins/worktree-plus/hooks/scripts/worktree-create.sh` — 변경 불필요
- `plugins/worktree-plus/hooks/scripts/setup-check.sh`
- `plugins/worktree-plus/skills/worktree-config/SKILL.md`
- `.claude-plugin/marketplace.json`
- `plugins/worktree-plus/.claude-plugin/plugin.json`

**Validation approach:**
- `claude plugin validate .`
- 수동 테스트: 임시 git repo에서 시나리오별 확인

---

## Behavior Contract

1. Block if `git status --porcelain` reports staged or unstaged changes
2. Block if `git status --porcelain` reports untracked files
3. Block if upstream exists and `upstream..HEAD` has commits (기존 동작 유지)
4. upstream 없는 브랜치는 삭제하지 않음 (워크트리만 제거, 브랜치 보존)
5. `git worktree remove` 실패 시 exit 1; 디렉토리 수동 삭제 안 함

---

## Task 1: Harden removal logic in `worktree-remove.sh`

**Files:**
- Modify: `plugins/worktree-plus/hooks/scripts/worktree-remove.sh`

- [ ] **Step 1: Gate branch deletion on upstream existence**

Replace the current branch-deletion block (lines 103-107):

```bash
# Clean up branch
if [ -n "$BRANCH" ]; then
  git -C "$PROJECT_ROOT" branch -D "$BRANCH" >&2 2>/dev/null || true
  echo "Deleted branch: $BRANCH" >&2
fi
```

with:

```bash
# Clean up branch only when upstream exists (hook-created tracking or pushed branches)
if [ -n "$BRANCH" ] && [ -n "$UPSTREAM" ]; then
  git -C "$PROJECT_ROOT" branch -D "$BRANCH" >&2 2>/dev/null || true
  echo "Deleted branch: $BRANCH" >&2
else
  echo "Preserved branch: ${BRANCH:-<detached>}" >&2
fi
```

`$UPSTREAM` is already set at line 74 in the dirty-check section. Reused local branches and unpushed `new-from-base` branches have no upstream, so they survive worktree removal.

Expected result: branches without upstream are never deleted.

- [ ] **Step 2: Remove the `rm -rf` fallback**

Replace lines 97-101:

```bash
echo "Removing worktree: $WORKTREE_PATH" >&2
git -C "$PROJECT_ROOT" worktree remove "$WORKTREE_PATH" --force >&2 2>/dev/null || {
  rm -rf "$WORKTREE_PATH"
  git -C "$PROJECT_ROOT" worktree prune >&2 2>/dev/null || true
}
```

with:

```bash
echo "Removing worktree: $WORKTREE_PATH" >&2
if ! git -C "$PROJECT_ROOT" worktree remove "$WORKTREE_PATH" --force >&2; then
  echo "Failed to remove worktree via git; directory left untouched: $WORKTREE_PATH" >&2
  exit 1
fi
```

Expected result: git-level failure stops the hook instead of force-deleting the directory.

- [ ] **Step 3: Run shell syntax verification**

```bash
bash -n plugins/worktree-plus/hooks/scripts/worktree-remove.sh
```

Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add plugins/worktree-plus/hooks/scripts/worktree-remove.sh
git commit -m "fix(worktree-plus): gate branch deletion on upstream, remove rm -rf fallback"
```

---

## Task 2: Document removal semantics in `README.md`

**Files:**
- Modify: `plugins/worktree-plus/README.md`

- [ ] **Step 1: Update the feature table cleanup row**

Replace:

```md
| Cleanup protection | None | Blocks removal if uncommitted changes or unpushed commits |
```

with:

```md
| Cleanup protection | None | Blocks removal if uncommitted changes, untracked files, or unpushed commits; only deletes branches with upstream |
```

- [ ] **Step 2: Add removal safety section after Usage, before `### Gitignored files`**

```md
### Removal safety

When a worktree is removed through the hook, worktree-plus blocks removal if the worktree has staged or unstaged changes, untracked files, or commits not pushed to upstream. Branches without an upstream are preserved on removal — only the worktree directory is cleaned up. If `git worktree remove` fails, the directory is left untouched.
```

- [ ] **Step 3: Verify wording consistency**

Check the README uses consistent terminology (`unpushed commits`, not mixing with `unpreserved`). Do not rewrite unrelated sections.

- [ ] **Step 4: Commit**

```bash
git add plugins/worktree-plus/README.md
git commit -m "docs(worktree-plus): clarify removal safety policy"
```

---

## Task 3: Validate

- [ ] **Step 1: Plugin validation**

```bash
unset CLAUDECODE && claude plugin validate .
```

- [ ] **Step 2: Manual scenario test in a temporary repo**

```bash
TMPDIR=$(mktemp -d)
cd "$TMPDIR"
git init worktree-plus-safety
cd worktree-plus-safety
git commit --allow-empty -m "init"
git branch -M develop
```

Test scenarios:
1. **Dirty worktree** — create worktree, add untracked file, attempt removal → blocked
2. **Clean no-upstream worktree** — create worktree, removal succeeds, `git branch` still shows the branch
3. **Clean upstream worktree** — create worktree, push, removal succeeds, branch deleted

- [ ] **Step 3: Record results**

Document which scenarios passed. If validation required code changes, commit each fix separately.

---

## Self-Review Checklist

- `worktree-create.sh` is untouched
- `$UPSTREAM` reuse: set at line 74, consumed at branch deletion — no new variable declarations
- `rm -rf` fully removed, not wrapped in a flag
- README matches implemented behavior
- No version bump (safety fix, not a release)
