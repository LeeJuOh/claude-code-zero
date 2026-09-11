# Spec 015 — excalidraw-architect: 백엔드 실무 다이어그램 판단 스킬 `archdraw` (yctimlin 캔버스 위)

> 생성: 2026-09-05 · 출처: excalidraw 레포 3종 비교 + 방법론 서치 세션
> 구현 이슈: 미작성 — **포크 레포에서** 도그푸딩 후 슬라이스(3차 확정, Further Notes "문서 위치")
> 대상: 신규 플러그인. **이름 확정(2026-09-11 3차): 레포 = 플러그인 = npm = `excalidraw-architect`** (npm 비어있음 확인). yctimlin `mcp-excalidraw-server`(그리는 손)와 나란히 놓았을 때 "판단(아키텍트)"이 차별점으로 읽히게. **스킬 = `archdraw`** (`skills/archdraw/SKILL.md`, 호출 `/archdraw <발화>`; 충돌 시 `/excalidraw-architect:archdraw`). 구 작업명 `backend-diagram`은 본문에서 `archdraw`로 읽는다(경로 표기 `skills/backend-diagram/` → `skills/archdraw/`). **별도 레포 확정** — 이 스펙은 포크 레포 생성 시 그쪽으로 이동(임시 보관).
> 의존: `mcp-excalidraw-yctimlin` (MCP 26툴, 라이브 캔버스). **2026-09-11 그릴 확정: 별도 레포 = yctimlin 포크(MIT).** 서버 코드는 우리 것, 내장 스킬(`skills/excalidraw-skill/`)은 판단 스킬로 교체, 플러그인 `.mcp.json`으로 서버 내장. 사용자는 우리 플러그인 하나만 설치. (구 전제 "캔버스 조작 코드 없음" 폐기)
> 근거 원문: `references/mcp-excalidraw-yctimlin/` (README, `src/core/design-guide.ts`), `references/excalidraw-diagram-skill/SKILL.md` (LICENSE 없음 → 복사 금지, 원칙만 재작성), c4model.com, arc42.org, CodeScene change-coupling.
> **검증 상태: 아래 판단 규칙 대부분은 이 세션에서 조립한 가설이다.** 실제 사용에서 확인된 것은 (a) yctimlin이 양방향이라는 것, (b) 공식 MCP는 Claude Code에서 못 쓴다는 것뿐. 도그푸딩 한 바퀴 후 규칙을 걸러낸 다음 이슈로 옮긴다.

## Problem Statement

백엔드 개발자가 AI 에이전트와 코드 작업을 할 때 **텍스트로는 아키텍처가 통하지 않는다.** 에이전트가 텍스트로 구조를 설명하면 이해가 안 가고, 내가 원하는 큰 그림을 텍스트로 설명하면 에이전트가 오해한다. 그래서 그림을 그려가며 그릴하고 있고, 도구로 yctimlin의 라이브 Excalidraw 캔버스를 쓴다.

도구는 충분하다. 캔버스는 양방향이라 내가 브라우저에서 직접 고치면 에이전트가 스크린샷으로 읽는다. 부족한 건 **판단**이다:

- 에이전트가 **뭘 그릴지** 기본값으로 흐른다. "이 API 부르면 뭐가 일어나"를 물어도 박스-화살표 컴포넌트 그림을 그린다.
- **추상화 레벨을 섞는다.** 서비스 그림에 클래스 이름이 들어가고, 한 장에 구조와 시간축이 같이 있다.
- **내가 고친 걸 뒤엎는다.** 캔버스에서 박스를 옮겨놓으면 다음 턴에 재배치한다.
- 아키텍처 외 실무 상황(장애 분석, 락 문제, 마이그레이션, API 계약)에 어떤 그림이 맞는지 기준이 없다.

기존 자산 두 개가 이 판단을 주지 않는다:

- **yctimlin MCP** — 손. 캔버스 조작 전부 + 치수·색 규격(`read_diagram_guide`). "무엇을 그릴지"는 없다.
- **excalidraw-diagram-skill** — 눈썰미. "잘 그리는 법" 방법론 552줄. 설명·교육용 그림에 최적화돼 있어 일부 원칙은 아키텍처 도면과 정면 충돌한다(균일 금지, 박스 최소화). 렌더러는 yctimlin이 대체한다.

## Solution

yctimlin 캔버스 위에서 동작하는 **판단 전용 스킬.** 네 가지를 준다:

1. **상황 → 그림 라우팅.** 백엔드 실무 17개 상황마다 어떤 다이어그램 종류를, 어떤 요소가 빠지면 안 되는지.
2. **캔버스 우선.** 에이전트는 행동 전에 캔버스를 보고, 내가 바꾼 건 뒤엎지 않는다. 텍스트 설명 없이 그림으로 왕복.
3. **줌 레벨과 연결.** 시스템 → 배포 단위 → 모듈 → 레이어 → 경계 타입. 각 장은 윗 장 박스 하나의 확대. 레벨은 스택 무관, 근거 추출만 스택별 어댑터.
4. **모드.** 기본은 안 남김(설명 그림). 내가 말하면 도면으로 승격 → 파일명 규칙 + `docs/architecture/` 저장.

## User Stories

1. As a 백엔드 개발자, I want "이 API 부르면 뭐가 일어나"를 물으면 시퀀스 다이어그램이 나오기를, so that 컴포넌트 그림을 받고 다시 요청하지 않는다.
2. As a 백엔드 개발자, I want "구조가 어떻게 돼"를 물으면 C4 레벨 그림이 나오기를, so that 큰 그림부터 본다.
3. As a 백엔드 개발자, I want 서비스 레벨 그림에 클래스 이름이 안 들어가기를, so that 서비스 5개짜리 그림이 클래스 40개로 터지지 않는다.
4. As a 백엔드 개발자, I want 한 장에 구조와 시간축이 섞이지 않기를, so that 그림 하나가 한 질문에 답한다.
5. As a 백엔드 개발자, I want 박스 라벨이 "인증 API"가 아니라 `POST /auth/token`이기를, so that 그림만 보고 코드를 찾는다.
6. As a 백엔드 개발자, I want 캔버스에서 박스를 옮겨놓으면 에이전트가 그 배치를 정답으로 받기를, so that 좌표를 텍스트로 설명하지 않는다.
7. As a 백엔드 개발자, I want 캔버스에 남긴 표시(어떤 색·모양이든)를 에이전트가 고칠 곳으로 읽기를, so that "왼쪽 위에서 세 번째"라고 말하지 않는다.
8. As a 백엔드 개발자, I want 반영된 표시를 에이전트가 정리하기를, so that 캔버스에 처리된 피드백이 쌓이지 않는다.
9. As a 백엔드 개발자, I want 손그림 사진이나 대충 그린 스케치를 던지면 정식 그림으로 옮겨주기를, so that 초안을 말로 설명하지 않는다.
10. As a 백엔드 개발자, I want 서비스 그림의 `order-service` 박스를 열면 그 서비스의 모듈 그림이 나오기를, so that 지도처럼 줌인한다.
11. As a 백엔드 개발자, I want 모듈 의존성이 `build.gradle`이나 `@Module({imports})`에서 읽히기를, so that 에이전트가 추측하지 않는다.
12. As a 백엔드 개발자, I want 추론으로 그린 의존성이 점선으로 구분되기를, so that 확실한 것과 추정을 구분한다.
13. As a 백엔드 개발자, I want Gradle이든 NestJS든 같은 줌 레벨 정의를 쓰기를, so that 스택이 바뀌어도 그림 읽는 법이 같다.
14. As a 백엔드 개발자, I want 그림이 기본으로 저장되지 않기를, so that 일회성 이해 그림이 레포를 오염시키지 않는다.
15. As a 백엔드 개발자, I want "저장해"라고 하면 파일명 규칙에 따라 `docs/architecture/`에 들어가기를, so that 다음 세션 에이전트가 그 파일을 읽고 이어간다.
16. As a 백엔드 개발자, I want "다듬어줘"라고 하면 정렬·색·범위가 도면 수준으로 올라가기를, so that 버릴 그림을 남길 그림으로 승격한다.
17. As a 백엔드 개발자, I want 저장된 도면을 복사해 그 위에 변경 영향을 색칠할 수 있기를, so that before/after를 비교한다.
18. As a 백엔드 개발자, I want 장애 원인을 파볼 때 타임라인 그림이 나오기를, so that 어디서 끊겼는지 시각별로 본다.
19. As a 백엔드 개발자, I want 락·동시성 문제를 볼 때 트랜잭션 경계와 락 획득 순서가 그려지기를, so that 데드락 사이클을 눈으로 찾는다.
20. As a 백엔드 개발자, I want 성능 병목을 볼 때 구간별 레이턴시 분해가 나오기를, so that 어디가 전체의 몇 %인지 안다.
21. As a 백엔드 개발자, I want 재시도 정책 그림에 백오프 간격과 최대 횟수가 반드시 있기를, so that 그림만 있고 판단은 못 하는 일이 없다.
22. As a 백엔드 개발자, I want 마이그레이션 계획에 단계별 전환·이중쓰기 구간·롤백 지점이 그려지기를, so that 계획을 팀에 그림으로 보여준다.
23. As a 백엔드 개발자, I want 이벤트 토폴로지에 토픽명·발행자·구독자·순서보장 여부가 있기를, so that "이 이벤트 누가 받아"에 답한다.
24. As a 백엔드 개발자, I want API 계약 그림에 실제 요청/응답 페이로드가 있기를, so that 협의 중 "예를 들면"이 필요 없다.
25. As a 백엔드 개발자, I want 설명용 그림에선 배치가 의미를 말하기를(팬아웃은 퍼지는 모양), so that 텍스트를 지워도 구조가 읽힌다.
26. As a 백엔드 개발자, I want 도면에선 같은 역할이 같은 모양이기를, so that `order-service`를 3초 안에 찾는다.
27. As a 백엔드 개발자, I want 에이전트가 애매하면 "구조야, 흐름이야?"라고 되묻기를, so that 잘못된 그림에 시간을 쓰지 않는다.
28. As a 백엔드 개발자, I want 그리기 전에 에이전트가 실제 코드를 읽기를, so that 그림이 스펙이 아니라 코드를 반영한다.

## Implementation Decisions

**플러그인 형태** (2026-09-11 그릴 확정)
- yctimlin 포크(MIT) 레포 = 캔버스 서버(우리 코드) + 스킬 1개 + 플러그인 패키징. 내장 `excalidraw-skill`은 판단 스킬로 교체, 조작법은 `references/canvas-ops.md`로 이동.
- 인터페이스: **CLI 기본**(yctimlin CLI 그대로; JSON stdout, 스크린샷은 파일→Read). MCP는 옵션. **호출 줄 (2026-09-11 3차 확정)**: `skills/archdraw/scripts/archdraw` shim(셸 5줄, `exec node "$(dirname "$0")/../../../dist/bin.js" "$@"`)을 두고 SKILL.md는 `scripts/archdraw <cmd>`로 부른다(스킬 루트 기준 상대경로 — Agent Skills 스펙 관례). 이유: Codex는 SKILL.md 안 `${CLAUDE_PLUGIN_ROOT}`·`${PLUGIN_ROOT}`를 치환 안 함(Agent Plugins §9.2, 치환은 mcp.json args/env/cwd만), 반면 스킬 폴더 경로는 Claude("Base directory")·Codex(스킬 목록에 파일 경로) 둘 다 모델에 알려줌. 구 `node ${CLAUDE_PLUGIN_ROOT}/dist/bin.js` 폐기. `allowed-tools`는 Claude용 `Bash(${CLAUDE_SKILL_DIR}/scripts/archdraw *)`(Codex는 무시, 무해). 대안 기각: npm 배포(`npx -y`, 보류 중) / SessionStart 훅이 루트 경로 파일에 기록(Codex 훅은 v1 스펙 밖 + 두 벌).
- **수동 스킬**: `disable-model-invocation: true`, `/archdraw $ARGUMENTS`. description은 트리거 아님. 한 번 호출하면 규칙이 세션에 상주(공식 문서) — 후속 턴 재호출 불필요, 컴팩션 후만 재호출.
- 스킬 유형: Tool-first / Domain-Specific Intelligence(주) + Iterative Refinement(부). 자동 호출·`context: fork` 아님(캔버스 대화 이어져야 함).
- 스킬 작성 규칙(docs `skills.md`, Anthropic 블로그, X글 "Lessons from Building Claude Code", 공식 skill-creator): 본문 500줄 이하 + references 3단계 / Claude가 이미 아는 건 빼고 기본 행동을 바꾸는 것만 / Gotchas 섹션 / ALWAYS·NEVER 남발 대신 "왜" / 결정론 필요한 건 서버 코드 / 대표 과제 돌려 막히는 gap부터.
- 모델별 지시문 분기: 공식 지원 없음(현재 모델 노출 변수 없음, `env-vars.md` 확인). effort 분기(`${CLAUDE_EFFORT}`)만 가능. 모델 무관 규칙으로 쓰고 약한 모델 대비는 서버 강제로 흡수.
- 산출물은 영어(SKILL.md, references). 이 스펙과 이슈는 한국어.
- 별도 레포이므로 이 마켓플레이스의 다른 플러그인에 의존하지 않는다.

**1. 라우팅 테이블** (스킬 본체)
- 상황 17개 → 그림 종류 + 필수 요소. 상황: 처음 보는 서비스 / API 동작 / 엔티티 생명주기 / 재시도·분기 / 데이터 모델 / 이벤트 토폴로지 / 배포·장애 대응 / 장애 원인 분석 / 동시성·락 / 성능 병목 / API 계약 / 마이그레이션 / 큐·배치 파이프라인 / 인증·권한 / 의존 도달 범위 / 데이터 흐름·파생 데이터 / 저장소 토폴로지.
- **16·17 DDIA 축** (2026-09-11 그릴 확정): C4 줌 레벨은 코드 단위를 확대하는 축이고, DDIA는 "데이터가 어디 살고 어떻게 흐르나"라는 다른 축 → 레벨이 아니라 상황으로 추가. **16 데이터 흐름·파생 데이터** — "이 데이터 어디서 와서 어디로 가?" 박스=저장소, 화살표=데이터 이동. 필수요소: 원본(source of truth) 표시 / 이동 방식(CDC·배치·동기 write-through) / 지연 허용치. **17 저장소 토폴로지** — "DB 어떻게 구성돼?" 필수요소: 복제 방식(sync/async, 리더/팔로워) / 파티션 키 / 어느 읽기가 stale 허용인지. **이벤트 토폴로지(6)** 필수요소에 전달 보장(at-least-once·outbox·멱등키) 추가. DDIA 나머지(스토리지 엔진·인코딩·합의)는 그림으로 논의할 일 드물어 제외.
- **15번 "의존 도달 범위"** (2026-09-11 그릴 확정, 구 "변경 영향범위", archify Authored Reachability 재작성): "payment 바꾸면 어디?" → 기존 의존성 그림 위에 **나를 쓰는 쪽 / 내가 쓰는 쪽** 두 방향을 다른 색으로 칠하고 나머지는 흐리게. "안 그림" 줄에 "실제 영향은 판단 안 함(도달 ≠ 영향)". 그림 제목·설명에 "영향범위"·"blast radius" 단어 금지 — 의존 그래프 도달은 실제 변경 영향과 다르기 때문(필드 하나 추가는 직접 호출자만 고침).
- 관통 규칙 셋: 한 장에 한 종류 · 진짜 이름 · 기본은 안 남김.
- 표의 각 상황에 **답하는 질문 한 문장**을 적는다(archify `recipes/scenarios.mjs`의 `question`/`avoidWhen` 차용). 에이전트는 사용자 발화를 이 질문 중 하나로 읽고 그림을 고른다 — 사용자가 부른 그림 이름("아키텍처 그려줘")보다 질문이 우선.
- **두 갈래로 읽힐 때만** 되묻는다. 한 종류만 맞으면 묻지 않는다. 물을 때는 후보마다 아스키 미리보기를 붙인다(예: 재시도 정책=상태도 vs 호출 순서=시퀀스). 종류를 고르기 전에 "남길 것인지"는 묻지 않는다(흐름 끊음) — 저장 시점에만 판단. (2026-09-11 그릴 확정)

**2. 캔버스 우선**
- 에이전트는 매 턴 행동 전에 CLI `screenshot`(MCP `get_canvas_screenshot`)으로 캔버스를 본다. 사용자가 남긴 표시·주석은 모델이 그림과 구분해 읽는다 — 색·모양을 규칙으로 정하지 않는다.
- 사용자가 옮긴 배치 = 정답. 에이전트는 뒤엎지 않고 정렬만 다듬는다. 판별은 CLI `describe`(MCP `describe_scene`)의 요소 좌표 변화.
- 사용자 스케치·사진 = 초안. 정식 그림으로 옮기되 사용자 배치 순서를 유지한다.
- 새 툴을 만들지 않는다. yctimlin의 양방향 캔버스 위에 얹는 행동 규칙 두 줄이 전부다.
- **자가 수정 정지** (2026-09-11 그릴 확정, archify #6 재작성): 같은 문제(라벨 겹침, 근거 못 찾음 등)를 두 번 고쳐도 안 나아지면 그만 고치고 사용자에게 말한다("라벨 겹침 못 잡음, 직접 옮겨달라" / "order→payment 근거 못 찾음, 점선 유지"). 렌더러 거부 루프는 없지만 스크린샷 자가 검사·근거 없음 표시로 에이전트 혼자 도는 루프가 있어서. 횟수 2는 경험칙, 도그푸딩 후 조정.
- **라벨 삭제는 수리 아님** (2026-09-11 그릴 확정, archify #7 재작성): 화살표 라벨 겹침은 옮기기·줄이기로만 고친다. 라벨은 의미(동기/비동기, 프로토콜, 방향)라서 지우면 그림이 거짓이 됨. 예외: 양끝 박스만으로 뜻이 완전히 드러나는 라벨. 필수요소 "항목 삭제 금지"의 화살표 버전.
- **"안 그림" 한 줄** (2026-09-11 그릴 확정, archify #4 receipt 재작성): 그림 밑에 텍스트 한 줄 "안 그림: ___". 같은 레벨인데 일부러 뺀 것만 적는다(예: L3에서 이벤트 구독선 생략). 레벨 규칙으로 빠진 것·근거 등급(점선)은 중복이라 안 적음. 없으면 생략. 캔버스에 넣어 스크린샷·저장에 같이 남긴다. 사용자가 보고 "그것도 그려줘" 하면 같은 종류면 덧그리고, 다른 종류면 옆에 새 그림. 도면 모드에선 범례로 승격.

**3. 줌 레벨 + 근거 어댑터**
- 레벨 5개, 스택 무관: L1 시스템 컨텍스트 / L2 배포 단위 / L3 모듈 경계 / L4 레이어 / L5 경계 타입(포트 인터페이스와 구현체). C4의 Context·Container·Component에 모듈 층을 끼운 형태 — Gradle 멀티모듈·Nest 모듈이 C4에 없는 칸이기 때문.
- 각 장은 윗 장 박스 하나의 확대. 박스 라벨에 하위 장 참조를 남긴다. 파일명이 줌 경로.
- 각 레벨에 넣을 디테일 수준 고정: L2에 엔드포인트·토픽명, L3에 모듈명·소유 테이블명(클래스 없음), L4부터 클래스. 상위 장에 하위 디테일 금지. (2026-09-11 정정: 구 "L3에 클래스명"은 L4·L5와 중복이라 삭제)
- **L4 정의** (2026-09-11 그릴 확정): 모듈 안 레이어. 레이어 이름·칸은 **프로젝트 아키텍처 스타일 그대로** — 헥사고날: adapter-in / application(in-port·service·out-port) / domain / adapter-out. 클린: entities / use-cases / interface-adapters / frameworks. 3티어: controller / service / repository. 스타일은 스택 어댑터가 패키지명·ArchUnit 규칙·모듈 구조에서 판별, 못 읽으면 되물음. 스타일 무관 공통 필수요소: **의존 화살표 + 방향 위반 빨강 표시**(domain→infra 같은 것). 위반이 모듈마다 달라서 레이어 그림이 모듈별로 가치 있음. L5 = L4 경계(out-port 등) 하나의 확대.
- **DDD 매핑** (2026-09-11 그릴 확정): 레벨 추가 없음. 전략 — 바운디드 컨텍스트는 L2(마이크로서비스) 또는 L3(모듈러 모놀리스) 박스 그 자체, 컨텍스트 관계(ACL·shared kernel·conformist·upstream/downstream)는 그 화살표 라벨. 전술 — L4 domain 칸에 《aggregate》《domain service》《event》 스테레오타입, 애그리거트 내부 엔티티는 안 나열. DDD+헥사고날이면 UI·Infrastructure 자리를 adapter-in·adapter-out이 대체.
- L5는 경계에 있는 타입만(포트와 구현체). 내부 클래스 나열 금지 — 낡는 속도 때문.
- 근거 추출은 스택별 어댑터 테이블. 원칙: **의존성이 선언적으로 박힌 파일을 먼저 찾는다.** 신뢰도 3등급 — 선언(빌드 파일·모듈 데코레이터) / 관례(디렉터리 구조) / 추론(import 파싱, 점선 표시).
- **근거 검증은 서버, 판단은 에이전트** (2026-09-11 그릴 확정, archify #5 `repository-evidence.mjs` 재작성): 선·값마다 근거 태그 `코드` / `설계` / `로그` 중 하나. `코드` 태그는 `파일:줄`을 함께 적고, **그릴 때마다** 서버가 그 파일·줄 존재를 확인한다 — 없거나 틀리면 점선으로 강등 + 캔버스에 "근거 없음: order→payment" 표시. 의미(정말 의존성인지)는 검사 안 함. `설계`(마이그레이션 계획, API 계약 협의) · `로그`(장애 타임라인)는 검사 없음, 표시만. 저장 시점이 아니라 매번 검사하는 이유: 틀린 그림으로 대화하면 저장 전에 이미 손해.
- **어댑터 = 원칙 3줄, 스택 표 없음** (2026-09-11 그릴 확정, 구 "첫 스택 하나"·"스택별 어댑터 테이블" 폐기): ① 의존이 선언된 파일을 먼저 찾아라(빌드 파일·모듈 데코레이터) ② 없으면 디렉터리 관례 ③ 그래도 없으면 import 추론, 점선. 스택별 파일명(`build.gradle`, `pom.xml`, `@Module`, `go.mod`…)은 모델이 이미 알아서 표로 안 적음 — "Claude가 아는 건 빼기" 규칙. 아키텍처 스타일 판별(헥사고날·클린·3티어)도 같은 원칙(패키지명·ArchUnit → 관례 → 되묻기). 거짓말은 Q3 서버 근거 검사가 잡음. 도그푸딩에서 특정 스택의 선언 파일을 모델이 반복해서 못 읽으면 그 스택만 서버 파서(결정론)로 승격. 주력 검증 스택: Spring Java/Kotlin(Gradle·Maven), NestJS.
- **같은 레벨 과밀 처리** (2026-09-11 그릴 확정, archify #3 재작성): 한 그림에 주노드가 대략 10~15를 넘으면 그 레벨 안에서 코드 경계(패키지·디렉터리·팀)로 한 겹 묶어 **개요 그림 + 묶음별 그림**으로 나눠 그린다. 전부 같은 캔버스, 다른 영역 — 기존 그림은 건드리지 않는다. 숫자는 지침이지 규칙 아님(판단은 에이전트, 자동 검사는 "묶였는가"만). 도면 모드는 예외. 용어: **그림 = 캔버스 위 독립 영역 하나**, "한 장에 한 종류"는 그림 단위.

**3.5 캔버스는 지우지 않는다 (2026-09-11 3차 그릴 확정 — 구 "자동 보관" 폐기)**
- 에이전트는 캔버스를 지우거나 덮지 않는다. 새 그림은 **새 frame**(7-6)을 옆에 그린다. `clear`는 사용자 발화("지워")로만. 그래서 "아까 그 그림"은 캔버스에 그대로 있음.
- 구 §3.5 "clear·덮기 직전 서버가 scratch/에 자동 export"는 삭제. 이유: 출처 없는 우리 발명이었고, 위 규칙이면 지워지는 순간 자체가 없음. 남는 유실은 서버 크래시·재부팅 때 저장 안 한 그림뿐 — "기본 안 남김" 원칙상 버릴 그림. 세션 종료 감지 문제(구 Next Steps 2)도 같이 소멸.
- 데이터 폴더: `$CLAUDE_PLUGIN_DATA/`(Codex `$PLUGIN_DATA`, 둘 다 없으면 `~/.excalidraw-architect/`) 아래 `snapshots/`(7-2) + `tmp/`(7-5c 스크린샷 png). `scratch/` 없음.
- **필수요소 규칙**: 상황별 필수요소는 그림에 항상 값이 있어야 한다 — 코드에서 읽은 실제 값 / 없음이 확인됨 / 확인 못 함(점선). 항목 삭제 금지. "저장해" 시점에 "확인 못 함"이 남아 있으면 알리고 채우게 한다. 그 외 시점엔 검사 없음.

**3.7 포크 범위 — 서버 작업 목록** (2026-09-11 그릴 확정, 항목별 기존/추가 표시)
- 사실(조사): CLI 이미 있음(`dist/bin.js`, 18 서브커맨드 — 스펙의 `server/bin/cli.js` 표기는 오기) / 요소·스냅샷 전부 메모리 Map(`src/types.ts:288-300`), 디스크 영속화 없음(README 423·552·577줄 명시) / export는 `EXCALIDRAW_EXPORT_DIR` 한 폴더 밖 쓰기 거부 / 요소 종류에 `frame` 없음(`frameId` 칸만) / 캔버스 서버는 머신당 하나(포트 3000, pid 파일) — 세션 구분 없음 / 캔버스 = `@excalidraw/excalidraw` 0.18.1(MIT), yctimlin MIT.
- **7-1 자동 보관 [삭제, 3차]**: §3.5 참조. 서버 작업 없음. 대신 스킬 규칙 한 줄(캔버스 안 지움, 새 frame).
- **7-2 스냅샷 영속화 [수정]**: `snapshot`/`restore` 저장소를 메모리 Map → `$CLAUDE_PLUGIN_DATA/snapshots/<name>.excalidraw`. 스토리 17 before/after가 세션을 넘겨야 해서.
- **7-3 근거 검사 [추가]**: 요소에 `evidence: {tag: code|design|log, path, line}` 칸. 생성 경로(`mcp-dispatch` create/batch, CLI `add`) 공통 함수에 검사 삽입 — `code`면 파일·줄 존재 확인, 없으면 점선 강등 + "근거 없음: A→B" 텍스트 자동 생성. 모양은 archify `repository-evidence.mjs`, 거부 대신 강등·태그 3종은 우리 판단. 레포 위치 = 서버 cwd.
- **7-4 내장 스킬 교체 [교체]**: `skills/excalidraw-skill/`(조작법 276줄+치트시트 192줄) → `skills/archdraw/SKILL.md`(판단, 500줄 이하) + `references/canvas-ops.md`(yctimlin 조작법 그대로 이동) + `references/routing-table.md` + `references/zoom-levels.md`. 출처 4종: yctimlin(MIT, 조작법 그대로) / excalidraw-diagram-skill(라이선스 없음, 원칙만 재작성) / archify(MIT, 규칙 재작성) / 이 스펙. `install-skill` 커맨드 삭제(플러그인 `skills/` 자동 로드).
- **7-5 플러그인 포장 [추가]**: (a) 매니페스트 — 두 채널, 7-5a·7-5b / (b) 쓰기 허용 폴더를 레포 `docs/architecture/` + `$CLAUDE_PLUGIN_DATA/` 두 곳으로 / (c) CLI `screenshot` 임시 png 위치를 `$CLAUDE_PLUGIN_DATA/tmp/`로 고정(레포 오염 방지).
- **7-5a 채널 확정** (2026-09-11 3차 그릴 확정): **플러그인 두 채널만** — Claude Code 플러그인(`.claude-plugin/plugin.json` + `.mcp.json`, `${CLAUDE_PLUGIN_*}`) + Codex/Agent Plugins 1.0(루트 `plugin.json` + `mcp.json`, `${PLUGIN_*}`). 두 채널 다 설치 = 레포 클론이라 서버 코드가 같이 오고, 스킬은 `scripts/archdraw <cmd>` shim으로 호출(플러그인 형태 절 참조) — **npm 배포 불필요**. `npx skills` 채널은 보류: `npx skills add`는 `skills/`만 복사해 서버가 없으므로 npm 배포(`npm publish`, 새 이름)가 전제인데 사용자 0명 단계에선 비용만 있음. 나중에 열 때는 publish 한 번 + 스킬 호출 줄을 `npx -y <패키지> <cmd>`로 교체하면 끝(yctimlin 방식). `install-skill` 커맨드 삭제(7-4)는 유지.
- **7-5b 매니페스트 생성** (2026-09-11 3차 그릴 확정): `package.json`이 단일 소스(name/version/description). `npm run manifests` 스크립트(~40줄)가 `.claude-plugin/plugin.json` · `.claude-plugin/marketplace.json`(`source: "./"`, GitHub 직접 설치용) · `.mcp.json`(`node ${CLAUDE_PLUGIN_ROOT}/dist/bin.js mcp`) · 루트 `plugin.json` · `mcp.json`(`${PLUGIN_ROOT}`) 5개를 생성, 생성물은 커밋. 버전 올릴 때 `package.json` 한 곳 + 스크립트. CI(또는 pre-commit)에서 "생성물 최신인가" diff 검사. 대안 기각: 손으로 6개(버전 4곳 불일치 반복된 실수), MCP 매니페스트 제거(옵션 사용자 위해 유지).
- **7-6 frame 요소 지원 [추가, 소규모]**: 타입 목록에 `frame` + 기본값. **그림 하나 = frame 하나**(이름 = 제목). Excalidraw 0.18이 원래 그리므로 프론트 수정 없을 것(도그푸딩 확인). 과밀 세기·"안 그림" 줄 위치·사용자가 액자 끌면 그림 통째 이동(스토리 6)에 사용. group+제목 대안 기각.
- **7-7 MCP 26툴 유지**: CLI 기본이라 축소해도 얻는 게 없음. 옵션 사용자용.
- **7-8 세션별 캔버스 [추가]**: **세션 하나 = 캔버스 서버 하나 = 브라우저 탭 하나.** 새 명령 `session start` — 빈 포트에 서버 띄우고 `{session, url}` 반환. 스킬이 첫 턴에 실행해 사용자에게 URL 알림, 이후 모든 호출에 `--session <키>`. 세션 정리는 사용자 `session end`(=stop)로만 — 자동 감지 없음(3차, §3.5 참조). 컴팩션으로 키 유실 시 `session list` — 같은 프로젝트에 하나면 자동 복귀, 여럿이면 탭 제목의 키를 사용자에게 물음. 키는 스킬이 서버에서 발급(호스트 세션 ID·PPID 의존 안 함 → Claude·Codex 동일). 대안 기각: 프로젝트 경로별 포트(같은 폴더 다중 세션 못 나눔), 한 서버+세션별 frame(분리 원할 때 코드 두 벌), MCP 기본(키 불필요하지만 CLI 기본 결정 뒤집음 — 도그푸딩에서 키 휴대가 귀찮으면 재고).

**4. 모드**
- 설명 모드(기본): 정확도 동일, 마감·범위만 축소. 그 질문에 필요한 것만. 저장 안 함. ARGUE 원칙 켬.
- 도면 모드(승격): 표준 도형·균일 배치·범례·파일명 규칙. `docs/architecture/`에 `.excalidraw`로 export. ARGUE 원칙 끔.
- 승격은 사용자 발화("다듬어줘", "저장해")로만. 역방향(도면 복사 → 설명용 오버레이)도 허용.

**excalidraw-diagram-skill에서의 이식** (LICENSE 없음 → 문장 복사 금지, 원칙만 재작성)
- 항상 가져옴: 진짜 이름 쓰기 / 한 장 안의 멀티줌 3요소(요약 띠·영역·구체명) / isomorphism test / 그리기 전 근거 확인(스펙 조사 → 실제 코드 읽기로 치환).
- 모드별: ARGUE 철학 — 설명 모드 켬, 도면 모드 끔.
- 안 가져옴: 균일 금지 / 박스 최소화·컨테이너 30% / cloud·spiral·tree 패턴 / 미학 규칙 / 렌더러·JSON 스키마·팔레트 파일(yctimlin 대체).

**yctimlin과의 경계**
- 치수·색·화살표 바인딩 규격은 yctimlin 디자인 가이드를 따른다. CLI엔 가이드 커맨드가 없으므로(MCP `read_diagram_guide`만 존재) 가이드 내용은 `references/canvas-ops.md`에 옮겨 담는다(7-4). 스킬 본문이 중복 정의하지 않는다.
- 스킬은 어떤 커맨드를 언제 부르는지만 지시(CLI 기본, 괄호는 MCP 대응): 첫 턴 `session start`, 턴 시작 `screenshot`(`get_canvas_screenshot`), 저장 시 `export`(`export_scene`), 승격 시 `arrange align`(`align_elements`), before/after 시 `snapshot save`(`snapshot_scene`).

## Testing Decisions

- 시임은 하나: **스킬 호출.** 입력 = 사용자 발화 + (선택) 레포 + (선택) 캔버스 상태. 출력 = 어떤 그림을 어떤 레벨로 그렸는가. 내부 판단 과정은 검사하지 않는다.
- 좋은 테스트 = "이 발화에 이 종류의 그림이 나오는가", "이 레벨 그림에 금지된 디테일이 없는가", "사용자가 옮긴 요소의 좌표가 유지되는가". CLI `describe` 출력으로 판정 가능하므로 스크린샷 육안 검사 없이 자동화된다.
- ~~라우팅 테이블 트리거 eval~~ → 수동 스킬이라 트리거 eval·description 최적화 없음. 대신 skill-creator의 with/without 비교 eval(발화 → 기대 그림 종류·레벨·필수요소)만.
- 도그푸딩이 테스트에 선행한다. 규칙이 실제로 필요한지 확인되기 전에 eval을 쓰지 않는다.

## Out of Scope

- **실제 변경 영향 분석 스크립트** (blast radius / change coupling). 에이전트의 grep 답변이 못 미더운지 확인된 바 없음. 필요해지면 기존 도구(dependency-cruiser, madge, jdeps, code-maat) 조사부터. 이 스펙의 15번 상황은 "의존 도달 범위"로 한정하고 스크립트 없이 에이전트 판단으로 그린다.
- 공식 `excalidraw/excalidraw-mcp` 지원. MCP Apps 위젯이라 Claude Code에서 렌더 불가.
- 캔버스 조작 툴 신설. yctimlin이 전부 제공.
- arc42 템플릿 도입. ADR은 이미 사용 중이며 arc42 9장과 동일. 8·10·11장(크로스커팅·품질요구·리스크)은 도면 체크리스트 항목으로만 참조.
- 4+1 view, EventStorming, Domain Storytelling. 무겁거나 워크숍 기법이라 단독 작업에 부적합.
- excalidraw-diagram-skill의 Playwright 렌더러.

## Further Notes

- **미검증 항목 처리 (2026-09-11 그릴)**: 줌 레벨(L4·DDD·L3 정정)과 어댑터(원칙 3줄)는 그릴로 확정. **모드(설명/도면)만 도그푸딩으로 넘김** — 그려봐야 아는 것.
- **이 스펙의 판단 규칙은 검증되지 않았다.** 세션 중 "남길지 먼저 정하라"가 "기본 안 남김, 말하면 승격"으로 뒤집혔듯, 실사용 없이 쓴 규칙은 뒤집힌다. 이슈 슬라이스 전에 도그푸딩 한 바퀴: 실제 프로젝트에서 L1→L2→모듈 드릴다운 + 영향범위 색칠 + 캔버스 직접 수정을 수동으로 돌리고, **세 번 이상 반복해서 교정한 것**만 규칙으로 남긴다.
- 라우팅 테이블은 "종류"만이 아니라 "빠지면 안 되는 요소"가 실제 가치다. 재시도 그림에 백오프 간격이 없으면 그림만 있고 판단은 못 한다.
- **문서 위치** (2026-09-11 3차 그릴 확정): 스펙(PRD)만 이 레포에서 그릴로 마무리. 그릴 끝나면 포크 레포 생성 → 스펙을 그쪽 `docs/specs/`로 이동 → ADR·CONTEXT.md·이슈 슬라이스는 **포크 레포에서 생성**. 이 레포엔 `docs/INDEX.md`에 포인터 한 줄만. 포크 레포는 이 마켓플레이스에 의존하지 않고 혼자 완결.
- 공식 MCP 비교 결과는 재사용 가치가 있어 llm-wiki 카탈로그(`wiki/summaries/raw-repos-catalog.md`) 갱신 후보: yctimlin README 비교표의 "공식은 AI가 캔버스를 못 본다"는 부분적으로 부정확 — 공식도 사용자 편집을 텍스트 diff로 모델에 돌려준다(이미지는 아님).

## Handoff (2026-09-11, 3차 종료 → 4차는 포크 레포 생성)

> 그릴 끝. 본문 "(2026-09-11 … 그릴 확정)" 표시가 확정분, 이 절은 다음 세션이 **뭘 하면 되는지**만 적는다. 근거·대안은 본문 해당 절에 있으므로 여기 반복 안 함.

**Goal** — 포크 레포 `excalidraw-architect` 만들고 이 스펙을 그쪽으로 옮긴 뒤, 거기서 CONTEXT.md·ADR·이슈 슬라이스를 만든다. 코드 구현은 그 다음.

**First Action** — 사용자에게 GitHub 계정/레포 생성 방식 확인(gh CLI로 yctimlin 포크 후 rename vs 새 레포에 복사). 확인 전엔 만들지 않는다. 업스트림: `https://github.com/yctimlin/mcp_excalidraw` (MIT, 로컬 사본 `references/mcp-excalidraw-yctimlin/` @ ff42de9). 다른 출처 로컬 사본: `references/excalidraw-diagram-skill/`(라이선스 없음, 문장 복사 금지), `references/archify/`(MIT).

**Steps (순서)**
1. 포크 레포 생성 → `docs/specs/015-excalidraw-architect.md`를 그쪽 `docs/specs/`로 이동. 이 레포에는 같은 경로에 포인터 한 줄 파일만 남기고 커밋(Further Notes "문서 위치").
2. 포크 레포에서 `CONTEXT.md` — 용어: 그림(=frame 하나) / 캔버스 / 설명 그림 vs 도면 / 필수요소 / 근거 태그(code·design·log) / 세션 키 / "안 그림" 줄. 구현 디테일 금지, 용어 사전만.
3. 포크 레포에서 ADR 후보 5개 — 포크 결정(스킬만 아닌 이유) / 질문 기준 라우팅(그림 이름보다 질문 우선) / 세션=캔버스 서버=탭 / 근거 검사 매번(저장 시점 아님) / 캔버스 안 지움(자동 보관 대신 새 frame). 각각 본문 근거 절 참조. 셋 조건(되돌리기 어려움·맥락 없으면 의아·실제 트레이드오프) 안 맞으면 빼도 됨.
4. 이슈 슬라이스 — §3.7 항목이 곧 후보: 7-2 스냅샷 영속화 / 7-3 근거 검사 / 7-4 스킬 교체(shim 포함) / 7-5 포장(a 두 채널, b 매니페스트 생성, b·c 쓰기 폴더) / 7-6 frame / 7-8 세션별 캔버스. 7-1 삭제됨, 7-7은 작업 없음. 도그푸딩 0바퀴(모드·frame 프론트·Codex 실동작)가 슬라이스 전에 와야 한다는 Further Notes 원칙 유지 — 슬라이스 문서는 쓰되 "도그푸딩 후 조정" 표시.
5. 이 레포 메모리(`project_backend_diagram_015.md`)에 포크 레포 경로 기록.

**Context** — 사용자 스타일: 한 번에 질문 하나, 3~4줄. "먼소리야"·"장황하게 말하지마" = 설명 실패 → 사실 배경 나열 말고 "문제 한 줄 / 해법 한 줄 / 예·아니오". 옵션은 이름만 말고 같은 발화에서 어떻게 다르게 동작하는지 예시. 사용자는 백엔드 전문가(헥사고날·DDD·DDIA). 그릴 중 코드 편집 금지, 확정은 문서에만(feedback grill-plan-edits-to-doc). 커밋은 영어 1~2문장, push는 지시 있을 때만.

**Facts verified this session (1차 문서)** — `${CLAUDE_PLUGIN_ROOT}`·`${CLAUDE_SKILL_DIR}`는 플러그인 스킬 본문·allowed-tools 텍스트 치환 + hook/MCP env, Bash 셸 env 아님(`skills.md`, `plugins-reference.md`). Codex/Agent Plugins는 SKILL.md 치환 없음, mcp.json args/env/cwd만(§9.2); 훅은 v1 밖(Codex 자체 훅은 있음, `CLAUDE_PLUGIN_ROOT` 호환은 훅 env만). Agent Skills 스펙: 스킬 파일은 스킬 루트 상대경로로 참조, Codex는 스킬 목록에 파일 경로 노출. yctimlin CLI 18 서브커맨드(`start/stop/status/apply/add/update/delete/get/query/describe/screenshot/export/import/mermaid/snapshot/arrange/share/clear` + `install-skill`), 디자인 가이드 CLI 없음(MCP `read_diagram_guide`만). npm `excalidraw-architect` 비어있음(2026-09-11).

**What Didn't Work** — ⚠️ 사실 배경을 3~4문단 깔고 질문 → 두 번 "먼소리야". 결론 먼저, 근거는 물으면. ⚠️ "npm 배포" 같은 용어를 설명 없이 씀 → 사용자에겐 Maven Central 비유가 통했음. ⚠️ curl 결과를 레포 루트에 떨굼(`ap-spec.html`) — 스크래치패드 절대경로로 쓸 것.

**Suggested skills (4차)** — `domain-modeling`(CONTEXT.md·ADR, 포크 레포에서) / `writing-for-agents`(SKILL.md 초안 때) / `skill-creator-pro`(스킬 골격·eval, 구현 단계). 그릴은 끝났으니 `grilling` 불필요.
