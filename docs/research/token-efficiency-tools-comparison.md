# 토큰 효율 도구 비교 — caveman / claude-token-efficient / rtk

> `references/`에 클론된 세 개 외부 도구 분석. 모두 Claude Code 토큰 효율이라는 공통 목표를 가지지만 공격 지점과 메커니즘이 서로 다름. 동시 사용 가능.
>
> 분석 일자: 2026-04-18

## 한 줄 요약

| 레포 | 경로 | 형태 | 겨냥 |
|---|---|---|---|
| **caveman** | `references/caveman` | Claude Code 플러그인 (훅 + 스킬) | **출력 토큰** (Claude 응답 압축) |
| **claude-token-efficient** | `references/claude-token-efficient` | 단일 `CLAUDE.md` 파일 | **출력 토큰** (Claude 응답 압축) |
| **rtk** | `references/rtk` | Rust 바이너리 + 쉘 훅 | **입력 토큰** (도구 결과 가공) |

## 공격 지점이 다름 (가장 중요)

세 도구는 경쟁관계 아니라 **보완관계**. 파이프라인의 서로 다른 지점을 겨냥.

```
유저 입력 ─┐
          ▼
     [CLAUDE.md 자동 로드]         ← claude-token-efficient
          │                          (프로젝트 루트 파일, 매 턴 프롬프트에 포함)
          │
     [SessionStart 훅]              ← caveman
          │                          (stdout → system context, 세션 1회)
          │
     [UserPromptSubmit 훅]          ← caveman
          │                          (additionalContext JSON, 매 턴)
          │
     ━━━ Claude 응답 생성 ━━━        ← 출력 압축 (caveman, c-t-e)
          │
     [Bash 도구 호출]
          │
     터미널 결과 → [PreToolUse 훅]  ← rtk
          │         (rtk 바이너리가 텍스트 가공)
          │
     ━━━ Claude 컨텍스트 반영 ━━━   ← 입력 압축 (rtk)
```

## 메커니즘 상세 비교

| 항목 | caveman | claude-token-efficient | rtk |
|---|---|---|---|
| **겨냥** | Claude 출력 토큰 | Claude 출력 토큰 | Claude 입력 토큰 (도구 결과 = context) |
| **수단** | 훅 2개 + SKILL.md + Python 압축 엔진 | 단일 `CLAUDE.md` 파일 | Rust 바이너리 + 쉘 훅 |
| **세션 시작** | SessionStart 훅 stdout → 풀 규칙 1회 주입 | CLAUDE.md 자동 로드 (CC 기본 동작) | `rtk init -g`가 settings.json 패치 |
| **매 턴** | UserPromptSubmit 훅의 `hookSpecificOutput.additionalContext` 짧은 리마인더 | CLAUDE.md 재포함 (CC 기본) | PreToolUse 훅이 `git status` → `rtk git status` 재작성 |
| **방식** | 프롬프트 규칙 (말로 부탁, 확률적) | 프롬프트 규칙 (말로 부탁, 확률적) | 실제 텍스트 가공 (결정적) |
| **실패 모드** | Claude가 무시 가능 | Claude가 무시 가능 | 필터 실패 시 원본 폴백 (항상 동작) |
| **절감 주장** | 출력 65-75% | 출력 63% · 비용 17.4%↓ | 터미널 출력 60-90% |
| **설치** | `claude plugin install caveman@caveman` | `cp CLAUDE.md ./` | `brew install rtk && rtk init -g` |
| **토글** | `/caveman lite\|ultra`, `stop caveman` | 파일 삭제 | `rtk proxy <cmd>`, 훅 제거 |
| **언어** | Node.js (훅) + Python (압축) | 순수 텍스트 | Rust |

## caveman 훅 내부 (실제 구현)

### SessionStart 훅 — `hooks/caveman-activate.js`

- 파일 읽기: `skills/caveman/SKILL.md` 본문을 런타임에 로드
- 강도 레벨(lite/full/ultra/wenyan)에 맞게 필터링
- **stdout으로 출력** → Claude Code가 이 stdout을 **숨겨진 system context로 자동 주입** (공식 훅 규약)
- flag 파일 `$CLAUDE_CONFIG_DIR/.caveman-active`에 모드 기록 (statusline이 읽음)

### UserPromptSubmit 훅 — `hooks/caveman-mode-tracker.js`

매 유저 프롬프트마다 실행. 세 가지 책임:

1. **Slash 커맨드 파싱**: `/caveman lite|ultra|wenyan` 등 감지 → flag 파일 업데이트
2. **자연어 토글**: "talk like caveman" / "stop caveman" 매치
3. **Per-turn reinforcement**: 활성 상태일 때 아래 JSON 뱉음 →
   ```js
   {
     "hookSpecificOutput": {
       "hookEventName": "UserPromptSubmit",
       "additionalContext": "CAVEMAN MODE ACTIVE (full). Drop articles/filler/..."
     }
   }
   ```
   `hookSpecificOutput.additionalContext`는 Claude Code 훅 API 공식 필드. 이 문자열이 **그 턴 유저 메시지 직전에 Claude 컨텍스트로 주입**됨.

### 왜 두 훅 분리했나

`caveman-mode-tracker.js:72-80` 주석이 설명:

> "SessionStart hook injects the full ruleset once, but models lose it when other plugins inject competing style instructions every turn. This keeps caveman visible in the model's attention on every user message."

→ 풀 규칙은 세션 시작 1회(크고 무거움), 매 턴은 짧은 앵커(attention drift 방지).

### 보안 디테일

`readFlag()`가 flag 파일 읽을 때 **symlink 방지 + 크기 제한 + 화이트리스트 모드 검증**. 공격자가 `~/.caveman-active`를 `~/.ssh/id_rsa`로 symlink해서 개인키를 `additionalContext`로 Claude에 주입하는 걸 차단. **훅이 model context에 임의 바이트 주입 가능 = 공격면**이라는 인식이 코드에 박혀있음.

## rtk가 "입력 토큰"만 줄이는 이유

사용자 흔한 오해: "rtk가 아웃풋을 자른다" → **틀림**. rtk가 자르는 건 **Claude 입력 토큰**.

```
git status 실행
   ↓
터미널이 200줄 뱉음           ← rtk가 못 막음 (이미 생성됨)
   ↓
Bash 도구 결과로 변환
   ↓
[rtk가 여기서 자름]            ← 200줄 → 20줄
   ↓
다음 Claude API 호출 input에 포함 ← 여기서 토큰 절약
   ↓
Claude 응답 생성              ← rtk 무관
```

### 그럼 의미 있나

Claude Code 같은 코딩 에이전트는 **input이 output보다 압도적으로 큼**:

| | 토큰량 | 단가 (Sonnet) |
|---|---|---|
| Input (코드, 터미널, 대화) | 수만~수십만 | $3/M |
| Output (응답) | 수백~수천 | $15/M |

단가는 output 5배 비싸지만 **누적 토큰량은 input이 10~100배** → 실제 비용은 input 지배.

`git log -50`, `cargo test`, `npm list` 같은 건 1회에 5K~20K 토큰 치고 들어감. rtk가 80% 자르면 세션당 수만 토큰 절약 + 컨텍스트 윈도우도 벌음 (200K 한계 늦게 닿음).

**간접 효과**: 노이즈 적은 입력 → Claude 응답도 살짝 짧아짐. 하지만 주효과는 input.

## 이 레포 맥락 추천 조합

CC 플러그인 마켓플레이스 운영 + 플러그인 개발 맥락:

1. **1순위: rtk** — `git diff`, `cargo test`, `claude plugin validate` 출력이 지속적으로 컨텍스트 먹음. 입력 자르기가 체감 가장 큼. Homebrew 5초 설치, 쉘 훅 자동 설정.
2. **2순위: claude-token-efficient의 규칙 12줄 차용** — 이미 AGENTS.md에 "Tone and style" 등 간결성 규칙 있으니 **없는 부분만 병합**. 통째 도입은 중복.
3. **caveman은 상황별 토글** — README/문서/description 작성 때는 off 필수(원시인말 산출물 나옴). 탐색·디버깅 세션만 `/caveman lite`. Full-time on은 비추.

**조합 권장**: `rtk` 영구 on + AGENTS.md 간결성 규칙 유지 + `caveman lite` 상황별 slash 토글.

## 각 도구 distinctive 포인트

### caveman
- **3-arm 평가**(`evals/`: baseline / terse / skill): "일반 간결성"과 skill 순효과를 통계적으로 분리. Honest delta = skill vs terse.
- **Auto-clarity 규칙**: 보안 경고·비가역 작업·다단계 시퀀스에선 자동으로 정상 모드 복귀.
- **CI 자동동기화**: `skills/caveman/SKILL.md` 단일 소스 → 40+ 에이전트(cursor/windsurf/cline/copilot…) 규칙 파일 자동 생성.
- **caveman-compress 서브스킬**: CLAUDE.md 같은 메모리 파일 자체를 caveman-speak으로 압축 (입력 토큰도 감소). 평균 46%.

### claude-token-efficient
- **극도로 단순**: 1파일, 0 설정.
- **프로필 체계**: `profiles/M-drona23-v8/`는 **1줄짜리**("A coding project. Read .claude/rules/ before starting"). 극소 오버헤드.
- **공개 벤치마크**: 3개 코딩 과제에서 v8 $0.935 vs C-structured $1.131 → 17.4% 저렴.
- **입력 토큰 비용**: 파일이 매 메시지 input에 붙음. 짧은 작업은 손해. 반복 파이프라인에서만 순이득.

### rtk
- **진짜 컴파일된 바이너리**: ~60KB, <10ms 시작 오버헤드.
- **70+ 명령어**: git, cargo, npm, pnpm, vitest, pytest, docker, aws 등.
- **다국어 README** (ko/ja/es/fr/zh): 실무 프로젝트 신호.
- **투명 통합**: PreToolUse 훅이 자동 재작성. 유저 워크플로우 변경 없음.
- **`rtk gain`**: SQLite로 절감량 추적. 실데이터로 ROI 검증 가능.
- **동반 도구 openclaw**: OpenClaw 플랫폼용 TypeScript 플러그인 (동일 바이너리 위임).

## 핵심 인사이트 요약

1. **"프롬프트 규칙"의 정체**: Claude에게 *말로* "짧게 답해"라고 지시하는 것. 확률적, 가끔 무시됨.
2. **caveman은 순수 스킬 아님**: SKILL.md는 데이터 소스, 실제 활성화는 **훅이 `additionalContext`로 주입**해서 이뤄짐. 훅 없는 환경에선 항상 활성 안 됨.
3. **claude-token-efficient는 기계 없음**: Claude Code가 CLAUDE.md를 매 턴 프롬프트에 자동 붙이는 **기본 동작**에 편승.
4. **rtk만 결정적**: 앞 둘은 Claude "선의"에 기댐. rtk는 바이트 단위 실제 컷. 충돌 없어 같이 써도 됨.
5. **입력 ≠ 출력 공격면**: 출력 토큰 줄이기(caveman, c-t-e)와 입력 토큰 줄이기(rtk)는 다른 문제. **비용 구조상 input이 지배적**이라 rtk ROI 일반적으로 더 큼.

## 관련 파일 경로 (이 레포 내)

- 레퍼런스: `references/caveman/`, `references/claude-token-efficient/`, `references/rtk/`
- 비교 대상 기존 연구: `docs/research/ai-context-tools-comparison.md` (컨텍스트 도구 비교)
- 레포 간결성 규칙: `AGENTS.md` "Coding Style" 및 CC 시스템 프롬프트 "Tone and style"
