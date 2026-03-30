# Handoff: harness-zero — 1층+2층 디자인 및 구현 검수

## Goal

harness-zero Phase 1 (1층 세팅 + 2층 훅)의 설계 문서와 구현 문서를 reference 프로젝트 딥리서치를 통해 검수하고 개선한다. organize 스킬은 이번 세션에서 10개 프로젝트 리서치 후 재설계 완료. 남은 건 init 스킬과 2층 훅의 설계/구현이 reference 프로젝트의 실제 구현 패턴을 충분히 반영하고 있는지 검수하는 것.

## First Action

2층 훅 토큰 추정(Task 2: lib.sh)의 실제 구현 패턴을 딥리서치한다:

```
@references/claude-code-organizer/ 의 scanner.mjs에서 ai-tokenizer 사용 패턴과 bytes/4 폴백 로직을 읽고,
현재 Phase 1 플랜의 lib.sh harness__estimate_tokens 구현과 비교하여 개선점을 도출한다.
```

## Context

이번 세션에서 한 핵심 작업: `/harness organize` 스킬이 "내 상황에만 맞는 파일 이동 도구"에서 "보편적 도메인 지식 온보딩 도구"로 재설계됐다. 10개 reference 프로젝트를 병렬 딥리서치해서 인사이트를 뽑고, 설계 문서(재설계 스펙) → 구현 문서(Phase 1 플랜) → SKILL.md → init 연결 → CLAUDE.md/plugin.json 순서로 전부 업데이트했다.

사용자의 마인드셋: "reference map v2에는 하네스 아키텍처 매핑만 있고, 워크플로우 관점의 리서치가 빠져있었다. organize는 이제 됐는데, init과 2층 훅도 같은 수준으로 딥리서치해야 한다."

핵심 교훈: 설계 문서 → 구현 문서 → SKILL.md 순서로 가야지, SKILL.md 먼저 고치고 문서는 "나중에"가 아니다.

## Current Progress

### 이번 세션 완료

- [x] organize 스킬 보편성 분석 — "파일 이동 도구" vs "도메인 지식 온보딩 도구" 구분
- [x] 10개 reference 프로젝트 병렬 딥리서치:
  - claude-code-organizer, OpenSpec, planning-with-files
  - get-shit-done, Backlog.md
  - superpowers, OpenViking
  - gstack, oh-my-claudecode
  - everything-claude-code
- [x] organize SKILL.md 재설계 (harness-zero 레포에 반영)
  - 동적 구조 감지, 라이프사이클 기반 분류, Knowledge Audit 모드, git mv, AGENTS.md 업데이트
- [x] 재설계 스펙 업데이트 — 1층에 organize 섹션 추가 (의도, 분류 체계, 10개 프로젝트 인사이트, init 관계)
- [x] Phase 1 플랜 업데이트 — Goal/Architecture, 파일 구조에 organize 추가, docs/specs/ 추가, Task 7.5 신설
- [x] init SKILL.md — Step 8에 `/harness organize` 안내 추가
- [x] harness-zero CLAUDE.md — "classifies docs" → "onboards domain knowledge"
- [x] harness-zero plugin.json — description 업데이트

### 이전 세션 완료 (참고)

- [x] GitHub repo (github.com/LeeJuOh/harness-zero) 생성, branches: main + develop
- [x] marketplace.json에 lab-harness-zero 등록 (GitHub source)
- [x] skills/init/SKILL.md + references/ 작성
- [x] skills/organize/SKILL.md 작성 (이번 세션에서 재설계)
- [x] CLAUDE.md 작성 (91줄)
- [x] 재설계 스펙 작성 + reference map v2 작성

### 미완료 — 딥리서치 필요

Phase 1 플랜의 다음 영역이 reference map에서 프로젝트를 매핑만 했지, 실제 코드를 읽어서 구현 패턴을 검증하지 않은 상태:

| 영역 | 플랜 태스크 | 딥리서치 대상 | 왜 필요한지 |
|------|-----------|-------------|------------|
| **토큰 추정** | Task 2 (lib.sh) | `@references/claude-code-organizer/` scanner.mjs | bytes/4 vs ai-tokenizer 정확도 차이, 실제 폴백 로직 |
| **컨텍스트 예산** | Task 3 (SessionStart) | `@references/claude-devtools/`, `@references/claude-code-organizer/` | 7~11개 카테고리 브레이크다운 실제 구현 |
| **훅 엄격도** | Task 3, 5 | `@references/everything-claude-code/` hooks/ | hook profiles (minimal/standard/strict) 실제 구현 |
| **레포 분석** | Task 6 (init) | `@references/aidlc-workflows/`, `@references/skill-doctor/` | 적응형 검사 깊이, 스킬 정적 분석 패턴 |
| **아키텍처 경계** | Phase 1.5 예정 | `@references/gitagent/` | RULES.md 하드 제약 구현 |
| **artifact 연결** | init→organize | `@references/oh-my-claudecode/` src/lib/mode-state-io.ts | "prior artifact 존재 시 phase skip" 구현 패턴 |

## What Worked

- **병렬 딥리서치**: 5개 에이전트를 동시에 돌려서 10개 프로젝트를 ~3분에 리서치. 순차적으로 했으면 20분+
- **"보편성 체크" 관점**: organize 스킬을 "내 상황에 맞는가"가 아닌 "아무 사용자가 써도 되는가"로 평가한 것이 재설계의 출발점
- **설계→구현→SKILL.md 순서 강제**: 사용자가 직접 잡아줌. SKILL.md부터 고치면 설계 문서와 구현 문서가 싱크 깨짐
- **하네스 엔지니어링 아닌 프로젝트에서도 워크플로우 패턴 추출**: reference map v2는 4층 아키텍처에만 매핑했지만, organize는 워크플로우 기능이라 get-shit-done, planning-with-files 같은 비-하네스 프로젝트에서 더 좋은 인사이트가 나옴

## What Didn't Work

- **SKILL.md 먼저 수정 → 문서는 "나중에"**: 사용자가 바로 잡아줌. 문서가 source of truth이고, SKILL.md는 문서를 구현한 것
- **reference project clone을 organize에 포함**: 문서 정리와 외부 레포 클론은 별개 관심사. 스킬 범위를 넘어서는 기능은 빼야 함
- **reference map v2만으로 충분하다는 가정**: 맵은 "이 프로젝트가 이 층에 기여한다"만 알려줌. 실제 구현 패턴을 검증하려면 코드를 읽어야 함

## Next Steps

First Action 이후 순서:

1. **2층 훅 딥리서치** (Task 2-5):
   - `@references/claude-code-organizer/` — 토큰 추정, 컨텍스트 예산 분석 실제 코드
   - `@references/everything-claude-code/` — hook profiles 실제 구현
   - `@references/claude-devtools/` — 7카테고리 토큰 브레이크다운
   - `@references/compound-engineering-plugin/` — CC 플러그인 훅 패턴

2. **init 레포 분석 딥리서치** (Task 6):
   - `@references/aidlc-workflows/` — 적응형 검사 깊이
   - `@references/skill-doctor/` — 스킬 정적 분석

3. **리서치 결과 반영**:
   - 재설계 스펙 2층 섹션 업데이트 (organize처럼 인사이트 추가)
   - Phase 1 플랜 Task 2-6 구현 세부사항 개선
   - 필요하면 SKILL.md 업데이트

4. **harness-zero 레포에서 dogfooding**:
   - `/harness init` 실행 → 실제 스캐폴딩 테스트
   - `/harness organize` 실행 → claude-code-zero에서 문서 가져오기 테스트

5. **Phase 1 나머지 태스크 구현** (Task 2-5, 8-10)
