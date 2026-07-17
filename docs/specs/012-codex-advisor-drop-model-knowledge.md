# Spec 012 — codex-advisor: codex 모델 지식 폐기 (검증 삭제 + 낡는 문서 정리)

> 생성: 2026-07-17 · 출처: grill-with-docs 세션 (gpt-5.6 출시 계기 검수)
> 구현 이슈: `docs/issues/012-codex-advisor-drop-model-knowledge.md` (슬라이스 S1~S3)
> 대상 플러그인: `plugins/codex-advisor/` (현재 v4.6.2 → v4.7.0, minor: 유저가 보는 출력 변화, 저장 동작은 동일)
> 용어집: `docs/context/codex-advisor.md` — **Model/effort routing** 절이 이 스펙의 대상.
> ADR: 신설 없음. 0004(prompt ownership)·0006(transcript hook)은 무관 — 프롬프트·훅 안 건드림.

## Problem Statement

유저가 겪는 일:

1. `/codex-setup --model gpt-5.6-sol --effort ultra` 치면 **경고 두 개**를 먹는다. 둘 다 거짓이다 —
   `gpt-5.6-sol`(2026-07-06~10 출시)도 `ultra`도 실재하는 유효값인데, 플러그인이 "내가 모른다"를
   "그런 건 없다"로 말한다. 유저는 오타 낸 줄 알고 멀쩡한 최신 모델을 안 쓰게 된다.
2. README를 읽으면 쓸 수 있는 모델이 `gpt-5.5`까지인 줄 안다. **gpt-5.6 3종(sol/terra/luna)이
   없다.** effort도 `minimal`~`xhigh` 5종만 있고 `max`·`ultra`가 없다.
3. "Tested against Codex CLI 0.125 / companion 1.0.5"를 보면 자기 companion 1.0.6이 지원 밖인 줄 안다.
   **실제 1.0.6 변경은 Windows git 셸 인젝션 하드닝뿐이고 우리와 무관하다** (본 세션에서 1.0.5↔1.0.6
   전체 재귀 diff로 확인 — `codex-companion.mjs` 바이트 동일, `lib/git.mjs`·`lib/process.mjs`만 변경).

근본 원인 하나: **플러그인이 codex의 세계(모델 목록·effort 목록·버전)를 자기 코드와 문서에
복사해뒀고, 그 복사본이 원본보다 느리게 썩는다.** 지금 같은 지식이 5곳에 복사돼 있고 전부 낡았다.
그리고 아무도 낡은 걸 못 잡았다 — companion 1.0.6이 나온 걸 유저가 `/plugin` 돌려서 알았지 우리가
안 게 아니다. **유지 실패가 실증됐다.**

## Solution

유저가 보게 될 것:

- **판정하지 않는다.** `--model`/`--effort`는 무슨 값이든 그대로 `config.toml`에 쓴다. 유효성은
  codex가 실행 시점에 심판한다 — 어차피 codex가 최종 심판자였고, 우리 경고는 비차단이라 애초에
  방어가 아니라 소음이었다.
- **목록 대신 조회 방법.** "네 계정이 뭘 쓸 수 있는지는 codex에서 `/model`로 봐라." 이 안내는 계정별로
  정확하고 절대 안 썩는다. 지금 README의 목록은 스스로 "your actual availability depends on
  subscription tier"라고 발뺌 중이다 — 최신도 아니고 정확하지도 않다.
- **"여기까지 테스트했다"는 문장 삭제.** 대신 **최소 요구 버전**(companion 1.0.4+, transfer 1.0.5+)만
  남긴다. 그건 유저가 실제로 행동하는(설치·업글) 진짜 계약이고, 그 아래선 실제로 안 돈다.

## User Stories

1. As a codex-advisor 유저, I want `--effort ultra`가 조용히 저장되기를, so that 방금 나온 effort를 쓸 때 플러그인이 나를 의심하지 않는다.
2. As a codex-advisor 유저, I want `--model gpt-5.6-sol`이 경고 없이 저장되기를, so that 출시된 지 11일 된 플래그십을 쓰면서 "이거 틀린 값인가?" 고민하지 않는다.
3. As a codex-advisor 유저, I want 플러그인이 모르는 값에 침묵하기를, so that 경고가 뜰 때는 그게 진짜 신호임을 믿을 수 있다.
4. As a 처음 README를 읽는 유저, I want "쓸 수 있는 모델은 codex에서 `/model`로 확인"이라고 안내받기를, so that 낡은 목록을 전체 목록으로 오해하지 않는다.
5. As a 구독 티어가 낮은 유저, I want 문서가 내 계정 기준 목록을 약속하지 않기를, so that 문서에 있는 모델이 나한테 없어도 버그로 오해하지 않는다.
6. As a companion 1.0.6 유저, I want 문서가 1.0.5까지만 테스트했다고 말하지 않기를, so that 내 환경이 지원 밖이라고 오해하고 멀쩡한 걸 디버깅하지 않는다.
7. As a codex CLI 최신 버전 유저, I want 문서가 0.125를 못 박지 않기를, so that 버전이 달라도 불안해하지 않는다.
8. As a `spark` 단축어를 쓰던 유저, I want 그게 계속 동작하기를, so that 이번 정리로 내 명령이 깨지지 않는다.
9. As a `/codex-setup` 유저, I want before/after 한 줄이 그대로 나오기를, so that 뭐가 바뀌었는지 여전히 눈으로 확인한다.
10. As a `/codex-setup` 유저, I want config.toml의 다른 키(`model_context_window` 등)가 보존되기를, so that 이번 변경으로 내 설정이 날아가지 않는다.
11. As a codex를 한 번도 안 돌린 유저, I want 캐시가 없어도 아무 일 없기를, so that 캐시 유무가 내 setup 경험을 가르지 않는다.
12. As a jq/python 환경이 특이한 유저, I want 스크립트가 크래시하지 않기를, so that setup이 조용히 죽지 않는다.
13. As a 유지보수자, I want 모델·effort 지식이 레포에 없기를, so that OpenAI가 다음 모델을 내도 우리가 할 일이 없다.
14. As a 유지보수자, I want 못 지킬 약속("매 릴리즈 확인함")을 문서가 안 하기를, so that 문서가 조용히 거짓이 되는 상태를 안 만든다.
15. As a 유지보수자, I want 최소 요구 버전은 남아 있기를, so that "왜 1.0.3에서 안 되냐"는 질문에 답할 근거가 있다.
16. As a 다음 세션의 에이전트, I want 용어집의 Model/effort routing 절이 실제 코드와 일치하기를, so that 없는 검증 로직을 있다고 믿고 계획을 세우지 않는다.
17. As a 다음 세션의 에이전트, I want AGENTS.md의 Codex 문서 링크가 정본 도메인을 가리키기를, so that 구 도메인이 죽는 날 문서 진입점을 잃지 않는다.

## Implementation Decisions

### D1 — 캐시 읽기 전부 삭제 (그릴 옵션 ④)

`apply-codex-config.py`에서 `~/.codex/models_cache.json` 관련 전부 제거:

| 대상 | 지금 하는 일 | 판결 |
|---|---|---|
| `STANDARD_EFFORTS` 상수 | effort가 하드코딩 5종에 없으면 경고 (경고문에 상수를 그대로 찍음 — **상수가 곧 유저에게 보이는 문서**) | 삭제 |
| 캐시 조회 + "not in local cache" 경고 | 모델이 캐시에 없으면 경고 | 삭제 |
| 모델별 `supported_reasoning_levels` 대조 | effort가 그 모델 지원목록에 없으면 경고 | 삭제 |
| `default_reasoning_level` 공시 | 모델만 주고 effort 생략 시 그 모델 기본 effort 알려줌 | 삭제 |
| `import json`, 캐시 서술 독스트링 | 위 삭제에 딸려감 | 삭제 |

**남는 것**: `MODEL_ALIASES`, `find_line`/`set_line`/`fmt`, TOML 읽기/원자적 쓰기, stdout 한 줄.
163줄 → 100줄 안팎(삭제 실계산 ~60줄 — 검수 세션 실측. 75줄 맞추려고 계약 코드를 더 지우지 말 것).

**기각한 대안 — ④'(검증만 삭제, `default_reasoning_level` 공시는 유지)**: 공시는 codex가 setup
시점에 안 알려주는 유일한 순가치라 살릴 만했으나, 유저 결정으로 전부 삭제. 근거 — 공시도 캐시가
75일 묵으면 틀린 값을 알려주고(유저 캐시 `fetched_at=2026-05-03`), 캐시를 읽는 코드가 남아 있는 한
"우리가 codex 세계를 안다"는 구조가 유지된다.

### D2 — `MODEL_ALIASES` 유지

`{"spark": "gpt-5.3-codex-spark"}` 한 줄은 남긴다. D1이 지운 것들과 성격이 다르다:

- 경고는 **지워도 잃는 게 없고**(잔소리만 사라짐), **낡으면 맞는 값을 틀렸다고 우긴다**.
- 단축어는 **지우면 기능이 사라지고**(유저가 19글자 슬러그를 다 침), **낡으면 codex가 실행 시점에
  "그런 모델 없다"고 바로 알려준다** — D1이 이미 받아들인 대가와 동일.

삭제는 기존 `--model spark` 유저를 깨는 breaking인데 얻는 게 원칙적 순수함뿐이라 기각.

### D3 — 문서에서 모델·effort 목록 삭제, 조회 방법으로 대체 (그릴 옵션 다)

유저 대면 문서(README, `codex-setup` SKILL.md, `codex-rescue` SKILL.md)에서:

- 슬러그 목록 삭제 → "available slugs depend on your account — run codex and use `/model` to see
  yours" 형태의 조회 안내.
- effort 목록 삭제 → 같은 원칙. `model_reasoning_effort`가 config.toml 키라는 사실만 남긴다(그건
  우리 계약이지 codex 지식이 아님).
- **"the script surfaces both an effort-set warning and a model-specific support warning"** 문장 삭제
  — D1 이후 즉시 거짓이 된다. **D1은 문서 수정을 선택이 아니라 필수로 만든다.**
- 예시 명령의 슬러그는 **고유값 1종만** 남긴다(등장 횟수가 아니라 종류 기준 — 예시 명령이 여러
  곳이어도 전부 같은 슬러그). 값은 `gpt-5.6-sol`(현 플래그십). 이건 **예시지 호환성
  주장이 아니다** — 예시도 언젠가 낡지만, "이게 전체 목록"이라는 단정을 버리면 썩는 면적이 1/5로 준다.

### D4 — "여기까지 테스트했다" 문장 삭제, 최소 요구 버전은 유지 (그릴 옵션 ②삭제)

두 종류를 갈라야 한다:

- **① 최소 요구 버전 — 유지.** "companion v1.0.4+ install required", "`/codex-transfer` needs
  v1.0.5+". 유저가 이걸 보고 **행동한다**(설치·업글). 그 아래선 실제로 안 돈다. 검증 가능하고 안 썩는다.
- **② "여기까지 봤다" — 삭제.** `tested through 1.0.5`, `Tested against Codex CLI 0.125`,
  description 속 `(gpt-5.5)`, `plugin.json` keywords의 `"gpt-5.5"`. 유저가 이걸 보고 하는 행동이 없다.

**②를 살리려면 "매 codex 릴리즈마다 확인한다"는 지킬 수 있는 프로세스가 있어야 하는데 없고, 없다는
게 오늘 증명됐다. 못 지킬 약속은 안 하는 게 낫다.**

**②가 아닌 것 — 버전 핀 문서·주석은 남긴다.** `references/companion-usage.md`는 companion 1.0.5의
**라인 번호까지** 핀된 해부 문서다("verified against 1.0.5", `handleTransfer at :825-836`) — 버전
표기가 곧 그 문서의 유효성 조건이라, 지우면 라인 번호가 무근거가 되어 오히려 거짓말이 된다.
`hooks/session-start.mjs`의 1.0.5 주석도 동일(특정 버전 실측 기록). `codex-transfer` SKILL.md의
"older than 1.0.5"는 ①(최소 요구)이다. 셋 다 구현 이슈 S3 grep 게이트의 허용 잔존.

⚠️ **이 결정은 2026-04-11에 유저가 정한 규칙([[feedback_audit_scope]] — "compat 도장은 찍는다")을
뒤집는다.** 4월 규칙은 조건부였다("브레이킹 없음을 **확인했으면** 갱신하라") — 우린 확인을 안 했다.
규칙을 지키는 대신 약속 자체를 없애는 쪽으로 유저가 결정. **메모리 갱신이 이 이슈의 산출물에
포함된다** (아래 D7). 안 하면 다음 세션의 에이전트가 도장을 다시 찍는다.

### D5 — 용어집 갱신

`docs/context/codex-advisor.md`:

- **Model/effort routing** 절 — 라우팅 구조(“`--model`/`--effort`는 companion에 안 가고
  config.toml에 쓴다, 변경은 전역”)는 **그대로 유효**하다. D1은 그 절이 서술하지 않는 검증 로직만
  지운다. 다만 "판정하지 않는다"는 원칙을 한 줄 추가해 다음 에이전트가 검증을 되살리지 않게 한다.
- **Provenance debt** 절의 `"our default model is gpt-5.5 — it is already one generation behind"` —
  두 겹으로 틀렸다. (1) gpt-5.5는 이제 한 세대가 아니라 두 세대 뒤처졌고, (2) **애초에 플러그인엔
  "default model"이 없다.** 유저 config.toml에 `gpt-5.5`가 있는 건 유저가 그렇게 설정해서다.
  이 절의 논지(vendored 블록이 낡는다)는 살리되 모델 이름 근거는 제거.

### D6 — AGENTS.md의 Codex 문서 링크 갱신 (유저 지시로 범위 포함)

`developers.openai.com/codex/*` 페이지가 `learn.chatgpt.com`으로 **308 Permanent Redirect** 한다
(검수 세션 재실측). 정밀 사실 세 개:

- `developers.openai.com/llms.txt` **자체는 200으로 살아 있다** — 308을 타는 건 인덱스가 아니라
  그 안에 나열된 `/codex/*.md` 페이지들이다.
- 매핑은 비일률: `/codex/config-reference` → `/docs/config-file/config-reference`
  (`/docs/codex/...` 아님). 페이지 URL을 하드코딩할 땐 개별 실측 필요.
- 신 인덱스 `https://learn.chatgpt.com/docs/llms.txt`(200)조차 아직 구 도메인 URL을 나열한다 —
  갈아타도 페이지 fetch의 308은 당장 안 사라진다. 실익은 구 도메인이 죽을 때의 보험.

AGENTS.md의 "Other agents' docs" 링크를 `https://learn.chatgpt.com/docs/llms.txt`로 교체. 레포 전역
파일이라 엄밀히는 플러그인 범위 밖이지만, 같은 사실 하나에서 나왔고 한 줄이라 따로 빼면 잊는다.

`apply-codex-config.py`의 옛 URL 주석은 D1이 어차피 지운다.

### D7 — 메모리 갱신 (산출물)

`feedback_audit_scope` 메모리에 D4의 예외를 반영. "도장은 찍는다" 규칙은 **확인 프로세스가 있을
때만** 성립한다는 조건을 명시하고, 없으면 약속 자체를 없애는 게 낫다는 이번 판례를 추가.

### D8 — 버전

`marketplace.json` 4.6.2 → **4.7.0** (minor). 저장 동작은 100% 동일하므로 breaking 아님. 다만 유저가
보는 출력(경고·공시)이 사라지고 문서 계약이 바뀌므로 patch가 아님. 로컬 소스 플러그인이라 버전은
`marketplace.json`에만 존재.

`plugin.json`과 `marketplace.json`의 **description은 양쪽 다** 고친다(AGENTS.md 규칙) — 제거된
`(gpt-5.5)` 문구가 두 곳에 복사돼 있다.

## Testing Decisions

### Seam

**`apply-codex-config.py`의 CLI 경계가 유일한 seam이다. 신설 없음.**

```
입력:  argv[1]=<model> argv[2]=<effort>,  $HOME/.codex/config.toml 의 기존 내용
출력:  stdout 한 줄("Model: ... | Effort: ..."),  stderr(경고),  config.toml 변경 결과
```

이게 최상위 seam인 이유: 스킬은 이 스크립트를 subprocess로만 부르고(용어집 **Model/effort routing**),
스크립트 내부 함수는 어떤 스킬도 직접 안 쓴다. `HOME`을 임시 디렉터리로 돌리면 유저의 실제
config.toml을 건드리지 않고 전 경로를 관측할 수 있다. **좋은 테스트 = 이 경계의 외부 행동만 본다** —
`find_line`이 정규식을 쓰는지, 캐시를 어떤 순서로 훑는지는 테스트 대상이 아니다.

### 선례 (prior art)

레포에 자동 테스트 프레임워크가 **없다**(루트에 `package.json`/`pyproject.toml`/`pytest.ini` 부재).
기존 관행은 **임시 디렉터리로 환경변수를 돌린 수동 검증 + acceptance criteria에 결과 기록**이다 —
이슈 003의 S12(`CLAUDE_PLUGIN_DATA`를 임시 디렉터리로 오버라이드해 telemetry 시딩), S13(가짜 stdin
JSON으로 훅 실행) 참조. 이번에도 그 관행을 따른다. 프레임워크 도입은 Out of Scope.

### 무엇을 관측하나

`HOME`을 임시 디렉터리로 돌리고 스크립트 CLI를 직접 호출해 **외부 행동만** 본다 — stderr가 조용한지,
config.toml에 뭐가 남는지, stdout 한 줄이 그대로인지. `find_line`이 어떤 정규식을 쓰는지, 캐시를 어떤
순서로 훑는지는 테스트 대상이 아니다.

이 seam의 결정적 이득: **codex를 실행할 필요가 없다.** 그래서 유저의 깨진 codex 바이너리(Further
Notes 참조)가 이 작업을 막지 않는다.

**캐시 의존 소멸의 증명 방법**: 캐시 파일을 심어둔 상태와 안 심은 상태의 출력이 **완전히 동일**해야
한다. 이게 D1이 실제로 끝났다는 유일한 증거다 — 경고가 안 뜨는 것만으로는 "우연히 캐시에 있었다"와
구분이 안 된다.

**Grep 게이트가 진짜 게이트다.** 이슈 003의 교훈 — 복사된 지식은 고정 목록이 아니라 grep이 권위다.
이 작업의 본질이 "같은 문자열의 복사본을 전부 찾아 지우는 것"이므로, 슬라이스별 구체 게이트는 구현
이슈의 acceptance criteria에 있다.

## Out of Scope

- **companion 1.0.6 대응 코드** — 본 세션에서 1.0.5↔1.0.6 전체 재귀 diff로 **우리 계약 무변경 확인**.
  `codex-companion.mjs` 바이트 동일, 변경은 `lib/git.mjs`/`lib/process.mjs`의 Windows git 셸 하드닝뿐.
  ①의 "1.0.4+"는 그대로 유효 — 손댈 것 없다.
- **codex CLI 재설치·실 E2E** — 유저 환경 문제(`/opt/homebrew/bin/codex`가 사라진 Caskroom
  0.128.0을 가리키는 깨진 심링크, 마지막 실행 2026-05-03). 이 이슈는 codex 실행을 요구하지 않는다 —
  seam이 파일 쓰기라 `HOME` 오버라이드로 전부 검증된다.
- **테스트 프레임워크 도입** — 레포 전역에 없다. 이 이슈 혼자 도입하는 건 범위 초과.
- **`MODEL_ALIASES` 삭제** — D2에서 기각.
- **Provenance debt 상환**(vendored 블록의 gpt-5-4-prompting 재싱크) — 용어집이 지적한 별건.
  D5는 그 절의 **모델 이름 근거만** 고치고 debt 자체는 안 갚는다.
- **`plan_mode_reasoning_effort` 지원** — 지금도 안 하고, 이 이슈는 기능 추가가 아니다.
- **codex 문서 자체의 모순** — `config-reference` 페이지는 아직 `minimal|low|medium|high|xhigh`만
  나열하는데 models 페이지·changelog는 `max`/`ultra`를 쓴다. **우리가 판정을 그만두면 이 모순은
  우리 문제가 아니게 된다** — 그게 D1의 핵심 이득이다.

## Further Notes

**이 스펙의 한 줄 요약**: 남의 세계에 대한 사실을 우리 레포에 복사해두면, 원본은 갱신되고 복사본만
썩는다. 복사를 그만둔다.

**유저 환경 사실**: `/opt/homebrew/bin/codex`가 사라진 Caskroom 0.128.0을 가리키는 **깨진
심링크**고, 마지막 codex 실행이 2026-05-03이다. 이 스펙의 seam은 파일 쓰기라 `HOME` 오버라이드로
전부 검증되므로 **codex 재설치는 이 작업의 선행조건이 아니다**(Out of Scope 참조).

**본 세션에서 확정한 사실** (다음 세션이 재조사하지 않도록):

| 사실 | 근거 |
|---|---|
| gpt-5.6 3종(sol/terra/luna) 출시 | learn.chatgpt.com whats-new — 2026-07-06~10 |
| `ultra`/`max`는 실재하는 effort | models 페이지 셀렉터 + changelog + openai/codex#30585. **단주의**: config-reference 페이지는 아직 5종만 나열 — 공식 문서끼리 어긋남 |
| `model_reasoning_effort` 5종 세트 | config-reference verbatim `"minimal \| low \| medium \| high \| xhigh"` — `none`은 `plan_mode_reasoning_effort` 전용 |
| companion 1.0.6 = Windows git 하드닝만 | 1.0.5↔1.0.6 `diff -r` 실측 |
| codex 문서 도메인 이사 | `/codex/*` 페이지는 308 — 단 매핑 비일률(config-reference는 `/docs/config-file/`행). `developers.openai.com/llms.txt`는 200 생존, 신 인덱스 `learn.chatgpt.com/docs/llms.txt`(200)도 아직 구 도메인 URL 나열. 검수 세션 재실측 |
| models_cache는 codex 소유, TTL 300초 | 캐시에 `fetched_at`/`etag`/`client_version` 필드 존재. TTL 300초는 GitHub 이슈발이라 **문서 verbatim 아님 — 추측 섞임** |
| 유저 캐시 5/3자인 이유 | 캐시가 깨진 게 아니라 codex를 5/3 이후 안 돌린 것. `~/.codex/` 전체가 같은 타임스탬프. **codex 한 번 돌리면 자동 리프레시** |

**설계 원칙 (다음 에이전트가 되살리지 말 것)**: 비차단 검증은 방어가 아니다. 경고하고 나서 똑같이
저장하면, 오타는 그대로 config.toml을 전역 오염시키고 유저는 잔소리 한 줄을 더 받을 뿐이다. 진짜
방어를 원하면 차단해야 하는데, 캐시는 계정 게이트·신규 모델을 정당하게 모르므로 차단은 더 나쁘다.
**그래서 판정을 포기하는 게 옳다 — 어중간한 판정이 최악이었다.**

