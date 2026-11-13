# 이슈 017 — `one-minute-pr` 스킬 구현 (슬라이스 S1~S4)

> 상태: **구현 완료 (S1~S4), 릴리스 전** · 생성: 2026-11-14
> 스펙: `docs/specs/017-pr-body-skill.md`. 결정 D1~D31, 제약 C1·C2는 모두 스펙에 있다. 스펙과 이 문서가 다르면 스펙이 맞다.
> 대상 플러그인: `plugins/one-minute-pr/` (새 플러그인, D28·D30)
> 원칙: 검사할 수 있는 것은 스크립트로(AGENTS.md "Deterministic first"). SKILL.md에는 규칙만 넣고 근거·기각 이유는 넣지 않는다(D19).

## Slices (tracer bullets)

의존 순서: S1 → S2 → S3 → S4. 전부 순차, 한 에이전트. S2의 SKILL.md가 S1 스크립트를 부르고, S3이 S2를 등록하고, S4가 등록된 플러그인을 설치해 본다.

```
S1 ─→ S2 ─→ S3 ─→ S4
```

### S1 — 본문 검사 스크립트 + 단위 테스트 (결정 D7, D8, D13, D21)

**What to build**: 스킬 폴더 안에 `scripts/check-body.mjs`(이름은 제안)를 만든다. 입력은 본문 파일 경로 하나, `node scripts/check-body.mjs <body.md>`. node 내장 모듈만 쓴다(D8).

- 실패(종료 코드 ≠ 0): `##` 섹션 이름이 D2 목록 밖이거나 순서가 틀림. `## Rollback`이 없음(D21). 코드 블록·백틱 밖에 긴 대시(`—` `–`), 둥근 따옴표, 문장 중간 콜론(`: ` 뒤 글자)(D13).
- 경고(종료 코드 0, stdout에 표시): 40줄 초과(D7).
- D2 순서: Why · What changed · Scope · Tradeoffs · Blast Radius · Rollback · Verification. Rollback 말고는 빠져도 된다.

스크립트는 스킬 폴더 안에 둔다. `npx skills`가 스킬 폴더만 가져온다고 보기 때문이다(C1, 추정).

**Acceptance criteria** (seam: CLI 종료 코드 + stdout):
- [x] 바른 본문(7섹션 전부, 그리고 Rollback만 있는 것) → 종료 0
- [x] 순서가 바뀐 본문, 목록 밖 섹션, Rollback 없는 본문 → 각각 종료 ≠ 0, 어떤 규칙인지 stdout에 나옴
- [x] 긴 대시·둥근 따옴표·문장 중간 콜론이 본문에 있으면 실패, 코드 블록·백틱 안에 있으면 통과
- [x] 41줄 본문 → 종료 0, 경고 출력
- [x] `package.json`·`npm install` 없이 돌아감
- [x] 테스트 파일은 플러그인 폴더 밖, 레포 루트 `tests/one-minute-pr/`에 둔다(사용자 2026-11-14, 이유는 `docs/reference/gotchas.md` "Plugin scope"). 테스트는 스크립트를 CLI로 실행해 결과를 확인한다

**Blocked by**: None.

### S2 — SKILL.md + 별도 파일 (결정 D1~D6, D9~D12, D14~D26, D29, D31, 제약 C1·C2)

**What to build**: `/skill-creator-pro`로 `skills/one-minute-pr/SKILL.md`를 쓴다. pstack authoring playbook 기준 "When in doubt, delete. Keep only prose that changes a decision."(`poteto-mode/playbooks/authoring-a-skill.md`)을 적용한다.

- frontmatter는 Agent Skills spec 6개 필드만(C1). description은 "사용자가 PR을 열거나 만들라고 할 때"로 좁힌다(D25). `compatibility`에 Node.js를 적는다(D7, D8).
- 단계: 브랜치 상태 확인(D29: 커밋 안 한 변경이 있으면 멈추고 알림, push 안 했으면 push) → 증거 모으기(D14, 본 것만) → 본문 쓰기(D2, D11, D15, D23, D21) → S1 스크립트 검사 → forge CLI로 올리기(D4, D6, D20) → PR 링크와 빠진 증거 알림(D14).
- 일부 경우용 내용은 별도 파일(D26). `references/diagrams.md`(D16, D17 그림 규칙), `references/overflow.md`(D3, D5 넘친 내용). SKILL.md에서 "언제 열지" 문장으로 가리킨다.

**Acceptance criteria** (seam: 파일 내용, grep과 단어 수):
- [x] SKILL.md 900단어 이하(스크립트·별도 파일 제외, D19), 영어
- [x] frontmatter 키가 6개 필드 밖에 없음(`disable-model-invocation` 0건, D25)
- [x] 본문에 `${CLAUDE_`, `$ARGUMENTS`, `` !` ``, `@` 경로, 도구 이름(`AskUserQuestion`, `Bash`) 0건(C1)
- [x] 결정 대조표: 스펙의 D1~D31 각각이 SKILL.md나 별도 파일의 어느 문장으로 동작하는지 표로 확인한다. 표는 이 이슈의 핸드오프에 남기고 SKILL.md에는 넣지 않는다. 동작할 문장이 없는 결정(D24 이름, D27 eval, D28·D30 위치, D31)은 "해당 없음"으로 적는다.
- [x] 이 레포의 PR 템플릿 유무와 상관없이 D2 섹션으로 쓴다는 문장이 있음(D20)

**Blocked by**: S1.

### S3 — 플러그인 등록 (결정 D28, D30, AGENTS.md Workflow)

**What to build**:
1. Codex 사실 확인부터 한다. Codex가 `.claude-plugin/plugin.json`을 읽는지, 아니면 `.codex-plugin/plugin.json`이 필요한지 공식 문서(`learn.chatgpt.com/docs/llms.txt`)로 확인한다. 루트 `.agents/plugins/marketplace.json` 형식도 확인한다. 결과를 스펙 C1에 적는다.
2. `plugins/one-minute-pr/.claude-plugin/plugin.json`을 만든다. 필요하면 Codex 매니페스트도 만든다.
3. `.claude-plugin/marketplace.json`에 등록하고 버전을 적는다(로컬 플러그인은 marketplace에만, AGENTS.md Versioning). 첫 버전은 `0.1.0`(제안).
4. 루트 `.agents/plugins/marketplace.json`을 만들거나 고친다.
5. `README.md`를 쓴다(`docs/reference/readme-style.md`). 네 가지 설치 방법(CC, Codex, agy, `npx skills`)을 적는다. `plugin.json`과 `marketplace.json`의 description은 지금 기능만 적는다.

시작 전에 `docs/reference/gotchas.md`를 읽는다(AGENTS.md).

**Acceptance criteria** (seam: CLI 검증):
- [x] `claude plugin validate .` 통과(`No version specified` 경고는 정상)
- [x] Codex 확인 결과가 스펙 C1에 출처와 함께 있음
- [x] `npx skills add LeeJuOh/claude-code-zero --list`에 `one-minute-pr`가 나옴(push 뒤). 결과: 레포 이름만 주면 기본 브랜치 `main`을 읽어 38개, `one-minute-pr` 없음. `npx skills add https://github.com/LeeJuOh/claude-code-zero/tree/develop --list`는 39개, `one-minute-pr` 있음(skills 1.8.1, 2026-11-14). 레포 이름 형식은 릴리스(main 병합) 뒤에 나온다.
- 바꾼 점: 4단계 `.agents/plugins/marketplace.json`은 만들지 않았다. Codex가 지금 `.claude-plugin/marketplace.json`을 읽는다(스펙 C1). 루트 `README.md`·`README.ko.md` 플러그인 목록에도 넣었다.

**Blocked by**: S2.

### S4 — eval과 배포 확인 (결정 D27)

**What to build**:
- 호출: 요청 몇 개로 스킬이 불리는지 본다. 대상(예: "PR 만들어 줘"), 비슷하지만 대상 아님(예: "이 PR 리뷰해 줘"), 애매함(예: "이거 올려 줘").
- 결과 비교: 이 레포의 실제 변경 2~3개로 스킬이 있을 때와 없을 때 본문을 같은 입력으로 비교한다. 둘이 같으면 스킬을 다시 생각한다. 이 레포의 PR은 적고 대부분 문서 변경이다(`gh pr list`, #6·#7). 그래서 입력은 커밋 범위로 고를 수도 있다(정할 것).
- 배포: CC marketplace, Codex marketplace, agy 하위 폴더 URL, `npx skills`로 설치하고 한 번씩 부른다. `npx skills`가 스킬 폴더만 가져오는지(C1 추정)도 이때 확인한다.

**Acceptance criteria**:
- [x] 호출 요청별 결과(불림/안 불림)를 이 이슈 핸드오프에 기록 (아래 "S4 결과")
- [x] 비교 결과 기록. 차이가 없으면 다음 할 일을 적고 멈춘다 (차이 있음)
- [x] 네 설치 방법 각각 설치 성공과 호출 1회 결과 기록. 안 되는 방법은 스펙 D30을 다시 연다 (네 방법 모두 됨, D30 유지)
- [x] 시험 설치는 끝나면 지운다

**Blocked by**: S3.

## Out of Scope (스펙 참조)

- 커밋 만들기(D29), 증거 새로 만들기(D14), 작성 출처 줄(D10), 사람이 없는 실행 전용 동작(D31), `auto-optimize`(D27 "나중").

## S4 결과 (2026-11-14)

**울타리.** 모든 실행은 scratch 클론에서 했다. `origin`은 로컬 bare 레포이고 `main`만 있다. 그래서 GitHub에 PR이 생기지 않는다. `gh repo view`는 "none of the git remotes configured for this repository point to a known GitHub host"로 거부했다. 스킬은 D4대로 본문만 출력했다. 실행: `claude -p` (`claude 2.1.322`), `codex exec` (`codex-cli 0.167.1`), `agy -p` (1.5.3), skills 1.8.1. 입력 커밋은 `7da7ef1`(worktree-plus 문장 삭제), `b6b1bbe`(toolbox 3개 스킬 수정), `f1194d9`(S1 스크립트).

**호출.** `--plugin-dir`로 스킬을 넣고 `7da7ef1` 브랜치에서 한 번씩 돌렸다.

| 요청 | 기대 | 결과 |
|---|---|---|
| "PR 만들어 줘" (대상) | 불림 | 불림 (`one-minute-pr:one-minute-pr`) |
| "이 PR 리뷰해 줘" (비슷하지만 대상 아님) | 안 불림 | 안 불림, `code-review`가 불림 |
| "이거 올려 줘" (애매함) | 안 불림 | 안 불림, 무엇을 올릴지 되물음 |

**비교.** 같은 프롬프트 "이 브랜치로 main에 PR 열어 줘. 쓸 수 있는 forge 원격이 없으면 PR 제목과 본문만 출력해 줘."를 스킬 있음·없음으로 돌렸다. 본문 줄 수는 `markdown` 블록만 센 값, 검사는 `check-body.mjs` 결과.

| 입력 | 스킬 있음 | 스킬 없음 |
|---|---|---|
| `7da7ef1` | 31줄, 검사 ok. Why · What changed(`diff`) · Scope · Blast Radius · Rollback · Verification. 증거 2개 "not found" | `## Summary` · `## Changes`만. Rollback·검증 없음 |
| `b6b1bbe` | 37줄, 검사 ok. 같은 6섹션. Blast Radius에 `load-secrets.sh.template:11`·`:58` 확인. 증거 2개 "not found" | `## Summary`(굵은 글씨+콜론 목록) · `## Files`(파일 목록) · `## Test plan`(실행 안 한 체크박스 2개). Rollback 없음 |
| `f1194d9` | 37줄, 검사 ok. 같은 6섹션 | 같은 6섹션. 이 커밋의 레포에 스펙 017이 있어 기준 실행이 스펙을 읽었다. 비교에서 뺀다 |

차이가 있으므로 스킬을 다시 생각하지 않는다. 첫 비교(프롬프트 "이 브랜치로 PR 열어 줘", bare origin에 `develop`도 있음)는 기준 실행 3개가 모두 "이미 develop에 있다"며 본문을 쓰지 않아 버리고 다시 돌렸다.

**설치와 호출 1회.** 모두 develop 코드(`e52b8c3`)를 받았다. 레포 이름만 쓰는 README 명령은 `main`을 읽으므로 릴리스 뒤에 동작한다.

| 방법 | 설치 | 받은 파일 | 호출 결과 |
|---|---|---|---|
| CC marketplace | `claude plugin marketplace add 'LeeJuOh/claude-code-zero#develop'` + `claude plugin install one-minute-pr@claude-code-zero` 성공, `Version: 0.1.0`. 사용자 설정이 이 marketplace의 소스를 고정해서 별도 `CLAUDE_CONFIG_DIR`에 설치했다 | 플러그인 폴더 전체(README, `.claude-plugin`, 스킬) | 별도 설정 폴더는 로그인이 없어서 설치된 캐시를 `--plugin-dir`로 넣고 `/one-minute-pr` 실행. 캐시 경로에서 `check-body.mjs` 실행, `/tmp/omp/body.md ok`, push, 본문 출력 |
| Codex marketplace | 이미 있는 `claude-code-zero` marketplace(`.claude-plugin/marketplace.json`)를 `-c 'marketplaces.claude-code-zero.ref="develop"'`로 올린 뒤 `codex plugin add one-minute-pr@claude-code-zero` 성공. 끝나고 `main`(`6380fb9`)으로 되돌림 | 플러그인 폴더 전체 | `codex exec '$one-minute-pr'`. 캐시의 SKILL.md를 읽고 `check-body.mjs` 결과 `ok`, push 성공. upstream 설정은 sandbox가 `.git` 쓰기를 막아 실패 |
| agy 하위 폴더 URL | `agy plugin install https://github.com/LeeJuOh/claude-code-zero/tree/develop/plugins/one-minute-pr` 성공, `Source: claude-code`, skills 1 | 플러그인 폴더 전체 + 변환한 `plugin.json` | `agy -p "/one-minute-pr"`. 첫 검사 4 problems(`missing section "## Rollback"` 포함) → 고친 뒤 `ok`, push 성공. headless는 권한을 못 물어서 `--settings`로 `command(git *)`·`command(node *)` 등과 `write_file(/tmp/*)`를 허용해야 했다(`--dangerously-skip-permissions`는 쓰지 않음) |
| `npx skills` | `npx skills add https://github.com/LeeJuOh/claude-code-zero/tree/develop --skill one-minute-pr -a claude-code -y --copy` 성공 | 스킬 폴더만(`SKILL.md`, `references/`, `scripts/`). C1 추정 확인 | `claude -p "/one-minute-pr"`. `check-body.mjs`가 문제를 찾아 고친 뒤 통과, push, 본문 출력, 빠진 증거 2개 알림 |

**지움.** Codex `codex plugin remove`, agy `agy plugin uninstall`, CC는 별도 설정 폴더째 삭제, `npx skills`는 scratch 레포의 `.claude/skills`·`skills-lock.json` 삭제. 실제 `~/.claude` 설정·설치 목록에는 `one-minute-pr` 0건.

**본 것 (고칠지 정할 것).**
- 다시 돌린 비교의 스킬 있음 3개는 push하지 않았다. 셋 다 이유로 "forge가 아니다"를 들었다. 1단계(D29)는 forge와 상관없이 push를 시키므로 어긋난다. 호출 확인 4개(CC·Codex·agy·`npx skills`)와 첫 비교에서는 push했다. 1단계에 "올릴 수 없어도 push한다"를 더할지 정한다.
- 본문 언어는 정하지 않았다. 사용자의 전역 지시가 한국어여도 본문은 영어로 나왔다(SKILL.md가 영어라서로 추정).

## S2 결정 대조표 (2026-11-14)

SKILL.md 898단어(`wc -w`, frontmatter 포함). frontmatter 키 `name, description, compatibility`. C1 금지 문자열 grep 0건. "SKILL.md"는 `plugins/one-minute-pr/skills/one-minute-pr/SKILL.md`, "diagrams"·"overflow"는 같은 폴더의 `references/` 파일.

| 결정 | 동작하는 문장 (위치) |
|---|---|
| D1 분량 | "Keep the body to about 40 lines." (SKILL.md Length) |
| D2 섹션·순서 | "Use these `##` sections in this order … Drop a section with nothing to say" + 7개 목록 (SKILL.md Body) |
| D3 넘친 내용 | "Ask the user where the overflow goes, and wait" + 두 선택지 (overflow) |
| D4 플랫폼 | "Find the forge from the remote URL. If its CLI is installed … With no usable CLI, print" (SKILL.md 5단계) |
| D5 접기 조건 | "Use `<details>` only when the forge renders it." (overflow) |
| D6 미리보기 없음 | "ready for review, not as a draft" + "Do not ask for a preview." (SKILL.md 5단계) |
| D7 스크립트 검사 | "run `node scripts/check-body.mjs <body-file>` … until it exits 0. A line-count warning is not a failure." (SKILL.md 4단계) + 스크립트 |
| D8 node `.mjs` | `compatibility` "Needs git and Node.js 18 or later." + 스크립트 내장 모듈만 |
| D9 제목 | "Follow the format of the repo's recent PR titles … `type(scope): subject` … Name a real symbol" (SKILL.md Title) |
| D10 작성 출처 줄 없음 | "No author line or SHAs." (SKILL.md Body) |
| D11 증거 표 | 7행 표 + "Keep the table out of the body" + "Paste output lines exactly, marking each cut with `…`" + Verification 1~3 불릿 (SKILL.md Evidence) |
| D12 문장 필터 | Writing rules 8줄 (SKILL.md) |
| D13 스크립트 문장 검사 | 스크립트 long dash·curly quote·mid-sentence colon. SKILL.md "The check fails on these"는 단어 수 때문에 뺐고 규칙 줄만 남김 |
| D14 본 증거만 | 2단계 "Use only results you saw … Do not run tests or take screenshots … Never invent" + "write \"not found\" … not \"not done\"" + 6단계 빠진 증거 알림 |
| D15 What changed | "The shapes that changed, not files. A shape is a contract …, a data structure …, or a setting … `diff` block … No file tree." (SKILL.md Body) |
| D16 흐름 그림 | "When a flow changed … read `references/diagrams.md`" (SKILL.md) + 그리는 순서 3단계, HTML 금지 (diagrams) |
| D17 그림 규칙 | "When you draw with option 2 or 3" + 규칙 3개 (diagrams) |
| D18 이미지 | "Upload images to the PR, never to the branch. If you cannot, say so in the reply." (SKILL.md Evidence) |
| D19 900단어·영어 | 898단어, 영어 |
| D20 PR 템플릿 무시 | "even when the repo has a PR template" (SKILL.md Body) |
| D21 Rollback | "always keep Rollback" + `## Rollback` 항목 + 스크립트 필수 검사 |
| D22 다시 부를 때 | "On a second run for the same PR, write the body again from the whole branch instead of patching it …" (SKILL.md Steps 뒤) |
| D23 Blast Radius | "one fact that makes it safe or risky, with how far you checked it … write \"unproven\"" (SKILL.md Body) |
| D24 이름 | 해당 없음 (`name: one-minute-pr`) |
| D25 자동, 좁힌 트리거 | description "Use when the user asks to open, create, or make a pull request or merge request." `disable-model-invocation` 없음 |
| D26 별도 파일 | `references/diagrams.md`, `references/overflow.md`, SKILL.md에서 "read … when" 문장으로 가리킴 |
| D27 eval | 해당 없음 (S4) |
| D28 별도 플러그인 | 해당 없음 (S3) |
| D29 push만 | 1단계 "stop and tell the user to commit … Do not commit for the user … push the branch with an upstream. Never force-push." |
| D30 위치 | 해당 없음 (S3) |
| D31 사람 없는 실행 | 해당 없음 (다루지 않음) |
| C1 에이전트 호환 | 6개 필드만, 도구 이름 없음, 질문은 "Ask the user … and wait" 산문, 스크립트는 skill 폴더 기준 상대 경로 |
| C2 사람 리뷰어 | "The body is for a human reviewer who has the diff. When rules conflict, choose what reads best for that reviewer." |

## 리뷰 결과와 할 일 (2026-11-14)

`/pstack:interrogate`로 리뷰했다(opus 2개, Codex 1개). 모든 발견은 명령을 다시 돌려 재현했다. 결정이 끝나면 아래를 한 번에 고친다.

**정한 것.**
- push 규칙: A(언제나 push). SKILL.md 1단계에 "PR을 올릴 수 없어도 push한다"를 분명히 적는다. D29는 그대로. (사용자 2026-11-14)
- 본문 언어: 정하지 않는다(C). 참고 PR 스킬 6개(S1, S6, S8, S9, S10, symphony push)에 언어 규칙 없음(grep). 시험 본문은 모두 영어. 다른 언어가 실제로 나오면 D32로 다시 연다. 스펙에 D32 "정하지 않음"으로 적는다. (사용자 2026-11-14)
- Scope: 언제나 넣는다(A). 출처는 pstack `S1:17` "`## Scope`: always."뿐(다른 참고 스킬에는 Scope 섹션 없음, grep). 할 말이 없으면 "Covers the whole change." 한 줄. 스펙 D2·D7·D21과 SKILL.md Body, 스크립트 필수 섹션(Rollback, Scope), 테스트를 고친다. (사용자 2026-11-14)
- CLI 증거 행: "before and after"를 되살린다(A). 출처 Hugo `S9:42`, `A1:54`, mattpocock `:21,:160`. pstack `S1:20`만 결과뿐. 본 적 없는 "전"은 "not found"(D14). (사용자 2026-11-14)
- 스크립트 범위: A. 리스트 안 들여 쓴 펜스, 4칸 들여 쓴 코드, `## Rollback ##`, 줄을 넘는 인라인 코드를 코드로 본다(D13). 본문에 `<!--`가 있으면 실패(symphony `pr_body.check.ex:124`, 숨긴 Rollback 방지, D21). 1~3칸 헤딩·탭·setext·이스케이프 백틱·BOM은 그대로. 테스트를 더하고 S1 체크 항목 3을 다시 체크한다. (사용자 2026-11-14)

**고칠 것 (결정 필요 없음).**
- [ ] SKILL.md:14 "in this session or that exist in the repo, the conversation, or the PR"는 장소 목록이라 D14 위반. 장소를 빼고 "본 결과만"으로 줄인다.
- [ ] SKILL.md Evidence에 "붙인 출력은 코드 블록이나 백틱 안에 둔다"를 더한다. 지금은 `Tests: 5 passed` 같은 출력이 콜론 검사(D13)에 걸려 D11 "Never retype"과 부딪친다.
- [ ] 스펙 출처 줄 고침: `S4:46`→`:43`(D23, 출처 표), `S9:42-48`→`:41-47`, `S9:43`→`:42`(D11), `S9:50`→`:49`(D14), `S9:56`→`:57`(D18), `S9:62` "Never invent a result"→`:65` "Nothing in it was invented"(D14), `A6:102`→`:105`(D11), `A6:100-106`→`:105-109`(D23, 출처 표), `S8:85-89`→`:72-79`(D15), A1:49-55는 7행이 아니라 5행(D11).
- [ ] 스펙 D14: S4(`S4:17,37` "돌려서 증명")와 A3:99를 "보고만 하는 편"에서 뺀다. D23이 이미 S4와 맞춘다.
- [ ] 스펙 D8: "실행 검사 스크립트는 check-plan.mjs뿐"은 틀림(symphony `push/SKILL.md:55` `mix pr_body.check`). 결정은 그대로.
- [ ] 스펙 D27: `wiki/` 근거는 스펙 :10 "위키 요약 제외"와 맞지 않음. 원본으로 바꾸거나 뺀다.
- [ ] 이 이슈 S2 표 D7 행 인용을 실제 문장 "A line-count warning does not block."으로. S1 체크 항목 3은 들여 쓴 코드에서 틀리므로 스크립트를 고칠 때까지 체크를 푼다.
- [ ] README 4곳을 결정에 맞춘다(Scope 필수, `<!--` 실패, push 언제나). `plugins/one-minute-pr/README.md`("dropped, except Rollback"), 루트 `README.md`·`README.ko.md`의 one-minute-pr 항목, `plugin.json`·`marketplace.json` description("a missing Rollback"). `docs/reference/readme-style.md`와 technical-writing·unslop을 적용한다. 이전 세션에 README에 unslop을 돌린 기록은 없다.
- [ ] 플러그인 버전 `0.1.1`, `claude plugin validate .`, SKILL.md 900단어 이하(`wc -w`).

## 핸드오프 (2026-11-14, 착수 전 일시정지)

- **다음 할 일 (2026-11-14 갱신).** S1~S4가 `develop`에 있다(`f1194d9`, `50c6a18`, `6758cdd`, `e52b8c3`, 이 커밋). 남은 것은 릴리스(`docs/release-workflow.md`, 사용자 요청 때)와 릴리스 뒤 README의 레포 이름 형식 설치 명령 확인이다. "S4 결과"의 "본 것" 두 줄은 사용자가 정한다.
- **일시정지 (2026-11-14, 리뷰 뒤).** 정할 것은 모두 끝났다(위 "리뷰 결과와 할 일"의 "정한 것" 5개). 사용자가 "고쳐"라고 하면 시작한다.
  재개 순서: 1) 스펙에 결정 반영(D2·D7·D21 Scope 필수, D11 CLI 행, D13 스크립트 범위, D29 push 문장, 새 D32 언어 "정하지 않음")과 출처 줄 고침. 2) 스크립트와 `tests/one-minute-pr/` 테스트(먼저 실패하는 테스트). 3) SKILL.md(900단어 이하, `wc -w`)와 README 4곳(technical-writing, unslop, `docs/reference/readme-style.md`). 4) 이 이슈 S2 표와 S1 체크 항목 3. 5) 버전 `0.1.1`, `claude plugin validate .`, 커밋, push.
  주의: 스크립트 문제 1의 고치는 방법(들여 쓴 펜스는 몇 칸이든 펜스, 빈 줄 뒤 4칸 줄은 코드, 헤딩 끝 `#` 제거, 인라인 코드는 문단 단위)은 사용자에게 설명했고 이의가 없었다. 리뷰 재현 파일은 세션 scratchpad에만 있다. 위 "고칠 것"에 명령과 줄 번호를 남겼다.
  S4 실행 기록(stream, 본문)은 세션 scratchpad에만 있어 세션이 끝나면 사라진다. 결과는 이 이슈의 "S4 결과"에 옮겨 두었다.
- **나중에 할 일 (사용자 2026-11-14).** codex-advisor(`evals/`, `hooks/tests/`, `scripts/tests/`)와 vision-powers(`scripts/*.test.js`)의 개발용 파일을 플러그인 폴더 밖으로 옮긴다. 017과 별도 작업이다. 옮긴 뒤 검사 스크립트를 붙인다.
- **push.** S3·S4의 설치 확인(`npx skills`, agy URL)은 GitHub에 있는 코드를 받는다. 그래서 슬라이스마다 커밋하고 `develop`에 push한다. agy URL은 `.../tree/develop/plugins/one-minute-pr`를 쓴다. `main` 병합, 태그, PR은 하지 않는다(릴리스는 `docs/release-workflow.md`, 사용자가 따로 요청).
- **제안값 (바꿀 수 있음).** 스크립트 이름 `check-body.mjs`, 첫 버전 `0.1.0`. 테스트 위치 `tests/one-minute-pr/`는 사용자가 확정했다.
