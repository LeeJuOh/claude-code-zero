# 에이전트 문서 검수 — 레포 문서 + 플러그인 (2026-09-11)

> 상태: **검수 완료 · 재검수 반영(2026-09-23) · 1부 렌즈 재검수 반영(2026-09-24) · 1부 S1~S4·남은 결정 완료(2026-09-24, S5만 원 작성 머신), 2부 P1 완료(10/11 수정 + §2-7 #6은 e2e-test-runner 플러그인 삭제 `e69be21`로 종결) + §2-7 #25 편입·완료 `231504a` + §2-7 #28·#29 완료 `b451fb8`(worktree-plus 3.2.1) · v1.84.0 배포 `ee4f077`(12차) · P2 구현 1~3단계 완료 `3abe3ee`·`10686fd`·`d156085`(vision-powers 5.0.0, 14차) · 4단계 완료 `00422aa`(15차) · 5단계 완료 `7c14121`(16차) · 6단계 완료 `a24bbac`(17차) · 7단계 결정 완료(18차, 원장만) · 7단계 완료 `cdae0d8`(19·20차) · v1.85.0 배포 `f2c638c`(20차, vision-powers 5.0.0, 푸시 완료) · P3 결정 완료(21차 그릴링, 원장만 — §2-3 "P3 결정") · P3 1단계 완료 `3c4f2ab`(22차, codex-advisor 5.2.0) · P3 2단계 완료 `882843b`(23차) · P3 3단계(권한) 완료 `7a0f62c`·`52d5be6`(24~27차) · v1.86.0 배포·푸시(27차, codex-advisor 5.2.0) — P3 끝 · 순서 P5 → P4로 바꿈(28차) · P5 결정·구현 완료 `5a67f5e`(28차, skill-creator-pro 2.1.0) · v1.87.0 배포·푸시(28차) · P4·claw-mux 안 함, §2-6 notebooklm-connector 완료 `d868b69`(29차, 1.3.3). P7 toolbox 완료 `b6b1bbe`(30차, 2.0.1). claw-mo 안 함(30차). 다음은 P7 worktree-plus** · 수정 순서: 1부(레포 문서) 먼저, 2부(플러그인)는 그 뒤
> 줄 번호 기준: 커밋 `21a87ab`. 단 codex-advisor 관련 행과 재검수로 고친 행은 `23c69ec` 기준 — 수정 전에 해당 줄을 다시 열어 확인할 것. 공식 문서 줄 번호는 2026-09-23 기준으로 갱신(못 찾은 것은 인용 당시 값)
> 확인 표기: ✅ 직접 재확인(공식 문서 grep·git·실행) · 🔹 검수 에이전트가 grep/실행으로 확인 · (추측) 미확인
> 계기: auto memory를 껐다(`~/.claude/settings.json` `autoMemoryEnabled: false`). 메모리 파일은 남지만 로드되지 않으므로, 살릴 내용은 매 세션 읽히는 레포 문서로 옮기고 그 김에 레포 문서의 틀림·중복·퇴적을 정리한다.
> 작성 환경: 메모리 27개(§1-4), `.claude/settings.local.json`, `.claude/worktrees/remove-test-3`는 원 작성 머신(`/Users/ljo/…/zero-code/claude-code-zero`)에만 있다. 다른 머신에서 작업하면 이 대상은 없다.
> 다음 세션: 아래 §핸드오프부터 읽는다. 이 문서가 원장이다 — 별도 handoff 파일은 만들지 않는다.

## 핸드오프 (2026-10-09 29차 → 30차)

**목표:** P7(§2-7 나머지)을 플러그인 하나씩 처리한다. 순서: toolbox → claw-mo → worktree-plus → vibeproxy-kit(맨 끝, §1-5 #2).

**첫 행동:** toolbox §2-7 #8부터. `plugins/toolbox/skills/secret-setup/SKILL.md`의 검증 단계 `cat "$MOCK_ENV"`(29차 확인 :218)가 실제 비밀값을 컨텍스트에 찍는다. 현재 코드에서 다시 열어 확인 → 짧게 보고(문제·최강 변형·추천 한 줄) → 승인 → 고침. 원장 수정안: `cut -d= -f1`(이름만) + `bash -n`. 그다음 toolbox 나머지 #12·#13·#19·#20·#22를 한 행씩 같은 방식으로. toolbox는 끝에 한 커밋 + 버전 범프(marketplace.json, 지금 2.0.0) → 원장 커밋 따로.

**맥락:** 29차에 사용자가 P4(rubber-duck-tutor)와 claw-mux(§2-5)를 통째로 건너뛰었다("안고칠거야 다음", "패스"). 행이 길게 남은 플러그인은 사용자가 건너뛸 수 있다 — 첫 행을 보고할 때 그 가능성을 염두에 두고, 건너뛰면 원장에 "안 함"만 적고 다음으로. notebooklm-connector(§2-6)는 8행 모두 처리.

**현재 상태(git 확인):** develop, 작업 트리 깨끗. origin/develop보다 앞섬(29차 커밋 미푸시): `d868b69`(notebooklm-connector 1.3.3) → `69896de`(원장) → 이 핸드오프 커밋. main·태그는 v1.87.0 그대로 — 배포는 사용자가 부를 때(`docs/release-workflow.md`).

**29차 결정(재논의 금지):** rubber-duck §1-5 #8 안 고침 · P4 전체 안 함 · claw-mux(§2-5) 전체 안 함 · notebooklm #4는 이름 정리만(아래 교훈) · #6 maxLength 잘라내기 분기 삭제 · #7 Storage 절 한 줄 · #8 재연결 단계는 에이전트 출력이 원본 · #11 `permissionDecision: allow`.

**29차 교훈**
- ✅ 원장의 "(추측)" 버그는 고치기 전에 싸게 실행 확인했다: notebooklm #4(hook matcher `Task`가 안 걸린다)는 stub 에이전트 + 로그만 남기는 hook 사본 두 벌(옛/새)로 `claude -p --plugin-dir … --model claude-haiku-5-5 --allowedTools Agent` 순차 실행, $0.009. 옛 matcher도 발동 → 버그 아님. 공식 문서에 없는 별칭도 실제로는 동작할 수 있다.
- ✅ 행마다 "문제(현재 코드 확인) → 최강 변형 → 추천 한 줄 → 질문 하나"로 보고하니 사용자가 "ㅇㅇ"·"추천대로"로 바로 답했다. 부수 발견(README "Rejects" ↔ 실제 "Condenses", setup-data.sh 틀린 주석)은 괄호 한 줄로 붙여 같은 행에서 처리.
- ✅ 플러그인 하나의 행들을 한 커밋 + 한 번의 버전 범프로 묶었다(사용자 승인).
- ⚠️ 전역 CLAUDE.md가 `@~/.codex/AGENTS.md`로 바뀜: 한국어, 짧은 문장, 결론 먼저, 불릿, 핵심 굵게.

**28차 교훈**
- ✅ 원장이 묶어 둔 결정(#9 ↔ #11)을 공식 원본(`~/.claude/plugins/cache/claude-plugins-official/skill-creator/<hash>/`)과 대조하니 묶일 이유가 없었다. 결정 질문 전에 "공식에 있나"를 먼저 확인한다.
- ✅ 사용자의 "점진적 접근이면 해결되는 거 아냐?"를 최강 변형으로 따져, 맞는 곳(공식 Claude.ai 절 → references)과 안 맞는 곳(pro 추가 블록, ADR 0001)을 나눠 안을 고쳤다.
- ✅ 구현 전 advisor 검토가 놓칠 뻔한 것을 잡았다: #4 실행 단위가 4곳에서 어긋남, Claude.ai 절 이동으로 깨지는 Cowork 참조, auto-optimize가 제목으로 인용하는 절 5개.
- ⚠️ 첫 스모크 테스트는 없는 파일을 가리켜 Skill이 아예 안 불렸는데 "자동 실행 0"으로 기록할 뻔했다. 트리거 테스트는 옛 버전(`git archive <커밋> plugins/<p> | tar -x -C <scratch>`)을 대조군으로 같은 프롬프트에 돌린다 — 옛 버전이 트리거돼야 시험이 유효하다.
- ⚠️ 비용 예상 $0.2 → 실제 $0.48(새 버전이 스킬 안으로 더 진행). `--max-turns`는 비용 상한이 아니다. macOS엔 `timeout`이 없다(exit 127).
- ⚠️ 사용자가 공식 skill-creator를 불렀을 때 그 스킬의 기본(작업 폴더를 스킬 옆에)을 따르면 배포본에 섞인다 — 이 레포에서는 scratchpad.

**27차 진행**
- 검사기 3개 + `claude plugin validate .` 통과 → `7a0f62c`(P3 3단계 권한) → 원장 `b369a77`.
- 커밋 뒤 자동 보안 리뷰(security-guidance 플러그인)가 실제 문제를 찾았다: `codex-task.sh prompt <파일>`이 stdin을 아무 경로에나 썼다(예: `prompt ~/.zshrc`). 스크립트는 `allowed-tools`로 확인 없이 돌아 Write 도구의 안전 검사를 건너뛴다. 같은 문제가 `launch`·`wait`·`review-wait`(아무 `<run-dir>`)와 모든 `<data-dir>` 인자에 있었다. 사용자 승인 뒤 고침 `52d5be6`: `codex-task.sh`의 `real_run_dir`(실제 경로가 `…/plugins/data/codex-advisor-*/tmp/*-run-*`)·`real_prompt_file`(그 안 `prompt.txt`만)·`check_data_dir`(절대 경로, `..` 없음, `codex-report.sh`에도). 스킬 호출 문구는 그대로. 가짜 companion으로 정상 6건 통과·공격 14건 거부. `--document` 읽기는 그대로(문서를 Codex에 보내는 것이 기능). 원장 `f2e2993`.
- 배포: main 병합 `85c1d04`, 태그 `v1.86.0`, `main`·`develop`·태그 푸시(사용자 승인). 푸시 뒤 `origin/develop..develop` 0, `origin/main..main` 0.
- 하지 않은 것: 26차 변경의 지운 줄 대조(사용자 승인으로 건너뜀), `52d5be6` 뒤 `claude -p` e2e 재실행(스크립트 직접 시험만).

**상태(27차 중단, git 기준):** develop, 작업 트리 깨끗, 마지막 커밋은 이 핸드오프 원장 커밋(푸시 안 함 — 원장만). 정리(선택): `~/.claude/plugins/data/codex-advisor-inline/tmp/`에 옛 테스트 찌꺼기 5개(`review-run-O07SUY`, `verify-gJYaJm`, `verify-mirbjw`, `verify-payload-…`, `verify-run-…`). 지워도 된다.

**27차 교훈**
- ⚠️ bash는 `set -e`를 `$( … )` 안으로 넘기지 않는다. 함수 안의 `x=$(검사 함수)`가 실패해도 계속 돈다 → 검사 호출마다 `|| exit 1`. 첫 시험에서 `prompt <다른 폴더>/prompt.txt`가 통과할 뻔했다(`/`가 읽기 전용이라 우연히 실패). 거부 시험은 "실패했다"만 보지 말고 실패 메시지가 검사 문구인지 본다.
- ⚠️ 권한을 사전 허용한 스크립트는 Write 도구의 안전 검사를 대신한다. 경로를 받는 스크립트는 쓰기 대상을 스크립트 안에서 가둔다. 사전 허용 규칙을 넓히는 변경 뒤에는 "이 스크립트로 아무 파일이나 쓸 수 있나"를 시험한다.
- ✅ 보안 리뷰가 지적한 함수 하나만 고치지 않고 같은 모양(경로 인자 → 쓰기)을 grep으로 모두 찾았다(`launch`·`wait`·`<data-dir>`). 인자를 더하는 안 대신 경로 모양 검사로 스킬 문구를 안 바꿨다.
- ✅ 사용자가 "뭐할차례?"·"구현은끝남?"을 물으면 결론 한 줄 + 검증 안 한 것 + 추천 한 줄로 답했다.

**26차 교훈**
- ⚠️ e2e 로그 요약 스크립트가 명령을 100자에서 잘라, 한 Bash 호출 안의 두 번째 줄(`clean`)을 못 보고 "clean을 빠뜨렸다"고 잘못 보고했다. 사용자가 핸드오프를 부른 뒤 `CLEANED=`를 grep해서 바로잡았다. 빠졌다고 말하기 전에 결과 문자열(`CLEANED=`·`SAVED=`)이나 남은 파일로 확인한다.
- ✅ e2e를 두 번 돌렸다(Claude sonnet, `--permission-mode default`, Bash 없는 `--allowedTools`). 1회차가 Write 안전 검사 거부를 찾았다(3분 $0.27), 2회차는 거부 0건이었다(50초 $0.24). 시작 전에 모델·시간·비용을 한 줄로 알렸다.
- ✅ 가짜 companion(`HOME`을 scratchpad로, `cache/openai-codex/codex/9.9.9/scripts/codex-companion.mjs`)으로 `review`/`review-wait`의 정상·빈 출력·JSON 아님·대기 중·취소 경로를 1분 안에 시험했다. 취소 시험에서는 `pgrep -f`가 sh 래퍼를 잡았다. companion이 기록하는 pid는 node 자신의 pid이므로 그 pid로 시험해야 한다.
- ⚠️ 사용자 "장황하게말하지마 다시보고해", "머가문제란거야", "문제2가 먼데", "새문제가 먼데" — 문제를 설명할 때 무엇이 언제 어떻게 깨지는지(경로 예시 → 실패)를 먼저 말한다. 원인 용어부터 꺼내지 않는다.
- ⚠️ 검사기·테스트가 이전 세션 변경으로 깨져 있을 수 있다. 커밋 전에 `evals/check-prompt-blocks.py`, `node --test plugins/codex-advisor/hooks/tests/verifier-payload.test.mjs`(폴더를 주면 결과 줄이 안 나온다), scripts/tests에서 `python3 -m unittest test_prepare_verifier`를 돌린다.

**상태(26차 중단, git 기준):** develop, 미커밋 19개 경로(수정 17 + 새 파일 `scripts/codex-job.sh`·`scripts/codex-report.sh`). `prepare-verifier.py`는 실행 권한(100644 → 100755)만 바뀌었다. 이 중 원장 1개, 나머지는 codex-advisor. 마지막 커밋 `fc344ab`. 미푸시: `2fce4e2`·`add41cc`·`df5525e`·`c834615`·`3c4f2ab`·`eeb4b47`·`882843b`·`fc344ab`(25차 기준 `origin/develop`=`f209ba7`, 27차에 fetch로 다시 확인). 플러그인 데이터 `~/.claude/plugins/data/codex-advisor-inline/tmp/`에 옛 테스트 찌꺼기 5개(`review-run-O07SUY`, `verify-*` 4개)가 남아 있다. 지워도 된다.

**25차 교훈**
- ✅ 실제 `claude -p` e2e가 드라이런·대조로는 안 보이는 턴 경계 문제를 찾았다(`--allowedTools`에 Bash를 넣지 않아야 보인다 — 21차 e2e는 Bash를 넣어서 못 봤다).
- ✅ 지운 줄 대조 서브에이전트를 e2e와 병렬로 돌렸다(약 2분). e2e 실행 중에는 플러그인 파일을 고치지 않았다.
- ⚠️ 사용자 "문제잇냐고 남은거 머냐고 다한거냐고" — 진행 중 보고가 결론(끝났나/문제/남은 것)을 먼저 말하지 않았다. 상태를 물으면 "다 안 됨 / 문제 N건 / 남은 일 목록" 순서로 바로 답한다.
- ⚠️ e2e 뒤 정리 안 됨: `~/.claude/plugins/data/codex-advisor-inline/tmp/`에 `review-run-O07SUY`(25차)와 옛 `verify-payload-…`·`verify-run-…`이 남아 있다. 테스트 레포는 scratchpad(세션 끝에 사라짐).

**24차 교훈**
- ⚠️ 사용자 "정석으로 고쳐야할거아냐" — 처음엔 "규칙만 좁히고 나머지는 auto mode 분류기에 맡김"을 추천했다. 규칙이 실제 명령 몇 개에 맞는지 세어 보지 않은 반쪽 안이었다. 권한 규칙을 바꾸는 안은 내기 전에 블록을 전부 뽑아 규칙과 대조한다(이번 실측 48개 중 11개만 맞음).
- ⚠️ "먼소리야 이해안가"를 세 번 들었다. 권한 매칭 규칙(문서 인용)으로 설명하면 안 통했고, "지금: 아무 명령이나 묻지 않음 / 계획: 스크립트만 묻지 않음 / 걸리는 점: 나머지는 확인을 받음"처럼 결과로 말하니 통했다.
- ✅ 큰 수정 전에 버리는 테스트 플러그인(`allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)`)으로 명령 모양을 `claude -p --model haiku --permission-mode default`로 먼저 확인했다(1분 미만). 따옴표 경로·여러 줄·heredoc stdin·`.py` 직접 실행 = 통과, 규칙 밖 `mkdir` = `permission_denials`에 잡힘. 음성 대조를 꼭 넣는다.
- ✅ 공식 permissions.md 사실: 복합 명령은 줄마다 매칭, 일반 변수 할당 뒤에선 allow가 안 맞음, `${CLAUDE_PLUGIN_DATA}` 같은 작업 폴더 밖으로의 `>` 리다이렉트는 따로 승인 필요 → 리다이렉트도 스크립트 안으로.
- ⚠️ macOS `date +%s%N`은 나노초가 아니라 `N` 글자를 붙인다 — 새 스크립트는 `mktemp -d`로 고유 폴더를 만든다.

**23차 교훈**
- ⚠️ 사용자 "뭔소리야 커밋해" — 검증 뒤 "수정 커밋과 원장 커밋을 따로 만들까요?"를 물었다. 이미 절차 4("수정 커밋 + 원장 기록은 별도 커밋")가 정한 것 — 승인된 작업의 정해진 마무리는 묻지 말고 한다.
- ✅ 구현 직전 원장 행을 companion 1.0.6에서 다시 열었더니 새 발견 2개(§2-3 "P3 2단계 기록")와 밀린 줄 번호(#4 :351 → 지금 §7 규칙 7, #9 :309 → §6 transcript 행)가 나왔다. 원장 줄 번호 대신 문구로 찾는다.
- ✅ 지운 줄 대조와 드라이런을 서브에이전트 2개로 병렬 실행(합계 약 1.5분). 드라이런이 모호점 2개(job id 모양, 무엇에 따옴표)를 찾아 바로 고쳤다.

**22차 교훈**
- ⚠️ e2e(`claude -p`)를 돌리기 전에 모델(Claude·Codex)과 예상 시간·비용을 한 줄로 먼저 알린다. 22차 codex-verify 1회 ≈ 10분·$4.8(fable-5-1, 대부분 Verifier의 WebFetch) — 사용자 "무슨작업시켯길래 그렇게 길어? 토큰 많이드는거아님?", "빡치네". 스크립트 흐름만 볼 땐 wait 통과 후 멈춘다.
- ⚠️ e2e 실행 중에 그 플러그인 파일을 고치지 않는다 — bash가 스크립트를 읽는 도중 바뀌어 wait가 exit 2(구문 오류)로 끝났다.
- ⚠️ 보고는 결론 한 줄 + 질문 하나 + 추천 한 줄(22차 "장황하게말하지마 다시보고해" — 바꾼 것·발견·검증을 다 늘어놓았다).
- ✅ stream-json에서 `parent_tool_use_id`로 메인 세션과 서브에이전트 호출을 가른다(Verifier의 문서 Read를 메인 위반으로 오해할 뻔).

**P3 구현 요점** (상세·근거는 §2-3 "P3 결정")
- ① 구조 커밋: `codex-task.sh`(`launch`·`wait`, companion 경로를 스크립트가 직접 찾음) → verify·research·rescue의 실행·대기 블록을 교체. 남은 블록의 `$CODEX_COMPANION`은 `<literal CODEX_COMPANION path>` 방식(#1). setup은 블록 하나에서 resolve → `setup --json`(기타-setup). `/codex:status` → `/codex-status` + companion-usage §6 한 줄(#8). codex-advisor 5.1.0 → **5.2.0**(marketplace.json).
- ② 글 정리 커밋 ✅ `882843b`(23차).
- ③ 권한 커밋: bare `Bash` → `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)` 중심. `claude -p`를 `--allowedTools` 없이 돌려 권한 거부 0건 확인, 많으면 그대로 두고 이유 기록.
  - **24차 결정(그릴링 Q1·Q3): 정석으로 좁힌다.** 실측: Bash 블록 48개 중 규칙 `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)`에 맞는 것은 11개(`codex-task.sh`·`apply-codex-config.py`). 나머지 37개는 `set -o pipefail`·`X=$(…)` 할당·`node`·`mkdir`·`rm`·`git`·`test`로 시작해 안 맞는다(permissions.md "Compound commands": 줄마다 매칭, 할당 뒤는 allow 불일치). ⚠️ 처음 낸 "규칙만 좁히고 나머지는 auto mode 분류기에 맡김" 안은 반쪽이었다 — 사용자 "정석으로 고쳐야할거아냐". 정석(skills.md "Pre-approve tools" 패턴): 스킬의 모든 Bash 블록을 스크립트 호출 한 줄로 바꿔 규칙이 다 맞게 한다. Q3 B: 1단계 방식대로 일 단위 분리 — `codex-task.sh`에 추가 + `codex-report.sh`(리포트 저장·임시 파일 정리) + `codex-job.sh`(status·result·cancel·transfer). `allowed-tools`는 `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)`(+ python3 호출이 남으면 그 모양 하나).
  - **24차 결정(Q2): 검증** — `claude -p`를 `--allowedTools` 없이 기본 모드로 `/codex-status` + `/codex-review`(작은 diff) 2개 실제 실행, 권한 거부 0건. 나머지 스킬은 규칙↔명령 대조. 끝에 지운 줄 대조(20차 LOST 분류).
- 검증: 단계마다 드라이런/`claude -p` 실행, 끝에 지운 줄 대조(20차 LOST 분류). #5·#15는 각 인용을 설치본 companion 1.0.6(`~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/`)에서 함수 이름으로 찾는다.

**P3 뒤 과제** (21차에 다루지 않음)
- (20차) Artifact 채널에서 highlight.js(cdnjs)를 허용할지 정한다. 금지 이유였던 CSP는 틀렸고, Mermaid와 달리 렌더링 비교가 없다. 허용하면 `structured-blocks.md` "Artifact channel: no CDN" 절을 바꾸고 `data-theme` 테마 전환을 드라이런으로 확인.
- (20차 드라이런 부수 발견) plugin-visual Phase 7 `-sections` 정리 명령은 죽은 문구. 드라이런 에이전트들이 짚은 모호점: refine에서 문장 하나 추가가 "content 재작성"인지, plugin-visual 게시 실패 뒤 남는 `.artifact.html` 처리, md 전용 실행에서 semantic-tokens.md를 읽어야 하는지.
- 10차부터 미답(급하지 않음): gotchas.md "Plugin variables in the Bash tool"에 한 줄 — hook `additionalContext`와 Read로 여는 파일도 `${CLAUDE_PLUGIN_ROOT}`·`${CLAUDE_PLUGIN_DATA}`가 치환되지 않는다(9차 실측).
- 순서: P3 → P4 rubber-duck-tutor → P5 skill-creator-pro → P6 claw-mux·notebooklm → P7 나머지(vibeproxy-kit 맨 끝). S5는 원 작성 머신에서만. P4부터 17차 공통 규칙을 쓸지는 그때 묻는다(P3에선 사용자가 그 규칙대로 지우는 안을 모두 승인했다).

**21차 교훈**
- ✅ 그릴링 전에 행마다 현재 코드와 companion 1.0.6을 실측했더니 원장과 4건이 달랐다: #1은 실제로 깨지지 않음(모델이 스스로 `echo` 후 경로를 글자 그대로 씀), #6은 이미 해결, #12는 전제 틀림(5.1.0부터 effort가 `Run flags`로 companion에 감), setup 인증 확인은 `codex --version`이라 아무것도 확인 안 함. 원장 행을 믿지 말고 구현 직전에도 다시 연다.
- ✅ 사용자 "머가문제란거야?" → 실제 명령·출력 한 쌍으로 문제 하나씩, "문제(실측) → 선택지 A/B → 추천+근거" 형식으로 물었더니 18개를 "추천대로 다음"으로 빠르게 끝냈다.
- ✅ 18차 교훈대로 규칙에서 답이 나오는 것(#13, rescue:463, #16의 없는 문서 참조)은 묻지 않고 알리기만 했다.
- ✅ codex 스킬 실제 실행: 프롬프트를 stdin으로 `claude -p --plugin-dir plugins/codex-advisor --output-format stream-json --verbose --allowedTools "Bash Read Grep Glob Agent"`. `-p`에선 AskUserQuestion에 답할 수 없으니 프롬프트에 "Phase 1.5 초안 승인됨, AskUserQuestion 호출 금지"를 붙였다. jsonl에서 `tool_use`의 `command`를 python으로 뽑아 비교. codex-verify 1회 약 2분.
- ⚠️ zsh에서 `echo ====`는 오류(`= not found`) — 구분선은 `---`.

**20차 교훈**
- ⚠️ 이유를 지어내지 않는다. 19차에 highlight.js 금지 이유를 "Mermaid 결정과 같은 렌더링 선택"으로 적었는데 비교한 적이 없었다 — 사용자가 "하이라이트 js 금지한다고?"로 짚음. 이유가 틀렸으면 규칙 유지/변경을 묻고, 유지하면 이유 없이 두고 과제로 남긴다.
- ⚠️ 사용자가 "뭐할차례?"를 물으면 작업 중이어도 다음 단계 한 줄로 바로 답한다.
- ✅ 드라이런 결과는 `commands.sh`를 grep으로 표로 모아(Artifact 호출 수, sidecar url, Ask 수, `--content-only`) 옛/새를 한눈에 비교.
- ✅ 배포 전 삭제 대조: 서브에이전트가 `git diff <전> <후>`의 지운 규칙마다 MOVED/REWORDED/REF/TOOL/LOST로 분류 → 190개 중 LOST 11개, 그중 2개를 되살림. 드라이런만으로는 이런 손실이 안 보인다. 큰 삭제 정리 뒤에는 이걸 검증 단계에 넣는다.
- ⚠️ "문제없다?"에는 검증 안 한 것을 먼저 말한다(이번엔 지운 줄 대조를 안 한 채 배포를 물었다).
- ✅ JSON 매니페스트의 문자열 하나를 바꿀 때 `jq`는 파일 전체 형식을 바꾼다 → python으로 `json.dumps(옛 값)` 문자열 치환.

**19차 교훈**
- ⚠️ 사용자 "한글로말해" — 사용자에게 보이는 모든 문장은 한국어로.
- ✅ python으로 블록 단위 `cut(시작 문구, 끝 문구, 새 글)` 교체가 큰 SKILL.md 정리에 빨랐다(문구 한 번만 있는지 assert).

**18차 교훈**
- ⚠️ 기존 규칙에서 답이 나오면 묻지 말고 계획에 넣고 알리기만 한다(Q3 "먼소리야 스킬은 adr을 바라보게 짜면 안되는거아냐?").
- ⚠️ 확인은 글자(“A로 기록”)가 아니라 내용(전/후 예시 한 쌍)으로.
- ✅ 질문은 "큰 그림 한 줄 → 사실 → 선택지 → 추천".
- ✅ 수정안을 "지금 툴 설명과 맞나"로도 본다(CSP 문장을 그렇게 찾음).

**17차에서 이어지는 것:** 공통 규칙(위). 원장 수정안 자체가 검수 기준(C4 no-op·중복)에 맞는지도 본다. 지우기 전에 "지울 내용이 references·게이트에 있나"를 grep으로 확인. Python 3.9 + 한국어: 파일 첫 줄 `# -*- coding: utf-8 -*-`, python과 `git commit`은 `&&`로. auto mode 분류기가 막으면 우회하지 말고 한 줄로 묻는다. `claude -p … --allowedTools`는 프롬프트를 삼키므로 stdin으로. 심각도 라벨을 "안 고쳐도 됨"으로 번역하지 않는다. 이 원장이 handoff다 — 별도 파일을 만들지 않는다.

**12차에서 이어지는 주의:** 두 머신에서 작업한다 — 배포 때 release-workflow 1단계(fetch·`origin/main` 비교)를 건너뛰지 않는다(12차 로컬 `main`이 23커밋 뒤였음).

**플러그인 하나 처리 절차** (8~11차에 굳힘)
1. 현재 코드에서 재확인 → 짧게 보고 → 승인. ⚠️ 8차에 "개선하자"를 승인으로 읽고 고쳤다가 "누가 고치래?"를 들었다. 9·10차는 보고 뒤 사용자가 `/skill-creator-pro 고치자`·"ㅇㅇ"로 승인했다.
2. 설계 선택이 있으면 고치기 전에 하나씩 묻는다(10차: 레포 확인만 vs 레포 폴더 → 레포 폴더, 이어서 항상 vs 전역만 → 전역만). 버그가 여럿이면 버그 하나씩 묻는다(11차 `/grill-with-docs`).
3. 검수: 스크립트는 격리 환경(`HOME`·`GIT_CONFIG_GLOBAL`을 scratchpad로, `GIT_CONFIG_NOSYSTEM=1`)에서 직접 돌리고, 옛/새 비교. 검수 결과가 끝나기 전에 사용자가 커밋을 원하면 빈 곳을 원장 행에 적고 커밋한다(9차).
4. 수정 커밋(버전 bump 포함) + 원장 기록은 별도 커밋.
5. 플러그인이 방치됐고 열린 버그가 많으면 삭제도 선택지(10차 e2e-test-runner — 사용자가 먼저 물었다).
- ⚠️ 보고는 짧게, 한국어로. 8차 "장황하게말하지마", 9차 "어디까지햇음?", 10차 "장황하게말하지마 다시보고해"(선택지 두 개 + 장단점 + 부수 발견을 한 번에 늘어놓았다). 형식: 결론 한 줄 + 질문 하나 + 추천 한 줄, 부수 발견은 괄호 한 줄. 11차 "먼소리야 버그 1부터"(버그 두 개의 A/B/C를 한 번에 냈다) → 버그 하나씩 "문제(재현 출력) → 선택지 → 추천 → 근거"로 물었더니 바로 답이 왔다.
- ⚠️ "먼소리지? 이유는 머고"(10차) — 추상 설명이 안 통했고 구체 경로 예시(`--local` `/wt/proj` → `/wt/proj/proj/fix`)로 통했다. 과장 금지: "예전 권장대로"라고 했다가 정정(옛 스킬은 "Per-repo typical"뿐, `--local` 절대 경로 우회책은 eval 에이전트가 지어낸 것).

**eval 방식**
- 스킬 문구만 바꿀 때(8·10차): 서브에이전트 드라이런. 옛 스냅샷은 `git archive <수정 전 커밋> plugins/<이름>`으로 푼 사본, 프롬프트는 "그 SKILL.md만 읽기, 쓰기 금지, 쓰기 명령은 `commands.sh`, 답변은 `response.md`". 산출물 예 `plugins/worktree-plus/.evals/dirbase-repo-scope/iteration-1/`.
- 훅 스크립트 로직(10차): stdin JSON을 직접 먹이는 시나리오 테스트 — `plugins/worktree-plus/.evals/dirbase-repo-scope/script-tests.sh <스크립트> <new|old>`. remove 훅(11차): `.evals/remove-hook/script-tests.sh` — 실제 create 훅으로 worktree를 만든 뒤 삭제. ⚠️ 옛 버전에서 뒤 버그(#29)가 앞 버그(#28)에 가려 안 드러났다 → 앞 버그를 우회하는 시나리오(S6 `.worktree.log` gitignore)를 따로 둔다. ⚠️ 시나리오들이 샌드박스 하나를 같이 쓰므로 worktree 이름·레포 폴더명을 시나리오마다 다르게(10차 S7이 S3의 `app/fix`와 부딪혀 가짜 FAIL).
- hook·`${CLAUDE_PLUGIN_*}` 치환이 걸린 수정(9차): 드라이런으로는 안 보인다 → 실제 `claude -p --plugin-dir <플러그인> --output-format stream-json --verbose --allowedTools …`. 러너·채점 예: `plugins/rubber-duck-tutor/.evals/ship-data-paths/`(`run-e2e.sh`·`grade.py`·`script-tests.sh`, gitignored).
- `aggregate_benchmark`는 `iteration-N/eval-<i>-<name>/<config>/run-1/grading.json`만 읽고 config를 알파벳순으로 놓는다 → `new_skill`/`old_skill`로 이름 지으면 새 버전이 먼저 와 Delta 부호가 맞다. 뷰어는 `generate_review.py … --static <iteration>/review.html`.
- ⚠️ `--plugin-dir` 실행은 데이터 폴더 `~/.claude/plugins/data/<이름>-inline`을 옛/새가 같이 쓴다 → 순차 실행, 실행마다 비우기.
- ⚠️ 세션 한도에 걸리면 결과가 "You've hit your session limit"로 끝난다 — 채점 전에 확인(9차 옛 버전 실행이 전부 무효).
- ⚠️ 모델은 한국어로 답한다(전역 CLAUDE.md) — 채점 정규식을 영어 단어로만 걸지 않는다. 스킬 흐름의 전제 조건도 맞춘다(9차 `/duck-orient`는 `.claude/orientation.md`가 있어야 gap을 확인하는데 없는 레포로 돌렸다).
- ⚠️ macOS bash 3.2: `declare -A` 없음, `set -u`에서 빈 배열 `"${a[@]}"`는 오류(`${a[@]+"${a[@]}"}`), `timeout` 없음(`perl -e 'alarm shift; exec @ARGV' 600 …`).

- 7차: codex-advisor(§2-3 #17) `dae4f7f`·`85f10d5`·`a3cfba4`(5.1.0). 8차: worktree-plus(§2-7 #1·#2) `ebbdffa`(3.1.1) + `6ad0cdd`(3.1.2). 9차: rubber-duck-tutor(§2-4 #1·#21) `d7ea71d`(3.1.3) + 원장 `b0b8999`. 10차: worktree-plus(§2-7 #25) `231504a`(3.2.0). 11차: worktree-plus(§2-7 #28·#29) `b451fb8`(3.2.1) — 그릴링으로 버그 하나씩 방향 확정. e2e-test-runner 플러그인 삭제 `e69be21` — §2-7 #6을 보고하자 사용자가 삭제를 물었고, 3월 이후 방치·옛 SDK(`@anthropic-ai/claude-code@^1.0.77`의 `query`, SDK는 지금 `@anthropic-ai/claude-agent-sdk`)·열린 버그 3건(#3·#6·#7)으로 삭제 추천 → 승인. README 두 곳의 Lab 절(이 플러그인뿐)도 삭제. 12차: v1.84.0 배포 `ee4f077`(P1 나머지). 13차: P2 결정(원장만). 14차: P2 1~3단계 `3abe3ee`·`10686fd`·`d156085`(vision-powers 5.0.0, 미배포). 15차: P2 4단계 `00422aa`. 16차: P2 5단계 `7c14121`. 17차: P2 6단계 `a24bbac`. 상세는 각 행.

| # | 범위 | 막는 결정 |
|---|---|---|
| S1 ✅ `61b5ec0`·`ae776e2` | AGENTS.md·CLAUDE.md·release-workflow.md — §1-1 AGENTS 표 + §1-3 + §1-4 중 AGENTS 목적지. AGENTS 행과 짝인 gotchas 줄도 같은 커밋 | — |
| S2 ✅ `1d9efd7` | gotchas.md — §1-1 해당 행 + §1-4 gotchas 목적지. §1-4의 context 목적지 3개도 여기서 | — |
| S3 ✅ `d3c669c` | INDEX.md + §1-2 퇴적 삭제 + skill 가이드 2개 삭제(#13) + auto-optimize 참조 삭제, skill-creator-pro 2.0.6 | — |
| S4 ✅ `b74fb20` | §1-1 설계 기록 표(상태줄·배너·링크) + rubber-duck 용어집 병합(영어) + context 4개 용어집 형식 정리 + CONTEXT-MAP. rubber-duck-tutor 3.1.2 | — |
| 1부 결정 ✅ `b8b9b61`·`de3166e`·`d1b4bcc` | #16 load-secrets.sh 삭제, #15 버림, #12 메모리 2개 처리 + AGENTS `wiki/` | — |
| S5 | 원 작성 머신: 메모리 폴더 정리(`feedback_audit_scope` 포함 삭제), worktree | #4 |
| P1~P7 | 2부. 분할은 아래 표 | §1-5 #8~#11 |

| # | 2부 범위 | 막는 결정 |
|---|---|---|
| P1 | 실제 버그: ~~§2-1 #1·#4·#32~~ ✅ `5be2cec`(+`143aa9c`), ~~§2-2 #1~~ ✅ `59eb822`, ~~§2-3 #17~~ ✅ `dae4f7f`·`85f10d5`·`a3cfba4`, ~~§2-4 #1·#21~~ ✅ `d7ea71d`, ~~§2-5 #1~~ ✅ `ca54ade`, ~~§2-6 #3~~ ✅ `d9b5177`, ~~§2-7 #1·#2~~ ✅ `ebbdffa`, ~~§2-7 #6~~ ✅ 플러그인 삭제 `e69be21` | — (Q11은 "우선순위 순 하나씩"으로 대체) |
| P2 | §2-1 vision-powers 나머지 — 13차에 결정 완료, 7단계로 나눔(§2-1 "P2 결정"·"P2 구현 단계"). 14차 1~3단계 ✅, 15차 4단계 ✅, 16차 5단계 ✅, 17차 6단계 ✅, 7단계 남음 | ~~#10~~ 13차 결정 |
| P3 | §2-3 codex-advisor 나머지 — 21차에 결정 완료, 3단계로 나눔(§2-3 "P3 결정") | — |
| P4 | ~~§2-4 rubber-duck-tutor~~ — **29차: 안 함**(사용자 결정, #2·나머지 행 모두) | ~~#8~~ |
| P5 | §2-2 skill-creator-pro(#15 `claude plugin eval` 분기 포함) | #9 |
| P6 | ~~§2-5 claw-mux~~ — **29차: 안 함**(사용자 결정), ~~§2-6 notebooklm-connector~~ ✅ `d868b69`(29차, 1.3.3) | ~~#11~~ |
| P7 | §2-7 나머지. vibeproxy-kit 행(#24 포함)은 맨 끝 — 다시 쓸 때 수정(#2 결정) | — |

- §2-5 #1(claw-mux `$SKILL_DIR`)·§2-7 #24(vibeproxy 백업 경로)의 수정안은 "references 파일은 치환 안 됨"(2026-09-24 확인)을 전제로 그대로 유효.

## 검수 기준

렌즈는 llm-wiki(`wiki/`)의 `concepts/agents-md`, `progressive-disclosure`, `principles-over-demonstrations`, `context-rot`, `summaries/context-engineering-claude5`, `nick-nisi-delete-skills`, `mattpocock-skills`. 요약:

| ID | 기준 |
|---|---|
| C1 | 충돌하는 지침 — 비용이 추론 예산으로 청구돼 eval에 안 보임. 최우선 |
| C2 | 낡음·틀림 — 없는 경로, 지난 버전, 거짓 상태줄, 옛 모델용 우회책 |
| C3 | 중복 — 같은 뜻이 2곳 이상. 원본 하나만 남긴다 |
| C4 | 환경 캐시·no-op — 레포를 보면 아는 것, 모델이 기본으로 하는 것 |
| C5 | 공개 계층 — 일부 경우만 필요한 내용이 상시 로드되는 곳에 있음 |
| C6 | 판단 기준이 맞는 자리에 절대 규칙(NEVER/MUST) |
| C7 | 예시·절차 과다 |
| C8 | 이유 없는 비자명 규칙 |
| C9 | 코드로 강제할 불변식이 산문에만 있음 / 코드가 이미 강제하는 걸 산문이 반복 |
| C10 | 포인터·description 품질 |
| C11 | 확인 불가능한 완료 조건 |

## 재검수 (2026-09-23)

HEAD `23c69ec` 기준으로 전 행을 다시 대조했다. 작성 직후 issue 016(codex-advisor 5.0.0)이 구현돼 codex 관련 행이 많이 바뀌었다.

- **삭제한 행** — 이미 해결: 1부 설계 기록 5행, §2-3 머리말 spark 건, claw-mux 기타(설치 캐시). 틀림: claw-mux #8, notebooklm #9. 삭제 사유는 각 표 아래에 남겼다.
- **수정안 교정** — 문제는 맞지만 수정안이 틀렸거나 범위가 모자란 행. 판단이 갈리는 것은 §1-5 #7~#12로 옮겼다.
- **줄 번호 갱신** — §2-3(리뷰 스킬 5개 재작성), INDEX.md(1줄 밀림), 위치 오기.
- **새 발견** — 2부 공통 관찰 "Bash 환경변수"·"reference 파일 치환(추측)", vision-powers #31, vibeproxy-kit #24, skill-creator-pro 기타.

## 렌즈 재검수 (2026-09-24, 1부 §1-1·§1-3·§1-4)

`writing-for-agents` 스킬 기준. 사실 판정은 그대로, 수정안의 **목적지·포인터·유지 판정**을 고쳤다.

- **흩어짐 → 한 곳으로** — 버전 지식 6곳(AGENTS:122·:140, gotchas:19·:21, validate 경고, 메모리 범프 규칙) → AGENTS Versioning 블록 하나. 테스트 교훈 4개(3곳으로 나뉘어 있던 것) → gotchas "Testing" 하나.
- **포인터** — gotchas 포인터가 hooks·scripts·testing을 안 부르면 §1-4로 옮긴 교훈에 닿지 못한다 → "Before any plugin change, read gotchas.md"(43줄이라 싸다).
- **no-op·강제 가능 → 삭제** — AGENTS:115(전역 `attribution` 설정이 이미 강제 ✅), :116(하네스 기본 지시가 "push only when asked" ✅), :139·gotchas:23 kebab-case(validate), :141 Descriptions(기본 행동), :142 줄바꿈(`.gitattributes` `* text=auto eol=lf` ✅).
- **부정형·절대 규칙** — Git Workflow "Never …"는 긍정형으로. :41 "Always start"와 :43-47 조건부 fetch를 한 조건문으로.
- **새 결정** — #13 skill 가이드 삭제, #14 버전 범프 시점(둘 다 결정됨). #5는 불필요로 종결.

---

# 1부 — 레포 문서

## 1-1. 틀림·충돌 (고칠 것)

### AGENTS.md · CLAUDE.md · settings

| 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|
| AGENTS.md:88-99 | 로컬 테스트 전 마켓 버전 disable 지시. 공식 `plugins.md:299`: `--plugin-dir` 로컬 복사본이 그 세션에서 우선. 테스트할 때만 필요한 내용(공개 계층) | (렌즈) 절 전체를 gotchas 신설 "Testing"으로 — `--plugin-dir` 우선 + §1-4 테스트 교훈 3개와 한곳에. AGENTS에서는 삭제 | ✅ |
| AGENTS.md:86 | `unset CLAUDECODE` 우회 불필요 — `CLAUDECODE=1`에서 `claude plugin validate .` 통과 | "Run `claude plugin validate .`"로 교체, `.claude/settings.json`의 `Bash(unset CLAUDECODE*)` allow 삭제 | ✅ |
| AGENTS.md:86 · :122 · :140 · gotchas.md:19 · :21 | validate가 로컬 플러그인마다 `No version specified` 경고 — 따라서 plugin.json에 넣으면 조용히 우선. 버전 지식이 이미 4곳에 흩어짐(단일 원본 위반) | (렌즈) AGENTS "Versioning" 블록 하나로 병합: 위치 규칙 + SemVer + "validate 경고는 정상, plugin.json에 넣으면 조용히 우선" + 수정 커밋에서 범프(#14). gotchas:19·:21 삭제 | ✅ |
| AGENTS.md:79-86 Workflow | (렌즈) 1단계가 :43-47 필수 fetch와 중복. 매 플러그인 수정마다 하는 버전 범프 단계가 없음 | 1단계 삭제(조건부 fetch 문장 하나로), "Bump the plugin's version in `marketplace.json` in the same commit" 단계 추가 | ✅ |
| AGENTS.md:11-12 | lab 목록 낡음 — `lab-harness-zero`는 `76a31f5`에서 제거, claw-mo·claw-mux는 `category: null` | 삭제(원본은 marketplace.json) | ✅ |
| AGENTS.md:139 · gotchas.md:23 | `lab-` 접두사 규칙 — 쓰는 플러그인 0개, e2e-test-runner는 `"category": "lab"`만. kebab-case는 validate가 잡는다(gotchas:23 스스로 기재) | (렌즈) 둘 다 삭제. lab 표시는 marketplace.json의 기존 항목이 보여준다 | ✅ |
| AGENTS.md:22 · :103 | `references/`를 gitignored라 함 — 실제는 git 추적 심링크 `references -> ../references` | "tracked symlink to shared `../references`. Read-only." | ✅ |
| AGENTS.md:74 · gotchas.md:29 | 플러그인 settings.json 지원 키 — 공식 `plugins-reference.md:1004`: `agent`, `subagentStatusLine` | gotchas:29 수정, AGENTS:74 삭제 | ✅ |
| AGENTS.md:60 | "all plugin development work → `/skill-creator-pro`" — 그 스킬은 marketplace·validate·README를 안 다룸 | **결정(#7, 2026-09-24)**: "Skill authoring and evals: `/skill-creator-pro`. Registration, README, validation: follow Workflow below." `claude plugin eval` 안내는 AGENTS가 아니라 스킬에(§2-2 #15) | 🔹 |
| AGENTS.md:82 | "Read **only** those files" ↔ :43-45 공식 문서 필수 fetch, CLAUDE.md "read gotchas before structural change" | **삭제**(2026-09-24). 에이전트 행동이 아니라 사용자 행동 서술이고 완료 조건 없음 | 🔹 |
| AGENTS.md:3 · :36 | GEMINI.md 없음. issues 001-010은 짝 spec 없음 | :3 둘째 문장 삭제, :36 "paired by number from 011" | 🔹 |
| AGENTS.md:3-5 | (렌즈) 관리자용 메모("map, not encyclopedia") — 매 턴 컨텍스트 비용 | HTML 주석으로(주입 전 제거됨, 공식 `memory.md:138`) | ✅ |
| AGENTS.md:41 ↔ :43-47 | (렌즈) "Always start with llms.txt"(절대) ↔ "Mandatory fetch when … Skip for minor edits"(조건부) — 같은 대상 | 조건부 포인터 하나로: "When creating plugins/components, changing schema, or reviewing a spec/issue that cites official docs: fetch llms.txt, then the page; verify each cited number." | ✅ |
| AGENTS.md:110 · :115 · :116 · :120 | (렌즈) :115 Co-Authored-By 금지 — 전역 `~/.claude/settings.json` `attribution` `""`이 이미 강제. :116 no auto-push — 하네스 기본 지시와 같음(no-op). :110·:120 "Never …" 부정형 | :115·:116 삭제. :110 → "Work on `develop`; `main` receives only `--no-ff` merges at release." 태그 규칙(:120-123)은 release-workflow.md로 | ✅ |
| AGENTS.md:141 · :142 | (렌즈) Descriptions "Clear, concise" — 기본 행동(no-op), 실질은 Workflow 4단계. Line endings — `.gitattributes`(`* text=auto eol=lf`)가 이미 강제 | 둘 다 삭제 | ✅ |
| CLAUDE.md:7 | 백틱 안 `` `@AGENTS.md` ``는 import 안 됨(memory.md) + 맵 목록이 AGENTS.md와 중복 | `@AGENTS.md` 한 줄만 남김. 단 CLAUDE.md:14의 gotchas 트리거("read before …")는 AGENTS 포인터로 옮긴다(§1-3) | ✅ |
| .claude/settings.local.json:12,18,19 | `git push`·`git merge`·`git tag` allow. gitignored, 원 작성 머신에만 있음 | 변경 불필요(#5 종결) — push 금지는 하네스 기본 지시 | ✅ |
| .claude/hooks/load-secrets.sh | settings 3곳(project·local·user) 어디에도 등록 안 됨 | **삭제**(#16, 2026-09-24). toolbox secret-setup의 같은 경로 언급은 유저 레포에 생성하는 파일이라 무관 | ✅ |

### docs/reference

| 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|
| skill-building-guide.md · skill-lessons-from-anthropic.md 전체 | Claude.ai PDF·X 글 옮김. 공식과 충돌 다수(Required Fields·1024자·5,000단어 ↔ 전부 선택·1,536자·500줄, 없는 파일 3개 참조, "CRITICAL:" 문체, Claude.ai·API 배포 절, `/skill-creator` 안내). `docs/context/skill-creator-pro.md:18-19`가 이미 "~95% 공식과 같음 → 빠진 부분만 증류" 판정 ✅. 작성 지식은 llm-wiki(`agents-md`·`progressive-disclosure`·`skill-formation`)에 있음 | **두 파일 삭제**(#13, 2026-09-24). 함께: AGENTS Knowledge Map :33-34·INDEX :13-14 행 삭제, `context/skill-creator-pro.md:18-19` 갱신, auto-optimize SKILL.md:59 참조 삭제(2부 skill-creator-pro) | ✅ |
| skill-lessons-from-anthropic.md:191 ↔ gotchas.md:13 | "Reference other skills **by name**" ↔ 플러그인 독립성. 공식에 `dependencies` 필드 존재(`plugins-reference.md:583`) | 파일은 삭제되므로 gotchas 쪽만: "hard dependency → `plugin.json` `dependencies`" 추가(§1-4 "Self-contained plugins" 절로) | ✅ |
| gotchas.md:27 | 플러그인 에이전트 지원 필드 목록 불완전(`name`, `description`, `effort` 누락, `isolation`은 `"worktree"`만) — `plugins-reference.md:72-73` | 목록 빼고 "ignored: `permissionMode`, `hooks`, `mcpServers`"만 | ✅ |
| gotchas.md:33 | ~200단어, 절반이 vision-powers 전용 artifact-design 논증 | 2줄로 축약("`allowed-tools` only pre-approves; declare `Skill(<name>)` for skills you load"), carve-out은 `docs/context/vision-powers.md`로 | 🔹 |

### docs/INDEX.md · 기타

| 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|
| INDEX.md:9, :13-14 | "Required reading"·"spec" — 두 문서는 Claude.ai PDF·X 글 옮김, 공식과 충돌 다수 | 두 행 삭제(#13). :9는 gotchas 행에 맞게 "Read before any plugin change" | 🔹 |
| INDEX.md:17 | "see CLAUDE.md for the entry point" — 진입점은 AGENTS.md:41 | "see AGENTS.md § Official Claude Code Docs" | 🔹 |
| INDEX.md:24 | `plugin-marketplaces.md` 설명 — 실제는 홍보 채널 목록, 파일명도 공식 페이지명과 겹침 | `docs/promotion-channels.md`로 이름 변경 | ✅ |
| INDEX.md:30-34 | `adr/`, `context/` 미등록 | 디렉터리 행 추가 | ✅ |
| INDEX.md:36 | superpowers 폐지 이력 | 삭제 | 🔹 |
| INDEX.md:5 | handoff 수명 규칙 없음 → 퇴적 원인. (렌즈) "register it in this index"가 파일 단위 등록을 불러 목록이 낡음. 설계 기록 상태줄 10건 낡음도 같은 원인(갱신 시점 규칙 없음) | "Handoffs are temporary: once absorbed into specs/issues/ADRs/commits, delete them." + "Register directories, not files." + "Update a spec/issue status line in the commit that completes it." | 🔹 |
| INDEX.md:46-63 | research·handoff 등록이 실제와 불일치 | §1-2 삭제 후 디렉터리 행으로 정리 | ✅ |
| release-workflow.md:20 | 레포 태그 번호 기준 없음(SemVer는 플러그인 버전용) | 기준 한 줄 추가: "Repo tag: minor if any plugin got a minor or major bump, else patch." (#6 결정) | ✅ |
| release-workflow.md:17-18 | (렌즈) 3·4단계 "릴리즈 때 범프할 플러그인을 묻고 범프" ↔ 메모리 `feedback_version_bump` "수정 커밋에서 범프, 묻지 않음". 이력에 둘 다 있음 ✅(`89cb4a7` 릴리즈 범프, `c865a28` 수정 커밋 범프) | #14 결정: 3단계 → "Check every plugin changed since `main` has a version bump", 4단계 범프 커밋 삭제. AGENTS 태그 규칙(:120-123)을 여기로 흡수 | ✅ |
| `.claude/worktrees/remove-test-3` | 살아 있는 git worktree(브랜치 `worktree-remove-test-3`) — docs 사본이 레포 grep 오염. 원 작성 머신에만 있음 | `git worktree remove` 결정(§1-5 #4) | ✅ |

### 설계 기록 (docs/specs · issues · adr · context)

기록 문서라 결정 근거·이력은 줄이지 않는다. 상태줄·뒤집힌 결정 표시·끊긴 링크만 고친다.

**상태줄이 사실과 다름**

| 문서 | 적힌 상태 | 실제 | 수정안 | 확인 |
|---|---|---|---|---|
| issue 001 | 구현 대기 | 완료 `4252baf`, AC 8/10 | "완료(4252baf) · eval·validate AC 2건 + ADR 0002 범위 follow-up 잔여" | 🔹 |
| issue 002 | 구현 대기, 체크박스 27개 전부 `[ ]` | 구현 `abb1db6`, CHANGELOG AC는 `e4ea197`로 무효 | 상태 갱신 + AC 체크 | ✅ |
| issue 003 | "다음 할 일은 릴리즈" | 릴리즈 `56e6138`(v1.76.0), duck-orient 한계는 `d1ac06a`로 해소 | First Action 교체, :581-586 "해소: d1ac06a" | 🔹 |
| issue 005 | 구현 대기, 체크박스 27개 `[ ]` | S1 출시 `08f3ee1`, S2(File Map)는 ADR 0010으로 폐기, S3~S6 미착수 | 상태 갱신 + S2 폐기 표시 | ✅ |
| issue 009 | 헤더 "커밋 40423bd" ↔ 본문 :85-90 "모두 미커밋" | 커밋됨, :255 결함은 `d1ac06a`로 해소 | 본문 스냅샷 표시 | 🔹 |
| issue 011 | ready-for-agent | 완료 `99ced96`(worktree-plus 3.1.0) | "완료" | ✅ |
| issue 012 | ready-for-agent | 완료 `92c01ce`(codex-advisor 4.7.0) | "완료 · spark 별칭은 `4e80b17`(5.0.0)에서 제거" | ✅ |
| issue 013 | ready-for-agent | S1~S3 완료 `761f101`(4.8.0), S4 미실행 | 상태 갱신 + AC 체크 | ✅ |
| issue 014 | "미푸시", :46 severity AC `[x]` | `c865a28`은 origin에 있음, `artifact-gate.js:416` gradient-text에 severity 없음 | :88·:153 "푸시됨", :46 `[ ]` | 🔹 |
| spec 016:7, :250-252 | "③은 ADR 후보", §ADR 후보 "ADR 0012를 쓴다" | ADR 0012 존재(`3f5ec7b`). §그릴 가이드·§핸드오프는 `085fc18`의 :265 역사 기록 배너로 해소 | :7·:250에 "ADR 0012로 확정" 표시 | 🔹 |

**뒤집힌 결정인데 표시 없음**

| 문서 | 뒤집은 쪽 | 수정안 | 확인 |
|---|---|---|---|
| issue 007:3, :68-70 | issue 010 / ADR 0009 (artifact-first 기본) | superseded 배너 | 🔹 |
| ADR 0002 | 0005·0007 (보일러플레이트 복귀, CDN 로컬 전용) | frontmatter `amended-by` + 배너(0007:2-13 형식) | 🔹 |
| ADR 0005 | 0007·0010 (File Map 삭제, CDN 로컬 전용) | 동일 | 🔹 |
| ADR 0004:39-41 "default model is gpt-5.5" | spec 012 D5 (기본 모델 없음) | "(Corrected by spec 012 D5)" | 🔹 |
| ADR 0009:81-83 fact-check 갭 | issue 010 S5(`b9d5ddf`)로 해소 | 구현 노트 한 줄 | 🔹 |

**충돌·중복·링크**

| 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|
| context/codex-advisor.md:22 | "landing via issue 006" — 출시됨 `a35c1b0` | "(issue 006)" | 🔹 |
| spec 016:184 | spec 012 D2 근거를 잘못 인용("companion과 동일 별칭") | 012:84-88 실제 문장으로 | 🔹 |
| context/rubber-duck-tutor.md ↔ plugins/rubber-duck-tutor/CONTEXT.md | 용어집 2개, Confrontation·Gap·Engagement 정의 불일치. 루트 `CONTEXT-MAP.md`는 plugin 쪽 1개만 가리킴 | `docs/context/` 정본으로 병합, plugin CONTEXT.md 삭제, CONTEXT-MAP이 `docs/context/*.md` 4개를 가리키게 | ✅ |
| context/rubber-duck-tutor.md:67 | Engagement = "트랜스크립트 기반 신호" ↔ engine.md:243-250 "live conversation, not re-parse transcript" | 대화 기반 정의로 교체 | 🔹 |
| context/rubber-duck-tutor.md:106 | 삭제된 handoff 파일 링크(`3eb1340`) | issue 003 + ADR 0008 링크로 | ✅ |
| context/skill-creator-pro.md:37 | "Keep eval harness" ↔ 같은 파일 :14, ADR 0001 "restore to official" | "Restore eval harness to official" | 🔹 |
| context/vision-powers.md:11-15 | Mermaid CDN이 기본인 것처럼 기술 ↔ ADR 0009 기본은 inline SVG | "(Local channel only: …)" | 🔹 |
| context/vision-powers.md:176-188 ↔ issue 014:127-134 | 구현 때 좁힌 결정(flowchart·state만 검사, phantom 클래스)이 이슈에만 있음 | ~~용어집에 반영~~ **반영 안 함**(2026-09-24) — 구현 세부라 용어집 대상 아님 | 🔹 |

재검수 삭제(issue 016 구현으로 해소): issue 016:55 "미커밋" · context/codex-advisor.md:57-99 "미구현 설계" — 출시됨, "Planned" 분리는 이제 거짓 · context/codex-advisor.md:65-66 · issue 016:190 — `1475e73`에서 교정 · issue 016:4 "스펙이 맞다" — 열린 결정이 스펙에 반영됨(`1475e73`·`085fc18`), 미결 배너는 이제 거짓 · spec 016:249 §그릴 가이드 — :265 역사 기록 배너로 해소.

## 1-2. 버릴 것 (퇴적)

| 파일 | 상태 근거 | 판정 |
|---|---|---|
| handoff/2026-05-05-claude-preset.md | 착수 안 함, 미확인 추정이 결정처럼 기재 | 삭제(#2 결정 2026-09-24) |
| handoff/2026-06-03-skill-creator-pro-v2-rebaseline.md | 완료 `29d2849`, 문서엔 "커밋 0개" ✅ | 삭제 |
| handoff/2026-06-06-doc-visual-artifact-redesign.md | 완료 `4252baf`, 잔여는 issue 001에 있음 | 삭제 |
| handoff/2026-06-14-vision-powers-audit.md | 완료 `9884796`·`b63f8a6` | `node --test <dir>` 교훈 흡수 후 삭제 |
| handoff/2026-06-20-vision-powers-visual-leverage.md | 완료 4.4.1, 버전·CHANGELOG 지시 틀림 | 삭제 |
| handoff/2026-06-27-vision-powers-review-fixes.md | 완료 `f38d79f`, 문서엔 "전부 미착수" | 삭제 |
| handoff/2026-06-27-vision-powers-structured-blocks.md | Phase 1 완료, 잔여 S3~S6은 issue 005 | 삭제 |
| handoff/plugin-diet.md | 완료, 표가 현재 코드와 불일치 | 삭제 |
| handoff/harness-zero/HANDOFF.md | 레포 떠남(`76a31f5`), 참조 문서 삭제됨 | 삭제 |
| handoff/new-vibe/HANDOFF.md | 대부분 반영 `544ca16`, 일부 결정 뒤집힘. Issue 7(`discover.sh:16` 경로 오염)은 미반영 ✅ | 삭제 — Issue 7은 §2-7 #24로 이동(#2 결정 2026-09-24) |
| handoff/vision-powers/environment-health-v2.15.md | 완료 `8c958fd`, 스킬 개명됨 | 삭제 |
| enhancement/2026-04-18-vision-powers-audit.md | 대상 파일·스킬 전부 없음 ✅ | 삭제 |
| enhancement/2026-04-23-rubber-duck-git-hook-latency.md | 해결 `d0d3ba1` | hook `if` 좁히기 교훈 흡수 후 삭제 |
| research/deeptutor-analysis.md | llm-wiki `summaries/deeptutor.md`가 더 새로움 ✅ | 삭제 |
| research/career-ops-analysis.md | llm-wiki `summaries/career-ops.md`와 중복 ✅ | 삭제 |
| research/ai-context-tools-comparison.md | 외부 도구 조사, 레포 무관 | 삭제(#3 결정 — llm-wiki `comparisons/code-understanding-tools.md`에 있음) |
| research/token-efficiency-tools-comparison.md | 외부 도구 조사, AGENTS.md에 없는 문구를 사실로 인용 | 삭제(#3 결정 — llm-wiki에 있음) |
| research/2026-04-23-vibeproxy-codex-reasoning-aliases.md | vibeproxy-kit payload.override 설계 근거(`f8b0785`) | 유지 + 상단에 "§10 적용됨" + INDEX 등록 |

## 1-3. AGENTS.md 줄이기 (153줄)

| 섹션 | 판정 | 이유 |
|---|---|---|
| Repository Overview 플러그인 목록(:10-12) | 삭제 | marketplace.json이 원본, 이미 낡음 |
| Directory Structure(:14-23), Plugin Component Structure(:62-75) | 삭제, :77 한 줄만 유지 | `ls`로 보이는 트리, 공식 컴포넌트(`workflows/`, `output-styles/` 등) 누락으로 이미 낡음 |
| Knowledge Map 표(:27-37) | (렌즈) "조건 → 대상" 포인터로 재작성. 필수만: gotchas(Before any plugin change), release-workflow(When the user asks to release or tag), specs/issues, INDEX. skill 가이드 2행 삭제(#13) | 현재는 무엇(what)만 있고 언제(when)가 없음. release 포인터 3곳 중복(:35, :125, CLAUDE.md) |
| Official Docs(:39-56) | :41·:43-47은 조건부 포인터 하나로(§1-1), :49 페이지 나열 삭제, :51 Codex 링크는 `context/codex-advisor.md`로, :53-56 대용량 파일 규칙은 **유지** | :53-56은 작업 도중에 닥치는 상황이라 gotchas로 빼면 포인터가 제때 안 걸림 |
| Plugin Development Workflow(:58-99) | §1-1 수정 반영: 1·2단계 삭제, 버전 범프 단계 추가, Local Testing → gotchas "Testing" | |
| references/ 섹션(:101-105) | 한 줄로 | |
| Git Workflow(:107-125) | :110 긍정형, :115·:116 삭제, 태그 규칙·pre-flight(:120-123)는 release-workflow.md로, 포인터 1개 | 중복·no-op·부정형 |
| Plugin Data Paths(:127-134) | 삭제, "Before any plugin change, read `docs/reference/gotchas.md`." 한 줄 | gotchas:9·39와 중복. (렌즈) 포인터가 hooks·scripts·testing을 불러야 §1-4 교훈에 닿음 — 갈래를 나열하느니 "any plugin change"(43줄이라 싸다) |
| Coding Style(:136-142) | Language + Versioning 블록(§1-1)만 남기고 + §1-4 원칙 2줄(deterministic, 로직은 스크립트에) | :139 validate, :141 no-op, :142 `.gitattributes`가 이미 강제 |
| Plugin README Style(:144-153) | `docs/reference/readme-style.md`로 이동, Workflow 4단계에 포인터 | README 작업에만 필요 |
| 머리말(:3-5) | HTML 주석으로 | 관리자용 메모, 주석은 주입 전 제거 |

**유지해야 할 것:** AGENTS.md:43-45(인용 숫자를 공식 원문과 대조), :53-56(WebFetch 요약 사고), 버전 우선순위(gotchas:19 → AGENTS Versioning 블록으로 이동), gotchas.md:31(`Write(path)` 미동작), :43(리서치 결과 대조).

## 1-4. 메모리 이관 맵

메모리 위치: `~/.claude/projects/-Users-ljo-Desktop-project-zero-code-claude-code-zero/memory/` (27개, 원 작성 머신). 레포 문서는 영어로 작성. 아래 "살릴 내용" 요약만으로 레포 반영은 가능하고, 원문 대조와 폴더 정리는 원 작성 머신에서 한다. 다른 머신의 메모리(`/Users/leejuo/…`: `subagent-model-preference`, `wiki-is-symlink-to-llm-wiki`)는 이 맵에 없다(§1-5 #12).

**살릴 것**

| 메모리 | 살릴 내용 | 목적지 |
|---|---|---|
| project_rubber_duck_redesign | jq `.key // default`가 JSON `false`를 삼킴 → boolean은 raw 비교 | gotchas.md 신설 "Hooks & scripts"(렌즈: 테스트 교훈은 "Testing"으로 분리) |
| project_rubber_duck_redesign | `set -u` 아래 `${CLAUDE_PLUGIN_ROOT}` 무가드 참조 → hook 전체 사망. `[[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]` | gotchas.md "Hooks & scripts" |
| (enhancement 문서) | hook `if` 조건을 좁혀 프로세스 기동 전에 거르기 | gotchas.md "Hooks & scripts" |
| (handoff 문서) | `node --test <dir>`은 가짜 fail — 파일 경로를 지정 | gotchas.md 신설 "Testing" |
| project_worktree_plus_setup_skill | headless `-p` 쓰기 검증: `--permission-mode acceptEdits` + 프롬프트에 선승인 | gotchas.md "Testing" |
| project_vision_powers_artifact_channel | 설치 캐시가 레포보다 오래되면 일반 세션의 Skill 툴이 구 로직 실행(`--plugin-dir`은 로컬 우선) | gotchas.md "Testing"(AGENTS:88-99 이동분과 한 항목) |
| feedback_plugin_data_paths | 임시 파일·산출물도 `${CLAUDE_PLUGIN_DATA}`, CWD 금지 | gotchas.md:39 보강 |
| (재검수 발견, 2부 공통) | Bash 도구 환경의 `CLAUDE_PLUGIN_DATA`는 비었거나 남의 플러그인 폴더 ✅ → 스크립트엔 경로를 인자로 | gotchas.md:39 같은 항목에(렌즈: 동일 위치) |
| feedback_audit_scope | 최소 요구 버전은 유지, "tested against"는 재확인 절차 없으면 삭제. 릴리즈 노트 감사 때 억지 변경 금지 | (렌즈) gotcha 아님(조용한 실패가 아닌 드문 작업의 판단 규칙) → **버림**(#15, 2026-09-24). S5에서 메모리 파일 삭제 |
| feedback_verify_rules_against_references | 내부 문서의 FORBIDDEN 규칙도 코드로 강제 전 references와 대조 | gotchas.md:43 병합 |
| feedback_deterministic_over_clever | 로직 배치는 프롬프트보다 hook/스크립트 고정 코드 우선, 가지 기각 전 최선 변형 검토 | (렌즈) 두 뜻 분리: 앞은 AGENTS Coding Style("Prefer deterministic code — hooks, scripts — over prompt instructions for anything checkable"), 뒤("기각 전 최선 변형")는 협업 규칙 → #1 묶음 |
| feedback_plugin_scope | 플러그인엔 기능 범위에 해당하는 지식만 | (렌즈) gotchas:11(설치본 격리)·:13(독립성)과 같은 개념 → gotchas 신설 "Self-contained plugins" 한 제목 아래 셋 + `dependencies`(§1-1) |
| feedback_version_bump | 플러그인 수정 커밋에 버전 범프 포함, 따로 묻지 않음 | AGENTS Versioning 블록 + Workflow 범프 단계. release-workflow.md 3·4단계와 충돌 → #14로 해소 |
| project_vision_powers_artifact_channel | `artifact-gate.js`는 HTML을 텍스트로만 읽음 — 통과 ≠ 렌더 정상 | docs/context/vision-powers.md |
| project_rubber_duck_redesign | 단일턴 trigger eval은 auto-detect형 스킬에 부적합 | docs/context/skill-creator-pro.md |
| feedback_no_unilateral_decisions · feedback_grill_plan_edits_to_doc · feedback_removal_scope · (015·013 메모의 질문 스타일) | 보고 ≠ 승인 / 그릴 중엔 이슈 문서에 작업으로 / 가리킨 레이어만 삭제 / 질문은 하나씩 짧게 | AGENTS.md(§1-5 #1) |

**삭제할 것** — 레포에 이미 있음: `project_references_folder_purpose`, `feedback_issue_docs_location`, `feedback_release_pull_first`, `feedback_readme_style`, `reference_origin_docs`. 끝났거나 낡음: `project_diff_visual_catch_up`, `project_worktree_plus_setup_skill`(교훈 이관 후), `project_vision_powers_artifact_channel`(교훈 이관 후), `project_rubber_duck_redesign`(교훈 이관 후), `project_codex_advisor_105`, `project_skill_creator_pro_status`, `project_codex_advisor_016`(이슈 016에 있음). 다른 레포: `project_harness_engineer`, `reference_harness_landscape`, `project_health_visual_skill`, `project_backend_diagram_015`. 판단 필요: `project_product_demo_video`.

## 1-5. 결정 필요

1. ~~협업 규칙(§1-4 마지막 행 4개 + `deterministic_over_clever` 뒷부분 "기각 전 최선 변형") 위치 — 전역 `~/.claude/CLAUDE.md` vs AGENTS.md~~ — **결정(2026-09-24): AGENTS.md.** 두 머신이 git으로 공유. 다른 레포엔 적용 안 됨을 감수
2. ~~handoff 중 살릴 것 — `claude-preset` 아이디어(삭제/spec), new-vibe Issue 7~~ — **결정(2026-09-24):** claude-preset 삭제. Issue 7은 실제 버그 → §2-7 #24에 합치고 vibeproxy-kit 작업은 2부 맨 끝(플러그인은 유지)
3. ~~research 2개 llm-wiki 이동~~ — **결정(2026-09-24): 삭제.** 위키에 이미 있음
4. `.claude/worktrees/remove-test-3` 제거 여부 (원 작성 머신)
5. ~~`settings.local.json` `git push` allow → ask 전환 여부~~ — **종결(2026-09-24): 불필요.** push 금지는 하네스 기본 지시
6. ~~release-workflow 레포 태그 번호 기준~~ — **결정(2026-09-24): 기존 관행 명문화.** 이번 릴리즈에 minor·major로 오른 플러그인이 있으면 태그 minor, patch만이면 태그 patch(v1.83.0 ← codex 5.0.0, v1.83.1 ← 5.0.2)
7. ~~AGENTS.md:60(모든 플러그인 작업 → `/skill-creator-pro`) — 제안 문구(§1-1)로 할지~~ — **결정(2026-09-24): 제안 문구대로.** 공식 skill-creator 대신 pro를 가리킨다(본문 동일 + 플러그인 스킬용 35줄, 결함은 §2-2에서 수정). 플러그인 스킬의 동작 검증(`claude plugin eval`)은 스킬에 넣는다(§2-2 #15). :82는 삭제
8. ~~rubber-duck #2 수정안 — (a) 원안: 4번을 "already committed session edits"로 재정의 (b) 3·4번 순서 교환. (a)는 미커밋 세션 편집을 `/duck-review`로 보내 duck-verify:4("code just written")와 어긋나고, (b)는 Mode Map(:18-19) 순서와 맞는다~~ — **결정(2026-10-09, 29차): 안 고침.** 이어서 P4 전체를 하지 않기로 함
9. ~~skill-creator-pro #9 — `claude`/`anthropic` 예약 규칙 유지 여부. API·claude.ai 스킬엔 유효한 규칙이라 #11(Claude.ai 절 삭제, ADR 0001) 결정과 묶인다~~ — **결정(2026-10-08, 28차): 묶이지 않음.** 공식 skill-creator에 Claude.ai 절은 있고 예약 규칙은 없다(pro 추가분). Claude.ai 절은 references로 옮겨 유지, 예약 문장은 둘로 나눔 — §2-2 "P5 결정"
10. vision-powers #7 — doc-visual의 md 게시 예외를 인정하려면 channel-decision.md의 권위인 ADR 0009 §3 개정이 따라온다. 개정할지, doc-visual의 md 게시를 없앨지
11. 실행 확인 필요(결정 아님): claw-mux #2(라이브 pane에서 `❯` 오판 재현) — 남음. ~~2부 공통 "reference 파일 치환"~~ 확인됨(치환 안 됨, 2026-09-24)
12. ~~다른 머신 메모리 2개 이관 여부~~ — **결정(2026-09-24, 이 머신 `/Users/leejuo`에서 처리):** `subagent-model-preference` 버림(Fable 세션 전제), `wiki-is-symlink-to-llm-wiki` → AGENTS.md `references/ · wiki/` 절 반 줄(llm-wiki 레포에서 수정). 두 메모리 파일 삭제함. 원문: — `subagent-model-preference`(→ 전역 선호. 근거가 "세션이 Fable 5"라 지금도 유효한지 확인), `wiki-is-symlink-to-llm-wiki`(→ 전역 `~/.claude/CLAUDE.md` 후보: `wiki -> ../llm-wiki/wiki` 심링크가 claude-code-zero·excalidraw-architect·link-dive 3개 레포에 있음 ✅). 전역 CLAUDE.md는 이 머신에 아직 없음 ✅
13. ~~skill 가이드 2개(skill-building-guide·skill-lessons) 줄 단위 수정 vs 삭제~~ — **결정(2026-09-24): 삭제.** §1-1 docs/reference 행
14. ~~버전 범프 시점: 수정 커밋(메모리) vs 릴리즈 때 묻기(release-workflow 3단계)~~ — **결정(2026-09-24): 수정 커밋.** release-workflow 3단계는 범프 누락 확인으로
15. ~~`feedback_audit_scope` 메모리(최소 요구 버전 유지, "tested against"는 재확인 절차 없으면 삭제) — 렌즈 제안대로 버릴지~~ — **결정(2026-09-24): 버림.** 파일 삭제는 S5(원 작성 머신)
16. ~~`.claude/hooks/load-secrets.sh` 삭제 여부~~ — **결정(2026-09-24): 삭제.** — git 추적 파일, settings 3곳(project·local·user) 어디에도 등록 안 됨(2026-09-24 이 머신에서 재확인 ✅). §1-1 "삭제 후보" 행

## 1-6. 수정 순서

1. 틀림·충돌·상태줄 수정 (§1-1)
2. 퇴적 삭제 (§1-2, 결정 #2·#3 반영)
3. AGENTS.md·CLAUDE.md 줄이기 + 메모리 이관 (§1-3, §1-4, 결정 #1 반영)
4. 메모리 폴더 정리 (레포 밖, 원 작성 머신)

---

# 2부 — 플러그인

수정 시 플러그인마다 버전 범프가 따라온다. 공통 관찰:

- **description 비용:** `disable-model-invocation: true` 스킬은 description이 컨텍스트에 안 들어간다(skills.md:509). 매 세션 비용은 모델 호출형만 해당 — codex-advisor 10개 1,974자, skill-creator-pro 2개 760자, vision-powers `diff-visual` 531자·`doc-visual` 399자가 큼.
- **본문 길이:** 공식 팁 500줄 초과 — vision-powers `context-health-visual` 557·`plugin-visual` 553·`diff-visual` 543, `skill-creator-pro` 520, rubber-duck `engine.md` 375(모든 /duck-* 실행마다 로드).
- **설치본 격리 위반 패턴:** 여러 플러그인이 레포 전용 경로(`docs/…`, `references/…`, research §번호)를 가리킴 — 설치본엔 없음(gotchas "Installed plugin isolation").
- **Bash 환경변수 (재검수 추가):** `CLAUDE_PLUGIN_ROOT`·`CLAUDE_PLUGIN_DATA`는 Bash 도구 환경에 없다(plugins-reference.md:765). SKILL.md·에이전트 본문의 `${…}`는 치환되지만, Bash로 실행된 스크립트가 `process.env`/`os.environ`으로 읽으면 안 된다. 2026-09-23 세션 Bash엔 다른 플러그인 값 `CLAUDE_PLUGIN_DATA=~/.claude/plugins/data/codex-openai-codex`가 들어 있었다 ✅ — 비어 있는 게 아니라 **남의 폴더**를 가리킨다. 해당: vision-powers #4, vibeproxy-kit #24, rubber-duck-tutor #21. 경로는 인자로 넘긴다.
- **reference 파일 치환 (재검수 추가, 2026-09-24 확인 ✅ — 치환 안 됨):** 설치본 `claw-mo/2.8.2/references/shared.md`에 `${CLAUDE_PLUGIN_DATA}`가 문자 그대로 있고 Read는 디스크 내용을 그대로 돌려준다. 같은 날 Bash 환경: `CLAUDE_PLUGIN_ROOT` 빈 값, `CLAUDE_PLUGIN_DATA`=`…/data/codex-openai-codex`(남의 폴더) 재현. 공식은 치환 위치를 "the skill's markdown content"와 `allowed-tools`로만 적는다(skills.md:416). Read로 여는 references 파일의 `${CLAUDE_PLUGIN_ROOT}`·`${CLAUDE_PLUGIN_DATA}`·`${CLAUDE_SKILL_DIR}`는 치환되지 않을 가능성이 있다. hook `additionalContext`도 치환 안 됨(2026-09-24 `claude -p` 실측 ✅ — 따옴표 heredoc의 `${CLAUDE_PLUGIN_ROOT}`가 문자 그대로 모델에 도착) — 그대로 Bash에 넣으면 빈 값이거나 위의 남의 값. 해당 파일: claw-mo `references/shared.md`, codex-advisor `references/companion-usage.md`·`evaluation.md`, rubber-duck `skills/ducking/engine.md`, vibeproxy-kit `references/model-selection.md`·`write-guide.md`, vision-powers `references/design-system/{channel-decision,structured-blocks,visual-self-audit}.md`·`plugin-visual/.../analysis-criteria.md`. 실행 확인 후(§1-5 #11) 공통 처리.

## 2-1. vision-powers

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | context-health-visual/SKILL.md:154-155 | `trigger-collision-inspector` 에이전트가 `skills/context-health-visual/agents/`에 있음 — 플러그인 에이전트는 루트 `agents/`만 로드, §5 호출 실패 | 루트 `agents/`로 이동, `vision-powers:trigger-collision-inspector`로 호출, :550·health-criteria:282 경로 수정 | ✅ |
| 2 | high | plugin-visual/.../analysis-criteria.md:185,189-190, env-fit-diagnosis.md:66,87-91, report-template.md:121 | "2% of context window, 16,000 fallback" — 공식 1%(skills.md:1083), context-health-visual과도 충돌 | 1% + 오버라이드 설정으로 교체, 공유 파일 하나만 가리키게. #3 먼저(가리킬 health-criteria가 아직 틀림) | ✅ |
| 3 | high | context-health-visual/SKILL.md:133,430,436-437, health-criteria.md:138-139,150-154,177, context-health-visual/scripts/env-health-scan.js:1152 | "8,000-char fallback", "dynamically shortened" — 현 공식: 덜 쓰는 스킬 description부터 제거, 신규 설정(`skillListingBudgetFraction`·`skillOverrides`·`skillListingMaxDescChars`) 미반영. 스캔 스크립트는 `SLASH_COMMAND_TOOL_CHAR_BUDGET`만 읽음 | 현 공식 기준으로 교체 + 스크립트가 세 설정도 읽게 | 🔹 |
| 4 | high | report-manager/SKILL.md:157(+:19,:57,:85), scripts/config.js:44, list-reports.js:23, render-report.js:83, log-report.js:22 | "`$CLAUDE_PLUGIN_DATA` is a shell env var, not a SKILL.md substitution" — 공식 skills.md:414-416은 치환함. 반대로 스크립트 4개는 `process.env.CLAUDE_PLUGIN_DATA`를 읽는데 Bash 환경엔 이 변수가 없거나 남의 값(2부 공통 "Bash 환경변수") | gotcha 삭제, SKILL.md는 `${CLAUDE_PLUGIN_DATA}`로 통일 + 스크립트는 경로를 인자로 받게 | ✅ |
| 5 | high | report-manager:97,124-153, fact-check:66-87,260, marketplace desc, README:86,106,108 | ✎ 섹션 피드백 UI를 심는 생성 스킬이 없음, ADR 0007이 Artifact에서 제거 → 수확 경로 전부 죽음 | 피드백 수확 절·감지 절·description·README 문구 삭제 | 🔹 |
| 6 | high | context-health-visual/SKILL.md:412,492-495 | `sections-data.json`에서 `body` 제거하라는 프라이버시 가드 — 그 파일 없음(:247). 스캔은 `excerpt`(env-health-scan.js:1324)·`raw`(:1101)를 냄 | 스캔 스크립트가 본문 필드를 안 내게 보장, SKILL.md는 한 줄 | 🔹 |
| 7 | high | channel-decision.md:32-34 ↔ doc-visual:43,76-77,132-162 | "md never changes / stays local" ↔ doc-visual은 md를 `--artifact`로 게시. channel-decision:9-10은 ADR 0009를 권위로 둠 | §1-5 #10 결정 후: 예외 인정이면 ADR 0009 §3 개정 + SSOT 표 예외 행 + doc-visual:43·76-77 삭제 | 🔹 |
| 8 | high | plugin-visual:509, agents/coherence-reviewer.md | `--verify` 플래그·coherence-reviewer 호출이 어디에도 없음 — 에이전트 description 229자만 매 세션 비용 | :509 삭제, 에이전트 삭제(또는 호출 단계 명시) | 🔹 |
| 9 | high | analysis-criteria.md:145,180-181,206, env-fit-diagnosis.md:69,76, report-template.md:122 | "MCP tool definitions load at session start, capped at 10%" — 공식: 기본 전부 deferred(mcp.md tool search). MEMORY.md를 deferred로 분류 | health-criteria §2·§7 모델로 교체(#3 이후) | 🔹 |
| 10 | high | fact-check/SKILL.md:46-47 | diff-visual 리포트 감지를 "Diff Visual" 제목으로 — 현재 제목은 "— Catch-up". "Doc Visual"(:47)도 실제로 안 나옴 | 파일명 접미사 규칙으로(report-manager:160과 동일, `.artifact` 접미사 제거 포함) | 🔹 |
| 11 | high | agents/security-auditor.md:94-119, plugin-visual:524 | "22 hook events as of 2026-03" — 현재 33개. :524가 가리키는 security-rules.md 이벤트 목록도 없음 | 이벤트 표 → 판단 기준(차단 가능/컨텍스트 주입/도구 출력 관찰). 에이전트 도구가 Read/Glob/Grep뿐이라 hooks.md URL 포인터는 못 따라감 — 필요한 목록은 호출 측이 넘긴다 | 🔹 |
| 12 | high | analysis-criteria.md:149-158 ↔ plugin-visual:8,:531 | "All checks run in a single bash block" — `grep`/`ls`가 allowed-tools에 없어 권한 프롬프트로 멈춤(:531 스스로 185s 대기 관측). MCP 체크가 grep하는 `~/.claude/.mcp.json`은 공식 위치 아님(`~/.claude.json`, `.mcp.json`) | `env-fit-scan.js --requirements` 인자로 이동, MCP 경로 교정. 이후 `Bash(which *)`도 미사용(#30과 함께 삭제) | 🔹 |
| 13 | high | agents/security-auditor.md:40 | `security-rules.md` Context Modifiers 참조 — 에이전트는 경로를 못 받음, 9개 중 4개만 복제 | 에이전트 본문에 `${CLAUDE_PLUGIN_ROOT}/…/security-rules.md` 직접 기재(에이전트 본문은 치환됨, plugins-reference.md:769), 에이전트 내 중복 표 삭제 | 🔹 |
| 14 | med | mermaid-patterns.md:484, feature-architect:277, plugin-visual:359,:530 | 노드 한도 15-20/~15/25 ↔ density-rules 9(게이트 강제) | 포인터로 통일 | 🔹 |
| 15 | med | agents/feature-architect.md:250 | violet classDef ↔ semantic-tokens.md:69 금지, 게이트는 4개 hex만 검사 | slate로 교체 | 🔹 |
| 16 | med | mermaid-patterns.md:386,408 | "ELK default" ↔ :27 "Only import when needed", 템플릿은 ADR 0002로 삭제 | 절 삭제 | 🔹 |
| 17 | med | context-health-visual:18 ↔ :344-345,:521-522 | observational 섹션 5개 vs 4개 | "6 graded + 5 observational"로 통일, :344 "10 diagnostic sections"도 11로 | 🔹 |
| 18 | med | doc-visual:4-7, diff-visual:4-9, report-manager:4-5, plugin.json/marketplace | description 동의어 나열, diff-visual 531자는 본문 반복, plugin.json(676자)·marketplace(1004자) 불일치 | 짧게 재작성 + 두 매니페스트 동기화 | ✅(길이) |
| 19 | med | doc-visual:94-121,319-355, diff-visual:354-398,491-519, plugin-visual:413-490, context-health-visual:326-407 | Artifact 채널 블록 ~70줄 × 4 복제 | (17차) 먼저 Artifact 툴 설명과 같은 내용(같은 `file_path` 재게시 = 같은 URL, icon, artifact-design 로드 안내 등)을 지운다. 남은 것(sidecar `url`, `.artifact.*` 경로, 게이트 `--content-only`)만 `references/design-system/artifact-channel.md` 하나로, channel-decision.md(ADR 0009 SSOT)에서 링크 | 🔹 |
| 20 | med | 5개 스킬 local 채널 규칙 | 로컬 규칙·CSS·self-audit 5곳 중복, 일부는 게이트가 이미 강제 | (17차) 게이트가 이미 강제하는 규칙은 옮기지 말고 지운다. 남은 것만 `local-channel.md`로, channel-decision.md에서 링크 | 🔹 |
| 21 | med | 4개 스킬 "Config precedence" 7줄 | channel-decision.md 복제 | channel-decision.md 포인터로 삭제. (`config.js channel` 서브커맨드안은 channel-decision:77-80 "config.js는 단순 키-값"과 충돌해 뺌) | 🔹 |
| 22 | med | context-health-visual:426-541 등 | Gotchas 115줄 대부분 health-criteria 중복·유지보수자 메모 | 런타임 사실은 criteria로, 유지보수 메모는 docs로 → 세 파일 500줄 미만 | 🔹 |
| 23 | med | feature-architect:157-177,354-399 ↔ analysis-criteria:69-119 | 품질 기준 이중화, 체크리스트 14 vs 7로 갈라짐 | analysis-criteria SSOT | 🔹 |
| 24 | med | 여러 스킬 | 개발 흔적("S2–S4", "issue 007 S4.5")과 설치본에 없는 경로(`docs/…`, `references/Kami/…`) | 삭제, 필요한 이유는 인라인 한 문장 | 🔹 |
| 25 | med | fact-check:171-173, report-manager:100,161 | 템플릿 시절 클래스(`ve-card`, `--i`) | ~~"match existing markup" 한 줄~~ (17차) 삭제만 — 그 한 줄은 모델 기본 행동 | 🔹 |
| 26 | low | 5개 스킬 | 8 Tells 재나열, 목록 갈라짐(report-manager:101은 7개, "borrowed costume" 누락) | anti-slop-tells.md 포인터 | 🔹 |
| 27 | low | diff-visual:188,400-405 | "Use extended thinking", 측정 기록 — no-op | 삭제 | 🔹 |
| 28 | low | env-fit-diagnosis.md:43 | "Six Diagnostic Analyses" — 실제 8개, `skills-lock.json`은 공식 문서·디스크 어디에도 없음(실제 파일은 `~/.claude/plugins/installed_plugins.json`) | "Eight", 3G 축소 | 🔹 |
| 29 | low | doc-visual:204 ↔ :210 | "read them each time" ↔ "no need to look up" | 규칙 목록 삭제 | 🔹 |
| 30 | low | plugin-visual:516,:8 | 쓰지 않는 `echo $(date)` gotcha와 `Bash(echo *)` grant | 삭제 | 🔹 |
| 31 | low | doc-visual:118-120,326, diff-visual:384-386,495, context-health-visual:357-359,380, plugin-visual:448-450,465, fact-check:243-244, report-manager:119, scripts/write-artifact-sidecar.js (재검수 추가) | Artifact 툴 `favicon` 파라미터는 deprecated, `icon`으로 대체(툴 스키마) | ~~`icon`으로 교체~~ (17차 A') 스킬에서 `favicon`/`icon` 언급을 모두 삭제 — 사용법은 툴 설명에 있다(처음 게시만 단어 하나, 재게시는 생략). 재게시 지시는 "sidecar의 `url`을 넣는다"만. "favicon/title을 같게 유지" 문단 삭제. `write-artifact-sidecar.js`의 `--favicon` 옵션·필드, `list-reports.test.js` 해당 값 삭제(옛 sidecar의 `favicon`은 읽는 코드 없음) | ✅ |
| 32 | med | scripts/artifact-gate.js:416 (S4 발견) | `checkGradientText`의 `gradient-text` 위반에 `severity` 없음 — issue 014 S2 AC 미충족 | `severity` 추가 | 🔹 |

README 충돌: "4 specialized agents"(실제 3개, 하나는 미호출 — #1·#8 적용 후 plugin-visual이 쓰는 건 2개), "Skips gracefully when claude-in-chrome unavailable"(render-report.js는 로컬 Chrome 바이너리 사용). 위치 README:17, :104.
유지: diff-visual:170-178(검증된 이름만 다이어그램에), :238-240(extraction law), channel-decision.md:82-97, mermaid-patterns.md:448-459·505-515, context-health-visual:496-507.


**P1 처리 (2026-09-24 5차, `/grill-with-docs`로 한 질문씩 결정)**
- #1 ✅ `5be2cec` — 루트 `agents/`로 이동, `vision-powers:trigger-collision-inspector`로 호출. `claude -p --plugin-dir ./plugins/vision-powers`로 로드 확인.
- #4 ✅ `5be2cec` — `config.js`·`list-reports.js`·`render-report.js`는 `--data-dir <경로>` 필수(없으면 exit 2), env·`~/.claude-code-zero` fallback 삭제. SKILL.md 호출부는 `--data-dir "${CLAUDE_PLUGIN_DATA}"`, report-manager의 `$CLAUDE_PLUGIN_DATA`는 `${…}`로, 틀린 gotcha 삭제. references 2곳(channel-decision·visual-self-audit)은 짧은 이름 + `<plugin data dir>`. 호출부 없던 `log-report.js` 삭제. Bash의 `CLAUDE_PLUGIN_DATA`가 codex 폴더였던 원인: openai-codex 1.0.6 `scripts/session-lifecycle-hook.mjs`가 SessionStart에서 `CLAUDE_ENV_FILE`에 자기 경로를 export — codex가 없어도 Bash엔 원래 없으므로 우리 버그는 그대로. codex 폴더에 쌓였던 `audit-*.png` 6장 삭제.
- #32 ✅ `5be2cec` — `severity: 'error'` + 테스트 조건. 테스트 3파일 73개 통과.
- 추가 발견 ✅ `143aa9c`(4.9.2) — `reports_dir` 설정은 list-reports만 따르고 생성 스킬은 무시 → 키 삭제("스킬 7곳이 설정을 읽게"안은 기각: 문서 안내·사용자 없음).

**P2 결정 (2026-09-30 13차, 한 질문씩 — 구현은 결정이 끝난 뒤)**
- 범위: 29개 전부, 3묶음(1 context-health·예산 #3·#2·#9·#6·#17·#22 / 2 plugin-visual·에이전트 #8·#11·#12·#13·#14·#15·#23·#28·#30·README / 3 리포트 스킬 #5·#10·#7·#18~#21·#24~#27·#29·#31).
- [x] `3abe3ee` `context-health-visual` 스킬 삭제 — 본업(목록 예산·컨텍스트 비용)이 `/doctor`·`/skill-doctor`·`/context`와 겹치고 수치가 자주 바뀜. #3·#6·#17·#22는 삭제로 종결. 재확인 때 본 사실: 공식 skills.md에서 8,000자 fallback은 사라졌고, 초과 시 "덜 쓰는 스킬의 description을 뺌", 새 설정 `skillListingBudgetFraction`(기본 0.01)·`skillListingMaxDescChars`(기본 1536)·`skillOverrides`(플러그인 스킬엔 미적용).
- [x] `3abe3ee` `agents/trigger-collision-inspector.md` 함께 삭제 — 호출자가 context-health-visual뿐.
- [x] `3abe3ee` 삭제에 따라 참조 정리(README "4 specialized agents"→2 포함, channel-decision "four channel skills" 2곳→three): README, plugin.json·marketplace description, `list-reports.js`, report-manager, `references/design-system/{channel-decision,diagram-type-selection}.md`. docs/issues·adr의 역사 기록은 그대로.
- [x] `00422aa` #2·#9: plugin-visual의 설치 전 컨텍스트 비용 추정은 유지하고 수치만 공식대로 — 목록 예산 1%(`skillListingBudgetFraction`·`SLASH_COMMAND_TOOL_CHAR_BUDGET`·`skillListingMaxDescChars` 반영, 16K fallback 삭제), MCP는 기본 deferred(tool search, 이름·서버 instructions만 시작 시 로드; `ENABLE_TOOL_SEARCH`·비공식 `ANTHROPIC_BASE_URL`이면 upfront), "10% cap" 삭제. 공식이 밝히지 않은 환산(글자/토큰)은 "추정"으로 표시.
- [x] `3abe3ee` #8: `agents/coherence-reviewer.md` 삭제 + plugin-visual:509 `--verify` 줄 삭제 — 호출처 없음(13차 grep 재확인).
- [x] `10686fd` #11: security-auditor의 hook 이벤트 표(22개, 공식 33개) 삭제 → 에이전트 `tools`에 WebFetch 추가, hook이 쓰는 이벤트마다 공식 hooks.md의 "Exit code 2 behavior per event"·"Decision control" 표에서 그 행을 찾아 판정(exit 2 효과가 이벤트마다 달라 스크립트만 보면 오판). 못 가져오면 "미확인". plugin-visual:524 "22 hook events" gotcha 삭제. (처음 안 "스크립트 행동만으로 판정"은 사용자 제안으로 교체)
- [x] `d156085` #12(+#30): 의존성 확인(bash 한 블록의 `which`·`grep`·`ls`·`test`)을 `env-fit-scan.js --requirements`로 이동, MCP 경로는 `~/.claude.json`·프로젝트 `.mcp.json`. 이후 안 쓰는 `Bash(which *)`는 #30과 함께 삭제.
- [x] `10686fd` #13: security-auditor 본문에 `${CLAUDE_PLUGIN_ROOT}/skills/plugin-visual/references/platforms/claude-code/security-rules.md` 경로 기재(에이전트 본문 치환 — plugins-reference.md:530), 복제한 Context Modifier 4개 삭제.
- [x] `00422aa` #14: 노드 한도를 게이트(`artifact-gate.js:8` 9 nodes/12 arrows)로 통일 — mermaid-patterns:484(15-20)·feature-architect:277(~15)·plugin-visual:359·:530(25) 숫자 삭제, 게이트 한도 포인터로.
- [x] `7c14121` #7(§1-5 #10 종결): md는 "기본 로컬, 요청하면 Artifact 게시" — 플래그든 자연어든 요청이면 묻지 않고 게시, 답변에 "Mermaid는 코드로 보인다" 한 줄. channel-decision.md md 행·:32-34 문구, ADR 0009 §3 개정 기록, doc-visual:43·:76-77("md stays local")·:60-66(자연어면 한 번 묻기) 수정.
- [ ] #5: ✎ 피드백 수확 기능 삭제 — UI를 심는 스킬 없음(13차 grep: README·report-manager에만 남음). report-manager 수확·감지 절, fact-check 해당 절, description·README 문구.
- [ ] **17차 공통 규칙(6·7단계 전체)**: 모으거나 옮기기 전에, 툴 설명·게이트·모델 기본 행동과 같은 내용은 먼저 지운다. 남은 것(이 플러그인만 아는 것)만 옮긴다. 계기: #31 수정안("`icon`으로 이름만 교체")이 툴 설명을 스킬에 다시 적는 안이었다 — 사용자 "스킬에 왜 클로드가 쓰는 툴 옵션이름까지 자세하게 적어야해?". 이 규칙으로 #19·#20·#25·#31 수정안을 고쳤다(각 행).
- [x] (18차 Q1) #19 새 발견: 세 스킬의 "CSP가 외부 요청을 모두 막는다 → Mermaid CDN 불가"는 틀림(지금 Artifact 툴 설명은 cdnjs·jsdelivr·unpkg 스크립트와 Google Fonts를 허용). 그 문장은 지운다. Artifact 채널의 Mermaid 금지는 **유지**, 이유는 "artifact-design 렌더링이 디자인·가독성에서 이겼다(2026-07 비교)" 한 문장. Mermaid 허용은 기능 변경이라 P2 범위 밖.
- [x] (18차 Q2) #19 목적지 변경: 새 파일 `artifact-channel.md` 대신 `channel-decision.md`에 "Artifact channel" 절로 넣는다(툴 설명 중복을 지우면 공통으로 남는 글이 ~10줄, 세 스킬은 이미 이 파일을 읽음). 실행 명령(`artifact-gate.js --content-only`, `write-artifact-sidecar.js`)과 스킬별 저장 경로는 SKILL.md에 남긴다 — references 파일은 `${CLAUDE_PLUGIN_ROOT}`가 치환되지 않는다.
- [x] (18차 Q3) #24 범위: 스킬·references·에이전트에서 ADR·issue·슬라이스(`S2–S4` 등) 언급을 **모두** 지운다(~30건, `grep -rn "ADR 0\|docs/\|issue 0\|S[0-9]–S[0-9]\|S0's\|previous version"`). 스킬은 ADR을 가리키면 안 된다 — 설치본에 `docs/`가 없다. channel-decision.md "Regression authority" 문단 삭제. 이유가 필요한 규칙만 이유 한 문장을 인라인으로. ADR 파일은 레포에 그대로.
- [x] (18차 Q4) #20 목적지 변경: 새 파일 `local-channel.md` 대신 `channel-decision.md`에 "Local channel" 절. 게이트가 강제하는 규칙(보라 hex, classDef `rgba()`·`color:`, 9 nodes/12 arrows, font fallback, 링크·alt·placeholder, 게이트 검사 목록)은 지운다. self-audit 절차·Chrome 부재·2회 제한은 `visual-self-audit.md` 포인터로, 스킬에는 render 명령과 그 스킬만의 점검 항목만. 절에 남는 공통 글은 CSS 기본 5줄(다크 모드 변수, CJK 폰트, `min-width: 0`, `prefers-reduced-motion`, Mermaid zoom은 SVG 크기).
- [x] (18차 Q5) 7단계 검증은 서브에이전트 드라이런(8·10차 방식, 옛/새 스킬 비교). 실제 `claude -p` 게시 실행은 안 한다 — 볼 항목 4개(md 게시 요청 시 묻지 않고 게시, config만으로는 md 미게시, Mermaid "코드로 보인다" 한 줄, 재게시가 sidecar `url` 전달)는 모두 스킬 지시의 문제다. #21·#26·#18은 원장 수정안대로(#21은 config 명령 한 줄만 SKILL.md에 남김 — 치환 때문).
- 버전: 스킬·에이전트 삭제는 인터페이스 제거 → vision-powers 5.0.0.
- 안 함: 게이트의 보라 hex 목록(4개) 확대 — 사용자가 "중요한 것만"으로 좁힘.

**P2 구현 단계** (13차 합의 — 단계마다 커밋 1개 + 검증, 끝나면 다음. 원장 기록은 별도 커밋)

| 단계 | 내용 | 검증 |
|---|---|---|
| 1 ✅ `3abe3ee` | 삭제: `context-health-visual`·`agents/trigger-collision-inspector.md`·`agents/coherence-reviewer.md`(#8 포함) + 참조 정리 → 5.0.0 | 남은 참조 grep, `claude -p --plugin-dir ./plugins/vision-powers` 로드 |
| 2 ✅ `10686fd` | security-auditor #11·#13 (+plugin-visual "22 hook events" gotcha) | 샘플 플러그인(hook 있는 것)으로 옛/새 비교 |
| 3 ✅ `d156085` | 의존성 확인 스크립트화 #12 + #30 | `env-fit-scan.js` 단위 테스트, 권한 프롬프트 없음 |
| 4 ✅ `00422aa` | plugin-visual 수치·색 #2·#9·#14·#15·#16·#23·#28 + README 1건("4 agents"는 1단계) | grep, `node --test` |
| 5 ✅ `7c14121` | md 게시 규칙 #7 (ADR 0009 §3 개정 + channel-decision + doc·diff·plugin-visual) | 문구 대조 |
| 6 ✅ `a24bbac` | 리포트 스킬 오류 #5·#10·#25·#27·#29·#31 | `node --test`, fact-check 감지 |
| 7 ✅ `cdae0d8` | 중복 통합 #19~#21·#24·#26 + #18 description | 옛/새 eval |
- 7단계(19·20차, `cdae0d8`): 18차 Q1~Q5대로. channel-decision.md에 "Artifact channel"·"Local channel" 절, 세 생성 스킬은 포인터 + 저장 경로 + 명령만. 스킬·references에서 ADR·issue·슬라이스·Kami·틀린 CSP 이유 삭제(grep 0건). report-manager refine의 anti-slop 재나열·self-audit 반복 → 포인터. plugin.json·marketplace description 같은 문구 519자. highlight.js Artifact 금지는 유지(20차 사용자 승인 A — 틀린 CSP 이유만 지움, 허용 여부는 P2 뒤 과제). 판단 ②: doc-visual CSS 항목 중 Q4 5줄 밖의 "code block `white-space`"·"status dots, no emoji"는 지움, plugin-visual에는 status dots 한 줄 남김. 검증: `node --test plugins/vision-powers/scripts/*.test.js` 82/82(디렉터리 인자는 이 Node에서 실패 — glob으로), validate 통과, 드라이런 5시나리오 × 옛/새(`~/.claude/plugins/data/skill-creator-pro-claude-code-zero/vision-powers-p2-step7/iteration-1/`) — md 게시 요청 시 묻지 않고 게시 + Mermaid 한 줄, config만으로 md 미게시, plugin-visual 게시 실패 시 로컬 재생성(channel-decision.md 읽음), refine·fact-check가 sidecar `url`로 재게시. 다섯 모두 옛/새 같은 동작. 삭제 대조(20차, 서브에이전트, 표 `vision-powers-p2-step7/deleted-lines-audit.md`): 삭제 규칙 190개 중 MOVED 70·REWORDED 69·REF 28·TOOL 12·LOST 11. LOST 중 영향 있는 2개를 되살림 `4cc477a` — Local channel CSS에 코드 블록 `white-space: pre; overflow-x: auto`(판단 ②로 지웠던 것), diff-visual description에 "get up to speed"·"what changed here". 나머지 LOST 9개는 무해(republish 간 title 유지 — 툴 설명이 강제, Google Fonts·외부 이미지 금지 — 틀린 CSP 근거, `.artifact.md` 재사용 — 같은 경로면 같은 URL, `--no-artifact` 이력, doc-visual status dots·semantic 섹션). 부수 발견(옛 버전에도 있음): plugin-visual Phase 7 `rm -rf /tmp/plugin-visual-{dirname}-sections` — 만드는 곳이 없는 옛 문구.
- 6단계(17차, `a24bbac`): 17차 공통 규칙대로 지우기 위주. #5 report-manager 수확 절·refine 2단계·`--i` gotcha, fact-check `feedback.json` 절·gotcha, README 3곳, marketplace description 끝 구절. #10 감지는 report-manager·`list-reports.js`와 같은 "파일명에 `-diff-visual`/`-doc-visual`/`-report` 포함"("끝남"이 아님 — plugin-visual md는 `-report-security.md`). #25 fact-check 요약 블록의 `ve-card`·`--i`와 함께 `kpi-*` 클래스도 삭제(어디에도 CSS 없음, 같은 템플릿 흔적). #29 삭제한 규칙 7개는 모두 references나 게이트에 있음을 grep으로 확인. #31 세 생성 스킬의 "title/favicon 같게 유지" 문단과 favicon 인자, fact-check·report-manager 재게시의 favicon, sidecar `--favicon`·필드, 테스트 값. 부수: README의 `diagnose environment` 예시 2줄(1단계에서 지운 context-health-visual) 삭제, plugin-visual "based on feedback" 삭제. 검증: `node --test` 4파일 82/82, sidecar 스크립트 실행(필드 url·title·published_at), 잔여 grep 0건, validate 통과. 버전은 5.0.0 그대로(미배포).
- 5단계(16차, `7c14121`): 수정안과 달리 doc-visual만이 아니라 **diff-visual·plugin-visual md도 같은 규칙** — 사용자가 "세 스킬이 같은 규칙이 더 좋다"로 승인. 규칙 본문은 channel-decision.md "Markdown on request" 절(SSOT) 하나, 세 스킬은 저장 경로(`.md`→`.artifact.md`)와 포인터만. plugin-visual은 `security`/`overview` md도 포함. config는 md를 게시하지 않음(이번 턴 요청만). README 표·:95 문장, plugin.json·marketplace description에 한 구절. 검증: "md stays local"·"ask once"·"lone exception" grep 0건, validate 통과. 실제 게시 동작은 7단계 eval에 넣는다.
- 2단계 검증(14차): 실제 `claude -p --plugin-dir`로 security-auditor를 codex-advisor(PreToolUse·SessionStart hook)에 돌려 옛/새 비교(`plugins/vision-powers/.evals/p2-step2-security-auditor/`). 새 버전은 치환된 경로로 security-rules.md를 읽고 hooks.md를 WebFetch해 "SessionStart는 막지 못함, PreToolUse exit 2는 막음, allow는 deny 규칙을 못 넘음"을 인용. 옛 버전도 판정은 맞았으나 출처 없음. ⚠️ "WebFetch 차단" 실행은 부모 `--allowedTools`에 WebFetch가 없어도 서브에이전트가 hooks.md를 받아 와 "unverified" fallback은 검증 못 함. (부수 발견: 세 실행 모두 codex-advisor 스킬 10개의 bare `Bash` allowed-tools를 CRITICAL로 보고 — P3 후보)
- 3단계(14차, `d156085`): 인자 형태는 `--requirement <TYPE>:<name>` 반복(원장의 `--requirements`와 이름만 다름 — 셸 인용 문제 없게 한 줄 하나). MCP는 `~/.claude.json`(user + `projects[cwd]` local)·프로젝트 `.mcp.json`·활성 플러그인의 `.mcp.json`/inline `mcpServers`. `context_metrics.mcp_servers`도 같은 목록으로 교정(예전엔 settings.json의 `mcpServers`를 셌음 — 공식 위치 아님). 검증: `scripts/env-fit-scan.test.js` 6개(격리 HOME·PATH), 전체 79개 통과. feature-architect 예시 help의 `~/.claude/.mcp.json`도 교정.
- ⚠️ 14차 교훈: 3단계에 plugin-visual 실제 실행(옛/새 순차, 1회 10분+)을 걸었다가 사용자가 "굳이 해야했나" → 새 버전 실행은 취소. 게다가 이 머신은 `permissions.defaultMode: auto`라 `claude -p`에서 권한 프롬프트가 원래 안 뜬다(옛 실행도 거부 0건) — 권한 프롬프트 검증은 이 방식으로 불가능했다. 긴 e2e는 무엇을 판별하는지 먼저 따지고, 단위 테스트로 충분하면 생략.
- 4단계(15차, `00422aa`): 공식 skills.md·settings-reference.md·mcp.md(2026-10-01 curl)로 수치 확인 — 목록 예산 1%(`skillListingBudgetFraction` 기본 0.01), 항목당 1,536자(`skillListingMaxDescChars`, `description`+`when_to_use`), 초과 시 덜 쓰는 스킬 description부터 뺌. MCP는 tool search 기본(이름·server instructions만 시작 시), `ENABLE_TOOL_SEARCH=false`·`CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`·비공식 `ANTHROPIC_BASE_URL`이면 upfront, `auto[:N]`은 10% 문턱, 서버 `alwaysLoad: true`는 항상 upfront. 원장 수정안과 다른 점 하나: 설정 값을 모델이 볼 길이 없어서 `env-fit-scan.js`가 `context_metrics.skill_listing`(`budget_fraction`·`char_budget_override`·`max_desc_chars`)과 `mcp_tool_loading`(`deferred`/`upfront`/`threshold`)을 낸다(테스트 3개 추가). 기본 환산은 200K ~8,000자·1M ~40,000자, "추정" 표시. verdict 규칙 6은 "upfront일 때만 10% 비교"로. MEMORY.md를 deferred로 분류한 행 삭제. ⚠️ 공식 env-vars.md의 `SLASH_COMMAND_TOOL_CHAR_BUDGET` 행은 아직 "fallback of 8,000 characters"라고 쓴다 — skills.md에는 fallback이 없어서 fallback은 적지 않았다. #14: feature-architect·mermaid-patterns·plugin-visual 규칙 6은 `diagram-density-rules.md`(게이트) 포인터로, Gotchas의 "25 nodes" 줄은 삭제. #15: builtin → slate `#64748b1f`, skill·agent도 8자리 반투명 hex로. #16: mermaid-patterns "ELK Layout" 절 삭제(위쪽 "With ELK Layout" 선택 import 절은 유지). #23: feature-architect의 카테고리 표·품질 체크리스트 14개·설계 기준 표를 analysis-criteria 포인터로 바꾸고, 카테고리 탐지 휴리스틱·예시 열은 analysis-criteria 표로 옮김(체크리스트 14개 = analysis-criteria Documentation + Quality Checklist). #28: "Eight", 3G와 bundle 표·Gotcha는 `~/.claude/plugins/installed_plugins.json`(`name@marketplace` 키). README: 로컬 Chrome 필요 + 없으면 경고하고 건너뜀. 검증: 옛 수치 grep 0건, `node --test` 82개 통과, `claude plugin validate .` 통과. 긴 e2e는 안 돌림(문구 교체 + 단위 테스트로 충분 — 14차 교훈).
- 버전: P2 단계들은 배포 전이라 5.0.0 하나로 묶는다(단계마다 bump 안 함).
- [ ] 나머지(#15·#23·#28·#30·README 2건, #10·#18~#21·#24~#27·#29·#31)는 원장 수정안대로 처리, 수정안과 달라질 때만 묻는다(13차 사용자 합의 "중요한 것만 판단"). #15는 예시 3줄을 :275 규칙(반투명 8자리 hex)대로, builtin은 slate.

## 2-2. skill-creator-pro

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | skill-creator-pro/SKILL.md:446 (+:245, :406 같은 CWD 의존) | `python ${CLAUDE_SKILL_DIR}/scripts/package_skill.py` — :17 `from scripts.quick_validate import`라 `ModuleNotFoundError`(공식은 `python -m`). 실행 재현됨. `-m`으로 가도 PyYAML 필요(quick_validate.py:9) | ✅ `59eb822`(2.0.7) — "from `${CLAUDE_SKILL_DIR}`: `python -m scripts.package_skill <absolute/path>`"(cwd가 바뀌므로 절대 경로). PyYAML 있는 venv에서 패키징 성공 확인. PyYAML 없는 머신은 **그대로 둠**(2026-09-24 결정: 에러가 드러나 `pip install`로 대응 가능, 이 절은 `present_files` 있는 Claude.ai·Cowork 전용, 공식도 동일) | ✅ |
| 2 | high | auto-optimize/SKILL.md:70-71,337,340 | 작업 디렉터리를 스킬 옆 `autoresearch-*/`에 — 플러그인 스킬이면 배포본에 섞임, skill-creator-pro:181과 규칙 불일치 | `${CLAUDE_PLUGIN_DATA}/autoresearch-<name>/` | 🔹 |
| 3 | high | auto-optimize:3 ↔ skill-creator-pro:3 | 트리거 4개 겹침 — "improve my skill"이 무인 제자리 수정 루프로 갈 수 있음 | auto-optimize는 "hands-off 요청 시에만", skill-creator-pro의 공식에 없는 "Also trigger on…" 삭제(472→~340자) | 🔹 |
| 4 | high | auto-optimize:68 ↔ :109,:219 | 기준선 3-5회 vs 실험 N회 — max_score 비교 불가 | 기준선도 실험과 같은 횟수 | 🔹 |
| 5 | med | skill-creator-pro:259,:300-304 | `kill $VIEWER_PID` — 셸 변수가 호출 간 유지 안 됨, 포트 충돌은 스크립트가 이미 처리 | PID를 echo 후 리터럴로 kill, 이유절 삭제 | 🔹 |
| 6 | med | auto-optimize:121,128-130 | 대시보드가 file://에서 `results.json` fetch — 브라우저가 차단(실측: headless Chrome `TypeError: Failed to fetch`) | 결과 인라인 + meta refresh, 명세는 references로 | 🔹 |
| 7 | med | auto-optimize:72,:219 | 실행 주체 미명시 — eval을 아는 세션이 직접 돌리면 오염 | 매 실행 fresh subagent | 🔹 |
| 8 | med | skill-creator-pro:96 | `${CLAUDE_PLUGIN_DATA}` 지시 — 사용자 스킬 대부분은 personal/project라 치환 안 됨 | 플러그인/개인 스킬 분기 | 🔹 |
| 9 | med | skill-creator-pro:436,:438 | Claude Code 기준 누락 — 예약 `synced`(skills.md:130), 이름 충돌 우선순위(skills.md:161-170, 플러그인 스킬은 네임스페이스). `claude`·`anthropic` 예약은 API·claude.ai 스킬엔 유효 | `synced`·우선순위 추가. `claude`/`anthropic` 규칙 유지 여부는 §1-5 #9 | 🔹 |
| 10 | med | auto-optimize:351-363,:267,:335-347 | 예시·반복 문단·Output Files 중복 | 삭제, changelog 템플릿은 references로 | 🔹 |
| 11 | med | skill-creator-pro/SKILL.md(520줄) | 자기 규칙(:108)과 공식 500줄 초과 | pro 추가분부터 삭제, Claude.ai 절 삭제는 ADR 0001과 부딪혀 결정 필요 | 🔹 |
| 12 | low | auto-optimize:261 | "NEVER STOP" ↔ :215 "ALL CAPS 금지" | 이유 붙인 기준 문장으로 | 🔹 |
| 13 | low | auto-optimize:58-59,:380 | 레포 전용 경로 참조, "step 2" 오기 | 삭제, "Step 3". (:59는 S3에서 삭제됨, 2.0.6) | 🔹 |
| 14 | low | README.md:23 | 없는 기능 "confidence scoring" | 삭제 | 🔹 |
| 15 | med | skill-creator-pro(eval 절) | 공식은 플러그인에 실린 스킬의 동작 검증에 `claude plugin eval`을 권함(skills.md:831, v2.1.269+). skill-creator의 `evals/evals.json`과 형식 비호환(plugin-evals.md:15). 스킬은 이를 모름 | 플러그인 스킬이면 `claude plugin eval`로 안내하는 분기 추가(#7 결정). 500줄 초과(#11)와 함께 줄 수 관리 | ✅ |

기타: agents 3개·schemas.md·scripts는 공식과 동일(ADR 0001 준수). 기록 안 된 fork 2개 — `eval-viewer/generate_review.py:279-291` `</script>` 이스케이프, `eval-viewer/viewer.html`의 sandboxed iframe(.html 출력 실시간 렌더). 공식 `LICENSE.txt`(Apache-2.0) 누락. → ADR/README에 fork 기록, LICENSE 추가.

### P5 결정 (2026-10-08, 28차 그릴링) — **구현 완료 `5a67f5e`(skill-creator-pro 2.1.0)**

순서: P5(skill-creator-pro)를 P4보다 먼저(사용자 승인). 사실 확인 기준: 설치된 공식 skill-creator `claude-plugins-official/skill-creator/2a8ad9f74633` SKILL.md 485줄, pro 520줄, 공식 skills.md·platform agent-skills overview(2026-10-08 받음).

할 일:
- [x] #11 Claude.ai 절(pro :453~, 공식 :420~)을 공식 문장 그대로 `skill-creator-pro/references/claude-ai.md`로 옮기고 본문엔 포인터 1줄. ADR 0001 Consequences의 "`references/` returns to `schemas.md` only" 한 줄 개정(Claude Code 플러그인이라 Claude.ai 절은 거의 안 읽히는데 매번 로드 — C5).
- [x] #11 pro 추가 블록 :49-58("스킬이 맞는 도구인가" 관문, 10줄)을 3줄로: "매 세션 필요한 지식 → CLAUDE.md, 이벤트 자동 실행 → hook" 판단만(5개 도구 목록은 C4). 다른 pro 추가 블록(:96-97, :153-154, :187-188, :339-346, :432-440, :503-504)은 ADR 0001대로 본문 유지. 목표 ≤500줄(pro :108 자기 규칙), #9·#15 추가분 포함. 지울 줄 목록은 구현 전에 보고·승인.
- [x] #9 :436 예약 문장을 둘로: Claude Code는 폴더 이름 `synced`·`anthropic-skills` 금지(skills.md:155-156), API·Claude.ai는 이름에 `claude`·`anthropic` 포함 금지(overview:217). 원장의 "`claude`/`anthropic`은 예약" 서술은 Claude Code 기준 틀렸고 API 기준 좁았다. 이름 충돌 우선순위 추가는 원안대로.
- [x] #7 auto-optimize의 모든 실행(기준선·실험 N회)은 실행마다 새 서브에이전트, 스킬 경로와 입력만 주고 평가 기준은 안 줌, 한 실험의 N회는 같은 턴에 동시 시작. 공식 :169-171(실행마다 서브에이전트, 한 턴에 모두 시작)·:424(직접 실행은 "덜 엄밀")와 같은 원칙.
- [x] #3 auto-optimize에 `disable-model-invocation: true`(무인 제자리 수정 루프 + 큰 비용 → 사용자가 `/auto-optimize`로만 시작; 겹침 0, description ~290자 절약). skill-creator-pro description의 "Also trigger on…" 삭제 → 공식 description + "for Claude Code". :346의 `/auto-optimize` 안내는 유지.
- [x] #6 대시보드: `auto-optimize/scripts/render_dashboard.py` 추가 — `results.json`을 읽어 결과를 넣은 self-contained HTML + meta refresh를 씀. 모델은 실험마다 스크립트 1번 실행(결정적 우선, file:// fetch 차단 회피, 모델이 HTML을 매번 다시 쓰지 않음).
- [x] 나머지 행은 원장 수정안대로: #2(작업 폴더 → `${CLAUDE_PLUGIN_DATA}/autoresearch-<name>/`, `SKILL.md.baseline` 백업도 그 안), #4, #5, #8, #10, #12, #13, #14, #15, 기타(fork 기록·LICENSE).
- [x] 버전 범프(minor), README·description 2곳 갱신, `claude plugin validate .`.

P5 구현 기록(28차): skill-creator-pro SKILL.md 520 → 495줄, auto-optimize 379 → 304줄. 공식 대조 기준은 `claude-plugins-official/skill-creator/6eb6a30bf024`(캐시의 7개 해시 모두 SKILL.md 동일). 옮긴 `references/claude-ai.md`는 공식 절과 문장 동일(diff 확인). #4 실행 단위: "1 실험 = 입력마다 R회, 기본 R=2", `max_score` = evals × 입력 수 × R, Step 2 발견 실행 = 한 실험(→ Step 5 기준선과 같은 단위). #3 명령 이름은 공식 skills.md:437대로 `/skill-creator-pro:auto-optimize`(README도). #6 `render_dashboard.py <results.json> <out.html>`: 데이터 인라인·인라인 SVG(CDN 없음)·running일 때 meta refresh 10초·`.html` 아닌 출력 거부·환경변수 안 읽음·`allowed-tools` 사전 허용 안 함(27차 교훈). 원장 수정안과 다른 점: :438 "조용히 엉뚱한 것이 이긴다"도 틀려서 공식 우선순위(skills.md:188-197)로 고침. README 라이선스 줄에 공식 Apache-2.0 파생과 fork 2개 기록.
검증: `claude plugin validate .` 통과(경고는 로컬 플러그인 version 경고뿐), 절 제목 5개(auto-optimize가 인용) 유지 grep, 깨진 참조 0(`claude.ai section above`·`VIEWER_PID`·옛 `/auto-optimize`), 대시보드 headless Chrome 스크린샷(다크 모드·이스케이프·refresh 확인), 트리거 대조 스모크(`claude -p --model haiku`, 같은 auto-optimize형 프롬프트, 더미 `my-skill`): 옛 버전(`7e50047`) → `skill-creator-pro:auto-optimize` 자동 호출, 새 버전 → `skill-creator-pro:skill-creator-pro` 호출(auto-optimize 0). 합계 약 $0.48. 명령 목록에 `skill-creator-pro:auto-optimize` 있음. 첫 스모크($0.08)는 없는 파일을 가리켜 Skill이 안 불려 무효였다. README 스타일: fork 상세는 구현 세부라 ADR 0001로 옮김. **안 한 것:** 벤치마크(사용자 결정으로 생략). 계획에 없던 값: 기본 R=2(입력 3 × 2 = 6회, 옛 기본 5회와 비슷).
## 2-3. codex-advisor

issue 016(codex-advisor 5.0.0, `05b74a7`)이 리뷰 스킬 5개(review·adversarial·rescue·verify·research)를 다시 썼다. 이 절의 줄 번호는 `23c69ec` 기준이다. (재검수 삭제: 머리말의 `codex-review:73` spark 건 — `4e80b17`에서 해소.)

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | codex-verify:100→283,304,319, research:95→263,284,299, rescue:231→296,310, transfer:40→72 | `$CODEX_COMPANION`을 앞 Bash 호출에서 설정하고 뒤 호출에서 사용 — 셸 변수 비유지, verify/research는 Phase 1.5 질문이 끼어 반드시 다른 호출. rescue:285-286은 스스로 "shell variables do not survive across calls"라 적어 놓고 어김 | 매 블록 첫 줄에서 재해석(또는 #7 스크립트로 흡수) | 🔹 |
| 2 | high | codex-status:19-21, result:19-21, cancel:28 | `status $ARGUMENTS` 따옴표 없이 전달 ↔ companion-usage.md:321 whitelist 규칙 | Phase 1 whitelist + 값별 따옴표 | ✅ |
| 3 | med | codex-cancel:14-19,:37, status:55, result:56 | companion 실제 동작과 다른 설명(id 없으면 활성 job 1개일 때만 취소 — companion 1.0.6 `job-control.mjs:281-305`, `--all`은 상한만 해제) | 실제 동작으로 교체 | 🔹 |
| 4 | med | companion-usage.md:352,:367 | 알 수 없는 플래그 "FATAL" ↔ 각 SKILL.md는 AskUserQuestion | AskUserQuestion으로 통일 | 🔹 |
| 5 | med | rescue:53,226,265,458-459, review:31,43,273, adversarial:30,41,184, verify:282,434, research:262,421 | companion `:NNN` 줄 인용 — 핀과 안 맞는 옛 번호, companion-usage.md와 값이 둘(rescue:226 `:758-790` ↔ companion-usage `:762-823`) | SKILL.md 인용 삭제, companion-usage.md §3 포인터 | 🔹 |
| 6 | med | review:80, rescue:75, verify:173, research:162, adversarial:102 | "Advisory stderr warnings (slug not in cache)" — spec 012에서 삭제된 기능. 스크립트 stderr는 usage와 config 읽기 오류뿐 | 절 삭제 | 🔹 |
| 7 | med | rescue:266-311, verify:283-320, research:263-300, companion-usage.md | 실행·jobId 파싱·대기 루프 복사 + 관련 gotcha 반복. 016의 prepare-verifier.py는 Phase 4만 다룸 | `scripts/codex-task.sh launch/wait`로 이동 | 🔹 |
| 8 | med | rescue:305,321, verify:314, research:294, companion-usage.md:301 | `/codex:status` 안내 — Official 플러그인 비활성 권장과 충돌, 플러그인명 지목 | `/codex-status` | 🔹 |
| 9 | med | companion-usage.md:309 | "enable the Official plugin" ↔ ADR 0006 자체 hook | 자체 hook 기준으로 | 🔹 |
| 10 | med | codex-transfer:3 | description 361자, 모델이 스스로 호출할 흐름 아님 | `disable-model-invocation: true` + 짧은 description | ✅(길이) |
| 11 | med | review:43-44, adversarial:41-42, rescue:457, setup:126 | `--model`/`--effort` 근거 4곳 + companion-usage 중복 | SKILL.md엔 한 줄 포인터 | 🔹 |
| 12 | low | companion-usage.md:302 | effort 값 검증 — companion에 전달 안 됨, 용어집 "Do not reintroduce"와 충돌 | 행 삭제 | 🔹 |
| 13 | low | codex-result:3, cancel:3 | 동의어 나열 | 한 문장 | 🔹 |
| 14 | low | adversarial:11-12,:354 | "invents more than plain review does" 근거 없이 2회(`bcd42f9` 재작성 후) | 삭제 | 🔹 |
| 15 | low | companion-usage.md:14,:155,:296 | "1.0.0+" ↔ README "v1.0.4+", "still present in 1.0.5" 확인 스탬프 | :14 삭제, 스탬프 삭제(:9 핀은 유지) | 🔹 |
| 16 | low | review:272 | 없는 "the plan" 참조 | 삭제 | 🔹 |
| 17 | med | scripts/apply-codex-config.py (S4 발견) | ~~최상위 키가 없으면 파일 끝(마지막 `[table]` 안)에 붙음, 테이블 안 같은 키를 잡음~~ ✅ `dae4f7f`(5.0.3). 7차에 Codex 공식 문서(config-basic·config-reference·config-advanced·config-sample·environment-variables)로 케이스 전수 분석 → 추가로 고침: 작은따옴표 값·따옴표 키 미인식 → 키 중복 → config 파손, `CODEX_HOME` 무시, 여러 줄 문자열 속 `[x]`, 인라인 주석 유실. tomllib(3.11+)로 결과 검증 후 쓰기. 공식 샘플 config에서 옛 스크립트는 effort를 `[windows]`에 넣었음 ✅. 7차 검수 후 `85f10d5`(5.0.4): tomllib가 못 읽는 TOML 1.1 config(Codex 0.156.1은 받음 ✅)에 거짓 거부 → 원본이 읽힐 때만 검증 + 요청 키 외 불변 확인. 호출 스킬 5개에 "실패 시 중단" 명시·낡은 "stderr advisories" 문구 삭제 — 단 e2e(codex-verify, 1회)에선 옛 스킬도 스스로 멈춤 → 버그 재현 안 됨, 명확화 수준. 상위 계층 → `a3cfba4`(5.1.0): 프로젝트 `.codex/config.toml`이 전역을 이김, 스레드 `model`·턴 `effort` 값은 프로젝트를 이김 — app-server 실측 ✅. 스크립트가 cwd→프로젝트 루트(`project_root_markers`, 기본 `.git`)의 프로젝트 config를 찾아 요청 키를 덮으면 `Run flags:`(task: model·effort, review·adversarial: model) 또는 `Note:`(review effort) 출력, 스킬은 그 플래그를 companion 명령에 붙임. companion `task --effort`는 none~xhigh만 받음(max·ultra 거부) → 덮는 경우에만 플래그 전달해 기본 경로 불변. e2e(codex-verify, 새/5.0.4 각 1회): 새 스킬만 `--effort` 전달 ✅. `--profile`·`-c`는 사용자가 직접 치는 것이라 대상 아님 | (완료) | ✅ 테스트 10개 + 공식 샘플·실제 config 사본 |

**P3 결정 (21차 그릴링, 구현은 세션 뒤)**
- [x] #1 ✅ `3c4f2ab`(22차 — 남은 블록은 모두 한 호출 안에서 resolve·사용이라 #7로 끝남, setup은 기타-setup으로): 실측(`claude -p` codex-verify 1회) — 깨지지 않음. 모델이 호출 A에 `echo "CODEX_COMPANION=…"`을 스스로 넣고 뒤 호출에 경로를 글자 그대로 넣었다. 그래도 스킬 글이 :156 규칙("앞 호출의 셸 변수 금지")과 충돌 → **A 작게 고침**: verify·research·rescue 호출 A에 `echo "CODEX_COMPANION=$CODEX_COMPANION"`, 다른 블록은 `"<literal CODEX_COMPANION path>"`(다른 변수와 같은 방식). 심각도 high → med. #7(스크립트화)은 따로 정한다.
- [x] #2 ✅ `882843b`: 실측 — `/codex-status show me the last job` → `No job found for "show"`. **A 짧은 거름 규칙**: status·result·cancel에 "job id와 문서에 있는 플래그만 값마다 따옴표 붙여 넘김, 그 외는 버림, 말로 된 요청이면 인자 없이" 3줄. review식 전체 Phase 1 복사(C7)·`"$ARGUMENTS"`(플래그 깨짐)는 기각.
- [x] #3 ✅ `882843b`: companion 1.0.6 `job-control.mjs` 대조 — cancel은 id 없으면 이 세션 활성 job이 1개일 때만 취소(2개↑ 거부 :300), status `--all`은 상한만 해제(:227), result는 이 세션의 최근 종료 job(failed·cancelled 포함, :257). **A 지움**: cancel Phase 1·:37, status :55, result :56. companion 오류 메시지가 이미 설명(C4). companion이 안 말하는 것만 남김(취소해도 diff는 남음).
- [x] #4 ✅ `882843b`: 같은 입력(`--foo`)에 SKILL.md 5개는 AskUserQuestion, companion-usage §7 규칙 7(:351)은 FATAL — §7 예시(:362 `--uncommitted`)도 규칙 7과 어긋남. **A AskUserQuestion으로 통일**: 규칙 7을 "넘기지 않음 → AskUserQuestion"으로, :367 예시도. 비대화형은 규칙 6(exit 1)이 이미 처리.
- [x] #5 ✅ `882843b`: 실측 — 스킬 `:619`(readTaskPrompt) ↔ 1.0.6 실제 :643·:648-649. companion-usage는 "1.0.5 기준". **B 모든 곳(SKILL.md 9개 + companion-usage.md)에서 줄 번호를 함수 이름으로**. A(SKILL.md만 삭제)는 낡은 번호를 한 곳에 남겨서 기각.
- [x] #6: 이미 해결 — 7차 `85f10d5`에서 "stderr advisories" 문구 삭제, 지금 스킬에 없음.
- [x] #7 ✅ `3c4f2ab`(22차): verify·research 블록 diff — 코드 같고 주석·설명만 갈라짐. **A `scripts/codex-task.sh`**: `launch <prompt-file> <out-dir> [run flags]` → JOB_ID 출력, `wait <job-id> <out-dir>` → 4분 한 번 대기 후 상태 출력, 끝났으면 result를 파일로. companion 경로는 스크립트가 직접 찾음 → #1은 이 블록에서 사라지고, #1 A는 남은 블록에만 적용. 재호출 횟수 판단은 스킬에 남김(Bash 시간 제한).
- [x] #8 ✅ `3c4f2ab`(22차): Official 플러그인을 끄면 `/codex:status`는 없음(README :59-62가 끄라고 안내). companion 자체 메시지도 `/codex:status`·`/codex:cancel`을 안내. **A** 우리 글(rescue:307, verify:316, research:296)을 `/codex-status`로 + companion-usage §6에 "companion 메시지의 `/codex:<x>`는 사용자에게 `/codex-<x>`로 알린다" 한 줄. #7 스크립트로 옮겨지는 곳은 함께.
- [x] #9 ✅ `882843b`: companion-usage:309 "Official 플러그인을 켜라" ↔ transfer:78 "자체 hook이 설정, `CLAUDE_ENV_FILE` 없을 때만 → `--source`"(코드·ADR 0006과 맞음). **A :309 행 삭제**, transfer:78만 남김(transfer 전용 오류, C3).
- [x] #10 ✅ `882843b`: description 실측 — 10개 합계 약 2,060자, transfer 371자(나머지 150~210). **A `disable-model-invocation: true` + 짧은 description**. 세션을 떠나는 동작은 사용자가 직접 고른다.
- [x] (21차 추가, #10 확장) ✅ `882843b` cancel·status·result·setup에도 **`disable-model-invocation: true`**(합계 약 700자, 트리거가 명령 이름 자체). 모델 호출형은 review·adversarial·rescue·verify·research 5개만 남김.
- [x] #11 ✅ `882843b`: 같은 이유 두 문단이 review:42-44·adversarial:41-43·rescue:457·setup:126·companion-usage :44·:47. **A** SKILL.md 4곳을 "`--effort`를 companion에 직접 넘기지 않음(review엔 그 플래그가 없어 프롬프트에 섞임) — 자세히는 companion-usage §2" 한 줄로. 긴 설명은 companion-usage에만. rescue의 "스크립트는 값을 판단 안 함, Codex가 판단"은 남김.
- [x] #12 ✅ `882843b`: 원장 전제("effort는 companion에 안 감") 틀림 — 5.1.0부터 프로젝트 config가 effort를 정하면 `Run flags: --effort`로 `task`에 감, `max` 등은 companion이 거부(:124). **B 고쳐 씀**: "프로젝트 config 때문에 Run flags로 `--effort`를 넘긴 경우에만(rescue·verify·research). 메시지 그대로 전달, 다른 값을 묻는다." 값 목록 하드코딩 삭제(setup:92와 충돌).
- [x] #13 ✅ `882843b`: Q11로 흡수 — result·cancel이 `disable-model-invocation`이 되면 description은 `/` 메뉴용. "Use when asked …" 동의어 나열을 빼고 한 문장으로(4개 모두).
- [x] #14 ✅ `882843b`: 지금은 adversarial:11-14 한 곳(:354는 이미 없음). Verifier 이유로 든 "invents more than plain review"는 측정 안 함, review도 같은 Verifier. **A 삭제** — review:14와 같은 "The judging is deliberately not yours."로 맞춤, "looks for reasons NOT to ship"은 남김.
- [x] #15 ✅ `882843b`: companion-usage :14 "1.0.0+"(README :139는 1.0.4+, transfer 1.0.5+), :155 "still present in 1.0.5" 도장, :9 기준 "1.0.5"(설치본 1.0.6). **B** :14·:155 삭제(최소 버전은 README 한 곳), #5 작업 중 인용을 1.0.6에서 찾으며 :9를 "1.0.6"으로. 부수: :7-8 인용 경로 `references/codex-plugin-cc/...`는 레포 전용(설치본 격리 위반) → #5 때 함께.
- [x] #16 ✅ `882843b`: review:272-274 bullet **전체 삭제**("See §3.1 of the plan"은 없는 문서, 나머지는 Phase 1 :51과 중복·이력 설명).
- [x] 기타-setup ✅ `3c4f2ab`(22차): 실측 — `codex --version`은 인증과 무관하게 버전만 출력 → 인증 확인이 항상 "likely OK". `companion setup --json`이 `codex.available`·`auth.loggedIn`·`nextSteps`를 줌. **A** "CLI 확인"·"인증 확인" 절 삭제, 블록 하나에서 resolve → `setup --json` → 보고. 못 찾으면 지금 설치 안내. setup의 #1(:45 설정 → :61 사용)도 여기서 사라짐.
- [x] 기타-rescue ✅ `882843b`: :463 "Exploring biases the double-check" 삭제(Verifier는 메인 세션 탐색을 모름). 규칙과 앞 이유("Codex가 context를 만든다")는 남김 — 새 이유를 지어내지 않는다.
- [ ] P3 후보(14차 bare `Bash`): 공식 skills.md:582 — 부른 턴 동안 모든 셸 명령을 묻지 않고 허용. **A #7 뒤에 좁힘**: `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)` 중심(skills.md:459-471 패턴), `claude -p`를 `--allowedTools` 없이 돌려 권한 거부 0건 확인. 거부가 많으면 B(그대로 두고 이유 기록)로 물러남.
- [ ] 구현 순서·커밋(Q18 A): ① 구조 — #7 `codex-task.sh` → #1(남은 블록)·기타-setup·#8, 5.2.0 bump ② 글 정리 — #2·#3·#4·#5(+#15)·#9·#11·#12·#14·#16·rescue:463·description(#10·#13·Q11 확장) ③ 권한 — P3 후보 bare `Bash`. 단계마다 커밋 하나, 버전은 배포 전까지 5.2.0(모델 호출을 꺼도 `/명령`은 동작 → minor). 검증: 드라이런 + 지운 줄 대조(20차 LOST 분류).

**P3 1단계 기록 (22차, `3c4f2ab`)**
- `codex-task.sh launch <prompt> <run-dir> [flags]`(허용 플래그 외 거부 — positional이 stdin을 덮는 문제를 코드로 막음) / `wait <job-id> <run-dir>`(STATUS=·WAIT_TIMED_OUT=·RESULT_FILE=·ERROR=, companion 출력은 run-dir 파일로만). 스킬 임시 파일은 `RUN_DIR` 하나 → 정리는 `rm -rf`(rescue는 prompt 남김).
- ✅ 새 발견: Bash 기본 timeout은 2분(공식 env-vars.md `BASH_DEFAULT_TIMEOUT_MS`), 스킬·README의 "300s"/"5분"은 틀림 → wait 호출에 `timeout: 300000` 명시, 잘린 호출도 job은 계속 돈다고 적음. e2e에서 모델이 `timeout=300000`을 붙임.
- ✅ 새 발견: companion은 runner가 non-zero로 끝나면 `errorMessage` 없이 `failed`(`lib/tracked-jobs.mjs:156`) → 스크립트가 빈 `ERROR=` 대신 안내 문장. `setup --json` `nextSteps`의 `/codex:setup --enable-review-gate`는 Official 전용 → 전달 안 함.
- 검증: 가짜 companion 시나리오 13개, `check-prompt-blocks.py`(스크립트 리다이렉트 검사로 바꿈, 깨뜨린 경우 FAIL 확인), 단위 24개(Python 3.11+ — 3.9는 `tomllib` 없어 원래 1 error), hook 12개, 지운 줄 대조(LOST 2·틀린 문장 3 → 고침), `claude -p` codex-verify 2회(2회차는 wait 통과 뒤 사용자 요청으로 중단). research·rescue e2e는 안 함.
- 2단계로 넘김: rescue Phase 2 주석 "Model/effort are NOT passed as companion flags"가 `Run flags:` 줄과 모순(#11·#12에서).

**P3 2단계 기록 (23차, `882843b`)**
- 결정대로 반영: status·result·cancel 인자 거름 규칙(job id 모양 `task-mf3k2a-x7q1zp` 예시 포함), cancel Phase 1 삭제(→ `AskUserQuestion` 도구도 뺌), companion-usage의 줄 번호를 함수 이름으로(1.0.6 기준), §7 규칙 7 FATAL → AskUserQuestion, §6 transcript 행 삭제, effort 오류 행을 Run flags 경우로, model/effort 근거는 companion-usage §2 한 곳, 5개 스킬 `disable-model-invocation: true` + 한 문장 description, README에 "모델 호출 5개 / `/명령` 전용 5개" 한 줄.
- ✅ 새 발견(고침): review에 알 수 없는 플래그 → focus text → `validateNativeReviewRequest`가 거부(조용한 오염 아님, adversarial만 조용히 섞임). status `--all`은 상한만 풀고 여전히 이 세션 job만(옛 글 "across sessions" 틀림). task 계열은 `codex-task.sh launch`가 알 수 없는 인자를 거부 → "Phase 1이 유일한 안전망" 문장 교체. "Model/effort never reach the companion"(Run flags와 모순) 3곳 교체.
- 검증: `claude plugin validate` 통과, `check-prompt-blocks.py` OK, hook 12/12, frontmatter 파싱, status 드라이런 4건(`; rm -rf ~` 버림 포함), 지운 줄 대조 LOST 0(경미 1 — §2 task 행 effort 값 목록 되살림), 새로 인용한 함수 이름 1.0.6에서 전부 확인. `claude -p` e2e와 Python 단위 테스트는 안 함(스크립트 불변) → 3단계 뒤 e2e 한 번.

**P3 3단계 기록 (24~26차, 미커밋)**
- 스킬 10개의 `allowed-tools` 첫 항목 = `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)`. 모든 Bash 블록 = 스크립트 호출 한 줄. 새 스크립트: `codex-report.sh`(`list`·`save`·`clean`), `codex-job.sh`(status·result·cancel·transfer·setup·config). `codex-task.sh`에 `new-run`·`check-doc`·`check-ref`·`prompt`·`snapshot`·`review`·`review-wait`·`payload` 추가.
- ✅ 턴 경계(25차 실측): `run_in_background`가 끝나면 새 턴이 되고, 스킬 허용이 사라진다(skills.md "The grant clears when you send your next message"). → `codex-task.sh review`가 companion을 분리 실행한다. node `spawn(detached)` + sh `set -m`이다. `set -m`이 없으면 companion이 자기 프로세스 그룹을 갖지 않아서, `/codex-cancel`(`terminateProcessTree`가 `kill(-pid)`)이 ESRCH로 아무것도 죽이지 못한다. 종료 코드는 `<run-dir>/exit`에 남는다. `review-wait`가 최대 4분 기다린 뒤 `STATUS=running|done`을 낸다. 상한은 8회(약 30분, 26차 Q1). 상한에 닿으면 취소하지 않고 `/codex-status`·`/codex-cancel`을 안내한다(옛 KillShell 행 교체).
- ✅ 원래 버그(26차 Q2): verify·research의 doc 모드 payload(`prepare-verifier.py` `run_doc`)가 `prompt.txt`·`result.json`을 경로로 가리키는데, `clean`이 폴더를 통째로 지웠다. → `--keep-prompt`를 `--keep-inputs`(두 파일을 남김)로 바꿨다. rescue·verify·research Phase 5에서 쓴다. rescue read-only(`run_findings`)는 `load_json`으로 내용을 담으므로 영향이 없다.
- ✅ 새 발견(26차 e2e): Write로 `~/.claude/plugins/data/…/reviews/`에 쓰면 `safetyCheck`("sensitive file")로 거부된다. allow 규칙으로 풀 수 없다. 옛 버전도 같았다. → `codex-report.sh save <data-dir> <type> [--failed]`이 stdin(heredoc `CODEX_REPORT_END`)을 받아 `<type>-<YYYYMMDD-HHMMSS>[-failed][-N].md`로 쓰고 `SAVED=`를 출력한다. 5개 스킬 Phase 5와 evaluation.md "Save Results"를 바꿨다.
- 문구: companion-usage §1(`die()`는 codex-task.sh·codex-job.sh에 있음), §4 Pattern A(분리 실행 + `review-wait`, `run_in_background` 금지 이유), §6 wait-timeout 행, §6 Never, §7 규칙 6·review·adversarial Phase 1 Ambiguous(`AMBIGUOUS:` 한 줄), §8 `--keep-inputs`, §10. verify의 "blind-payload `cat`" 문장 → `codex-task.sh prompt --document`.
- 검증: 가짜 companion으로 review/review-wait 6개 경로와 취소(`kill(-node pid)` → `COMPANION_EXIT=143`, `OUTPUT=empty`), `clean --keep-inputs`, `save` 경로(같은 초 `-2`, 빈 입력·잘못된 type·인자 거부)를 시험했다. `check-prompt-blocks.py` OK(검사 3종을 새 구조로 고침: `codex-task.sh" payload`, `review-wait` + `Cap at 8`, 프롬프트 heredoc 정규식). `test_prepare_verifier` OK. `claude plugin validate` 통과. e2e `/codex-review --scope working-tree`: 1회차에서 Write 거부 1건 → 고침 → 2회차 거부 0건. 리포트 저장·`CLEANED=` 확인. adversarial·rescue·verify·research는 규칙↔명령 대조(24차 Q2). 26차 변경분의 지운 줄 대조는 안 했다. hook 테스트 `node --test plugins/codex-advisor/hooks/tests/verifier-payload.test.mjs` 12/12 통과.

기타: `codex-setup:32-40` 인증 확인은 companion `setup --json`의 `authStatus`로 대체 가능. rescue:461 "Exploring biases the double-check"는 Verifier 도입 후 낡은 이유 문장(:23-26은 `bcd42f9`에서 교정됨).

## 2-4. rubber-duck-tutor

ADR 0003·0008은 재논의하지 않음.

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | hooks/post-push.sh:66, post-pr.sh:66, engine.md:289 | `resolve-gap.sh "<the exact gap text recent-gaps.sh printed>"` — 출력이 `날짜<TAB>gap`이라 그대로 넘기면 no-op → ship-point gap이 영원히 해소 안 됨 | "gap text with the leading date and tab removed" | ✅ **완료**(2026-09-25, `d7ea71d`, 3.1.3). 문구 대신 코드로: `resolve-gap.sh`가 앞의 `YYYY-MM-DD<TAB>`를 스스로 뗀다 — 찍힌 줄·맨 텍스트 둘 다 해소됨. 9차 격리 실행으로 버그 재현 후 수정 확인 |
| 2 | high | duck/SKILL.md:29-30 | 3번(`git diff --stat` 미커밋)이 4번(세션 편집 미커밋)을 먼저 잡아 `/duck-verify`로 거의 라우팅 안 됨(새 untracked 파일만 있는 세션만 4번 도달) | §1-5 #8 결정 — (a) 4번 재정의 (b) 3·4번 교환. 중복 Mode Map 표 삭제는 공통 | 🔹 |
| 3 | high | ducking/references/exercise-patterns.md:48 ↔ :176, engine.md:347 | "막히면 코드 보여줘라" ↔ "어느 단계에서도 코드 금지" | :48 삭제, 1-3줄 문법만 허용 | 🔹 |
| 4 | high | engine.md:173 ↔ :188,:198 | 증명 안 된 hunch를 log-gap에 기록 → 다음에 틀린 gap으로 출제 | hunch는 별도 줄, log-gap 금지 | 🔹 |
| 5 | high | engine.md:103,105 | 모델 재량 제안 지시 ↔ ADR 0003, "regardless" ↔ `enabled:false` 즉시 중단 | 재량 부분 삭제, config 체크 우선 | 🔹 |
| 6 | high | references/orientation-guide.md:3,72, log-gap.sh:7, exercise-patterns.md:3 | 유저 레포에 `/duck orient refresh` 문구 기록 — 이 명령은 동작 안 함. "main SKILL.md" 문구는 orientation-guide 아닌 exercise-patterns.md:3 등 | `/duck-orient refresh`, "main SKILL.md" → `engine.md` | 🔹 |
| 7 | high | plugin CONTEXT.md ↔ docs/context/rubber-duck-tutor.md | 용어집 이중·정의 충돌 (1부 설계 기록 표와 동일 건) | 1부에서 처리 | ✅ |
| 8 | med | engine.md:133,:163 | quick check "~30초" ↔ 필수 Confidence·Uncertainty 체크 | quick은 둘 다 생략 | 🔹 |
| 9 | med | engine.md:337 ↔ :38,:64-69, duck-orient:19 | 한 메시지 질문 2개, "before anything else" 두 곳(engine·duck-orient:19) | :337 삭제, 순서 한 줄 명시 | 🔹 |
| 10 | med | engine.md:216-333 | ship-point 3절 118줄(engine의 31%) — 어떤 모드도 실행 안 함, hook은 engine 안 읽음. 슬라이스 이력(:259, :279) 섞임 | 이력 제거 후 `references/ship-point.md`로. #12와 함께(포인터가 끊기지 않게) | 🔹 |
| 11 | med | engine.md:227-233 ↔ post-push/post-pr:66 | "keep in sync" 사본 drift — hook엔 injection·N+1·hook contract 누락, tie-break는 hook에만 | `lib.sh` 함수 하나를 SSOT로, sync 주석은 grep 테스트로 | 🔹 |
| 12 | med | post-push.sh:62, post-pr.sh:62 | 경로 없는 "see the plugin engine doc" 포인터 — ship 시점에 engine 읽기 유도(ADR 0003 근거와 충돌) | 괄호 정의 인라인, 포인터 삭제 | 🔹 |
| 13 | med | engine.md:210-211 | `lib.sh duck__check_rate_limit`(lib.sh:67)가 이미 강제하는 세션 한도 | :210-211만 삭제. :209(사용자 거절)·:214는 다른 곳에서 강제 안 되므로 유지 | 🔹 |
| 14 | med | engine.md:340-361 | "wrong is wrong" 3회, 질문 1개 규칙 반복, exercise-patterns 복사 | 포인터 1줄. 단 :359("no general-knowledge questions")는 다른 곳에 없어 유지 | 🔹 |
| 15 | med | engine.md:41 ↔ :90, verify:40 | "Never solve, never hint" ↔ 스스로 교정·설명 지시 | "답을 내놓은 뒤에만 한 문장으로 정답" | 🔹 |
| 16 | med | duck-prebuild:102 | "Continue until all decisions are covered" — intensity 예산과 충돌 | 예산 소진까지 위험 순 | 🔹 |
| 17 | med | duck/SKILL.md:36,:46,:50 | auto-detect 후 인라인 실행 vs 명령 안내 미정, 없는 "fallback" 섹션 | 한 규칙으로 | 🔹 |
| 18 | low | 6개 스킬 description | 전부 `disable-model-invocation`이라 모델 트리거 문구 무의미(coach 504자) | 120자 이하 메뉴 라벨 | ✅ |
| 19 | low | engine.md:221,:239, hooks:66 | 외부 스킬(`code-review`) 이름 지목 | "out of scope for duck" | 🔹 |
| 20 | low | README.md:45-47 | engine 동작과 다른 설명 3줄 | 실제 동작으로 | 🔹 |
| 21 | high | ducking/scripts/ 7개(`log-gap`·`recent-gaps`·`resolve-gap`·`log-telemetry`·`ignore-streak`·`telemetry-summary`·`read-config`) + hooks/lib.sh (2026-09-24 발견) | 데이터 경로를 `${CLAUDE_PLUGIN_DATA:-~/.claude/data/rubber-duck-tutor}`로 env에서 읽음(2부 공통 "Bash 환경변수"). hook이 부르면 플러그인 폴더, 모델이 Bash로 부르면 폴백 폴더(또는 남의 플러그인 폴더)로 갈라짐. 예: `outcome` 기록(Bash) ↔ `ignore-streak`(hook)이 다른 파일을 읽어 streak이 늘 0 → scoreboard 모드가 안 켜짐(추측: 실행 재현 전, 코드 판독) | 경로를 인자로(P1 결정 패턴). 호출부: hook은 `${CLAUDE_PLUGIN_DATA}` 전달, SKILL.md·hook 주입문은 `${CLAUDE_PLUGIN_DATA}` 치환 | ✅ **완료**(2026-09-25, `d7ea71d`, 3.1.3). 9차 재현: Bash로 쓴 outcome은 폴백 폴더, hook의 streak은 플러그인 폴더 → 0. 범위가 더 컸다 — hook 주입문은 따옴표 heredoc이라 `${CLAUDE_PLUGIN_ROOT}`가 문자 그대로 모델에 가고(`claude -p` 실측, 치환 안 됨), `engine.md`(Read)도 같음 → ship 때 스크립트 경로부터 `/skills/…`로 깨짐. 수정: 스크립트 7개 `--data-dir <절대 경로>` 필수(없거나 상대면 exit 2, 폴백 삭제), hook은 `duck__fill_paths`로 주입문 자리표시자에 실제 경로(JSON 이스케이프)를 채움(따옴표 없는 heredoc은 백틱이 실행돼 기각), `engine.md`는 `<scripts>`·`<data-dir>` + 각 모드 SKILL.md가 두 경로 제시. 검수: 격리 테스트 29/29, `claude -p` e2e(새 버전) — ship gap 재질문·해소, ignored 기록, `enabled:false` 정지 확인. 미확인: duck-orient의 gap 재질문 경로(eval이 orientation.md 없는 레포라 안 탐), 옛 버전 e2e 비교(세션 한도로 무효) — 사용자가 이 상태로 커밋 결정. 산출물 `plugins/rubber-duck-tutor/.evals/ship-data-paths/`. 기존 폴백 폴더 데이터 이관은 안 함(이 머신에 없음) |

유지: engine.md:93-99(Skeptical Grading), coach:57(연습 통과로만 gap 해소), exercise-patterns.md:163,:180, duck-verify:12-16.

## 2-5. claw-mux

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | claw-mux/SKILL.md:102,118,173-179, terminal-io.md, sync-and-automation.md:45, cmux-browser:97-110, cmux-markdown:95-96 | `$SKILL_DIR` 25곳 — 공식 치환 변수는 `${CLAUDE_SKILL_DIR}`, 셸 env도 비어 `/scripts/…` 실행 실패 | SKILL.md 본문은 `${CLAUDE_SKILL_DIR}`로 교체. references(terminal-io.md 5곳, sync-and-automation.md:45)는 치환 안 될 수 있으므로(2부 공통 "reference 파일 치환") SKILL.md에 스크립트 경로를 한 번 제시하고 references는 상대 경로로 | ✅ **완료**(2026-09-24, `ca54ade`, 1.2.1). 링크 표 19곳은 상대 경로(`references/…`, `templates/…`, 공식 예시와 같은 형식), SKILL.md 스크립트 호출 2곳은 `${CLAUDE_SKILL_DIR}`, references 5곳은 `poll-screen.sh`로 줄이고 SKILL.md가 전체 경로를 한 번 제시 |
| 2 | med | terminal-io.md:146, SKILL.md:107-108 | Claude Code 완료 감지를 `╭─`/`❯`로 — 작업 중에도 렌더돼 오판 (추측 — poll-screen.sh:26-27이 스크롤백 어디든 `❯`를 매칭. 라이브 pane 확인 필요, §1-5 #11) | `cmux wait-for -S task-done` 방식 | 🔹 |
| 3 | med | notifications.md:82-91 | Stop hook `stop_reason` 분기 — 공식 입력에 없음, 유저 settings 편집은 범위 밖 | 절 삭제 또는 `last_assistant_message` | 🔹 |
| 4 | med | SKILL.md:62-69,71-125,127-144,13-21 | wait-for 줄 3회, 사이드바 명령 3회, 환경 체크 3회 | 전략 표 + 1줄, ~100줄로 | 🔹 |
| 5 | med | SKILL.md:75,:162, terminal-io.md:150,:193 | "foreground sleep over 2 seconds 차단" 미확인 수치 3곳 + 서로 충돌 | "run_in_background 또는 Monitor" 한 곳 | 🔹 |
| 6 | med | cmux-markdown:117 ↔ :44,:120 | atomic replace 지원 ↔ 재생성 시 재연결 안 됨(:44에 이미 시간 기준 규칙) | 시간 기준 한 줄, 스킬 ~20줄로 축소 | 🔹 |
| 7 | med | cmux-browser:20-30,61-71,83-89,112-121 | 같은 워크플로 3회, Limits 중복 | Core Workflow 하나만 | 🔹 |
| 9 | low | SKILL.md:3, README.md:37 | claw-mux description에 트리거 없음(cmux-browser:3엔 이미 "Use when…"), README가 disable-model-invocation과 충돌 | 트리거 문장, `/cmux-markdown` 안내 | 🔹 |

재검수 삭제: #8 `--workspace`/`--window` — `cmux markdown --help`·`cmux browser --help`(0.64.25)에 있음, 최상위 `cmux help` 요약에만 없었다. 기타(설치 캐시 1.2.0 description 불일치) — 현재 캐시가 레포와 같음.

## 2-6. notebooklm-connector

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | agents/chrome-mcp-query.md:16-18 | `permissionMode: bypassPermissions` — 플러그인 에이전트에선 무시(plugins-reference.md:73), 작성자는 켜진 줄 앎 | 삭제, README에 allow 규칙 안내 | ✅ |
| 2 | high | notebooklm-manager/SKILL.md:18, references/gotchas.md:31 | "Chrome MCP tools aren't in allowed tool set — calling will error" — 공식: allowed-tools는 제한 아님 | 이유를 "에이전트가 탭·폴링·에러를 소유"로 교체, 중복 삭제 | ✅ `d868b69` — 이유를 "에이전트가 탭·폴링·에러 분류를 맡음"으로, SKILL.md 끝 Tool Boundaries 중복 절 삭제 |
| 3 | high | hooks/ensure-skill-loaded.sh:5,10 | regex `노트북`(=laptop)·`notebook.*list` 등 과매칭 + "MUST invoke" — **이번 세션에서 NotebookLM과 무관한 프롬프트에 실제 발동 관측**. 2026-09-23 재검수 세션에서도 재현(서브에이전트 보고 메시지에 발동) | ~~`notebooklm` 중심으로 좁히고 조건부 문구~~ **hook 삭제**(2026-09-24, `d9b5177`, 1.3.2). 스킬 description이 같은 트리거(URL·NotebookLM 언급)를 이미 말함. 원 목적(`982f6a1` "후속 메시지에서 스킬 재호출")은 키워드 없는 후속 메시지엔 어차피 안 걸림. 재호출의 실익(`allowed-tools` 승인이 다음 메시지에 풀림, skills.md:528)은 #1의 README allow 규칙 안내로 | ✅ |
| 4 | med | hooks/hooks.json:27, SKILL.md:18,72,116 | matcher `Task` — 도구명은 `Agent`로 바뀜. `Task` alias는 settings·에이전트 정의에만 명시(sub-agents.md:481), hook matcher는 `tool_name` 정확 매칭(hooks.md:287-291) (추측) | `"Agent\|Task"`, 본문 `Agent`로 — 어느 쪽이든 안전 | ✅ `d868b69` — **버그 아님(실행 확인)**: 2.1.295 `claude -p` stub 시험에서 옛 matcher `Task`도 hook 발동. 이름 정리만: matcher `Agent\|Task`, 본문 `Task` 9곳 → `Agent` |
| 5 | med | follow-up-reminder.sh:21 ↔ SKILL.md:114 | hook이 config를 읽지 않음. 다만 "per Section 5" 문구가 :114 skip을 포함해 "매번 강제"는 과장 | "unless auto_coverage is false" | ✅ `d868b69` |
| 6 | med | agents/chrome-mcp-query.md:216,231-233,311, SKILL.md:97 | textarea maxLength 분기 — gotchas:17 "no maxLength" → 절대 실행 안 됨 | 분기·출력 줄 삭제, SKILL.md:97 함께 | ✅ `d868b69` — JS 잘라내기 제거(반환 `inputLength`만), `node --check` 통과 |
| 7 | med | SKILL.md:166-193,197-200 | hook 내부 마이그레이션 설명 28줄, 모델 할 일 없음 | 한 줄 | ✅ `d868b69` — Storage 절 한 줄 |
| 8 | med | SKILL.md:101-108 ↔ agents:76-83 | 복구 6단계 동일 복제 | 에이전트 출력 SSOT | ✅ `d868b69` |
| 10 | low | plugin.json ↔ marketplace.json | description 문구 다름 | 동기화 | ✅ `d868b69` — 기능 나열 문구로 동기화. README 길이 검사 행 "Rejects" → "Condenses"도 |
| 11 | low | hooks/setup-data.sh:70 | PreToolUse `{"decision":"approve"}` deprecated(hooks.md:1848) | 현 형식으로 | ✅ `d868b69` — `permissionDecision: allow`. :11-12 틀린 주석(grant는 다음 메시지에서 풀림)도 고침. 격리 HOME 실행 확인 |

재검수 삭제: #9 — agent:373은 추가 *javascript_tool* 호출만 금지. :367(tabs_context 재시도)·:369(스크린샷 폴백)와 충돌 없음.

## 2-7. claw-mo · toolbox · vibeproxy-kit · worktree-plus · e2e-test-runner(10차 삭제)

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | worktree-plus/skills/worktree-setup/SKILL.md:94 | "migration re-trigger by restarting" — `setup-check.sh:40-41` fast path가 migration 블록보다 먼저 exit | `git config --global` 수동 명령 안내, v3.0.0 migration 절 축소 검토 | ✅ **완료**(2026-09-24, `ebbdffa`, 3.1.1). 94줄만 교체 — `git config --global` 수동 안내 + 재시작이 안 되는 이유 + prefix `-` 규칙. 검수 eval(새 11/11, 옛 7/12)에서 빈 prefix에도 `-`를 붙이라는 문구 결함 발견 → 비어 있지 않을 때만 `-`, 빈 값은 `""`로 수정(3.1.2). 영향은 드문 경로(플래그 없는데 env var 남음). 마이그레이션 절 축소는 안 함 |
| 2 | high | worktree-plus/.../SKILL.md:75 | "`dirBase`: no tilde expansion (stays literal)" — 실제 `worktree-create.sh:43-45`가 `exit 1` | "`~` values are rejected — write an absolute path" | ✅ **완료**(2026-09-24, `ebbdffa`, 3.1.1). README:110은 이미 "use an absolute path"라 그대로 |
| 3 | high | ~~e2e-test-runner/skills/e2e-test/SKILL.md:39~~ | `--resultsPath ./e2e-results` 고정 → 기본값 `./e2e-results/${Date.now()}`(args.ts:22) 무력화, 매 실행 덮어씀, Quick Start `--baseline` 경로가 존재 불가 | 플래그 삭제, 출력된 경로 읽기. SKILL 5-6단계도 함께 | 종결 — 플러그인 삭제(`e69be21`, 10차) |
| 4 | high | claw-mo/skills/claw-mo-open/SKILL.md:73-78 | 런타임은 파일만 watch하는데 config엔 `*.md` 저장 → 다음 `/claw-mo-up`이 drift로 `--clear`(shared.md:98,134-135 패턴 비교). dir 모드도 `dir/*.md`로 drift (코드 읽기로 확인) | 저장값을 실제 시작 형태와 일치 | 안 함(30차, 사용자: 잘 안 씀) — mo 0.23.3 실측으로 버그 확인: 파일·폴더 시작 서버는 patterns `null`, shared.md 비교의 `sorted(g.get('patterns', []))`가 TypeError → 항상 differ |
| 5 | high | vibeproxy-kit/skills/setup-aliases/SKILL.md:232 ↔ :291 ↔ :303 | merged-config 재생성 시점 "launch만" vs "launch or toggle" | 사실 하나로 확정, Phase 9 한 곳에 | 🔹 |
| 6 | med | ~~e2e-test-runner/hooks/hooks.json:9,14~~ | `timeout: 120000`·`5000` — 단위가 초(hooks.md:430) → 약 33시간 | `180`/`5` | ✅ 종결 — 플러그인 삭제(`e69be21`, 10차). 10차 재확인 때 추가 발견: 타임아웃으로 끊기면 `\|\| rm -f`가 안 돌아 복사된 `package.json`이 남고 다음 세션이 설치를 건너뜀(코드 판독) |
| 7 | med | ~~e2e-test-runner SKILL.md:29-36,67-68 + hooks~~ | 의존성 체크 3곳 | SKILL은 fallback 1줄 | 종결 — 플러그인 삭제(`e69be21`, 10차) |
| 8 | med | toolbox/skills/secret-setup/SKILL.md:218 | 검증 단계 `cat "$MOCK_ENV"` — 실값이 컨텍스트에 찍힘 | `cut -d= -f1`(이름만) + `bash -n` | ✅ `b6b1bbe` |
| 9 | med | vibeproxy-kit setup-aliases (여러 줄) | 같은 규칙 2-5회 + references 반복 | SSOT 지정, Gotchas 대부분 삭제 | 🔹 |
| 10 | med | vibeproxy-kit setup-aliases:62-75,101-135,307-317 | 317줄, 조건부 onboarding·Scripts 표 | `references/onboarding.md`, 표 삭제 | 🔹 |
| 11 | med | claw-mo/references/shared.md:3 ↔ 스킬들 | "do not duplicate" 선언과 달리 스킬마다 복제 | 스킬 Gotchas 복제분 삭제, autosync는 references로 | 안 함(30차, 사용자: 잘 안 씀) |
| 12 | med | toolbox/skills/handoff/SKILL.md:105-116 | 검증 규칙 3회, Gotchas가 Principles 재진술 | Gotchas 절 삭제 | ✅ `b6b1bbe` |
| 13 | med | toolbox/skills/secret-setup:177-208,234-244 | MCP 분기·중복 gotcha | references로, 중복 삭제 | ✅ `b6b1bbe` (gotcha 7개 삭제, MCP 절은 본문 유지 — description 주 대상) |
| 14 | low | claw-mo-open:56-60 ↔ manage:98, shared.md:159,171 | curl API vs "mo CLI 우선" | `mo -w`로 | 안 함(30차, 사용자: 잘 안 씀) |
| 15 | low | claw-mo-up:3 ↔ claw-mo-open:3 | 트리거 겹침 | 분리 | 안 함(30차, 사용자: 잘 안 씀) |
| 16 | low | vibeproxy-kit setup-aliases:239 ↔ :153 | "Do not skip" ↔ Remove 경로 | 예외 명시 | 🔹 |
| 17 | low | vibeproxy-kit references/effort-levels.md:9-31, model-selection.md:86 | 모델 표 노후 가능 (추측), 설치본에 없는 research §9.2 인용 | 확인일 명시, 인용 삭제 | 🔹 |
| 18 | low | worktree-setup:117,:193 | compound 명령 권한 설명 틀림, 중복 | 삭제 | 🔹 |
| 19 | low | secret-setup:237 | "`CLAUDE_ENV_FILE` only in SessionStart" — Setup·CwdChanged·FileChanged도 가능 | 수정 | ✅ `b6b1bbe` (hooks.md 확인) |
| 20 | low | toolbox handoff:82 | 다른 플러그인 스킬명(`/tdd`, `/diagnose`) 지목 | 일반 문구 | ✅ `b6b1bbe` |
| 21 | low | vibeproxy-kit·notebooklm README | 모드 수·동작 불일치 | 수정 | 🔹 |
| 22 | low | toolbox fetch-sitemap:87-93,107-112 | curl 플래그 설명·예시 중복 | 삭제 | ✅ `b6b1bbe` |
| 23 | low | vibeproxy-kit plugin.json(151자) ↔ marketplace(198자) | description 불일치 | 동기화 | 🔹 |
| 24 | med | vibeproxy-kit/skills/setup-aliases/scripts/write_user_config.py:62, references/write-guide.md:53-58 (재검수 추가), scripts/discover.sh:16(new-vibe handoff Issue 7 — 실제로 codex 폴더를 읽은 기록) | 백업·상태 경로 기본값을 `os.environ["CLAUDE_PLUGIN_DATA"]`에서 읽음 — Bash 환경엔 없거나 남의 값(2부 공통 "Bash 환경변수"). write-guide.md가 `"backup_dir": "${CLAUDE_PLUGIN_DATA}/backups"`를 넘기지만 references 파일이라 치환 안 될 수 있음 → 백업이 다른 플러그인 폴더로 | 백업 경로를 SKILL.md(치환됨)에서 명시적으로 넘기고, 스크립트는 env 폴백 삭제 | ✅(env) (추측)(치환) |
| 25 | high | worktree-plus/hooks/scripts/worktree-create.sh:47,56 | 절대 경로 `dirBase`는 `<dirBase>/<name>`이라 레포 구분이 없다. 두 레포가 같은 worktree 이름을 쓰면 뒤 레포가 앞 레포의 worktree를 "Reusing existing worktree"로 받아, 다른 레포에서 작업하게 된다. worktree-setup 스킬은 전역 절대 경로 설정을 돕기까지 한다 | (미정) 재사용 전에 그 worktree가 같은 레포 것인지 확인(`git rev-parse --git-common-dir` 비교), 또는 절대 경로 아래 레포별 하위 폴더 | ✅ 8차 격리 실행으로 재현(레포 A·B, name=fix → B가 A의 worktree를 받음). ✅ **완료**(2026-09-25 10차, `231504a`, 3.2.0). 결정: 두 안(재사용 전 레포 확인만 / 레포 폴더) 중 둘 다. 레포 폴더는 값이 `--local`이 아닐 때(`--global`·system)만 `<dirBase>/<repo>/<name>` — `--local` 절대 경로는 이미 레포 전용이라 그대로 두어 `/wt/proj/proj/fix` 두 겹을 피함(`--show-scope`는 git 2.26+라 `--local --get` 값 비교로 판정). repo 이름은 `--git-common-dir`에서(worktree 안 세션·bare 레포도 맞음). 재사용 전 `--git-common-dir`(pwd -P) 비교 → 다른 레포면 exit 1 + 이유(같은 폴더명 레포, 같은 local 값 복사). 옛 `<dirBase>/<name>` worktree는 기존 브랜치 검색으로 다시 열림. 검수: 격리 시나리오 11개 새 13/13, 옛 9/13(S1·S3 버그 재현) — `plugins/worktree-plus/.evals/dirbase-repo-scope/script-tests.sh`. 스킬 문구 드라이런 eval 3개 새 100%·옛 44%(옛은 레포 폴더를 몰라 '충돌 가능(추측)'·`--local` 우회 권장). 미확인: 전역/로컬 구분을 추가한 뒤 스킬 문구 eval 재실행 안 함(한 구절 추가), 실제 `claude -w` 실행 안 함(훅 입출력 계약만 검사) |
| 26 | low | worktree-plus/skills/worktree-setup/SKILL.md:94 | "exits before it whenever its hooks are already registered" — 정확히는 현재 plugin root로 등록됐을 때. 플러그인 업데이트 뒤 첫 세션엔 마이그레이션이 돈다. "재시작으로는 안 된다"는 결론은 맞음 | "registered for the installed version" | ✅ 8차 격리 실행 |
| 27 | low | worktree-plus/skills/worktree-setup/SKILL.md Value validation | 빈 `branchPrefix`가 "접두사 없음"이라는 설명이 없다 — 코드는 `=""` → `<name>`(`worktree-create.sh` 주석). 8차 eval에서 두 실행이 모두 "확인 못 함"으로 적음 | Value validation에 한 줄 | ✅ |
| 28 | high | worktree-plus/hooks/scripts/worktree-remove.sh:56-93 (10차 발견) | create 훅이 만드는 `.worktree.log`가 untracked라 dirty 검사에 걸림 → gitignore에 없으면 remove가 항상 `BLOCKED`(`?? .worktree.log`) | ✅ `b451fb8`(3.2.1) 검사에서 `?? .worktree.log` 한 줄만 제외. 기각: create 때 exclude 등록 — worktree별 `info/exclude`는 안 먹고 본 레포 `.git/info/exclude`만 먹음(사용자 레포 수정 + 기존 worktree 미해결) ✅ 11차 실측. 로그를 worktree 밖으로 — 설계 변경(3.3.0) | ✅ `.evals/remove-hook/script-tests.sh` 옛 10/16(S1·S5 BLOCKED) · 새 16/16, S2~S4 변경·untracked·미푸시 차단 유지 |
| 29 | med | worktree-plus/hooks/scripts/worktree-remove.sh:111 (10차 발견) | 삭제 성공 뒤 `log_entry "REMOVED"`가 지워진 폴더의 `.worktree.log`에 씀 → `No such file or directory`, `set -e`로 exit 1. 삭제는 된 채 훅은 실패로 끝남. 단 공식 `hooks.md` WorktreeRemove: non-zero여도 "폴더가 아직 있을 때만" 삭제 실패 → 실제 영향은 debug 로그 정도(추측, 문서 문구 기준). #28 수정 후엔 매 삭제마다 발생 | ✅ `b451fb8`(3.2.1) `REMOVED` 기록 줄 삭제 + 머리 주석 "Logs all removal attempts" → "Logs blocked removals", README "Audit trail" "create/remove events" → "the create event"(나머지 BLOCKED 사유 등은 그대로). 기각: 폴더 있을 때만 기록·삭제 전 기록(둘 다 결국 안 남음) | ✅ 같은 테스트 S6(log gitignore로 #28 우회): 옛 exit 1 + `No such file` · 새 exit 0 |

유지: worktree-setup:172-173(개행 없는 append 병합, include·link 중복 시 link 무음 skip), notebooklm references/gotchas.md:7-11(form_input 무음 실패), vibeproxy-kit setup-aliases:304(name/alias 반전 시 merge no-op), claw-mo shared.md:75-83·117(`--clear` 입력 대기 hang, 경로 정규화 비교).
