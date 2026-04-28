# VibeProxy Codex Reasoning Aliases

> **작성일**: 2026-04-23 (검증·정정·실측·플러그인 적용 방안 2026-04-28)
> **1줄 요약**: alias 이름만으로 reasoning level 차등 = **불가능**. 반드시 (a) client에서 모델명에 `(level)` suffix 부착하거나 (b) server config에 `payload.override` 박아야 함. 둘 다 byte-level 실측 확인. 현 `vibeproxy-kit` 플러그인은 (a)만 사용 — shell 거치는 caller에만 동작. (b) 추가 시 IDE/Cursor/직접 API 모두 차등 가능.
> **출처**:
> - `references/vibeproxy/` — VibeProxy wrapper와 bundled backend 연결 확인
> - `references/CLIProxyAPI/` — alias resolution, translator, thinking, executor 경로 추적
> - `~/.cli-proxy-api/{config.yaml,merged-config.yaml}` — 로컬 alias 설정 확인

---

## 결론

현재 로컬 설정 기준:

- `cc-codex-gpt54-med`
- `cc-codex-gpt54-high`
- `cc-codex-gpt54-max`

셋 다 **동일한 upstream `gpt-5.4` Codex 요청**으로 간다. 이름만 다르고, alias 자체가 `reasoning.effort=medium/high/max` 같은 차등 payload를 만들지 않는다.

차등이 생기는 경로는 3개뿐:

1. **inbound payload가 이미 thinking/reasoning 필드를 포함할 때** (translator 매핑)
2. **모델명이 `gpt-5.4(high)` 같은 `model(value)` suffix 문법일 때** (thinking 모듈)
3. **config의 `payload` rule이 alias 이름을 target으로 override를 정의할 때** (현재 로컬 설정엔 없음)

alias 이름 일부인 `cc-codex-gpt54-high`의 `high`는 **suffix 문법이 아니라 단순 문자열**이라서 자동 해석되지 않는다. 또 `med`는 `ParseLevelSuffix`가 인식하는 값이 아니다(`medium`만 valid).

---

## 1. VibeProxy는 backend binary `cli-proxy-api-plus`를 호출한다

VibeProxy 자체가 Codex reasoning level 로직을 따로 구현하는 구조가 아니라, 번들된 backend에 위임한다.

- `references/vibeproxy/src/Sources/ServerManager.swift:229` — bundled binary path 결정
- `references/vibeproxy/src/Sources/ServerManager.swift:361` — auth 흐름에서도 동일 binary 사용

변경 지점 추적 대상이 VibeProxy wrapper보다 **CLIProxyAPI backend**인 이유.

---

## 2. 로컬 alias 설정은 med/high/max 모두 `gpt-5.4`에 매핑된다

로컬 config와 merged config 모두 codex alias 3개를 같은 base model로 매핑한다.

- `~/.cli-proxy-api/config.yaml:35-41`
- `~/.cli-proxy-api/merged-config.yaml:27-33`

즉 설정 파일 단계에서는 이미:

- `cc-codex-gpt54-med` → `gpt-5.4`
- `cc-codex-gpt54-high` → `gpt-5.4`
- `cc-codex-gpt54-max` → `gpt-5.4`

차이는 없다.

---

## 3. alias resolution도 이름만 `gpt-5.4`로 바꾼다

실행 모델 후보를 고를 때 manager는 OAuth alias를 적용하고, 최종 resolved model 하나를 executor로 넘긴다.

- `references/CLIProxyAPI/sdk/cliproxy/auth/conductor.go:523-537` — `executionModelCandidates`

suffix 보존 로직은 따로 있다.

- `references/CLIProxyAPI/sdk/cliproxy/auth/oauth_model_alias.go:83-98` — `modelAliasLookupCandidates` (suffix 분리 후 base만으로 alias lookup)
- `references/CLIProxyAPI/sdk/cliproxy/auth/oauth_model_alias.go:100-112` — `preserveResolvedModelSuffix` (resolved 이름에 원래 suffix 다시 붙임)
- `references/CLIProxyAPI/sdk/cliproxy/auth/oauth_model_alias.go:130-150` — alias loop가 `preserveResolvedModelSuffix` 호출

중요한 점:

- `cc-codex-gpt54-high` → 그냥 `gpt-5.4`
- `gpt-5.4(high)` → suffix 보존
- `cc-codex-gpt54-high(high)` → alias lookup 시 base `cc-codex-gpt54-high`로 매칭 후 `gpt-5.4(high)`로 재조립

즉 **suffix 문법은 보존 대상**이지만, **alias 이름 내부의 `high`는 해석 대상이 아니다**.

---

## 4. Codex executor 순서: translate → thinking → payload rules → base model 고정

Codex executor는 다음 순서로 요청 body를 만든다.

1. `TranslateRequest(from, codex, baseModel, ...)`
2. `thinking.ApplyThinking(body, req.Model, ...)`
3. `helps.PayloadRequestedModel(opts, req.Model)` + `ApplyPayloadConfigWithRoot(...)`
4. 최종 `model = baseModel` (sjson)

근거:

- `references/CLIProxyAPI/internal/runtime/executor/codex_executor.go:167-177`
- `references/CLIProxyAPI/internal/runtime/executor/codex_websockets_executor.go:178-188`

이 순서 때문에 차등 동작은 셋 중 하나에서만 생길 수 있다:

- translator
- thinking
- payload rules

실제 추적 결과:

- translator: alias 이름 자체로는 차등 안 만듦
- thinking: suffix/body config 없으면 차등 안 만듦
- payload rules: alias 이름 기준 차등 가능하지만, 현재 로컬 설정엔 없음

---

## 5. translator는 Codex reasoning knob를 지원하지만, 입력 payload가 있어야 작동한다

`sdk/translator`는 generic registry/fallback 레이어다.

- 등록된 transform 있으면 호출
- 없으면 request body를 거의 그대로 통과시키고 `model`만 normalizing

근거:

- `references/CLIProxyAPI/sdk/translator/registry.go:45-66`

### 5.1 OpenAI Chat → Codex 변환

OpenAI Chat request를 Codex Responses 형식으로 바꿀 때:

- `reasoning_effort`가 있으면 `reasoning.effort`로 매핑
- 없으면 기본 `reasoning.effort = "medium"`
- `reasoning.summary = "auto"` 고정
- `text.verbosity`도 옮김

근거:

- `references/CLIProxyAPI/internal/translator/codex/openai/chat-completions/codex_openai_request.go:56-64`
- `references/CLIProxyAPI/internal/translator/codex/openai/chat-completions/codex_openai_request.go:267-280`

다음 입력은 translator가 차등 payload를 만든다.

```json
{"reasoning_effort":"high"}
```

→ Codex upstream body:

```json
{"reasoning":{"effort":"high","summary":"auto"}}
```

### 5.2 OpenAI Responses → Codex 변환

OpenAI Responses request에서 Codex로 갈 때는 대부분 passthrough + unsupported field 정리다.

- `references/CLIProxyAPI/internal/translator/codex/openai/responses/init.go:9-19`
- `references/CLIProxyAPI/internal/translator/codex/openai/responses/codex_openai-responses_request.go:20-46`

여기서도 alias 이름만 보고 med/high/max 차이를 새로 만들지는 않는다.

### 5.3 다른 포맷(Claude/Gemini) → Codex 변환

다른 포맷에서도 body에 thinking config가 있으면 Codex `reasoning.effort`로 바꾼다.

- Claude → Codex (`thinking.budget_tokens` → `reasoning.effort` 변환):
  - `references/CLIProxyAPI/internal/translator/codex/claude/codex_claude_request.go:302-317`
- Gemini → Codex (`generationConfig.thinkingConfig` → `reasoning.effort` 변환):
  - `references/CLIProxyAPI/internal/translator/codex/gemini/codex_gemini_request.go:244-277`

공통점: **입력 payload에 thinking 정보가 있을 때만** Codex reasoning knob가 생긴다.

---

## 6. thinking.ApplyThinking도 suffix/body config 없으면 아무것도 안 한다

`ApplyThinking`는 executor에서 `req.Model` 전체를 받아 suffix를 먼저 파싱한다.

- `references/CLIProxyAPI/internal/thinking/apply.go:87-118`

suffix 문법은 `model(value)` 형식만 인식한다.

- `references/CLIProxyAPI/internal/thinking/suffix.go:23-44` — `ParseSuffix` (괄호 분리)
- `references/CLIProxyAPI/internal/thinking/suffix.go:126-148` — `ParseLevelSuffix` (값 검증)

valid level 값은 정확히 6개다: `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. 즉 `med`나 `hi`는 인식되지 않는다.

예:

- `gpt-5.4(high)` → suffix `high` → ModeLevel/LevelHigh
- `gpt-5.4(8192)` → numeric budget 인식 (`ParseNumericSuffix`)
- `gpt-5.4(med)` → `ParseLevelSuffix` 실패 → 무시
- `cc-codex-gpt54-high` → suffix 없음, plain model string

suffix가 없으면 request body에서 provider-specific thinking config를 읽는다.

- `references/CLIProxyAPI/internal/thinking/apply.go:135-157`

Codex provider는 `reasoning.effort`를 읽고/쓴다.

- extract: `references/CLIProxyAPI/internal/thinking/apply.go:472-489` (`extractCodexConfig`)
- apply: `references/CLIProxyAPI/internal/thinking/provider/codex/apply.go:61-84` (`applyCodex`)

그래서 다음 셋을 비교하면:

- `gpt-5.4(high)` → `reasoning.effort=high` 적용
- body에 `{"reasoning":{"effort":"high"}}` 있음 → 유지/정규화
- `cc-codex-gpt54-high` → suffix도 없고 body config도 없으면 passthrough

실제로 no config면 `ApplyThinking`는 그대로 반환한다.

- `references/CLIProxyAPI/internal/thinking/apply.go:159-164`

---

## 7. payload rules만 alias 이름 기준 차등을 만들 수 있다

payload rule helper는 requested model(=alias resolution **전** 이름)도 후보로 넣는다.

- `references/CLIProxyAPI/internal/runtime/executor/helps/payload_helpers.go:14-19` — `ApplyPayloadConfigWithRoot` 시그니처에 `requestedModel` 인자
- `references/CLIProxyAPI/internal/runtime/executor/helps/payload_helpers.go:175-208` — `payloadModelCandidates` (resolved + requested + suffix-stripped 모두 후보)

이 말은 config에서 alias 이름 자체를 rule target으로 써서:

- `cc-codex-gpt54-med` → `reasoning.effort=medium`
- `cc-codex-gpt54-high` → `reasoning.effort=high`
- `cc-codex-gpt54-max` → `reasoning.effort=max`

같은 override를 만들 수 있다는 뜻.

하지만 현재 로컬 config에는 이런 payload rules가 없다.

- `~/.cli-proxy-api/config.yaml` 전체에 `payload:` 섹션 없음
- `~/.cli-proxy-api/merged-config.yaml` 전체에 `payload:` 섹션 없음

즉 **현재 설정에서는 alias 차등 없음**.

---

## 8. 실무 결론

### 8.1 지금 상태

현재 VibeProxy + CLIProxyAPI + 로컬 config 조합에서는:

- `cc-codex-gpt54-med`
- `cc-codex-gpt54-high`
- `cc-codex-gpt54-max`

셋 다 실질적으로 **동일한 `gpt-5.4` Codex 요청**이다. 차이는 `reasoning.effort=medium` 기본값 + `summary=auto`로 수렴.

### 8.2 실제로 reasoning level을 나누려면 (실측 결과 포함)

**❌ 안 되는 방법 (실측 2026-04-28):**

- `gpt-5.4(high)` 직접 호출 → `{"error":"unknown provider for model gpt-5.4(high)"}` 반환, upstream 도달 못 함. 이유: `gpt-5.4`는 alias 키가 아니라 upstream `name`. alias lookup 실패.
- alias.name 필드에 suffix 박기 (`name: gpt-5.4(high)`) → `unknown provider for model cc-codex-gpt54-high`. 이유: model registry lookup이 정확한 base name 요구, `gpt-5.4(high)`는 미등록 → alias 자체가 등록 안 됨 (`service.go:1446-1535`).
- 즉 **모델 이름만으로 차등 = 불가능**. 어디선가 변환(client suffix 부착 또는 server config) 필요.

**✅ 되는 방법 (실측 검증됨):**

1. **alias + suffix 조합** — client가 `cc-codex-gpt54-high(high)` 전달 → outbound `reasoning.effort=high` 확인
   - alias lookup이 base `cc-codex-gpt54-high`로 성공 → resolver가 `gpt-5.4`로 치환 → `preserveResolvedModelSuffix`가 suffix 재부착 → `thinking.ApplyThinking`이 suffix 파싱해서 `reasoning.effort=high` 적용
2. **payload rules로 alias별 override** — server config에서 alias 이름 target → 실측 outbound `reasoning.effort=high` 확인. caller 부담 0.

   실제 schema (검증: `internal/config/config.go:306-342`, `config.example.yaml:365-396`):

   ```yaml
   payload:
     override:
       - models:
           - name: "cc-codex-gpt54-med"
             protocol: "codex"
         params:
           "reasoning.effort": "medium"
       - models:
           - name: "cc-codex-gpt54-high"
             protocol: "codex"
         params:
           "reasoning.effort": "high"
       - models:
           - name: "cc-codex-gpt54-max"
             protocol: "codex"
         params:
           "reasoning.effort": "max"
   ```

   - bucket: `default` (누락 시만), `default-raw`, `override` (항상), `override-raw`, `filter` (제거)
   - `models[].name`은 wildcard 지원 (`gpt-*`). 단 alias 차등 원하면 alias 이름 명시 필수 — `gpt-*`는 resolution 후 base model까지 매칭하므로 3 alias 전부 동일 effort 박힘.
   - `protocol` 옵션: `openai|gemini|claude|codex|antigravity`

### 8.3 가장 안전한 해석

문제의 핵심은 "translator/thinking이 Codex reasoning knob를 아예 모르느냐"가 아니라:

> **knob는 안다. 하지만 alias 이름 일부인 `-high`를 reasoning level로 해석하는 로직은 없다.**

즉 capability는 있지만, 현재 alias naming과 연결되어 있지 않다.

---

## 9. 실측 검증 (2026-04-28)

### 9.1 문제 검증 — alias 3종 동일성

`merged-config.yaml`에 `request-log: true` 일시 추가 후 alias 3종 호출, `~/.cli-proxy-api/logs/v1-chat-completions-*.log`에서 outbound `/responses` body 추출.

**호출:**
```bash
curl -sS -X POST http://127.0.0.1:8318/v1/chat/completions \
  -H "Content-Type: application/json" -H "Authorization: Bearer dummy" \
  -d '{"model":"cc-codex-gpt54-<med|high|max>","messages":[{"role":"user","content":"say hi in one word"}],"stream":false,"max_tokens":10}'
```

**outbound body (셋 다 동일):**
```json
{
  "include": ["reasoning.encrypted_content"],
  "input": [{"content":[{"text":"say hi in one word","type":"input_text"}],"role":"user","type":"message"}],
  "instructions": "",
  "model": "gpt-5.4",
  "parallel_tool_calls": true,
  "reasoning": {"effort": "medium", "summary": "auto"},
  "store": false,
  "stream": true
}
```

**diff 결과:**
- `body-med.json` vs `body-high.json` → identical
- `body-high.json` vs `body-max.json` → identical
- 헤더도 timestamp 제외 동일 (`Originator: codex-tui`, `Chatgpt-Account-Id`, `Auth: codex oauth`, `Accept: text/event-stream` 모두 동일)

**결론 확정:**
- model 모두 `gpt-5.4`
- `reasoning.effort` 모두 `medium` (translator 기본값)
- `reasoning.summary` 모두 `auto`
- alias 이름은 outbound에 흔적 없이 사라짐
- 코드 추적 결론과 byte-level 일치

### 9.2 해결책 검증 — 5가지 시도 실측

| # | 방법 | 호출 측 | 서버 측 변경 | 결과 | outbound `reasoning.effort` |
|---|------|--------|------------|------|---------------------------|
| 1 | 모델명만 `cc-codex-gpt54-high` | model="cc-codex-gpt54-high" | 없음 | ✅ 200 | `medium` (translator 기본값으로 fallback) |
| 2 | 직접 suffix `gpt-5.4(high)` | model="gpt-5.4(high)" | 없음 | ❌ `unknown provider for model gpt-5.4(high)` | (도달 못 함) |
| 3 | alias + suffix `cc-codex-gpt54-high(high)` | model="cc-codex-gpt54-high(high)" | 없음 | ✅ 200 | `high` |
| 4 | alias.name에 suffix 박기 | model="cc-codex-gpt54-high" | `name: "gpt-5.4(high)"` | ❌ `unknown provider for model cc-codex-gpt54-high` | (도달 못 함) |
| 5 | payload override | model="cc-codex-gpt54-high" | `payload.override` 블록 | ✅ 200 | `high` |

**왜 #4 (alias.name에 suffix) 실패:**
- `applyOAuthModelAlias` (`sdk/cliproxy/service.go:1446-1535`)이 `aliases[].Name`을 model registry에 정확히 lookup
- registry에는 `gpt-5.4`만 등록, `gpt-5.4(high)`는 미등록 → forward map miss → alias 자체가 등록 안 됨 → routing 실패
- 즉 `name` 필드는 반드시 registry에 존재하는 base model이어야 함

**핵심 결론 — 차등 가능 경로 정리:**

| 위치 | 메커니즘 | 호출 측 부담 | 적용 범위 |
|------|---------|-------------|----------|
| client | inbound payload에 `reasoning_effort` / `thinking` / `thinkingConfig` 필드 | 모든 호출 코드 수정 | 전부 |
| client | 모델명에 `(level)` suffix (단 alias 이름 base) | 호출 시 suffix 부착 | 전부 |
| server | `payload.override` 블록 (config) | 0 (config 1회) | 전부 |

**불가능한 경로 (모델 이름만으로 차등):**
- alias 이름 안에 `-high` 텍스트 넣기 → 단순 문자열, 파싱 안 됨 (§3 참조)
- alias.name 필드에 `gpt-5.4(high)` 넣기 → registry lookup 실패 (#4)

**즉 모델 이름만으로 차등 = 불가능.** 항상 client 변환 또는 server config 둘 중 하나 필요.

검증 후 config 원복 (`request-log: true`, payload override block, `name: gpt-5.4(...)` 모두 제거), backup 보존 (`merged-config.yaml.bak.20260428-145624`).

---

## 10. 플러그인 적용 방안 (vibeproxy-kit)

### 10.1 현재 플러그인 동작

`plugins/vibeproxy-kit/skills/setup-aliases/` skill이 두 surface 관리:

1. `~/.cli-proxy-api/config.yaml`의 `oauth-model-alias` 블록 — alias name → upstream name 매핑
2. `~/.zshrc`의 managed block — shell alias가 `ANTHROPIC_MODEL=<alias>(<level>)` 박음

차등은 **shell alias suffix 부착**으로만 동작:
```bash
alias cc-codex-gpt54-high="$_VP_PROXY ANTHROPIC_MODEL=cc-codex-gpt54-high(high) claude"
```

즉 §9.2의 #3 방법 (alias + suffix). client-side 변환.

### 10.2 한계

shell 거치는 caller에서만 차등 동작. 다음 경우 fallback:
- IDE 직접 설정 (Cursor, VS Code Anthropic 확장)
- 코드에서 직접 API 호출
- claude-code-router 등 외부 도구가 alias 이름 그대로 사용
- `ANTHROPIC_MODEL` env가 설정 안 된 환경

이 경우 alias 이름만 전달 → §9.2의 #1로 작동 → effort=medium fallback. 사용자 멘탈 모델("`-high`니까 high겠지")과 불일치.

### 10.3 개선 방향: server-side payload override 추가

`write_user_config.py`가 `oauth-model-alias`와 함께 `payload.override` 블록도 관리. 시각적 진실:

```yaml
oauth-model-alias:
  codex:
    - alias: cc-codex-gpt54-med
      name: gpt-5.4
    - alias: cc-codex-gpt54-high
      name: gpt-5.4
    - alias: cc-codex-gpt54-max
      name: gpt-5.4

payload:
  override:
    - models:
        - name: "cc-codex-gpt54-med"
          protocol: "codex"
      params:
        "reasoning.effort": "medium"
    - models:
        - name: "cc-codex-gpt54-high"
          protocol: "codex"
      params:
        "reasoning.effort": "high"
    - models:
        - name: "cc-codex-gpt54-max"
          protocol: "codex"
      params:
        "reasoning.effort": "xhigh"
```

이 경우:
- client가 alias만 전달해도 server에서 effort 박힘
- shell alias suffix 있어도 동일 값으로 수렴 → 충돌 없음
- IDE/Cursor/직접 API 모두 차등 동작

### 10.4 영향 받는 플러그인 파일

| 파일 | 변경 |
|------|------|
| `scripts/write_user_config.py` | managed marker 안에 `payload.override` 블록 쓰기/병합/제거 추가 |
| `${CLAUDE_PLUGIN_DATA}/config.json` state | `managed_payload_overrides` 필드 추가 (정리 시 제거 대상 추적) |
| `skills/setup-aliases/SKILL.md` | Phase 5/Phase 8에 payload override 단계 추가, gotcha 갱신 |
| `references/effort-levels.md` | 기존 effort 매핑 그대로 사용 (검증만) |
| `scripts/write_zshrc.sh` | 변경 불필요. shell suffix 유지 (server override가 priority라 backwards compat) |
| `scripts/discover.sh` | `~/.cli-proxy-api/config.yaml`의 `payload.override` 블록도 detect (기존 entry 충돌 방지) |

### 10.5 의사결정 포인트

1. **shell alias suffix 유지 여부:** 유지 권장. server override가 effort 박은 후에도 suffix는 무해(동일 값). 기존 사용자 zshrc 마이그레이션 비용 0.
2. **`xhigh` 그대로:** 코드(`provider/codex/apply.go:19`)에 `low/medium/high/xhigh` documented. 실측 outbound `reasoning.effort=xhigh` 200 OK. 단 OpenAI 측 실제 차등 동작은 별도 검증 필요(응답 token 수 비교 등).
3. **Codex 외 다른 backend:** Copilot 동일 alias 트리플 패턴(`cc-copilot-gpt54-med/high/max`) 보유 → 같은 알고리즘 적용 가능. Antigravity/Gemini는 다른 thinking 모델(budget-based) → 별도 검토.

---

## 부록: 검증 요약 (2026-04-28)

검증 환경: `references/CLIProxyAPI`, `references/vibeproxy`, `~/.cli-proxy-api/`. 검증 후 정정한 항목.

| 항목 | 원 문서 | 정정값 |
|------|--------|--------|
| `~/.cli-proxy-api/config.yaml` codex alias 라인 | 27-33 | 35-41 |
| `codex_executor.go` translate→thinking→payload 블록 | 165-176 | 167-177 |
| `codex_websockets_executor.go` 동일 블록 | 178-189 | 178-188 |
| `codex_claude_request.go` reasoning 변환 블록 | 283-313 | 302-317 |
| 경로 prefix | `raw/repos/` | `references/` |

추가 사실:

- `ParseLevelSuffix` valid 값: `minimal/low/medium/high/xhigh/max` 6개. `med`는 invalid (suffix.go:126-148).
- `modelAliasLookupCandidates` (oauth_model_alias.go:83-98)이 suffix 분리 후 base만으로 lookup → resolved에 다시 붙이는 흐름 명시.
- §8.2에 payload override yaml 예시 추가 (정확한 schema는 별도 확인).
- §8.1에 "default 수렴값 = `reasoning.effort=medium` + `summary=auto`" 명시.

검증되지 않은 가정: 없음. payload schema도 검증 완료 (`internal/config/config.go:306-342`).
