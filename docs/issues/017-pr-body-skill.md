# 이슈 017 — `one-minute-pr` 스킬 구현 (슬라이스 S1~S4)

> 상태: **착수 전** · 생성: 2026-11-14
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
- [ ] 바른 본문(7섹션 전부, 그리고 Rollback만 있는 것) → 종료 0
- [ ] 순서가 바뀐 본문, 목록 밖 섹션, Rollback 없는 본문 → 각각 종료 ≠ 0, 어떤 규칙인지 stdout에 나옴
- [ ] 긴 대시·둥근 따옴표·문장 중간 콜론이 본문에 있으면 실패, 코드 블록·백틱 안에 있으면 통과
- [ ] 41줄 본문 → 종료 0, 경고 출력
- [ ] `package.json`·`npm install` 없이 돌아감
- [ ] 테스트 파일은 플러그인 폴더 밖, 레포 루트 `tests/one-minute-pr/`에 둔다(사용자 2026-11-14, 이유는 `docs/reference/gotchas.md` "Plugin scope"). 테스트는 스크립트를 CLI로 실행해 결과를 확인한다

**Blocked by**: None.

### S2 — SKILL.md + 별도 파일 (결정 D1~D6, D9~D12, D14~D26, D29, D31, 제약 C1·C2)

**What to build**: `/skill-creator-pro`로 `skills/one-minute-pr/SKILL.md`를 쓴다. pstack authoring playbook 기준 "When in doubt, delete. Keep only prose that changes a decision."(`poteto-mode/playbooks/authoring-a-skill.md`)을 적용한다.

- frontmatter는 Agent Skills spec 6개 필드만(C1). description은 "사용자가 PR을 열거나 만들라고 할 때"로 좁힌다(D25). `compatibility`에 Node.js를 적는다(D7, D8).
- 단계: 브랜치 상태 확인(D29: 커밋 안 한 변경이 있으면 멈추고 알림, push 안 했으면 push) → 증거 모으기(D14, 본 것만) → 본문 쓰기(D2, D11, D15, D23, D21) → S1 스크립트 검사 → forge CLI로 올리기(D4, D6, D20) → PR 링크와 빠진 증거 알림(D14).
- 일부 경우용 내용은 별도 파일(D26). `references/diagrams.md`(D16, D17 그림 규칙), `references/overflow.md`(D3, D5 넘친 내용). SKILL.md에서 "언제 열지" 문장으로 가리킨다.

**Acceptance criteria** (seam: 파일 내용, grep과 단어 수):
- [ ] SKILL.md 900단어 이하(스크립트·별도 파일 제외, D19), 영어
- [ ] frontmatter 키가 6개 필드 밖에 없음(`disable-model-invocation` 0건, D25)
- [ ] 본문에 `${CLAUDE_`, `$ARGUMENTS`, `` !` ``, `@` 경로, 도구 이름(`AskUserQuestion`, `Bash`) 0건(C1)
- [ ] 결정 대조표: 스펙의 D1~D31 각각이 SKILL.md나 별도 파일의 어느 문장으로 동작하는지 표로 확인한다. 표는 이 이슈의 핸드오프에 남기고 SKILL.md에는 넣지 않는다. 동작할 문장이 없는 결정(D24 이름, D27 eval, D28·D30 위치, D31)은 "해당 없음"으로 적는다.
- [ ] 이 레포의 PR 템플릿 유무와 상관없이 D2 섹션으로 쓴다는 문장이 있음(D20)

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
- [ ] `claude plugin validate .` 통과(`No version specified` 경고는 정상)
- [ ] Codex 확인 결과가 스펙 C1에 출처와 함께 있음
- [ ] `npx skills add LeeJuOh/claude-code-zero --list`에 `one-minute-pr`가 나옴(push 뒤)

**Blocked by**: S2.

### S4 — eval과 배포 확인 (결정 D27)

**What to build**:
- 호출: 요청 몇 개로 스킬이 불리는지 본다. 대상(예: "PR 만들어 줘"), 비슷하지만 대상 아님(예: "이 PR 리뷰해 줘"), 애매함(예: "이거 올려 줘").
- 결과 비교: 이 레포의 실제 변경 2~3개로 스킬이 있을 때와 없을 때 본문을 같은 입력으로 비교한다. 둘이 같으면 스킬을 다시 생각한다. 이 레포의 PR은 적고 대부분 문서 변경이다(`gh pr list`, #6·#7). 그래서 입력은 커밋 범위로 고를 수도 있다(정할 것).
- 배포: CC marketplace, Codex marketplace, agy 하위 폴더 URL, `npx skills`로 설치하고 한 번씩 부른다. `npx skills`가 스킬 폴더만 가져오는지(C1 추정)도 이때 확인한다.

**Acceptance criteria**:
- [ ] 호출 요청별 결과(불림/안 불림)를 이 이슈 핸드오프에 기록
- [ ] 비교 결과 기록. 차이가 없으면 다음 할 일을 적고 멈춘다
- [ ] 네 설치 방법 각각 설치 성공과 호출 1회 결과 기록. 안 되는 방법은 스펙 D30을 다시 연다
- [ ] 시험 설치는 끝나면 지운다

**Blocked by**: S3.

## Out of Scope (스펙 참조)

- 커밋 만들기(D29), 증거 새로 만들기(D14), 작성 출처 줄(D10), 사람이 없는 실행 전용 동작(D31), `auto-optimize`(D27 "나중").

## 핸드오프 (2026-11-14, 착수 전 일시정지)

- **다음 할 일.** S1부터 시작한다. 시작 전에 `docs/reference/gotchas.md`를 읽는다. 새로 넣은 "Plugin scope" 규칙에 따라, 플러그인 폴더에는 실행할 때 쓰는 파일만 둔다.
- **사용자 답을 기다리는 질문 2개.** 017 구현을 막지 않는다.
  1. codex-advisor(`evals/`, `hooks/tests/`, `scripts/tests/`)와 vision-powers(`scripts/*.test.js`)의 개발용 파일을 플러그인 폴더 밖으로 옮기는 일을 별도 작업으로 할지. 추천은 "예, 별도 작업"이다. 옮긴 뒤 검사 스크립트를 붙인다.
  2. 스펙 C2에 근거를 더할지. 근거는 `raw-articles/How the Claude Code team does code review.md:80`(AI 리뷰어가 PR 본문의 의도를 읽음)과 :106(위험이 낮은 PR은 사람 리뷰 없음)이다. 추천은 "예"다.
- **제안값 (바꿀 수 있음).** 스크립트 이름 `check-body.mjs`, 첫 버전 `0.1.0`. 테스트 위치 `tests/one-minute-pr/`는 사용자가 확정했다.
