# rubber-duck-tutor v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rubber-duck-tutor 훅을 워크플로우 단계 전환 기반으로 재설계하고, 덕 캐릭터를 확립하고, 질문 프레임워크를 구조화한다.

**Architecture:** 기존 git commit 훅(기계적, 너무 잦음)을 삭제하고 ExitPlanMode/Write *.md/PR 생성/Stop 4개 훅으로 교체. 프롬프트 기반 필터링을 전부 제거하고 셸에서 결정론적 필터링만 사용. SKILL.md에 덕 캐릭터와 assumptions/blindspots/tradeoffs 질문 프레임워크 추가.

**Tech Stack:** Bash hooks, SKILL.md markdown, Claude Code plugin hooks.json

**References:**
- 4개 외부 레퍼런스 분석 완료 (findskill prompt, rubberduck-mcp, mcp-rubber-duck, Socratic Duck Agent)
- 공식 hooks spec: https://code.claude.com/docs/en/hooks

---

## File Structure

```
plugins/rubber-duck-tutor/
├── .claude-plugin/plugin.json        # (no change)
├── README.md                         # Modify: 훅 설명 업데이트
├── hooks/
│   ├── hooks.json                    # Modify: 이벤트 매처 재구성
│   ├── lib.sh                        # Modify: Stop 이벤트 헬퍼 추가
│   ├── post-plan.sh                  # Modify: 덕 캐릭터, 필터링 제거
│   ├── post-write-plan.sh            # Modify: 덕 캐릭터, 필터링 제거
│   ├── pre-pr.sh                     # Create: PR/MR 생성 감지
│   ├── session-end.sh                # Create: Stop 이벤트 (마지막 방지책)
│   └── post-tool-use.sh              # Delete: git commit 훅 제거
└── skills/duck/
    └── SKILL.md                      # Modify: 캐릭터, 질문 프레임워크
```

---

### Task 1: hooks.json 재구성

**Files:**
- Modify: `plugins/rubber-duck-tutor/hooks/hooks.json`

- [ ] **Step 1: hooks.json을 새 이벤트 구조로 교체**

기존 PostToolUse의 Bash 매처(git commit)를 삭제하고, PR 감지용 Bash 매처와 Stop 이벤트를 추가한다.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/pre-pr.sh",
            "if": "Bash(gh *)"
          },
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/pre-pr.sh",
            "if": "Bash(glab *)"
          }
        ]
      },
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/post-plan.sh"
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/post-write-plan.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-end.sh"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: 변경 확인**

```bash
cat plugins/rubber-duck-tutor/hooks/hooks.json | python3 -m json.tool
```

Expected: valid JSON, PostToolUse에 Bash(PR)/ExitPlanMode/Write 3개 매처, Stop 이벤트 1개.

---

### Task 2: git commit 훅 삭제

**Files:**
- Delete: `plugins/rubber-duck-tutor/hooks/post-tool-use.sh`

- [ ] **Step 1: post-tool-use.sh 삭제**

```bash
rm plugins/rubber-duck-tutor/hooks/post-tool-use.sh
```

- [ ] **Step 2: 삭제 확인**

```bash
ls plugins/rubber-duck-tutor/hooks/
```

Expected: `hooks.json`, `lib.sh`, `post-plan.sh`, `post-write-plan.sh` (아직 pre-pr.sh, session-end.sh는 없음)

- [ ] **Step 3: 커밋**

```bash
git add plugins/rubber-duck-tutor/hooks/hooks.json
git rm plugins/rubber-duck-tutor/hooks/post-tool-use.sh
git commit -m "refactor(rubber-duck-tutor): remove git commit hook, restructure events

Git commit is a mechanical action, not a review checkpoint.
Replace with PR detection + Stop event hooks."
```

---

### Task 3: lib.sh 업데이트 — Stop 이벤트 지원

**Files:**
- Modify: `plugins/rubber-duck-tutor/hooks/lib.sh`

- [ ] **Step 1: Stop 이벤트용 헬퍼 함수 추가**

lib.sh 끝에 `duck__init_stop` 함수를 추가한다. Stop 이벤트는 PostToolUse와 입력 JSON 구조가 다르다 — `tool_input`이 없고 `stop_hook_active`, `last_assistant_message`가 있다.

```bash
# --- Stop event helpers ---

duck__init_stop() {
  DUCK_INPUT=$(cat)

  if [[ -z "$DUCK_INPUT" ]]; then
    exit 0
  fi

  # Prevent infinite loops: if stop hook already active, exit
  local stop_active
  stop_active=$(duck__get '.stop_hook_active')
  if [[ "$stop_active" == "true" ]]; then
    exit 0
  fi

  # Subagent detection
  local agent_type
  agent_type=$(duck__get '.agent_type')
  if [[ -n "$agent_type" ]]; then
    exit 0
  fi

  # Extract session ID for rate limiting
  DUCK_SESSION_ID=$(duck__get '.session_id')
  if [[ -z "$DUCK_SESSION_ID" ]]; then
    exit 0
  fi
}
```

- [ ] **Step 2: 구문 확인**

```bash
bash -n plugins/rubber-duck-tutor/hooks/lib.sh
```

Expected: no output (no syntax errors)

- [ ] **Step 3: 커밋**

```bash
git add plugins/rubber-duck-tutor/hooks/lib.sh
git commit -m "feat(rubber-duck-tutor): add Stop event helpers to lib.sh"
```

---

### Task 4: PR/MR 감지 훅 생성

**Files:**
- Create: `plugins/rubber-duck-tutor/hooks/pre-pr.sh`

- [ ] **Step 1: pre-pr.sh 작성**

```bash
#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Bash with gh/glab filter)
#
# Fires after Bash tool use filtered by `if: Bash(gh *)` / `if: Bash(glab *)`.
# Detects PR/MR creation commands and suggests a duck review session.
# Rate-limited. Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init

# Detect PR/MR creation commands
COMMAND=$(duck__get '.tool_input.command')
if ! echo "$COMMAND" | grep -qE '(gh\s+pr\s+create|glab\s+mr\s+create)'; then
  exit 0
fi

duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] 🦆 The user is about to create a PR/MR. Before proceeding, suggest a duck review in one short sentence using the duck character. Example tone: '🦆 꽥 — PR 올리기 전에 30초만 같이 볼래?' Stay in character as a curious, strategically naive duck. Do not start the session until they confirm. If they decline, do not offer again. If another plugin has already suggested a review, skip silently."}}
HOOK_JSON

exit 0
```

- [ ] **Step 2: 실행 권한 부여**

```bash
chmod +x plugins/rubber-duck-tutor/hooks/pre-pr.sh
```

- [ ] **Step 3: 구문 확인**

```bash
bash -n plugins/rubber-duck-tutor/hooks/pre-pr.sh
```

Expected: no output (no syntax errors)

- [ ] **Step 4: 커밋**

```bash
git add plugins/rubber-duck-tutor/hooks/pre-pr.sh
git commit -m "feat(rubber-duck-tutor): add PR/MR creation detection hook"
```

---

### Task 5: ExitPlanMode 훅 재설계 — 덕 캐릭터

**Files:**
- Modify: `plugins/rubber-duck-tutor/hooks/post-plan.sh`

- [ ] **Step 1: post-plan.sh를 덕 캐릭터 버전으로 교체**

프롬프트 기반 필터링("only if substantive decisions...")을 전부 제거하고, 덕 캐릭터로 무조건 제안한다.

```bash
#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches ExitPlanMode)
#
# Fires when Claude exits plan mode. Suggests a duck plan review.
# No prompt-based filtering — if a plan was created, always suggest.
# Rate-limited. Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init
duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] 🦆 A plan was just created. Suggest a duck plan review in one short sentence using the duck character. Example tone: '🦆 꽥 — 플랜 나왔네! 30초만 같이 볼래?' Stay in character as a curious, strategically naive duck. Do not start the session until they confirm. If they decline, do not offer again. If another plugin has already suggested a review, skip silently."}}
HOOK_JSON

exit 0
```

- [ ] **Step 2: 구문 확인**

```bash
bash -n plugins/rubber-duck-tutor/hooks/post-plan.sh
```

Expected: no output

- [ ] **Step 3: 커밋**

```bash
git add plugins/rubber-duck-tutor/hooks/post-plan.sh
git commit -m "refactor(rubber-duck-tutor): simplify plan hook with duck character

Remove prompt-based filtering. Plans always warrant a review suggestion."
```

---

### Task 6: Write *.md 훅 재설계 — 덕 캐릭터

**Files:**
- Modify: `plugins/rubber-duck-tutor/hooks/post-write-plan.sh`

- [ ] **Step 1: post-write-plan.sh를 덕 캐릭터 버전으로 교체**

프롬프트 기반 필터링("if this is a plan, spec, or design document...")을 제거한다. 셸의 결정론적 필터(파일 확장자, 제외 목록)는 유지한다.

```bash
#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Write)
#
# Fires after Write tool use. Checks if the written file is a markdown
# document that could be a plan or spec. Uses deterministic filtering
# only (extension check, known-skip list). No prompt-based judgment.
# Rate-limited. Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init

# Only trigger for .md files
FILE_PATH=$(duck__get '.tool_input.file_path')
if [[ -z "$FILE_PATH" ]] || [[ "$FILE_PATH" != *.md ]]; then
  exit 0
fi

# Skip known non-plan markdown files (deterministic filter)
BASENAME=$(basename "$FILE_PATH" | tr '[:upper:]' '[:lower:]')
case "$BASENAME" in
  readme.md|changelog.md|contributing.md|license.md|code_of_conduct.md|\
  security.md|agents.md|claude.md|gemini.md|memory.md|skill.md)
    exit 0
    ;;
esac

duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] 🦆 A markdown document was just written that may be a plan or spec. Suggest a duck review in one short sentence using the duck character. Example tone: '🦆 꽥 — 문서 하나 나왔는데, 같이 한번 볼래?' Stay in character as a curious, strategically naive duck. Do not start the session until they confirm. If they decline, do not offer again. If another plugin has already suggested a review, skip silently."}}
HOOK_JSON

exit 0
```

- [ ] **Step 2: 구문 확인**

```bash
bash -n plugins/rubber-duck-tutor/hooks/post-write-plan.sh
```

Expected: no output

- [ ] **Step 3: 커밋**

```bash
git add plugins/rubber-duck-tutor/hooks/post-write-plan.sh
git commit -m "refactor(rubber-duck-tutor): simplify write hook with duck character

Remove prompt-based filtering. Keep deterministic shell filters only."
```

---

### Task 7: Stop 이벤트 훅 생성 — 세션 마지막 방지책

**Files:**
- Create: `plugins/rubber-duck-tutor/hooks/session-end.sh`

- [ ] **Step 1: session-end.sh 작성**

Stop 이벤트는 PostToolUse와 출력 형식이 다르다. `decision: "block"` + `reason`으로 Claude에게 계속하도록 요청한다. `stop_hook_active` 체크로 무한 루프를 방지한다.

```bash
#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: Stop hook
#
# Last safety net. Fires when Claude is about to stop responding.
# If no other hook used the rate limit, suggests one final duck check.
# Uses stop_hook_active to prevent infinite loops.
# Rate-limited. Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init_stop
duck__check_rate_limit

cat <<'HOOK_JSON'
{"decision":"block","reason":"🦆 꽥 — 마무리 전에, 이번 작업 30초만 같이 볼래? (decline하면 바로 끝낼게)"}
HOOK_JSON

exit 0
```

- [ ] **Step 2: 실행 권한 부여**

```bash
chmod +x plugins/rubber-duck-tutor/hooks/session-end.sh
```

- [ ] **Step 3: 구문 확인**

```bash
bash -n plugins/rubber-duck-tutor/hooks/session-end.sh
```

Expected: no output

- [ ] **Step 4: 커밋**

```bash
git add plugins/rubber-duck-tutor/hooks/session-end.sh
git commit -m "feat(rubber-duck-tutor): add Stop hook as final session safety net

Only fires if other hooks haven't exhausted the rate limit.
Prevents infinite loops via stop_hook_active check."
```

---

### Task 8: SKILL.md 개선 — 덕 캐릭터 + 질문 프레임워크

**Files:**
- Modify: `plugins/rubber-duck-tutor/skills/duck/SKILL.md`

이 태스크는 SKILL.md에 3가지를 추가한다:
1. 덕 캐릭터/성격 섹션
2. 각 모드에 구조화된 질문 프레임워크 (assumptions/blindspots/tradeoffs)
3. 오프닝/클로징 리추얼 업데이트

SKILL.md는 현재 329줄. 500줄 예산 내로 유지해야 한다.

- [ ] **Step 1: Purpose 섹션 뒤에 Duck Personality 섹션 추가**

`## Scope` 앞에 다음 섹션을 삽입한다:

```markdown
## Duck Personality

You are a rubber duck: **curious, strategically naive, a benevolent skeptic.** You ask questions not because you don't understand, but because you suspect the human hasn't thought it through.

Tone guidelines:
- Open every session with `🦆 꽥 —` followed by a casual, curious observation about what you're reviewing
- Be direct but not aggressive. "이거 왜 이렇게 했어?" not "이것은 잘못되었습니다"
- Play dumb on purpose — "나는 덕이라 잘 모르겠는데..." forces them to explain clearly
- Never solve, never hint, never teach. Ask, then wait.
- Close sessions with a one-line gap summary (existing Session Wrap-up rules apply)
```

- [ ] **Step 2: "When to Offer" 섹션 단순화**

현재 "When to Offer" 섹션(66-79줄)의 세부 기준을 제거하고, 훅이 트리거를 담당한다는 점을 명시한다:

```markdown
## When to Offer

Auto-hooks handle triggering at workflow checkpoints (plan creation, spec documents, PR/MR creation, session end). This section applies to **Claude's own judgment** when no hook fired.

When the user explicitly invokes `/duck`, always run the session regardless.

Do not offer when:
- User declined this session
- User is actively debugging or in a flow state
```

- [ ] **Step 3: Plan Review Mode에 질문 프레임워크 추가**

Plan Review Mode의 Flow step 2 뒤에 질문 프레임워크를 추가한다:

```markdown
### Question Frameworks

Use these frameworks to generate questions. Pick 1-2 per session, not all:

**Assumptions** — "이 플랜에서 말 안 하고 당연하게 깔고 있는 게 뭐야?" Surface implicit premises. For each: how critical is it, how likely to be wrong, how would you verify it?

**Tradeoffs** — "왜 이걸 골랐어? 안 고른 대안은?" Force them to articulate what they gained AND lost with each choice.

**Blindspots** — "이 플랜이 실패할 수 있는 시나리오는?" Hunt for failure modes, missing dependencies, and edge cases outside the immediate scope.
```

- [ ] **Step 4: Code Verification Mode에 질문 프레임워크 추가**

Code Verification Mode의 Flow step 4 뒤에 추가:

```markdown
### Question Frameworks

**Blindspots** — "이 코드가 조용히 실패하는 경우는?" Focus on silent failures, not compile errors. Edge cases, null states, race conditions.

**Not Checked** — "아직 확인 안 한 건 뭐야?" Inspired by Socratic debugging — the question itself reveals what they skipped.
```

- [ ] **Step 5: PR/Change Review Mode에 질문 프레임워크 추가**

PR/Change Review Mode의 Flow step 3 뒤에 추가:

```markdown
### Question Frameworks

**Assumptions** — "이 변경이 성립하려면 뭐가 참이어야 해?" Surface dependencies on other code, data formats, or system state.

**Blindspots** — "이 diff 밖에서 깨질 수 있는 건?" Force them to think beyond the changed files.
```

- [ ] **Step 6: Facilitation 섹션에 오프닝 리추얼 업데이트**

현재 Facilitation의 첫 번째 항목을 교체한다:

현재:
```markdown
- **Always open with**: "Quick check on [topic]? 30 seconds." — every session starts with this line.
```

변경:
```markdown
- **Always open with**: "🦆 꽥 — [topic]! 30초만 볼래?" — every session starts in duck character. It is the complete opening — do not add filler. One sentence, then straight to the first question.
```

- [ ] **Step 7: 줄 수 확인**

```bash
wc -l plugins/rubber-duck-tutor/skills/duck/SKILL.md
```

Expected: 500줄 이하

- [ ] **Step 8: 커밋**

```bash
git add plugins/rubber-duck-tutor/skills/duck/SKILL.md
git commit -m "feat(rubber-duck-tutor): add duck personality and question frameworks

Add structured question patterns (assumptions/blindspots/tradeoffs)
inspired by mcp-rubber-duck prompts and Socratic Duck Agent."
```

---

### Task 9: README.md 업데이트

**Files:**
- Modify: `plugins/rubber-duck-tutor/README.md`

- [ ] **Step 1: Auto-hooks 설명 업데이트**

README.md 21-23줄의 auto-hooks 설명을 교체한다:

현재:
```markdown
Auto-hooks suggest duck sessions after commits and plan creation. Anti-collision logic prevents duplicate suggestions when other plugins are active.
```

변경:
```markdown
Auto-hooks suggest duck sessions at workflow checkpoints — plan creation, spec documents, PR/MR creation, and session end. The duck speaks in character (🦆 꽥). Rate-limited to 2 suggestions per session.
```

- [ ] **Step 2: 커밋**

```bash
git add plugins/rubber-duck-tutor/README.md
git commit -m "docs(rubber-duck-tutor): update README for v2 hook changes"
```

---

### Task 10: 플러그인 검증

**Files:** (none — validation only)

- [ ] **Step 1: 플러그인 검증 실행**

```bash
unset CLAUDECODE && claude plugin validate .
```

Expected: validation passes

- [ ] **Step 2: hooks.json 구조 재확인**

```bash
cat plugins/rubber-duck-tutor/hooks/hooks.json | python3 -m json.tool
```

Expected: valid JSON

- [ ] **Step 3: 모든 훅 스크립트 구문 확인**

```bash
for f in plugins/rubber-duck-tutor/hooks/*.sh; do
  echo "--- $f ---"
  bash -n "$f" && echo "OK" || echo "FAIL"
done
```

Expected: all OK

- [ ] **Step 4: 실행 권한 확인**

```bash
ls -la plugins/rubber-duck-tutor/hooks/*.sh
```

Expected: 모든 .sh 파일에 x 권한

- [ ] **Step 5: marketplace.json 버전 범프**

`.claude-plugin/marketplace.json`에서 rubber-duck-tutor의 version을 `1.1.0`으로 올린다 (새 기능 추가이므로 minor bump).

```bash
# marketplace.json에서 현재 버전 확인 후 1.1.0으로 업데이트
```

- [ ] **Step 6: 최종 커밋**

```bash
git add .claude-plugin/marketplace.json
git commit -m "release(rubber-duck-tutor): bump to 1.1.0

v2 hooks: workflow checkpoint triggers, duck character, question frameworks"
```

---

## Design Decisions

### 왜 프롬프트 기반 필터링을 제거하는가
프롬프트에 "ONLY if substantive decisions..." 같은 조건을 주면 Claude의 해석이 매번 달라진다. 같은 커밋을 봐도 "새 파일이니까 중요" vs "docs니까 사소" 를 왔다갔다한다. 필터링이 필요하면 셸에서 결정론적으로 처리하고, 나머지는 무조건 제안한다.

### 왜 git commit 훅을 삭제하는가
커밋은 기계적 행위이고 검수 단위가 아니다. superpowers 워크플로우에서 서브에이전트가 태스크마다 커밋하므로 매 커밋에 제안하면 소음이 된다. 실제 검수 시점은 플랜 완료, 문서 작성, PR 생성, 세션 종료이다.

### 왜 Stop 훅을 추가하는가
다른 3개 훅이 모두 발동하지 않은 세션에서 마지막 방지책. rate limit을 공유하므로 다른 훅이 이미 소진했으면 자동으로 발동하지 않는다. `stop_hook_active` 체크로 무한 루프를 방지한다.

### 덕 캐릭터의 근거
4개 레퍼런스 공통: 캐릭터가 있으면 제안이 시스템 알림이 아닌 대화로 느껴진다. "strategically naive"(전략적 나이브)는 Socratic Duck Agent에서 가져옴 — 일부러 모르는 척 물어보는 게 사용자의 설명을 강제한다.

### 질문 프레임워크의 근거
mcp-rubber-duck의 assumptions/blindspots/tradeoffs 프롬프트 구조에서 영감. 현재 SKILL.md에도 비슷한 질문이 있지만 명시적 프레임으로 이름을 붙이면 질문 품질이 일관된다.
