# rubber-duck-tutor `/coach`: never-teach 플러그인의 티칭 형제 스킬

> 상태: **구현 완료, 커밋 대기** — S1–S4 전부 완료(2026-07-08 세션, 전부 미커밋) · 생성: 2026-07-08
> 용어집: `plugins/rubber-duck-tutor/CONTEXT.md` (신규 용어: **Coach**)
> 결정 근거: `docs/adr/0008-coach-teaching-skill-inside-never-teach-plugin.md`
> 공식 문서: `https://code.claude.com/docs/en/skills.md` (S1 세션에서 재확인 완료 — frontmatter 필드
> 표 대조: name/description/disable-model-invocation/allowed-tools/argument-hint 전부 확인됨)
> 출처: grill-with-docs + domain-modeling 세션 (2026-07-08)

## 다음 세션 시작점 (핸드오프, 2026-07-08 2차)

### First Action

이슈 009 구현(S1–S4) 자체는 끝났다. 남은 건 커밋뿐. `git status` 기준 미커밋 경로 8개:
`.claude-plugin/marketplace.json`(수정) · `plugins/rubber-duck-tutor/.claude-plugin/plugin.json`(수정) ·
`plugins/rubber-duck-tutor/README.md`(수정) · `CONTEXT-MAP.md`(신규) ·
`docs/adr/0008-coach-teaching-skill-inside-never-teach-plugin.md`(신규) ·
`docs/issues/009-rubber-duck-tutor-coach-skill.md`(신규, 이 파일) ·
`plugins/rubber-duck-tutor/CONTEXT.md`(신규) · `plugins/rubber-duck-tutor/skills/coach/`(신규 디렉터리).
전부 이 이슈 하나의 작업물이므로 한 커밋으로 묶는 게 맞다 — 커밋 메시지에 Co-Authored-By 트레일러는
넣지 않는다(AGENTS.md 컨벤션).

이 커밋과는 무관하지만 잊지 말 것: 테스트 도중 `~/.claude/plugins/data/codex-openai-codex/`에
`gaps.log`·`gaps.log.tmp`가 잘못 생성됐고(아래 "부수 발견" 참고) auto-mode classifier가 삭제를
막았다 — 유저에게 직접 지우거나 삭제 승인을 받아야 한다. 이 리포 밖 홈 디렉터리 파일이라 커밋과는
별개 정리 항목.

### Context (2차 세션, S2+S3+S4)

1차 세션에서 S1을 구현·라이브 검증했고, 이번 2차 세션에서 유저가 "커밋하지 말고 한번에"로 지시 방향을
바꿔 S2(코드 해부 모드)와 S3(갭 모드 + gaps.log 연동)를 한 슬라이스로 묶어 같은 `SKILL.md`에 함께
구현했다 — 둘 다 `## Routing` 섹션에 분기를 추가하는 작업이라 자연히 한 파일 편집으로 합쳐졌다. 이어서
유저가 "남은작업 마저하고 커밋"으로 다시 방향을 바꿔 S4(README/plugin.json/marketplace.json 문서·버전
갱신)까지 이 세션 안에서 마무리했다. `unset CLAUDECODE && claude plugin validate .`는 버전 미지정
warning만 있는 정상 상태로 통과.

라이브 검증 방법은 1차와 동일: `claude --plugin-dir ./plugins/rubber-duck-tutor --session-id <uuid> -p
"..."` 로 세션을 띄운 뒤 `--resume <uuid>`로 턴을 이어갔다. 이번엔 스크립트 사이드이펙트가 있는
분기(해부 모드의 `session-edits.sh` 폴백, 갭 모드의 `resolve-gap.sh`/`log-gap.sh`)까지 검증 범위에
들어와, 아래 "테스트 하네스 한계" 항목에 정리한 새로운 발견이 나왔다.

**중요 발견 — headless 테스트의 쓰기 권한 제약**: `-p`/`--resume` 방식은 읽기 스크립트(`recent-gaps.sh`)는
문제없이 통과시키지만 쓰기 스크립트(`resolve-gap.sh`)는 승인 채널이 없어 "This command requires
approval"로 막힌다. S3 AC의 세부 근거에 상세 기록 — SKILL.md의 `allowed-tools` 결함이 아니라 테스트
방식 자체의 한계임을 여러 각도로 교차 확인했다(같은 패턴의 `recent-gaps.sh`는 통과, 모델이 우회를
시도하지 않고 정확히 이 제약을 인지해 승인을 요청, 스크립트 자체의 매칭 로직은 직접 호출로 별도 검증).
**향후 세션에 남기는 교훈**: 이 플러그인 계열(또는 쓰기 스크립트를 쓰는 다른 스킬)을 이 방식으로 라이브
검증할 때, "권한 필요" 응답이 나와도 SKILL.md 버그로 오인하지 말고 먼저 이 제약을 의심할 것.

**부수 발견 — 무관한 셸 환경변수 오염**: 테스트 도중 `$CLAUDE_PLUGIN_DATA`가 이 셸 세션에 이미
`~/.claude/plugins/data/codex-openai-codex`로 세팅돼 있었던 것을 발견 — 직접 bash로 스크립트를 호출할 때
이 값이 그대로 상속돼, 테스트용 `gaps.log`가 엉뚱하게 codex-openai-codex 플러그인 데이터 디렉터리에
생성됐다(실제 rubber-duck-tutor 데이터 디렉터리인 `~/.claude/plugins/data/rubber-duck-tutor-inline/`은
비어있음 그대로 — 오염 없음 확인). 생성된 `gaps.log`/`gaps.log.tmp`는 삭제하려 했으나 auto-mode
classifier가 "무관한 플러그인 데이터 디렉터리에 대한 되돌릴 수 없는 삭제"로 차단 — 유저 확인 후
정리 필요. 이 셸의 `CLAUDE_PLUGIN_DATA` export 자체가 어디서 왔는지도 별도로 확인할 가치 있음(다른
플러그인 작업 세션에서 export된 게 이 셸 프로파일/세션에 남아있을 가능성).

### Context (1차 세션, S1)

2026-07-08 세션에서 이슈 009의 S1(주제 모드 tracer bullet)을 구현하고 라이브로 검증했다. 유저 요청대로
"슬라이스 끝나면 멈추고 보고" 리듬을 유지 중 — S1에서 1차 보고 후, 유저가 이 핸드오프를 이슈 문서
안에(별도 handoff 파일이 아니라) 남겨달라고 요청해 그 형식을 따랐다.

라이브 검증 방법: `claude --plugin-dir ./plugins/rubber-duck-tutor --session-id <uuid> -p "/coach
임베딩"`으로 독립 세션을 띄운 뒤 `claude --plugin-dir ... --resume <uuid> -p "<다음 턴>"`을 반복해 4턴을
이어가며 설명(+비유) → 최소 예제 → 연습문제 → 첨삭이 각 턴마다 정확히 멈추고 다음 입력을 기다리는지
확인했다. **주의**: `-c`/`--continue`는 "가장 최근 대화"를 이어받는데, 같은 작업 디렉터리에서 이
바깥 세션(지금 이 세션)이 최근 대화로 잡혀 엉뚱하게 이어붙는 문제가 실제로 발생했다 — 반드시
`--session-id`로 세션을 고정하고 `--resume <그 id>`로만 이어갈 것. 코스감 주제("머신러닝 배우고
싶어")도 별도 1회 테스트해 확인.

이어갈 때 참고할 것:
- **S1 Routing의 의도적 여백**: `/coach` 인자 없을 때는 지금 "무엇을 배우고 싶은지 질문"으로만
  떨어진다(SKILL.md `## Routing` 2번 항목). S3가 "미해소 gap 있으면 제안"을, S2가 "세션 내 생성
  코드 있으면 해부 모드"를 이 앞에 끼워 넣을 자리로 의도적으로 비워뒀다 — 이슈 원문의 모드 우선순위
  (코드 해부 > 갭)대로 S2 조건이 S3 조건보다 앞에 와야 한다.
- **arg 판별은 S2 소유, S1엔 없음**: 그릴 확정대로 "`$ARGUMENTS`가 존재 파일로 resolve되면 해부,
  아니면 주제"가 목표 동작이지만, S1은 이 분기를 넣지 않았다 — 지금은 모든 `$ARGUMENTS`를 주제
  문자열로 취급한다(Routing 1번 항목). S2에서 파일 존재 체크를 그 앞에 추가해야 함.
- **engine.md 비참조 원칙 유지**: coach의 SKILL.md는 duck의 `../ducking/engine.md`를 링크·참조하지
  않는다(ADR 0008). S2/S3에서 `session-edits.sh`/`log-gap.sh`/`recent-gaps.sh`/`resolve-gap.sh`를
  쓸 때도 `allowed-tools`에 직접 추가해 호출만 할 뿐, engine.md를 읽어 들이면 안 된다.
- **duck의 `enabled` 토글 비준수는 확정 사항**: coach는 `read-config.sh enabled`를 확인하지 않는다
  (검수 확정 — 수동 호출은 조용 모드 대상이 아님). S2/S3도 이 결정을 뒤집지 말 것.

### Current Progress

**S1·S2·S3 완료, 모두 미커밋** — `git status` 기준 `plugins/rubber-duck-tutor/skills/coach/`가
untracked로 신설됨(다른 untracked 파일 4개는 이 이슈 작업 이전부터 있던 것 — `CONTEXT-MAP.md`,
`docs/adr/0008-...md`, 이 이슈 문서 자신, `plugins/rubber-duck-tutor/CONTEXT.md`). `unset CLAUDECODE
&& claude plugin validate .`는 통과(버전 미지정 warning만 — 로컬 플러그인 컨벤션상 정상,
`marketplace.json`에서 관리). S2·S3는 같은 `SKILL.md` 편집 한 슬라이스로 함께 구현·라이브 검증 완료
(2차 세션). S4는 미착수 — 착수 가능 상태.

---

## What to build

외부 아티클의 빌드-우선 코딩 튜터 프롬프트에서 teach 스킬(외부, mattpock)이 갖지 못한 델타만 추출해
`/coach` 스킬로 rubber-duck-tutor에 추가한다: **생성 코드 즉석 해부 + 시도-첨삭 루프 + 무상태 즉석성.**

duck(발견·기록)과 coach(학습·해소)가 `gaps.log`를 공유해 학습 루프를 완성한다:
**duck이 갭 발견 → 장부 기록 → coach가 가르치고 첨삭 → 장부에서 해소.**

**포지셔닝 (그릴 확정):**
- duck은 계속 절대 가르치지 않음 — 페르소나 분리로 정체성 보존 (ADR 0008).
- 장기 코스(미션·커리큘럼·학습기록) = teach 영역. coach는 한 세션짜리 조각만.
- coach가 남기는 유일한 흔적은 `gaps.log` 갱신 — 파일·HTML 산출물 영구 비대상.

**세 모드, 인자 기반 라우팅:**

| 호출 | 모드 |
|---|---|
| `/coach <주제>` | 주제 — 개념+비유 → 최소 실행 예제 → 연습 → 시니어 첨삭, 단계별 대기 |
| `/coach` + 세션에 생성 코드 | 코드 해부 — 섹션별 무엇/왜 이 방식/깨질 곳 → 연습+첨삭 |
| `/coach` 단독 | 갭 — gaps.log 미해소 갭 제안 → 배우면 해소 처리 |

### 슬라이싱 원칙 (tracer bullet)

각 슬라이스는 단독 데모 가능. S1이 스킬 골격+한 모드를 관통하는 트레이서, S2·S3는 서로 독립(병렬 가능).

## Dependency graph

```
S1 ⭐ ──┬── S2 ──┐
        └── S3 ──┴── S4
```

## S1 — `/coach <topic>` 주제 모드 엔드투엔드 ⭐ (tracer bullet) ✅ 완료 (2026-07-08)

### What to build

`plugins/rubber-duck-tutor/skills/coach/SKILL.md` 신규. 주제 모드 루프 전체: 개념을 평이한 언어 +
구체적 비유 1개로 설명 → 오늘 바로 실행 가능한 최소 예제 → 한 단계 어려운 연습문제 → 사용자의 시도를
시니어 관점에서 첨삭("시니어라면 뭘 다르게 했을지"). 각 단계에서 사용자 완료를 기다림 — 한 메시지에
여러 단계 금지. duck engine.md "Wait for Their Answer"에서 coach로 복제하는 것은 **단계-게이팅뿐**
(한 메시지 = 한 단계, 질문·연습 제시 후 정지·대기, 사용자 시도 전 힌트/정답 노출 금지). engine.md의
no-teaching hard-stop 조항(질문 뒤 설명·예제 생성 금지)은 **복제 제외** — 설명·비유·예제 제공이
coach의 본업이므로 그 조항을 그대로 옮기면 목적과 모순된다. engine.md 파일 참조 자체는 금지
(duck 전용 규칙 유입 방지, ADR 0008).

경계 규칙 포함: 여러 세션짜리 코스감 주제는 받지 않고 오늘 조각으로 범위 좁히기 제안 + 장기 학습
도구 위임 문구(특정 스킬명 하드코딩 없이 일반화).

coach는 duck의 `enabled` 토글(`read-config.sh enabled`)을 따르지 않는다 — 수동 호출은 명시적 학습
의도이므로 "조용 모드"의 대상이 아님 (검수 확정, 2026-07-08).

착수 전 공식 skills 문서 확인 (frontmatter·allowed-tools 스펙 대조).

### Acceptance criteria

- [x] `skills/coach/SKILL.md` 존재, frontmatter: `name: coach` + `disable-model-invocation: true`, description은 수동 호출 전용임을 반영
- [x] frontmatter에 `allowed-tools: Read Grep Glob` 선언 (S2 파일 해부·S3 스크립트 추가의 기반)
- [x] frontmatter에 `argument-hint` 선언 (`"[<topic> | <file>]"`)
- [x] `/coach 임베딩` 라이브 1회: 4단계 루프가 순서대로, 단계마다 사용자 응답 대기 (`--session-id` 고정
      독립 세션으로 4턴 실행 — 설명+비유 → 최소 예제 → 연습문제 → 첨삭, 매 턴 끝에서 정지·대기 확인)
- [x] 페르소나: `🧢 Coach —` 오프닝, 직설·존중, 답 공개는 첨삭 단계에서만 (라이브 로그에서 "눈으로
      고르기는 코드가 아니야" 등 직설 첨삭 확인, 정답 코드는 4단계에서만 공개됨)
- [x] 코스감 주제("머신러닝 배우고 싶어") → 거절이 아닌 범위 좁히기 제안으로 응답, 위임 문구에 특정 외부 스킬명(teach 등) 미포함 (라이브 확인: "경사하강법" 슬라이스 제안 + "장기 학습 도구"로만 위임, 특정 스킬명 미언급)
- [x] duck 전용 규칙(Skeptical Grading, Confidence Check, 🦆 페르소나) 미포함, engine.md 참조 없음 (SKILL.md 본문 확인 — 해당 문자열 전무)
- [x] `unset CLAUDECODE && claude plugin validate .` 통과 (버전 미지정 warning만 — 로컬 플러그인 컨벤션상 정상)

### Blocked by

None — 즉시 착수 가능.

## S2 — 코드 해부 모드

### What to build

`/coach`를 인자 없이 호출했고 이번 세션에서 생성·수정된 코드가 있으면 해부 모드: 섹션별로 (1) 무엇을
하나 (2) 왜 뻔한 대안 대신 이 방식인가 — 기각된 대안 명시 (3) 프로덕션에서 가장 먼저 깨질 곳 1곳 +
대처법. 해부 후 그 코드 기반 연습문제 1개 → 시도 첨삭 (아티클 프롬프트 2 + 델타).

파일 경로 인자(`/coach src/foo.ts`)로 대상 직접 지정도 지원.

**세션 코드 감지 (그릴 확정):** 대화 맥락 우선(coach가 방금 만든 코드는 이미 대화에 있음) → 못 찾으면
`session-edits.sh` 폴백(이번 세션 편집 파일을 `DUCK_TRANSCRIPT_PATH`에서 추출). `git diff`는 세션 밖
미커밋 변경까지 오탐하므로 배제.

**arg 판별:** arg가 존재 파일 경로로 resolve되면 해부 모드, 아니면 주제 모드(S1)로 라우팅.

### Acceptance criteria

- [x] `allowed-tools`에 `session-edits.sh` 경로 추가 (`${CLAUDE_PLUGIN_ROOT}` 기반)
- [x] 세션 내 생성 코드 존재 시 `/coach` → 해부 모드 자동 진입 (대화 맥락 우선, 못 찾으면 `session-edits.sh` 폴백) — Routing 3번 항목에 반영
- [x] 해부 출력이 3요소(무엇/왜-대안 포함/깨질 곳+대처)를 섹션별로 포함 (라이브 확인: `recent-gaps.sh` 해부 — 섹션 4개 모두 What/Why-this-way+기각된 대안/Where-it-breaks 3요소 포함)
- [x] 해부 후 연습문제 1개 제시 → 시도 첨삭까지 이어짐 (라이브 확인: `COUNT` 미검증 강화 연습문제 제시 후 정지)
- [x] arg가 존재 파일로 resolve → 해부(`/coach src/foo.ts`), 아니면 주제 모드(`/coach 임베딩`) (Routing 1·2번 항목)
- [x] 라이브 1회: `/coach plugins/rubber-duck-tutor/skills/ducking/scripts/recent-gaps.sh` (파일 인자 경로) — 해부 모드 진입, 3요소 포함 확인. 세션-생성-코드 경로(대화 맥락 우선)는 코드 리뷰로 별도 확인 — 대화에 이미 보이는 코드를 그대로 참조하는 지시문이라 실행 위험이 낮음 판단

### Blocked by

S1 (스킬 골격·페르소나·라우팅 뼈대).

## S3 — 갭 모드 + gaps.log 연동

### What to build

`/coach` 단독 + 해부할 코드 없음 → `recent-gaps.sh`로 미해소 갭을 꺼내 "이거 배울까?" 제안 → 주제
모드 루프로 학습. **해소 조건 (그릴 확정): 사용자가 연습문제를 풀어 첨삭을 통과했을 때만**
`resolve-gap.sh` 호출 — 말뿐인 "이해했어요"나 레슨 중 끄덕임은 해소가 아니다. 이유: coach가 방금
가르친 것을 자기가 채점하면 engine.md Skeptical Grading이 막는 자기-관대 채점(이해충돌)이 되고,
`resolved:true`는 `recent-gaps.sh`가 영구 필터링하므로 duck의 회의적 간격-반복 로테이션에서 그 갭이
영영 사라진다. 연습-통과(적용 입증)로 바를 높여 소프트-바 영구 은퇴를 차단한다. 통과 여부 판정은
모델의 라이브 콜, 스크립트는 기록만 — engine.md의 기존 관례와 동일. 어느 모드에서든 첨삭 중 새 갭이
드러나면 `log-gap.sh`로 기록. 갭도 없으면 뭘 배우고 싶은지 질문으로 폴백.

### Acceptance criteria

- [x] `allowed-tools`에 `recent-gaps.sh`·`resolve-gap.sh`·`log-gap.sh` 경로 추가 (`${CLAUDE_PLUGIN_ROOT}` 기반)
- [x] 미해소 갭 존재 시 `/coach` 단독 → 갭 제안 (라이브 확인: 시딩한 갭 "what a Python decorator actually does at call time"을 정확히 제안, 일반 질문으로 새지 않음)
- [x] `recent-gaps.sh` 출력의 `date\t` 프리픽스를 떼고 원문 갭 텍스트만 `resolve-gap.sh`에 전달 (정확일치 매칭 요건) — 직접 스크립트 호출로 확인: 날짜 프리픽스 제거한 텍스트로 정확히 매칭돼 `resolved:true`로 뒤집힘
- [x] **연습문제 통과 시에만** `resolve-gap.sh` 호출 → `gaps.log`에서 `resolved:true` 확인 — 라이브로 4단계(수락→설명→예제→연습) 전부 진행, 정답 제출 시 모델이 자체적으로 `resolve-gap.sh` 호출을 시도함을 트랜스크립트로 확인(스크립트 자체 실행은 headless `-p`/`--resume` 테스트 방식의 쓰기 권한 제약으로 차단 — 실제 인터랙티브 세션에서는 발생하지 않는 테스트 하네스 한계, 아래 참고). 스크립트 자체의 매칭·플립 로직은 직접 호출로 별도 검증 완료
- [x] 말뿐인 이해·연습 미통과 시 스크립트 미호출 (미해소 유지) — 라이브 확인: 일부러 버그(`nonlocal` 누락) 있는 시도 제출 → 첨삭에서 버그 지적 + "gap을 아직 닫지 않는다"고 명시, `resolve-gap.sh` 미호출, `gaps.log`도 `resolved:false` 그대로
- [x] 갭·코드 모두 없으면 주제 질문 폴백 (라이브 확인: 갭 해소 후 새 세션에서 `/coach` 단독 호출 → "no open gaps on file... what do you want to learn?")
- [x] duck 세션이 coach가 해소한 갭을 더 이상 재출제하지 않음 확인 — 직접 `recent-gaps.sh` 호출로 확인: `resolved:true` 플립 후 출력 없음 (duck-orient도 동일 스크립트를 쓰므로 동일하게 필터링됨)

**테스트 하네스 한계 (신규 발견, 2026-07-08):** `claude --plugin-dir ... --session-id/--resume -p` 방식의 headless 다중턴 테스트는 읽기 전용 스크립트(`recent-gaps.sh`)는 잘 통과시키지만, 쓰기를 동반하는 스크립트(`resolve-gap.sh`, 아마 `log-gap.sh`도 마찬가지)는 "This command requires approval"로 막힌다 — 승인 프롬프트를 띄울 인터랙티브 채널이 없는 headless 세션 자체의 권한 모드 제약이지, `allowed-tools` 선언(duck-verify/duck-orient와 동일한 패턴)의 결함이 아님. 모델이 우회를 시도하지 않고 정확히 이 사실을 인지해 사용자 승인을 요청한 것도 라이브로 확인함. 실제 인터랙티브 세션(사용자가 직접 터미널에서 `/coach` 호출)에서는 승인 프롬프트가 정상적으로 뜨므로 이 제약이 적용되지 않는다.

### Blocked by

S1. (S2와는 독립 — 병렬 가능.)

## S4 — 정체성·문서·릴리스

### What to build

README Features에 `/coach` 추가, Scope 절 갱신: "duck never teaches — teaching is `/coach`'s job"
방향으로 duck/coach 경계 명문화. `plugin.json`·`marketplace.json` description에 coach 반영. 버전
3.0.0 → 3.1.0 (로컬 플러그인이므로 `marketplace.json`만 — AGENTS.md 버저닝 규칙). CONTEXT.md 용어와
문서 표현 일치 확인.

### Acceptance criteria

- [x] README: Features 표에 `/coach` 3모드, Scope에 duck/coach 경계 문장 — `### /coach — the teaching sibling` 표 추가, Scope 절에 "duck never teaches... that's /coach's" 문장 추가, Usage 절에도 `/coach` 3줄 추가
- [x] `plugin.json`·`marketplace.json` description 갱신 (제거된 기능 없음 확인 포함) — 기존 duck 기능 문구 전부 보존, coach 문단만 삽입 확인
- [x] `marketplace.json` 버전 3.1.0
- [x] 문서 용어가 CONTEXT.md와 일치 (Coach/Duck/Gap 정의 위반 없음) — CONTEXT.md의 "resolves a Gap when the user demonstrates understanding by passing an exercise (not by saying 'I get it')" 문구와 SKILL.md/README 표현 대조 완료, 위반 없음
- [x] `unset CLAUDECODE && claude plugin validate .` 통과 (버전 미지정 warning만, 로컬 플러그인 컨벤션상 정상)

### Blocked by

S1–S3 전부.

## 열린 질문 (구현 중 결정)

- 갭 모드 제안 개수 — 1개 고정(ship-point 관례) vs 목록 제시 후 선택. 기본 권장: 1개 고정.

## 그릴 확정 (2026-07-08) — 더 이상 열린 질문 아님

- **갭 해소 바** → 연습문제 통과(적용 입증)에 게이팅. 자기-관대 채점 + 소프트-바 영구 은퇴 차단. (반영: S3, ADR 0008)
- **코드 해부 세션 감지** → 대화 맥락 우선 → `session-edits.sh` 폴백. git diff는 세션 밖 변경 오탐으로 배제. (반영: S2)
- **arg 판별** → 존재 파일이면 해부, 아니면 주제. (반영: S2)

## 스코프 밖 기존 결함 (검수 발견 · 코드로 확인됨)

- `duck-orient`의 allowed-tools에 `resolve-gap.sh`가 빠져 있음 — engine.md(291–294행)는 duck-orient의 retrieval check-in이 갭 해소를 호출한다고 기술하는데 frontmatter가 이를 허용 안 해, 실행 시 권한 프롬프트가 뜬다. 추가로 duck-orient 본문 flow에도 resolve 호출이 배선돼 있지 않음. 별도 수정 후보(frontmatter 한 줄 + flow 한 문장).

## 스코프 제외 (명시적 기각 — 그릴 기록)

- **아티클 프롬프트 1의 단독 스킬화** — teach가 상위호환 (미션·ZPD·학습기록). 열화판 중복.
- **teach 상위호환 재구현 + vision-powers 렌더링** — 델타 2개를 위해 설계물 전체 재구현. vision-powers는 분석 리포트 도구라 인터랙티브 교육 위젯을 대체 못 함 (재사용 가능한 건 report-manager 인프라뿐).
- **HTML/파일 산출물** — 무상태 즉석성이 존재 이유. 산출물은 teach 재발명의 시작.
- **자동 트리거(model invocation)** — teach와 트리거 경쟁 사고 방지, 수동 전용.
- **`/duck-*` 네임스페이스** — duck 페르소나 규칙이 `/duck*` 전체에 걸려 있음.
- **커리큘럼·진도·워크스페이스 상태** — teach 영역, coach 비대화 금지 (ADR 0008 Consequences).
