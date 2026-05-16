# Handoff: claude-preset

## Goal

`claude-preset` — Claude Code 세션별 프리셋 전환 도구 구현. 플러그인/스킬/MCP/에이전트 조합을 이름 붙여 저장하고, 세션 시작 시 적용해서 컨텍스트 오염 최소화.

## First Action

`/grill-with-docs`로 도메인 용어 정리 + ADR 작성 시작. CONTEXT.md 생성하고 핵심 결정 3개 ADR로 기록. 그 다음 `/to-prd`.

## Context

grill-me 세션에서 설계를 완전히 확정한 상태. 초반에 settings.json 수정, 파일 이동, 플러그인화, Docker 등 여러 접근을 탐색하다 최종적으로 `--settings` + `--disallowedTools` CLI 플래그 조합이 정답임을 발견. 이게 원본 settings.json 안 건드리면서 세션별 격리 + 병렬 가능한 유일한 방법.

현재 워크플로우: `grill-me ✅ → grill-with-docs 🔄 → to-prd → to-issues → 구현`

## Current Progress

### 확정된 설계

| 항목 | 결정 |
|---|---|
| 제품명 | `claude-preset` |
| 핵심 메커니즘 | `claude --settings preset.json --disallowedTools "Skill(X)"` |
| 제품 형태 | npm CLI (대화형 체크박스 UI) + Claude Code plugin 래퍼 |
| 프리셋 저장 | `~/.claude/presets/*.json` (블랙리스트 방식) |
| 원본 보존 | `~/.claude/settings.json` 수정 없음 |
| 세션 격리 | CLI 플래그 = 세션 스코프, 병렬 안전 |
| UI | inquirer.js 스타일 대화형 체크박스 (체크/언체크로 끌 것 선택) |
| 배포 | npm package + claude-code-zero 마켓플레이스 |

### 프리셋 파일 스키마

```json
{
  "name": "coding",
  "description": "코딩 집중 모드",
  "settings": {
    "enabledPlugins": {
      "vision-powers@claude-code-zero": false,
      "notebooklm-connector@claude-code-zero": false,
      "claw-mo@claude-code-zero": false
    },
    "disabledMcpjsonServers": ["claude-in-chrome"]
  },
  "disallowedTools": [
    "Skill(to-prd)",
    "Skill(doc-visual *)",
    "Skill(duck *)"
  ]
}
```

### CLI 명령어

```bash
claude-preset create           # 대화형 프리셋 생성
claude-preset list             # 프리셋 목록
claude-preset apply <name>     # 프리셋 적용 (= claude 실행)
claude-preset show <name>      # 프리셋 내용 보기
claude-preset edit <name>      # 프리셋 편집
```

### 플러그인 구조

```
plugins/claude-preset/
├── .claude-plugin/plugin.json
├── bin/claude-preset              # 핵심 로직 (Node.js)
└── skills/preset/SKILL.md         # bin 래퍼 (disable-model-invocation: true)
```

### 프리셋으로 제어 가능한 것

| 대상 | --settings로 | --disallowedTools로 |
|---|---|---|
| 플러그인 on/off | `enabledPlugins` | — |
| MCP 서버 off | `disabledMcpjsonServers` | `mcp__server__*` |
| 스킬 제거 | — | `Skill(name)` |
| 에이전트 제거 | — | `Agent(name)` |
| 모델 변경 | `model` | — |
| effort 변경 | `effortLevel` | — |

## What Worked

- 공식 문서 CLI 레퍼런스에서 `--settings`, `--disallowedTools` 발견 → 깔끔한 해결
- `--disallowedTools`는 permission deny와 다르게 컨텍스트에서 **완전 제거** (description도)
- 블랙리스트 모델 (끌 것만 명시) → 새 플러그인 설치해도 프리셋 업데이트 불필요

## What Didn't Work

- settings.json 직접 수정 접근 → 원본 손상 위험 + 병렬 불가
- 파일 이동 (skills/ ↔ skills-disabled/) → live reload로 모든 세션 영향
- 플러그인화 (user skills → mini plugins) → 과잉 복잡도
- Docker/devcontainer 격리 → 인증 문제 + 사용자 복잡도 과잉
- 샌드박싱 → Bash 프로세스 전용, 스킬 로딩과 무관
- `CLAUDE_CONFIG_DIR` → 문서에 존재 안 함 (devcontainer 문맥에서만 언급)
- 처음에 "CLI 플래그 없다"고 단정 → CLI reference 제대로 안 읽은 실수

## Next Steps

1. `/grill-with-docs` 완료 — CONTEXT.md + ADR 작성
   - ADR 후보: (1) --settings 방식 선택 이유, (2) 블랙리스트 vs 화이트리스트, (3) npm CLI + plugin 듀얼 형태
2. `/to-prd` — PRD 작성
3. `/to-issues` — 구현 이슈 분리
4. 구현
   - `--settings` object merge 동작 테스트 (replace vs merge)
   - Node.js CLI scaffolding (inquirer.js)
   - preset create/apply/list/show/edit 명령어
   - plugin wrapper (bin/ + SKILL.md)
   - README

## Design Decisions

### 블랙리스트 모델 선택 이유

화이트리스트 (켤 것 명시) vs 블랙리스트 (끌 것 명시):
- 화이트리스트: 새 플러그인 설치 시 모든 프리셋 파일 업데이트 필요 → 유지보수 지옥
- 블랙리스트: 기본 = 전부 켜짐, 프리셋은 빼기만 → 새 플러그인 자동 포함

### Scope 제약

```
Settings precedence: Managed (최고) > CLI args > Local > Project > User (최저)
```

- `--settings` = CLI args 레벨 (2위) → user settings보다 이김
- project scope에서 강제된 플러그인은 override 가능 (CLI > Project)
- managed scope 정책은 override 불가 (CLI < Managed)
- 실질적으로: user scope 플러그인은 전부 제어 가능, 팀이 project에 강제한 건 대부분 가능, managed 정책만 못 이김

### Settings merge 동작 (미확인)

- 배열 (permissions.deny 등): 문서 확인 — merge (concat + dedup)
- Object (enabledPlugins): 문서 미기재 — 키별 merge 추정, 테스트 필요
- 테스트 방법: `claude --settings '{"enabledPlugins":{"X":false}}' -p "what plugins are active?"` 실행 후 확인

## Usage Examples

```bash
# alias 설정 (~/.zshrc)
alias cc-coding='claude-preset apply coding'
alias cc-writing='claude-preset apply writing'
alias cc='claude'  # 기본 (전부 켜짐)

# 사용
cc-coding          # 코딩 프리셋으로 세션 시작
cc-writing         # 동시에 다른 터미널에서 문서 프리셋 가능 (병렬 안전)

# 내부 동작
claude-preset apply coding
# → claude --settings ~/.claude/presets/coding.settings.json --disallowedTools "Skill(to-prd)" "Skill(duck *)" ...
```

## Key References

- Claude Code CLI reference: `--settings`, `--disallowedTools`, `--setting-sources`, `--disable-slash-commands` flags
- Claude Code settings precedence: Managed > CLI > Local > Project > User
- Array settings merge across scopes (concat + dedup), object merge undocumented
- `claude plugin list --json` — 설치된 플러그인 자동 스캔 가능
- `--disallowedTools` docs: "Tools that are removed from the model's context and cannot be used"
- 참고 프로젝트: `references/claude-code-organizer/` (CCO — npx CLI + 웹 대시보드 + /cco skill), `references/oh-my-claudecode/` (OMC — npm CLI + plugin 듀얼)
- Matt Pocock workflow: `grill-me → domain-model/grill-with-docs → to-prd → to-issues → tdd`
- Skill docs: description cap 1,536 chars, total budget 1% of context window (fallback 8,000 chars)
