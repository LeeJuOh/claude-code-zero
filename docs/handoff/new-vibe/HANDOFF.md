# Handoff: vibeproxy-kit setup-aliases 전면 개선

## Goal

vibeproxy-kit 플러그인의 `setup-aliases` 스킬을 전면 개선한다. alias 네이밍, cc-list UI, request_model 라우팅 규칙, Antigravity Gemini 프리셋 처리, UX 질문 횟수 등 8개 이슈를 수정한다.

## First Action

`/skill-creator-pro` 스킬을 호출하고, 이 핸드오프 문서를 컨텍스트로 제공한 뒤, 아래 "수정 대상 파일" 4개를 순서대로 읽고 수정을 시작한다. SKILL.md부터 시작 — Phase 5 Step 3의 `request_model` 규칙 수정이 가장 먼저.

## Context

이전 세션(ai-hub 프로젝트, 63분)에서 `/vibeproxy-kit:setup-aliases`를 처음 실행했다. 4개 백엔드(Codex, Copilot, Antigravity, Gemini)를 프로브하고 22개 canonical alias + 22개 shortcut을 설정했는데, 과정에서 다수의 문제가 드러났다. 유저가 결과물을 전부 롤백하고 클린 상태에서 다시 하겠다고 했다. 현재 `~/.cli-proxy-api/config.yaml`, `~/.zshrc` managed block, state file 모두 삭제된 상태.

이 세션에서 skill-creator-pro의 Phase 1 (Understand)을 완료하고, 8개 이슈를 도출했으며, cc-list UI 디자인을 유저와 3회 반복 확정했다. Phase 2 (Design) 수준의 합의가 끝난 상태이므로, 다음 세션에서는 코드 수정(구현)부터 시작하면 된다.

## Current Progress

- [x] 이전 세션 export 분석 (63분, 331 메시지)
- [x] 플러그인 코드 전수 탐색 (SKILL.md, write_zshrc.sh, effort-levels.md, discover.sh, README.md)
- [x] 8개 이슈 도출 및 원인 분석
- [x] cc-list UI 디자인 확정 (유저 3회 피드백 반영)
- [x] 숏컷 네이밍 컨벤션 확정
- [x] request_model 규칙 수정안 확정
- [x] Antigravity Gemini 프리셋 처리 방식 확정
- [ ] SKILL.md 수정
- [ ] write_zshrc.sh 수정 (cc-list UI)
- [ ] effort-levels.md 수정
- [ ] README.md 수정
- [ ] 버전 범프 (marketplace.json)
- [ ] `claude plugin validate .`

## Issues & Solutions

### Issue 1: request_model 이중성 — SKILL.md 내부 모순

**원인**: SKILL.md Phase 5 Step 3에서 effort-suffix 모델의 `request_model`을 "원본 suffixed form" (e.g., `gpt-5.4(medium)`)으로 설정하라고 지시. 그러나 `fork=false`(기본값)일 때 원본 모델명은 VibeProxy 레지스트리에서 alias명으로 **대체**됨. 같은 SKILL.md의 Gotchas 섹션에서는 "alias명으로 validation하라"고 적혀있어 서로 모순.

**세션에서 벌어진 일**: orchestrator가 Phase 5 규칙대로 `gpt-5.4(medium)`을 `request_model`로 설정 → write_zshrc.sh가 `ANTHROPIC_MODEL=gpt-5.4(medium)` 생성 → validation 전부 "unknown provider" 502 → 원인 파악 후 `ANTHROPIC_MODEL=cc-codex-gpt54-med(medium)` 으로 zshrc 전체 재작성

**수정할 곳**: SKILL.md Phase 5 Step 3의 `request_model` 필드 설명 + Phase 10 validation 설명 + Gotchas

**수정 내용**:
```
모든 모델(fork=false 기본값):
  request_model = alias명
  
effort-suffix 모델:
  shell alias에서 ANTHROPIC_MODEL = alias명(effort)
  예: cc-codex-gpt54-med(medium)
  
원본 모델명(gpt-5.4, claude-opus-4.6 등)은 절대 request_model로 사용하지 않음.
fork=false로 레지스트리에서 사라졌기 때문.
```

### Issue 2: Antigravity gemini-3.1-pro-high / -low 정체성 혼란

**원인**: Antigravity가 같은 Gemini 3.1 Pro 모델을 thinking 강도 프리셋으로 2개 노출. SKILL.md는 `-high`/`-low` 드롭하라면서, effort-levels.md는 별개 모델로 등재.

**세션에서 벌어진 일**: `cc-gravity-gemini31-pro-high-low` (high 모델의 low effort) 같은 이름 생성 → 유저: "미친놈아 이게 뭐냐 하이냐 로우냐" → 유저: "프로에 하이 모델이 어딧어 걍 3.1 프로모델이지"

**수정할 곳**: SKILL.md Phase 5 Step 1 + effort-levels.md

**수정 내용**:
- effort-levels.md에 `gemini-3.1-pro-high`와 `-low`가 **같은 모델의 thinking 강도 프리셋**임을 명시
- SKILL.md Phase 5 Step 1에서 Antigravity Gemini Pro를 통합 제시:
  - "Gemini 3.1 Pro" 하나의 모델로 보여주고, 프리셋(high/low) 서브선택
  - 하나만 선택: `cc-gravity-g31pro-{effort}` (프리셋 접미사 없음)
  - 둘 다 선택: `cc-gravity-g31pro-hi-{effort}` / `cc-gravity-g31pro-lo-{effort}`

### Issue 3: cc-list UI

**원인**: printf 기반 2컬럼 (Alias / ModelShortcut). 백엔드 구분 불명확. 어떤 모델이 어디로 라우팅되는지 모름.

**확정된 디자인** (유저 3회 피드백 반영):

```
── Codex ──────────────────────────────────────────────────────────────

  Alias                      │ Model                │ Shortcut
  ───────────────────────────┼──────────────────────┼──────────────────
  cc-codex-gpt54-med         │ gpt-5.4 (medium)     │ cc-cx-med
  cc-codex-gpt54-high        │ gpt-5.4 (high)       │ cc-cx-high
  cc-codex-gpt54-max         │ gpt-5.4 (xhigh)      │ cc-cx-max

── Copilot ────────────────────────────────────────────────────────────

  Alias                      │ Model                │ Shortcut
  ───────────────────────────┼──────────────────────┼──────────────────
  cc-copilot-opus46-low      │ opus-4.6 (low)       │ cc-cp-opus-low
  ...

── Antigravity ────────────────────────────────────────────────────────

  Alias                      │ Model                │ Shortcut
  ───────────────────────────┼──────────────────────┼──────────────────
  cc-gravity-opus46          │ opus-4-6-thinking    │ cc-ag-opus
  cc-gravity-g31pro-low      │ gemini-3.1-pro (low) │ cc-ag-gemini-pro-low
```

UI 규칙:
- 3컬럼: Alias │ Model │ Shortcut
- 유니코드 box-drawing 문자 (`│`, `─`, `┼`)
- 헤더: bold, **각 섹션 안에 반복**
- 백엔드 구분선: `── Backend ────` (bold) + 전후 빈 줄
- Shortcut 컬럼: cyan (`\033[36m`), 다크모드 호환
- 숏컷 없는 alias는 Shortcut 열 비움
- 컬럼 너비: 동적 계산

### Issue 4: 숏컷 네이밍 컨벤션 미정의

**원인**: SKILL.md Step 4에서 매번 유저에게 물어봄. 규칙 없음. "숙켓" 오타까지 남.

**확정된 컨벤션**:
```
cc-{2char-backend}-{model}-{effort}

backend: cx(codex), cp(copilot), ag(antigravity), gm(gemini), qw(qwen), za(zai)
model: 버전 제외 최신 모델명 — opus, sonnet, gpt, gemini-pro (g31pro 아님!)
effort: low, med, high, max
```

예시:
| 숏컷 | Canonical | 설명 |
|------|-----------|------|
| cc-cx-med | cc-codex-gpt54-med | Codex gpt-5.4 medium |
| cc-cp-opus-high | cc-copilot-opus46-high | Copilot opus 4.6 high |
| cc-cp-sonnet-low | cc-copilot-sonnet46-low | Copilot sonnet 4.6 low |
| cc-cp-gpt-max | cc-copilot-gpt54-max | Copilot gpt-5.4 xhigh |
| cc-ag-opus | cc-gravity-opus46 | Antigravity opus (budget-based, no effort) |
| cc-ag-gemini-pro-low | cc-gravity-g31pro-low | Antigravity Gemini 3.1 Pro low |
| cc-gm-low | cc-gemini-g31pro-low | Gemini 3.1 Pro preview low |

**중요**: 숏컷은 자동 생성. AskUserQuestion으로 물어보지 않음.

### Issue 5: AskUserQuestion 폭탄 (15+회)

**원인**: 모델 선택, effort 선택, 숏컷 선택이 각각 별도 질문.

**수정**: 
- 숏컷 선택 질문 제거 (자동 생성)
- 모델+effort를 한 질문에 통합 가능하면 통합
- 기존 ~15회 → ~8회 (모드 1 + 백엔드 1 + 프로브 4 + Antigravity 프리셋 1 + 최종확인 1)

### Issue 6: 프로브 사이클 중 메뉴바 토글 vs 재시작

**원인**: SKILL.md는 "메뉴바에서 토글하라"고 지시하지만, 실제로는 메뉴바 토글만으로 런타임 레지스트리가 갱신되지 않음. VibeProxy 완전 종료 후 재시작 필요.

**세션에서 벌어진 일**: Codex 프로브 시 Codex만 켰는데 Copilot 모델(`owned_by=github-copilot`)이 섞여 나옴 → verify_probe.py reject → 재시작하니 통과

**수정할 곳**: SKILL.md Phase 4 Step 2의 toggle prompt

**수정 내용**: "메뉴바에서 토글" → "Quit VibeProxy → 해당 백엔드만 활성화 → 재실행"

### Issue 7: discover.sh의 CLAUDE_PLUGIN_DATA 경로 오염

**원인**: discover.sh line 16의 `STATE_DIR="${CLAUDE_PLUGIN_DATA:-...}"` — 다른 플러그인 컨텍스트에서 실행되면 그 플러그인의 data path가 들어옴.

**증거**: 세션 export에서 `state_file_path: "~/.claude/plugins/data/codex-openai-codex/config.json"` — codex 플러그인의 경로가 나옴.

**수정할 곳**: `scripts/discover.sh` line 16

**수정 내용**: `CLAUDE_PLUGIN_DATA` 환경변수 대신 고정 fallback 경로 사용하거나, 플러그인명으로 필터링

### Issue 8: ruamel.yaml 의존성 설치 실패

**원인**: write_user_config.py가 ruamel.yaml 필요. Homebrew Python의 `externally-managed-environment` 정책으로 자동 설치 실패.

**세션에서 벌어진 일**: subprocess.check_call로 `pip install --user ruamel.yaml` 시도 → 실패 → 수동으로 `--break-system-packages` 플래그 추가하여 설치

**수정 옵션**:
- A: write_user_config.py의 fallback pip 명령에 `--break-system-packages` 추가
- B: PyYAML fallback 강화 (round-trip 포기, 호환성 확보)
- C: SKILL.md에 ruamel.yaml 설치 Gate 추가 (Phase 1에서 체크)

## What Worked

- 프로브 사이클 자체는 정확함 — 백엔드 격리 후 verify_probe.py의 Layer 1/2 검증이 잘 작동
- config.yaml 작성 (write_user_config.py)은 정확 — 22개 alias 올바르게 등록
- zshrc managed block 패턴 안정적 — 백업/복원/마커 구분 모두 정상
- 롤백이 깔끔 — config.yaml 삭제 + zshrc 백업 복원 + state 삭제로 완전 원상복구

## What Didn't Work

- request_model에 원본 모델명 사용 → validation 전부 502 실패, zshrc 전체 재작성 필요
- 메뉴바 토글만으로 프로브 → verify_probe reject, 재시작 필요
- Antigravity Gemini alias 이름 → 유저가 3번 reject, 결국 "미친놈아" 피드백
- 숏컷 이름 제안 → 유저가 "숙켓이 뭐냐", "안티그래비티는?", "제미나이는?", "g31pro가 버전 아니냐" 등 4번 reject
- cc-list UI → "개구려" 한 단어 피드백

## Next Steps

수정 대상 파일 (우선순위 순):

1. **SKILL.md** — 가장 많은 변경
   - Phase 4 Step 2: toggle prompt → 재시작 지시로 변경
   - Phase 5 Step 1: Antigravity Gemini 프리셋 통합 제시
   - Phase 5 Step 3: request_model 규칙 전면 수정
   - Phase 5 Step 4: 숏컷 컨벤션 고정 + 자동 생성
   - Phase 10: validation request_model 일관성
   - Gotchas: 모순 제거

2. **write_zshrc.sh** — cc-list UI 리디자인
   - `build_block()` 함수의 cc-list 생성 로직 재작성
   - 3컬럼 유니코드 테이블 + 섹션별 헤더 + cyan 숏컷
   - canonical_aliases에 label 필드 구조 변경 필요 (backend/model 정보 포함)

3. **effort-levels.md** — Antigravity 프리셋 설명 추가
   - `gemini-3.1-pro-high`/`-low`가 같은 모델의 thinking 프리셋임을 명시

4. **discover.sh** — CLAUDE_PLUGIN_DATA 경로 오염 수정 (line 16)

5. **README.md** — 숏컷 컨벤션, cc-list 예시 업데이트

6. **marketplace.json** — minor 버전 범프

7. `claude plugin validate .` 실행

## Reference: Session Export Metrics

| Property | Value |
|----------|-------|
| Session | `a93f931c-258e-49d8-9744-3a4c550bac6f` |
| Project | `/Users/kevin/Desktop/project2/ai/ai-hub` |
| Duration | 63m |
| Messages | 331 |
| Total Tokens | 8,482,436 |
