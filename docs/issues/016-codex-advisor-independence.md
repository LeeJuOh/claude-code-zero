# 이슈 016 — codex-advisor 검수자 독립성 복원 구현 (슬라이스 S1~S6, S3b)

> 상태: **needs-grill** (Q1~Q18·R1~R3 기존 결정 유지, 최종 검수의 추가 쟁점 처리 대기, 2026-09-14) · 생성: 2026-09-11
> 스펙 (PRD): `docs/specs/016-codex-advisor-independence.md` — 문제 정의, 유저 스토리, 결정 D1~D6, 그릴 확정 사항 전부 스펙 참조. 스펙과 이 문서가 다르면 스펙이 맞다.
> 대상 플러그인: `plugins/codex-advisor/` (v4.7.1 → v5.0.0, major — R2)
> 용어집: `docs/context/codex-advisor.md` — **Double-check independence / Verifier / Verifier payload / Author note / Hypothesis exclusion / Finding group / Autonomy policy** · ADR: 0004(전제), 0012(③ 구조)
> 원칙: 강제는 구조로, 판단은 fresh 컨텍스트로, fact는 스크립트로. 지시문은 "왜"를 설명하고 MUST를 남발하지 않는다(skill-creator 가이드).

> **구현 전 그릴:** 아래 [최종 검수 기록](#final-review-2026-09-14)의 F1~F9·I1~I3를 검토하고, 채택한 결정을 스펙과 해당 슬라이스에 반영한다. 검수 의견은 아직 설계 확정이 아니다. 처리 완료 기준은 해당 절 참조.

## Slices (tracer bullets)

의존 순서: S1 · S2 · S3 독립 → S3b(S3) · S4(S3) → S5a·S5b(S3, S3b, S4) → S6(S1, S2, S5a, S5b).

**착수 순서** (Q12, 그릴 2026-09-14 확정): **전부 순차, 한 에이전트** — `S3 → S3b → S4 → S1 → S2 → S5a → S5b → S6`. 새 코드(스크립트·훅·agent)를 먼저 만들고 SKILL.md는 뒤에서 한 번씩 고친다. 병렬은 하지 않는다 — S1·S2와 S5a·S5b가 같은 SKILL.md를 고쳐 충돌만 생기고 이득이 없다.

**슬라이스 수정 때 함께 반영 (그릴 불필요)**:
- **W2**: "verify/research는 이미 구조적으로 독립이었다"(스펙 D3 verify/research 절, S5b 본문) 삭제. 메인이 그 문서를 작성했다면 blind payload로 기억이 지워지지 않는다 — 두 스킬에도 Verifier 적용의 실질 이득이 있다.
- **W3**: "500행 이하", "MUST/NEVER 0건"은 편집 기준으로만 둔다. 독립성·판정 품질의 증거로 세지 않는다.

```
S1 ─────────────────────────────┐
S2 ─────────────────────────────┤
S3 ─┬→ S4 ──┬→ S5a ────────────┼─→ S6
    └→ S3b ─┴→ S5b ────────────┘
```

### S1 — ② 블록 정리: rescue `autonomy_policy`, research 중복 제거 (스토리 5, 6, 7, 16; 결정 D2)

**What to build**: rescue 프롬프트에서 `completeness_contract`·`verification_loop`·`action_safety` 세 블록을 지우고 `autonomy_policy` 한 블록으로 바꾼다. `--write`는 전문(보고형/변경형/확인 필요형 3구간 + follow-through + 소규모 변경 테스트 금지), read-only는 보고형·follow-through 행만 + 기존 `grounding_rules`. research는 `grounding_rules`를 지운다(`structured_output_contract`의 "facts / inferences 분리"와 중복). verify는 손대지 않는다. 남는 모든 블록 옆에 출처 주석(가이드 이름 + 절 이름 + 날짜)을 단다 — 다음 모델 가이드가 나왔을 때 무엇을 재동기화할지 알기 위해서다. 주석은 payload 바깥(heredoc·"copy exactly" 코드블록 밖)에 둔다 — 안에 두면 PROMPT_FILE에 섞여 들어간다. 프리뷰(Phase 1.5)의 블록 목록 설명도 새 집합으로 맞춘다.

왜 이렇게: 세 블록은 같은 말을 반복하고, `action_safety`의 "위험하면 먼저 알려라"는 되묻기를 부르는데, 되묻기가 곧 실패다 — Codex의 질문에 답할 상대가 없기 때문(companion은 서버 요청을 전부 `-32601`로 거절, `lib/app-server.mjs:155-160`)이고, 질문으로 끝난 턴도 `finalTurn.status === "completed"`라 성공으로 집계된다(`lib/codex.mjs:754`) — 작업 미완인데 상태는 성공. (Q10, 그릴 2026-09-14). 그래서 `autonomy_policy`는 확인을 요구하지 않는다 — task 원문이 명시한 것은 승인된 것으로 실행하고, 시키지 않은 위험 행동은 하지 않고 최종 보고에 적으며, 질문으로 턴을 끝내지 않는다(스펙 D2 블록 4·5행). 5.6 가이드 "지시는 한 번만, ask-first 반복은 불필요한 승인 요청을 부른다", Astra 가이드 "되묻기 성향 증가 → bias-to-action 문구 필요".

**Acceptance criteria** (seam: PROMPT_FILE — 결정론):
- [ ] rescue `--write` 고정 입력 → PROMPT_FILE에 `<task>` + `<autonomy_policy>`만, 삭제된 세 태그 0건
- [ ] rescue read-only 고정 입력 → `<task>` + `<autonomy_policy>`(보고형 행 + follow-through 행) + `<grounding_rules>`
- [ ] research 고정 입력 → PROMPT_FILE에 `<grounding_rules>` 0건, 나머지 4블록 골든과 일치
- [ ] verify PROMPT_FILE이 변경 전 골든과 byte 동일
- [ ] 세 스킬 SKILL.md에 블록마다 출처 주석 존재, `gpt-5-4-prompting` 주석은 유지된 블록에만
- [ ] `autonomy_policy` 본문에 되묻기 유발 구절(`call out`, `before taking`, `ask first`, `ask the user`, `Require confirmation`) 0건, "already approved"·"Never end with a question" 각 1건(Q10, 그릴 2026-09-14). 단어 경계로 판정한다 — `task`·`without asking` 같은 부분일치는 해당 없음

**Blocked by**: None — can start immediately.

### S2 — ① 가설 제외 + 프리뷰 항상 + verify focus 인자 (스토리 1~4, 9; 결정 D1)

**What to build**: adversarial(focus)·rescue(task, Claude가 작문할 때)·research(topic)·verify(focus — 신설) 네 스킬의 Phase 1에 **Hypothesis exclusion** 규칙을 넣는다. Claude가 Codex로 보낼 문장을 쓸 때 증거(범위·증상·재현·로그·유저 원문)와 초점(볼 영역)은 남기고 가설(원인 주장, 의심 `file:line` 단정, 기대 답)은 뺀다. 기준은 한 줄 — 주장이 있으면 가설, 영역만 있으면 초점 — 그리고 사례 3~5개를 표로 박는다(예: "login handler 봐줘"=초점 / "auth.ts:42 null check 누락으로 뚫림"=가설 / "빈 비번으로 POST /login 하면 500"=증거). 출처를 가리지 않는다 — 유저가 직접 쳤든 Claude가 대신 호출했든 같은 규칙, 판별 로직 없음(Q11, 그릴 2026-09-14; 스펙 D1). 유저가 가설을 넣고 싶으면 프리뷰의 "제외된 것 넣기"로 복구. rescue task 원문은 요구사항이라 증거로 취급, verbatim 유지(스토리 4). Phase 1.5 프리뷰에 `Excluded (hypothesis):` 줄을 추가해 뺀 것을 보여주고 "Needs changes"로 되돌릴 수 있게 한다. `--no-preview` 플래그를 네 스킬에서 삭제한다(argument-hint, Phase 1 파싱, Phase 1.5 "skip" 문장, `companion-usage.md` 언급) — 분류가 Claude 판단(SOFT)이라 프리뷰가 유일한 검사 창인데 플래그가 그 창을 우회하기 때문이다. headless에서는 프리뷰 질문에 답할 호스트가 없어 Phase 1.5에서 멈춘다 — 감수(Q7, 그릴 2026-09-14; 종료 코드는 스킬이 정하지 않는다). verify에 positional focus text를 받아 `<task>`의 Focus areas 뒤에 붙인다. verify 파싱 순서: 문서 경로 → 남은 텍스트 = focus. **verify·research의 `resume [follow-up]` 키워드 삭제** (그릴 2026-09-13, Q13; 스펙 D1): 검수가 이전 Codex 스레드(가설 잔존, rescue 스레드일 수 있음)를 이으면 독립이 아니다. `skills/codex-verify/SKILL.md:49`, `skills/codex-research/SKILL.md:50`의 키워드 줄과 그 파생(`--resume-last` 전달, README 언급)을 지운다. rescue의 `--resume-last`는 손대지 않는다.

지시문 작성 지침: "왜"를 먼저 쓴다 — 검수자에게 답을 주면 검수자는 답을 확인한다(anchoring). 규칙 나열보다 대비 예시가 낫다. 이미 있는 `Original → focus` 변형 예시를 확장하면 된다.

**Acceptance criteria** (seam: 프리뷰 텍스트 + PROMPT_FILE/focus 인자 — 분류는 LM이라 골든 5건):
- [ ] `evals/evals.json`에 가설 포함 입력 5건(초점만 / 가설만 / 혼합 / 유저 직접 호출에 가설 / Claude 자체 호출에 가설) + assertion
- [ ] 가설 제외 대상 4건(가설만 / 혼합 / 유저 직접 호출 / Claude 자체 호출)은 프리뷰에 `Excluded (hypothesis):` 줄이 있고 그 문장이 focus 인자·PROMPT_FILE에 없음 — 유저 직접 호출과 Claude 호출의 결과가 동일(Q11)
- [ ] "초점만" 입력은 `Excluded` 줄이 비어 있고 focus가 유저 의도를 담음(빈값 아님)
- [ ] 프리뷰에서 "제외된 것 넣기"를 고르면 제외분이 focus 인자·PROMPT_FILE에 복구됨
- [ ] rescue task 원문(요구사항)은 PROMPT_FILE `<task>`에 verbatim — 가설 제외 대상 아님(스토리 4)
- [ ] 네 SKILL.md에 "유저가 직접 쳤는지" 판별 지시 0건
- [ ] 네 스킬 SKILL.md·README·`companion-usage.md`에 `--no-preview` 0건
- [ ] verify·research SKILL.md·README에 `resume` 키워드 0건, `--resume-last` 0건 (rescue는 유지)
- [ ] verify `codex-verify doc.md "security angle"` → PROMPT_FILE Focus areas에 그 문구 존재, 인자 없으면 기존 골든과 동일
- [ ] 각 SKILL.md 500행 이하 유지

**Blocked by**: None — can start immediately.

### S3 — ③-a 인용 존재·묶음 스크립트 (스토리 10, 13; 결정 D3 단계 2)

**What to build**: `scripts/` 아래 결정론 스크립트 하나. 입력은 companion `--json` 출력 파일 + 스킬 종류 + 리포 루트. finding 추출은 스크립트가 한다(스펙 D3 단계 1, 그릴 2026-09-12): adversarial은 `result.findings[]`를 그대로, review는 `codex.stdout`의 Codex 고정 틀(`Full review comments:` / `Review comment:` 다음 `- {title} — {abs_path}:{start}-{end}` + 들여쓴 body)을 정규식으로 자른다. 틀이 안 맞으면(헤더 없음, 항목 행 0개인데 본문 있음, 행이 패턴 불일치) `parse_error`로 비정상 종료 — `uncited`로 뭉개지 않는다. rescue read-only는 자르지 않는다: `rawOutput` 전체를 group 하나(`group_id: "all"`, `status: whole`)의 payload로 쓴다. 출력은 finding마다 `{index, file, line_start, line_end, status: ok|missing|uncited, group_id}` JSON. `uncited`는 인용 자체가 없음, `missing`은 파일이 없거나 줄 범위가 파일 길이를 벗어남. 입력에 검수 대상 ref(`--scope branch`면 HEAD, 작업 트리 검수면 생략)를 받아 인용 파일마다 `git diff --quiet <ref> -- <file>`로 작업 트리 변동을 확인하고, 변동된 파일의 `missing`은 `status: unverifiable, reason: worktree-drift`로 낸다(False Positive 아님 — 스펙 D3 불일치 규칙, 그릴 2026-09-12). 출력 최상위에 `worktree_drift: [files]`를 둔다. 같은 파일이면 같은 `group_id`(Q17, 그릴 2026-09-14; 줄 겹침 조건 삭제). group당 finding 최대 5개·payload 본문 최대 6,000자 — 먼저 걸리는 쪽에서 줄 순서로 쪼갠다. 다른 파일은 묶지 않는다. `group_id`는 `ok`에만 주고 `missing`·`uncited`는 `null`. `file`은 절대 경로·리포 상대 경로를 모두 받아 리포 상대로 정규화한다. 그 외 판단은 하지 않는다 — 이 스크립트는 fact만 다룬다(`evidence-gates`: fact는 코드, judgment는 AI). 같은 실행에서 **Verifier payload**도 쓴다: `ok` group마다 `<out-dir>/group-<id>.json`(finding 원문 + 인용 + 존재 결과 + 판정 규칙 경로 — Verifier가 받을 텍스트 전부)과 `<out-dir>/manifest.json`(payload별 sha256). 메인은 이 파일들을 만들지도 고치지도 않는다 — S3b 훅이 해시로 확인한다(스펙 D3 Verifier payload, 그릴 2026-09-12). payload는 항목마다 ID를 매긴다(Q2 출력 계약). 모드 셋: 기본(review/adversarial/rescue read-only — finding 자르기 + 인용 검사 + group payload), `--mode doc`(verify/research — 인용 검사 없이 문서 경로·Codex 결과 파일 경로·규칙 경로만 담은 payload 1개 + manifest), `--mode diff`(rescue `--write` — 실행 전 스냅샷 대비 `git diff`를 파일로 쓰고 경로 + 유저 task에서 잘라 번호 매긴 요구사항 항목을 담은 payload 1개). 문서 본문은 어느 모드에서도 payload에 들어가지 않는다 — 경로만(스펙 D3 원문·diff 전달, 그릴 2026-09-12). 스크립트가 도는 동안 메인 Claude는 소스를 읽지 않는다는 점을 SKILL.md에 설명할 때 근거로 쓰인다.

**Acceptance criteria** (seam: 스크립트 stdout — 결정론, 단위 테스트):
- [ ] adversarial fixture JSON 1개(ok 2·missing 1·uncited 1·겹침 2쌍) → 기대 JSON과 일치
- [ ] review fixture(`codex.stdout` 텍스트, `Full review comments:` 3건 + body 여러 줄 + 절대 경로) → finding 3개, 경로가 리포 상대로 정규화, body 원문 보존
- [ ] review fixture 1건짜리(`Review comment:` 헤더) → finding 1개
- [ ] 틀이 깨진 review 텍스트(항목 행에 ` — ` 없음) → `parse_error` 비정상 종료 + stderr, `uncited` 0건, 부분 출력 없음
- [ ] rescue read-only fixture → payload 1개, 내용 == `rawOutput` byte 동일
- [ ] `--mode doc` fixture(문서 1개 + Codex 결과 파일) → payload 1개, 문서 본문 0줄 포함, 경로 3개 + manifest
- [ ] `--mode diff` 임시 저장소(스냅샷 후 파일 수정 + 새 파일) → diff 파일에 수정·새 파일 모두, payload에 diff 경로 + 요구사항 항목 ID
- [ ] 같은 파일 finding 2개가 같은 `group_id`, 다른 파일은 다른 `group_id`
- [ ] 같은 파일 finding 7개 → group 2개(5+2), 줄 순서 유지; 본문이 긴 finding 3개(합계 6,000자 초과) → 자 상한에서 쪼개짐
- [ ] 임시 저장소: 대상 HEAD엔 4행이 있고 작업 파일을 1행으로 고친 뒤 4행 인용 → `unverifiable` + `worktree-drift`, `missing` 아님. 작업 트리가 HEAD와 같으면 `missing`
- [ ] 잘못된 JSON 입력 → 비정상 종료 + stderr 메시지, 부분 출력 없음
- [ ] 같은 fixture → `ok` group 수만큼 `group-<id>.json` 생성, `missing`·`uncited`는 payload 없음
- [ ] `manifest.json`의 sha256이 각 payload 파일과 일치, `group-<id>.json` 하나를 고치면 불일치
- [ ] 테스트 스크립트가 `scripts/` 옆에 있고 `python3`만으로 실행

**Blocked by**: None — can start immediately.

### S3b — ③-a′ Verifier payload 훅 (스토리 8, 11; 결정 D3 Verifier payload)

**What to build**: `hooks/hooks.json`에 PreToolUse 항목(matcher `Agent`) 하나와 `hooks/verifier-payload.mjs`. 훅은 stdin의 `tool_input.subagent_type`이 Verifier(`codex-advisor:verifier` — S4의 agent 이름과 일치)가 아니면 아무것도 내지 않고 끝난다. Verifier면 `tool_input.prompt`에서 payload 경로(`group-<id>.json`의 절대 경로 또는 리포 상대 경로) 하나를 찾아, 옆의 `manifest.json`에서 sha256을 대조하고, 일치하면 `hookSpecificOutput.updatedInput`으로 **`prompt`를 파일 내용으로 통째 교체**(다른 필드 `description`·`subagent_type`·`run_in_background`는 그대로 되돌려 보내고, **`model`은 제거**한다 — 메인이 검수자 모델을 고르는 통로(해석 순서 1위) 차단, R3 그릴 2026-09-14. `updatedInput`은 입력 전체를 교체한다). 경로가 없거나, 파일이 없거나, 해시가 다르면 `permissionDecision: "deny"` + 이유. 기존 SessionStart 훅은 그대로.

왜 훅인가를 파일 상단에 두 문장으로 쓴다: Verifier를 띄우는 prompt는 메인(코드 저자)이 쓰는데, 저자의 한 줄이 섞이면 fresh 컨텍스트가 무의미해진다. 지시는 그걸 못 막고 훅은 막는다(스펙 D3, ADR 0012 Amendment). 메인이 prompt에 덧붙인 텍스트는 버려진다는 사실을 SKILL.md에도 한 줄 적는다 — 메인이 "왜 내 말이 안 갔지" 하지 않도록.

**Acceptance criteria** (seam: 훅 stdin → stdout — 결정론, 단위 테스트):
- [ ] `subagent_type` ≠ Verifier인 stdin → stdout 비어 있음, exit 0
- [ ] Verifier + 유효 경로 + 해시 일치 → `updatedInput.prompt` == 파일 내용 byte 동일, 나머지 필드 원본 유지, `permissionDecision: "allow"`
- [ ] Verifier + `tool_input.model: "haiku"` → `updatedInput`에 `model` 키 없음(R3); 비-Verifier 호출의 `model`은 건드리지 않음
- [ ] prompt에 경로 앞뒤로 임의 문장을 덧붙여도 결과 동일(덧붙인 문장 0건)
- [ ] 경로 없음 / 파일 없음 / 해시 불일치 → 각각 `deny` + 구별되는 이유 문자열
- [ ] 통합 1회: `claude -p --plugin-dir ./plugins/codex-advisor --allowedTools Agent`로 Verifier를 띄운 stream-json에서 서브에이전트가 받은 첫 `user` 메시지가 payload 파일 내용과 일치(foreground 호출 — `run_in_background: false`)

**Blocked by**: S3 — `manifest.json` 형식과 payload 파일명. S4 — agent 이름.

### S4 — ③-b Verifier 에이전트 + evaluation.md 재편 (스토리 8, 9, 11, 18; 결정 D3 단계 3)

**What to build**: `agents/verifier.md`를 만든다. 역할: **Finding group** 하나를 판정한다. 입력은 finding 원문 + 인용 + S3 존재 결과 + 판정 규칙 참조. 도구는 Read·Grep·WebFetch(그릴 2026-09-13, Q5 — research payload의 URL 출처를 열기 위해; payload에 인용된 URL만, 못 열면 `Unverifiable(external-source)`, WebFetch 요약에 "없다"는 반박 근거로 안 침). 출력은 `{verdicts: [{id, classification: Agreed|Disputed|Nuanced|Unverifiable, severity, evidence, reason}]}` — payload가 번호 매긴 항목마다 1개(스펙 D3 출력 계약, 그릴 2026-09-12). PASS/FAIL·Agreement 요약은 검수자가 내지 않는다. 프롬프트는 3원칙을 따른다 — 기본 판정은 Disputed(반박 근거를 봤으면 reject), 원 finding에 commitment 없음(Codex 편도 안 듦), 출력은 JSON만. 여기에 하나 더: 인용 범위 안에서 증거를 못 찾으면 `Unverifiable`이고 evidence에 무엇이 부족했는지 적는다 — 반박한 것과 못 본 것을 유저가 구별해야 한다(스펙 D3 Unverifiable, 그릴 2026-09-12). 문구는 `references/compound-engineering-plugin/.../validator-template.md`를 참고하되 그대로 복사하지 않는다. `references/evaluation.md`는 규칙의 단일 원본으로 남기고 에이전트가 참조한다(두 곳에 복사해 갈라지지 않도록). `evaluation.md`의 "Self-Bias Awareness" 절은 삭제한다 — Verifier에겐 자기 코드가 없어 해당 없고, 열화 모드 라벨이 그 자리를 대신한다. rescue `--write`용 입력 변형(요구사항 항목 + diff, 항목별 충족 판정 + `side-effect-N` 추가 허용)과 verify/research용 입력 변형(문서 + Codex 지적 항목, 인용 확인 포함, `severity` 통과; research는 `missing-N` 추가 허용 — Q5, 그릴 2026-09-13)도 같은 에이전트가 payload 안의 지시로 받는다 — 스키마는 하나. `model:`은 박지 않는다(스펙 012).

왜 서브에이전트인가를 파일 상단에 두 문장으로 쓴다: 메인 세션은 그 코드를 쓴 당사자라 옹호할 것이 있고, 지시로는 그 사전 오염을 못 지운다(ADR 0012).

**Acceptance criteria** (seam: 에이전트 JSON — 스키마 + 명백 사례):
- [ ] `evals/evals.json`에 fixture 4건 — 명백히 맞는 finding / 존재하지 않는 함수를 인용한 finding / 사실이지만 맥락이 빠진 finding / 인용 줄만으로는 판정 불가한 finding(증거가 다른 파일에 있음)
- [ ] 네 출력 모두 스키마를 만족하는 JSON 한 덩어리, 산문 0건
- [ ] 기대 분류: 1 → Agreed, 2 → Agreed면 실패, 3 → Nuanced, 4 → Unverifiable. 네 건이 같은 분류면 실패(전부 Disputed 포함)
- [ ] Disputed·Unverifiable 출력의 evidence가 비어 있지 않음(반박 근거 / 부족한 증거)
- [ ] finding 2개짜리 group fixture → `verdicts` 길이 2, ID가 payload와 일치
- [ ] rescue `--write` fixture(요구사항 2개 + 부작용 있는 diff) → 요구사항 ID 2개 + `side-effect-1`
- [ ] 출력에 PASS/FAIL·Agreement 문자열 0건
- [ ] 에이전트 프롬프트에 3원칙이 각각 한 번씩 있고, MUST/NEVER 대문자 0건
- [ ] `evaluation.md`에 Self-Bias Awareness 0건, 분류 규칙은 evaluation.md에만 있고 에이전트는 경로로 참조
- [ ] `evaluation.md`에 "Cross-Model Comparison"·"Additional Findings"·`Claude additional` 0건(Q8, 그릴 2026-09-14); 템플릿 Summary 줄은 Agreed/Disputed/Nuanced/Unverifiable/Unverified 집계
- [ ] `evaluation.md`에 `Author note (main session)` 형식이 정의돼 있고 "판정은 바꾸지 않는다"가 함께 적힘(Q18)
- [ ] 에이전트 frontmatter에 `model:` 없음(`inherit`도 없음 — 유저 `CLAUDE_CODE_SUBAGENT_MODEL` 존중, R3), tools는 Read·Grep·WebFetch 세 개
- [ ] research fixture(URL 출처 1건 + 로컬 파일 출처 1건): URL 항목은 Agreed/Disputed/Unverifiable 중 하나이며 Unverifiable이면 사유 `external-source`; 스킬별 도구 분기 0건
- [ ] research fixture(핵심 항목 하나가 명백히 빠진 결과) → `missing-1` verdict 1개 이상, evidence에 무엇이 빠졌는지
- [ ] 묶음 관대함 비교(Q17): 같은 finding 5개를 group 1개로 준 결과와 group 5개로 준 결과의 Agreed 수를 기록 — 통과 기준 아님, 상한 5 조정 근거

**Blocked by**: S3 — 입출력 계약(`status`, `group_id` 필드명)을 공유.

### S5a — ③-c Phase 4 배선: 코드 경로 3스킬 (스토리 8, 11, 12, 13, 14; 결정 D3 단계 1·4·5)

**What to build**: review·adversarial·rescue의 Phase 4를 교체한다. 메인은 Codex JSON을 파싱해 finding 목록을 뽑고(소스는 안 읽음) → S3 스크립트 실행(인용 검사 + payload 파일 생성) → `ok` group마다 `Agent(subagent_type: Verifier, prompt: <payload 경로>)`로 Verifier를 띄우되(custom agent 신규 실행 — `fork`는 대화 전체를 상속하므로 금지. CLAUDE.md·git status는 공유되며 이는 감수; Q16, 그릴 2026-09-14) 한 번에 10 group까지, 완료 후 다음 묶음(Q17, 그릴 2026-09-14 — 동시 서브에이전트 한도 20)(S3b 훅이 prompt를 payload 내용으로 교체 — 메인이 덧붙인 말은 도착하지 않는다) → JSON을 모아 보고서를 쓴다. 검수자 JSON의 `verdicts`를 ID로 finding에 되붙이고(빠진 ID·모르는 ID가 있는 group은 `Unverifiable`/`contract-violation`), `missing` → False Positive, `uncited` → Uncited, `unverifiable`(worktree-drift) → Unverifiable은 스크립트 결과를 그대로 적고, 스크립트가 `parse_error`면 Phase 4를 진행하지 않고 보고서에 "Codex 출력 형식이 바뀜 — 판정 없음"을 적는다(메인이 대신 finding을 뽑지 않는다). `worktree_drift`가 비어 있지 않으면 보고서 상단에 "리뷰 후 작업 트리가 바뀜: <files>" 한 줄. 판정은 바꾸지 않는다 — 동의하지 않으면 그 finding 아래 `Author note (main session): <이견 + 근거>` 한 줄만 붙인다(Q18, 그릴 2026-09-14; 스펙 D3 단계 4). 보고서 상단에 `Verifier: fresh subagent (N groups)`. Agent 호출이 실패한 group은 `Unverified — Verifier 실행 실패`로 적고 메인은 판정하지 않는다(Q6, 그릴 2026-09-14; 스펙 D3 단계 5). 유저가 요청하면 같은 payload 경로로 재호출, 자동 재시도 없음. rescue `--write`는 finding 대신 diff를 Verifier에 보내고, Verifier가 diff 주변을 Read·Grep으로 볼 수 있음을 명시한다. 그 diff는 Phase 2 실행 직전 `git stash create`(작업 트리를 커밋 객체로 스냅샷, 트리는 안 건드림)로 잡은 커밋 대비 `git diff <snapshot>`이고, 새 파일은 실행 전후 `git ls-files --others --exclude-standard` 차집합 — 기존 `PRE_LIST`(파일명만) 방식을 대체한다(스펙 D3 rescue 절, 그릴 2026-09-12). finding 0개면 Verifier 0개. 크기 임계 없음 — finding 1개여도 띄운다. Read 차단 훅은 만들지 않는다(S3b payload 훅만).

**Phase 3 WAIT 도구 교체** (R1, 그릴 2026-09-14 — 016 밖의 기존 결함이지만 같은 파일·같은 절): review·adversarial의 `allowed-tools`와 Phase 3에서 `BashOutput`·`KillShell`을 지운다. 둘 다 현재 Claude Code에 없다(공식 `tools-reference` 도구 표 0건, 2026-09-14 수령·v2.1.270 세션 도구 목록에도 없음). 대기는 폴링 루프가 아니라 백그라운드 명령 완료 알림 → 출력 파일 `Read`; 30분 상한은 `TaskStop`(`allowed-tools`에 추가). `TaskOutput`은 deprecated라 쓰지 않는다. Execution Contract 표의 Phase 3 행도 같이.

SKILL.md 지시문은 "메인은 집계만 한다, 판정은 Verifier가 한다"를 이유와 함께 쓰고, 기존 "Read ONLY the file:line Codex cited" 절은 삭제한다(열화 모드 없음 — Q6). 대신 한 문장: "Agent 호출이 실패한 group은 판정하지 말고 `Unverified`로 적는다." Execution Contract 표의 Phase 4 행도 새 구조(집계 + Verifier 기동)로 바꾼다.

**Acceptance criteria** (seam: 저장된 보고서 파일 — `Verifier:` 라벨은 결정론):
- [ ] fixture Codex JSON(S3의 것)을 Phase 3 결과로 주입한 실행에서 보고서에 `Verifier: fresh subagent` + group 수
- [ ] `missing` finding이 보고서에서 False Positive, `uncited`가 Uncited
- [ ] 보고서 집계에 `Unverifiable` 건수가 Disputed와 별도 행으로 존재
- [ ] `--disallowedTools Agent`로 실행 → 전 group `Unverified — Verifier 실행 실패`, 메인 Read 호출 0회, `Self-verified` 문자열 0건
- [ ] SKILL.md에 메인이 소스를 읽어 판정하는 지시 0건("Read ONLY the file:line" 포함)
- [ ] group 12개 fixture → Agent 호출이 10개 완료 후 2개 추가(동시 10 초과 없음), `Concurrent subagent limit` 문자열 0건
- [ ] finding 0개 입력에서 Agent 호출 0회
- [ ] `parse_error` fixture 실행 → 보고서에 형식 변경 라벨, Agreed/Disputed 판정 0건, Agent 호출 0회
- [ ] 검수자 JSON에서 ID 하나를 뺀 fixture → 해당 group이 보고서에서 Unverifiable(contract-violation)
- [ ] 세 SKILL.md의 Verifier 호출 지시가 "prompt = payload 경로"이고, 판정 힌트를 넣으라는 문구 0건
- [ ] 세 SKILL.md의 Verifier 호출이 `subagent_type: Verifier`이고 `fork` 0건
- [ ] 세 SKILL.md에 "판정을 바꾸지 말고 Author note로 적는다" 지시가 있고, Cross-Model/Additional Findings 작성 지시 0건
- [ ] rescue `--write` 실행 보고서에 diff 판정(충족/이탈/부작용) 항목 존재
- [ ] rescue `--write`: 실행 전 미커밋 수정 1건 + Codex가 새 파일 1개 생성 → Verifier payload의 diff에 유저 수정 0건, 새 파일 포함
- [ ] 작업 트리를 리뷰 후 고친 fixture 실행 → 보고서에 "작업 트리가 바뀜" 라벨 + 해당 finding Unverifiable
- [ ] 세 SKILL.md Execution Contract 표 Phase 4 행에 "Read ONLY files/lines Codex cited" 0건
- [ ] review·adversarial SKILL.md에 `BashOutput`·`KillShell`·`TaskOutput` 0건, `allowed-tools`에 `TaskStop` 존재, Phase 3에 "완료 알림 → 출력 파일 Read" 서술(R1)
- [ ] 세 SKILL.md 500행 이하

**Blocked by**: S3, S4.

### S5b — ③-c Phase 4 배선: 문서 경로 2스킬 (스토리 8, 11, 12; 결정 D3)

**What to build**: verify·research의 Phase 4를 교체한다. 스크립트는 쓰지 않는다 — 입력이 문서 하나라 Verifier가 헤맬 공간이 없고 섹션/URL 인용은 `file:line`이 아니다. URL 출처는 Verifier가 WebFetch로 직접 연다(Q5, 그릴 2026-09-13; 스펙 D3 **URL 출처 검수**). Verifier에 문서 원문 + Codex 결과를 넘기고(메인 컨텍스트는 여전히 문서를 안 본다 — blind payload 유지) 인용 확인까지 Verifier가 한다. research의 synthesis("Codex가 놓친 것 채우기")는 메인이 아니라 Verifier가 `missing-N` 항목으로 낸다(Q5, 그릴 2026-09-13) — 기존 Phase 4의 메인 보충 작성 절은 삭제하고 보고서는 `missing-N`을 "Verifier가 추가한 항목"으로 따로 집계한다. 호출 형태는 S5a와 같다 — prompt는 payload 경로 하나, S3b 훅이 교체. payload는 S3 스크립트 `--mode doc`이 쓴다(문서 경로 + Codex 결과 파일 경로 + 규칙 경로, 본문 없음) — 인용 검사만 안 할 뿐 파일 생성은 같은 스크립트다(Q4, 그릴 2026-09-12). 라벨·실행 실패 처리(`Unverified`, 메인 판정 없음)는 S5a와 동일. 이 두 스킬은 이미 구조적으로 독립이었으므로 이득은 "다섯 스킬의 판정 주체가 같다"는 일관성이다.

**Acceptance criteria**:
- [ ] verify 실행 보고서에 `Verifier: fresh subagent`, 메인 컨텍스트에 문서 본문 미노출(Bash stdout에 문서 0줄)
- [ ] research 동일 + 보고서에 `missing-N` 항목이 별도 절로 집계되고, SKILL.md Phase 4에 메인이 Codex 결과 본문을 읽어 보충하는 지시 0건
- [ ] 두 SKILL.md에 S3 스크립트 호출은 `--mode doc` 1회뿐(인용 검사 모드 호출 0건)
- [ ] verify SKILL.md(Phase 4·Gotchas)에 Self-Bias / "I authored" / "Already considered" 문구 0건
- [ ] verify fixture(P1 Agreed 1건) → FAIL, (P1 Disputed + P2 Agreed) → PASS, (P1 Unverifiable) → FAIL + "미검증 P1" 사유 — PASS/FAIL 규칙은 `evaluation.md`에만 있고 SKILL.md는 참조
- [ ] `--disallowedTools Agent`로 실행 → `Unverified`, 메인이 문서·Codex 결과를 Read한 호출 0회

**Blocked by**: S3, S4 (S3는 계약 어휘만 공유).

### S6 — 마무리: `spark` 삭제, 문서·설명·버전 (스토리 15, 17, 19, 20; 결정 D4, D5, D6)

**What to build**: `apply-codex-config.py`의 `MODEL_ALIASES`에서 `spark`를 지우고 README·rescue SKILL.md의 spark 언급을 지운다 — 스펙 012가 남긴 유일한 모델 지식이며 지금은 캐시에 없는 모델을 가리킨다. README "How a call is translated"의 double-check 단계를 Verifier 구조로, "Independent double-check" 항목을 read/write 양면으로 고쳐 쓴다. `plugin.json`·`marketplace.json` description의 "Claude fact-checks every finding"을 fresh-context verifier 표현으로 바꾼다(둘 일치). `marketplace.json` 4.7.1 → 4.8.0. 용어집·ADR은 그릴에서 이미 갱신됨 — 구현 중 어휘가 바뀌었으면 여기서 맞춘다.

**Acceptance criteria**:
- [ ] `HOME=<tmp> apply-codex-config.py spark ""` → `<tmp>/.codex/config.toml`에 `spark` 그대로, 확장 0건. 실제 `~/.codex/config.toml`은 건드리지 않는다
- [ ] 플러그인 전체에 `gpt-5.3-codex-spark` 0건
- [ ] README에 `--no-preview` 0건, `Verifier` 설명 존재, "holds off reading" 류 구지시문 설명 0건, "Self-bias guardrail" 항목 0건
- [ ] 두 매니페스트 description 일치, "fresh" 또는 "independent verifier" 포함
- [ ] `marketplace.json` 5.0.0 (R2, 그릴 2026-09-14 — `--no-preview`·`resume` 삭제는 breaking)
- [ ] `unset CLAUDECODE && claude plugin validate .` 통과

**Blocked by**: S1, S2, S5a, S5b — 문서가 최종 동작을 기술.

## 검증 방법 (공통)

- **수동 실행이 기본** (Q7, 그릴 2026-09-14): S2 이후 adversarial·rescue·verify·research는 Phase 1.5 프리뷰에서 항상 멈추므로 `claude -p`로는 Phase 2 이후를 못 돌린다. 검토·기각: 테스트용 PreToolUse 훅으로 AskUserQuestion에 답 주입(테스트 파일 추가), Agent SDK `canUseTool` 하네스(SDK 의존), `--no-preview` 삭제 취소(검사 창 우회 경로 부활). 확정: 대화형 세션(`claude --plugin-dir ./plugins/codex-advisor`)에서 사람이 프리뷰에 답하고 파일 산출물(PROMPT_FILE, 보고서)을 검사한다. 수용기준의 "고정 입력 → 산출물" 형식은 유지 — 실행만 손으로.
- 프리뷰가 없는 review와, Phase 1.5를 지난 뒤의 산출물 검사(골든 비교)는 이슈 011의 기법(`claude -p --plugin-dir`)을 그대로 쓸 수 있다.
- S5a/S5b의 fixture 주입: 대화형 세션에서 테스터가 "Phase 3 결과로 `<fixture 경로>`를 쓰고 Phase 4부터 진행"이라고 지시한다. 실 Codex 1회는 마지막에.
- 종료 코드: 스킬은 부모 `claude` 프로세스의 종료 코드를 정할 수 없다(Bash `exit 1`은 그 도구 호출의 실패일 뿐). 자동화가 필요해지면 그때 하네스가 보고서 상태를 읽어 정한다 — 이 이슈 범위 밖.
- `evals/evals.json`은 skill-creator 스키마(prompt, expected_output, assertions). 스킬별 `<skill>-workspace/`는 커밋하지 않는다.
- 마켓플레이스 설치본과 충돌 방지: `claude plugin disable codex-advisor@claude-code-zero` 후 테스트.

## Out of Scope (스펙 참조)

Official 플러그인 포크·병합, adversarial 프롬프트 수정, Read 차단 PreToolUse 훅(Verifier payload 훅은 S3b), 크기 임계값, AGENTS.md 실측, `--no-preview` 대체 플래그.

<a id="final-review-2026-09-14"></a>

## 최종 검수 기록 — 2026-09-14, Codex

**판정:** fresh Verifier로 옮기는 방향은 타당하나, 현재 계약으로 구현 착수하기에는 추가 결정이 필요하다. 이 절은 Claude Code 세션에서 그릴할 검수 기록이다. 기존 Q·R 결정의 자동 번복이나 아래 수정 후보의 승인을 뜻하지 않는다.

**검수 범위·증거:** 별도 1차 검수 보고서는 제공되지 않아 이슈·스펙에 반영된 Q·R·W를 기존 검수 결과로 대조했다. Claude Code 공식 문서는 `llms.txt`에서 시작해 해당 페이지를 확인했고, 현재 플러그인·`references/codex-plugin-cc` 코드와 임시 Git 저장소 재현을 사용했다. F3·F4의 Git 조건은 재현했다. F1·F8·F9는 공식 동작에서 도출한 설계 지적이며 Claude Code 런타임 재현은 하지 않았다. 플러그인 구현·수정은 수행하지 않았다.

### 기존 검수 결과 재판정

| 기존 항목 | 재판정 · 근거 |
|---|---|
| R1 — WAIT 도구 교체 | 타당. 현재 [도구 문서](https://code.claude.com/docs/en/tools-reference)에 맞춰 완료 알림·출력 파일 Read·TaskStop으로 교체. 다만 30분 상한의 발동 경로는 I3에서 보완한다. |
| R2 — 5.0.0 major | 타당. `--no-preview`·검수용 `resume` 삭제는 저장소의 breaking 변경 기준에 해당한다. |
| R3 — 모델 생략·호출 model 제거 | 타당. 현재 [모델 선택 순서](https://code.claude.com/docs/en/sub-agents#choose-a-model)와 [updatedInput 전체 교체](https://code.claude.com/docs/en/hooks#pretooluse-decision-control)에 부합. 모델 우선순위는 버전 의존이며, 사용자 FORCE 설정도 있으므로 보편적인 고정 순서로 기술하지 않는다. |
| Q6·Q13 — 메인 대체 검수·검수용 스레드 재사용 폐지 | 타당. 실패 시 저자 검수로 돌아가거나 작성 스레드를 이어받으면 독립성 목적을 훼손한다. |
| Q10 — 질문 실패의 원인 교정 | 타당. companion `lib/app-server.mjs`의 `handleServerRequest`는 서버 요청을 거절하고, `lib/codex.mjs`의 `buildResultStatus`는 턴 완료 상태만 본다. `approvalPolicy=never` 자체가 질문을 종료시킨다는 설명은 부정확하다. |
| Q15·Q18 — Unverifiable·Author note | 타당. 반박 성공과 증거 부족을 구별하고 저자의 이견을 판정과 분리한다. |
| Q16 — fresh 컨텍스트 범위 | 사실관계 타당. [초기 컨텍스트](https://code.claude.com/docs/en/sub-agents#what-loads-at-startup)는 대화 이력을 제외하지만 CLAUDE.md 등을 포함한다. 공유 문서에 저자의 결론이 있으면 영향이 남으므로, "공유되어도 무해"는 보장이 아니라 수용한 한계로 기술한다. |
| Q17 — 묶음·동시 실행 상한 | 방향 타당. [동시 실행 한도](https://code.claude.com/docs/en/sub-agents#concurrent-subagent-limit) 20은 기본값이며 설정으로 달라진다. 5개·6,000자·동시 10개는 품질 보장 수치가 아닌 타협값이다. |
| Q1~Q5·Q14 — 추출·payload·출력·diff | 문제 진단은 타당하나 해결 계약이 미완성. 추가 쟁점 F1~F8에서 구체화한다. |
| Q7·Q11 — 프리뷰·가설 제외 | 사용자 선택으로 유지 가능. 실제 사람 확인 보장은 F9에서 별도로 검토한다. |
| W2·W3 — 기존 기억·편집 기준 | 타당. blind payload는 저자의 기존 기억을 지우지 않으며 행 수·금지어 개수는 품질 증거가 아니다. [OpenAI 축약 가이드](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6)의 효과 수치는 내부 평가 결과로, 이 플러그인의 품질 개선을 증명하지 않는다. |

### 아키텍처·메커니즘·구현 계약 — 그릴 대상

모든 F 항목의 상태는 **미결**이다. 아래 "수정 후보"는 검토 재료이며, 다른 해결책을 택해도 된다. "완료 기준"은 그릴 후 슬라이스에 넣을 검증 조건이다.

#### F1 — 최초 Agent 호출 이후의 저자 의견 전달 경로 (중요 · S3b/S5a/S5b)

- **근거·영향:** 훅은 `Agent` 입력만 교체한다. Claude Code는 `SendMessage`로 후속 메시지를 보내거나 완료된 서브에이전트를 새 Agent 호출 없이 재개할 수 있다. 최초 prompt를 정제해도 저자가 판정 전에 의견을 전달할 경로가 남는다. [공식 재개 동작](https://code.claude.com/docs/en/sub-agents#resume-subagents)
- **그릴:** Verifier에 대한 후속 메시지·재개를 어떻게 통제할 것인가? 최초 입력 정제와 검수 실행 전체의 독립성을 구분한다.
- **수정 후보:** Verifier 실행 ID에 대한 메시지 경로를 통제하거나, 후속 입력을 받은 실행을 독립 검수로 인정하지 않는 계약. 다른 에이전트의 일반 메시징은 유지한다.
- **완료 기준:** 유효 payload로 시작한 Verifier에 저자의 판정 힌트를 후속 전달하는 시나리오와 완료 후 재개 시나리오를 검증한다. 해당 입력이 판정에 도달하지 않거나, 결과가 독립 검수 집계에서 제외되어야 한다.

#### F2 — 자유 형식 모드에 입력 ID 목록이 없음 (중요 · S3/S4/S5b)

- **근거·영향:** doc 모드는 경로만, rescue read-only는 `rawOutput` 전체만 전달한다. 현재 verify/research 출력도 고정 ID가 있는 JSON이 아니다. 그런데 출력 계약은 payload가 부여한 ID마다 verdict 하나를 요구한다. 사전에 확정된 항목 목록이 없으면 주장 누락을 ID 비교로 검출할 수 없다.
- **그릴:** 자유 형식 결과의 항목 경계와 ID는 누가, 언제 확정하는가? 스크립트가 자연어 요구사항을 "의미 단위"로 나눈다는 전제도 함께 확인한다.
- **수정 후보:** 구조화 항목 목록을 먼저 확정하거나, 자유 형식 모드를 전체 결과 단위로 검수하고 항목 완전성 보장의 범위를 조정한다. 기존 단일 출력 스키마 결정과의 관계를 설명한다.
- **완료 기준:** verify·research·rescue read-only 각각에서 항목 하나를 누락한 결과를 어떻게 검출하는지 fixture로 정의한다. rescue write의 요구사항 분할 규칙도 임의 원문에 적용 가능해야 한다.

#### F3 — 기존 미추적 파일 변경이 diff에서 누락 (중요 · S3/S5a)

- **근거·재현:** 임시 저장소에서 기존 미추적 `draft.txt`를 만든 뒤 `git stash create`와 실행 전 파일명 목록을 기록하고 내용을 수정했다. `git diff <snapshot-or-HEAD>`는 비어 있고 실행 전후 미추적 파일명 차집합도 비었다. stash는 기존 미추적 내용을 담지 않고 이름 차집합은 같은 이름의 변경을 포착하지 못한다. 깨끗한 저장소의 `git stash create`는 exit 0·빈 stdout이었다.
- **그릴:** 추적 파일 WIP뿐 아니라 기존 미추적 파일의 수정·삭제까지 무엇으로 비교할 것인가? 빈 스냅샷일 때 기준도 정한다.
- **수정 후보:** 실행 전 미추적 파일 내용까지 보존해 전후 비교하고, stash 출력이 비면 실행 전 확정한 HEAD를 사용한다.
- **완료 기준:** 기존 추적 WIP 보존, 기존 미추적 파일 수정·삭제, 새 파일 생성, 깨끗한 시작을 포함한다. 사용자 기존 내용은 Codex 변경으로 집계되지 않고 실행 중 변경은 빠짐없이 포함되어야 한다.

#### F4 — 인용 줄이 남아 있는 drift는 정상 검수로 진행 (중요 · S3/S5a)

- **근거·재현:** 4행 파일의 마지막 행만 바꾸면 `git diff --quiet HEAD -- a.txt`는 1이지만 4행은 여전히 존재한다. 현재 규칙은 drift 파일의 `missing`만 `unverifiable`로 바꾸므로 이 경우 `ok` payload를 만들 수 있다. Verifier가 수정된 코드로 원래 finding을 반박할 수 있다. 작업 트리 검수는 비교 ref도 생략한다.
- **그릴:** 인용 존재 여부와 별개로 검수 대상 시점과 Verifier가 읽는 증거의 일치를 어떻게 확인할 것인가? 이동 가능한 HEAD 이름, 실제 resolved scope(`auto`·`--base` 포함), 작업 트리 검수를 함께 다룬다.
- **수정 후보:** 실행 전 기준을 고정하고 달라진 파일 전체를 미검증 처리하거나, 동일 시점의 증거를 읽게 한다. 별도 worktree를 필수 해법으로 전제하지 않는다.
- **완료 기준:** 같은 행 수로 내용 변경, 줄 삭제, 리뷰 중 HEAD 변경, working-tree 검수 중 변경에서 다른 시점의 증거로 Agreed/Disputed가 확정되지 않아야 한다.

#### F5 — 정상 review 0건이 parse_error가 됨 (중요 · S3/S5a)

- **근거·영향:** S3는 헤더가 없으면 parse_error로 정한다. Codex 공식 `render_review_output_text`는 findings가 비면 헤더 없이 `overall_explanation`만 출력한다. 정상 무지적 결과가 형식 변경 오류로 보고된다. [공식 formatter](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/review_format.rs) — 2026-09-14 확인한 main 소스이며 설치 버전과의 일치는 구현 시 확인한다.
- **그릴:** 구조화 원본이 없는 현재 전달 형식에서 정상 0건과 형식이 깨진 텍스트를 어디까지 구별할 수 있는가?
- **수정 후보:** 정상 무지적 출력의 처리 계약과 구분 불가능한 출력의 상태를 분리한다. 헤더 없는 임의 텍스트를 전부 0건으로 인정하는 해법은 오탐 통과를 만든다.
- **완료 기준:** 실제 formatter의 0건 출력, 정상 1건·복수 건, 깨진 항목, 무응답 fallback을 각각 fixture로 검증한다.

#### F6 — Unverified가 PASS/FAIL 규칙에서 빠짐 (중요 · S4/S5b)

- **근거·영향:** 스펙 D3는 P1 Agreed·Nuanced·Unverifiable만 FAIL로 두고 "나머지는 PASS"라고 한다. Agent 실행 실패인 `Unverified`는 해당하지 않으므로 미검수 P1이 PASS로 집계될 여지가 있다.
- **그릴:** 실행 실패·부분 결과·계약 위반으로 항목이나 severity를 복구할 수 없을 때 전체 판정은 무엇인가?
- **수정 후보:** 미검증 상태의 집계 우선순위를 명시하고, 알려진 P1 및 severity를 알 수 없는 실패를 각각 처리한다.
- **완료 기준:** P1 포함 group의 Agent 실패, 일부 group 실패, ID 누락·중복, severity 손실에서 검수 실패가 정상 PASS로 바뀌지 않아야 한다.

#### F7 — topic-only research와 누락 탐지 기준 누락 (S3/S4/S5b)

- **근거·영향:** 현재 research는 문서 없이 topic만 받는다. doc payload의 경로 세 개에는 선택적 문서 처리와 승인된 topic/focus 전달 계약이 없다. 결과만 읽는 Verifier는 원래 연구 범위에서 무엇이 빠졌는지 비교하기 어렵다.
- **그릴:** 문서 없는 호출을 무엇으로 표현하고, `missing-N` 판정에 필요한 승인된 연구 범위를 어떻게 전달할 것인가?
- **수정 후보:** 문서 경로를 선택값으로 두고 프리뷰에서 승인된 범위를 payload에 포함한다. 메인의 사후 가설이 추가되지 않도록 입력 출처를 구분한다.
- **완료 기준:** topic-only 및 topic+문서 호출이 모두 동작하고, 원래 범위의 핵심 항목을 Codex가 누락한 fixture에서 Verifier가 그 범위를 확인할 수 있어야 한다.

#### F8 — 훅 예외가 도구 실행 허용으로 이어질 수 있음 (S3b)

- **근거·영향:** 파일 없음·해시 불일치 외에 손상된 manifest·읽기 오류·예외 종료 처리가 없다. Claude Code command 훅은 일반 exit 1, 실행 실패, 타임아웃에서 도구 실행을 계속할 수 있다. [공식 오류·타임아웃 처리](https://code.claude.com/docs/en/hooks#exit-code-output)
- **그릴:** 훅이 처리할 수 있는 입력 오류와 훅 자체가 실행되지 않는 환경 실패를 어떻게 구분해 보장할 것인가?
- **수정 후보:** 예상 오류를 유효한 deny 또는 exit 2로 처리한다. 훅 미실행·타임아웃까지 절대 차단된다는 주장은 보장 범위에 맞춘다.
- **완료 기준:** malformed manifest, 읽기 실패, 잘못된 스키마에 대한 차단 검증을 추가한다. 훅 미실행·타임아웃 시 보장하지 못하는 범위와 보고 방식을 명시한다.

#### F9 — 프리뷰 표시와 실제 사람 확인은 다름 (조건부 · S2)

- **근거·영향:** `askUserQuestionTimeout`이 설정되면 미응답 질문이 닫히고 Claude가 계속할 수 있다. `--no-preview` 삭제만으로 항상 사람이 확인한다는 보장은 성립하지 않는다. [공식 질문 타임아웃](https://code.claude.com/docs/en/tools-reference#question-auto-continue-timeout)
- **그릴:** 실제 사용자 확인과 타임아웃 종료를 구분할 신호가 있는가? 구분할 수 없는 환경에서는 어느 단계에서 보류할 것인가?
- **수정 후보:** 명시적 확인을 얻었을 때 실행하고, 확인 여부가 불명확하면 프리뷰 단계에서 보류한다. 기존 플래그 삭제 결정을 되돌릴 필요는 없다.
- **완료 기준:** 명시적 승인, 수정 요청, 미응답 타임아웃 각각에서 실행 여부를 검증한다. 타임아웃을 사람 승인으로 집계하지 않아야 한다.

### 작은 구현 계약 — 그릴 또는 구현 전 확정

| ID · 대상 | 문제 | 결정·완료 기준 |
|---|---|---|
| I1 · S3b/S5a/S5b | 훅은 `codex-advisor:verifier`, 호출 수용기준은 `Verifier`로 식별자가 다르다. | 실제 plugin-scoped 호출 식별자를 통일하고, 설치된 플러그인의 Agent 호출이 훅에 매칭되는 통합 검증을 넣는다. |
| I2 · S3 | finding 하나가 6,000자를 넘으면 현재 묶음 분할만으로 상한을 지킬 수 없다. | 단일 초대형 항목의 예외·분할·오류 중 처리 방식을 정하고 원문 보존 및 출력 ID 계약을 함께 검증한다. |
| I3 · S5a/R1 | TaskStop은 중단 수단이며, 완료 알림만 기다리는 중 30분을 감지하는 수단은 아니다. | 완료되지 않는 작업에서도 상한에 중단 처리가 발동할 경로와 검증 방법을 정한다. |

### 표현·문서 동기화 — 설계 재논쟁 없이 정리

| 위치 | 정리 내용 |
|---|---|
| S5a 시작 | "메인이 finding 목록을 뽑는다"를 스펙 D3·S3의 스크립트 추출 계약과 통일한다. |
| S5b 본문 | "스크립트는 쓰지 않는다"·"문서 원문을 넘긴다"를 doc 모드 생성·경로 전달 계약과 통일한다. "이미 구조적으로 독립"은 W2대로 삭제한다. |
| S6 본문 | 4.8.0 잔재를 확정 버전 5.0.0으로 통일한다. |
| S3b 의존성·착수 순서 | 훅 단위 구현과 S4 agent가 필요한 통합 검증의 순서를 구분해 의존성 표기를 맞춘다. |

### 다음 Claude Code 세션의 진행·완료 기준

1. 이 절을 읽고 **F1 → F2·F7 → F3·F4 → F5·F6 → F8·F9 → I1~I3** 순서로 한 번에 한 쟁점씩 그릴한다. 관련 Claude Code 사실을 재확인할 때는 [공식 인덱스](https://code.claude.com/docs/llms.txt)에서 해당 문서로 이동한다. 현재 Codex 세션의 도구·스킬 규격을 Claude Code에 적용하지 않는다.
2. 각 항목에 **채택 / 수정 채택 / 기각**과 근거·사용자 결정일을 기록한다. 문서 근거와 런타임 실측을 구분하고, 실측이 필요한 결정에는 검증 조건을 남긴다.
3. 채택한 결정은 스펙의 해당 D절과 이슈 슬라이스·수용기준에 반영한다. 용어·독립성 보장 범위가 바뀌면 연결된 용어집·ADR도 맞춘다. 이 절에는 판정 이력과 반영 위치를 남겨 구현 규칙의 중복 원본이 되지 않게 한다.
4. **완료:** F1~F9·I1~I3의 미결 항목이 없고, 채택 사항의 스펙·슬라이스·검증 조건이 일치하며, 위 문서 동기화가 끝났을 때 `ready-for-agent`로 복원한다. 그릴 완료와 구현·테스트 완료는 별개다.
