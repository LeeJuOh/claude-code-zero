# Spec 011 — worktree-plus `worktree-setup`: config 스킬을 include/link 세팅 도우미로 확장

> 생성: 2026-07-17 · 출처: grill-with-docs + domain-modeling 세션
> 구현 이슈: `docs/issues/011-worktree-plus-setup-skill.md` (슬라이스 S1~S4)
> 대상 플러그인: `plugins/worktree-plus/` (현재 v3.0.3 → v3.1.0, minor: 스킬 리네임 + 기능 추가)

## Problem Statement

worktree-plus의 핵심 가치는 gitignored 파일을 워크트리로 데려가는 `.worktreeinclude`(복사) / `.worktreelink`(심링크)인데, 이 두 파일을 **만들어주는 조력자가 없다**. 사용자는 어떤 gitignored 파일이 존재하는지 직접 조사하고, copy와 link 중 무엇이 적절한지 스스로 판단하고, 파일 포맷을 기억해서 손으로 작성해야 한다. 번들 스킬 `/worktree-config`는 git config 키(`baseBranch`/`branchPrefix`/`dirBase`/`guessRemote`)만 다루고 include/link 파일은 건드리지 않는다.

## Solution

기존 `worktree-config` 스킬을 `worktree-setup`으로 리네임하고 범위를 확장한다. 사용자가 스킬을 명시 호출하면 (기존 git config 관리에 더해) 저장소의 실제 무시 파일 목록을 스캔해 `.worktreeinclude`/`.worktreelink` 후보를 제안하고, 사용자 확인을 받은 뒤 파일을 작성·병합한다.

## User Stories

1. As a worktree-plus 사용자, I want 스킬이 내 저장소의 gitignored 파일을 스캔해 include/link 후보를 제안하기를, so that `.worktreeinclude` 포맷과 후보를 직접 조사하지 않아도 된다.
2. As a worktree-plus 사용자, I want 제안 목록을 확인·수정한 뒤에만 파일이 작성되기를, so that 스킬이 내 저장소 루트에 임의 파일을 몰래 만들지 않는다.
3. As a worktree-plus 사용자, I want 각 후보에 copy/link 근거(크기, 브랜치 가변성, 공유 위험)가 표시되기를, so that 왜 그 분류인지 이해하고 뒤집을 수 있다.
4. As a worktree-plus 사용자, I want 이미 있는 `.worktreeinclude`/`.worktreelink`에 누락 항목만 추가되기를, so that 내가 손으로 쓴 항목·주석·순서가 보존된다.
5. As a worktree-plus 사용자, I want 기존 항목 중 디스크에 없는 경로를 스킬이 알려주기를, so that 죽은 항목을 정리할 수 있다.
6. As a worktree-plus 사용자, I want node_modules 같은 브랜치별 의존성을 link하려 할 때 공유 오염 위험을 설명받기를, so that 알고도 선택하는 것과 모르고 당하는 것이 구분된다.
7. As a worktree-plus 사용자, I want git config 관리(baseBranch 등) 기능이 리네임 후에도 그대로이기를, so that 기존 워크플로가 깨지지 않는다.
8. As a worktree-plus 사용자, I want 스킬이 명시 호출로만 발동하기를, so that "워크트리 만들어줘" 같은 일상 요청에 오발동하지 않는다.
9. As a 신규 사용자, I want README가 `/worktree-setup`으로 셋업 전 과정을 안내하기를, so that 설치 직후 무엇을 호출할지 안다.

## Implementation Decisions

- **위치**: 신규 스킬이 아니라 기존 `worktree-config` 스킬 확장. 셋업 진입점은 하나.
- **리네임**: `worktree-config` → `worktree-setup`. 디렉터리·frontmatter `name`·description 모두 변경. git config + 파일 세팅 둘 다 포괄하는 이름.
- **워크플로**: 스캔 → 제안 → 사용자 확인 → 작성. 확인 없는 쓰기 금지를 SKILL.md에 명시.
- **스캔 ground truth**: `git ls-files --others --ignored --exclude-standard --directory`. 이유: `.gitignore`뿐 아니라 `.git/info/exclude`·글로벌 `core.excludesFile`까지 모든 ignore 레이어가 반영된 결과이고, 패턴이 아닌 실존 경로만 나온다(hook도 실존하지 않는 항목은 `skipped (not found)` 처리하므로 실존 기준이 정확). `--directory`로 무시된 디렉터리는 한 줄로 접힌다.
- **보조 신호**: `.gitignore` 본문의 주석에서 의도 파악, `du -s`로 크기 측정(대용량 = link 후보 근거).
- **분류 규칙**: copy vs link 판단은 전부 모델 재량. SKILL.md에 고정 분류표를 넣지 않는다. 브랜치별 의존성 디렉터리(node_modules/.venv류) link도 하드룰 금지가 아니라 위험 설명 후 모델+사용자 판단.
- **기존 파일 처리**: 병합만. 누락 항목 append, 기존 항목·주석·순서 보존. 전체 재생성 금지.
- **권한 모델 (이중 게이트)**: `allowed-tools`에 스캔용 읽기 명령만 추가(`git ls-files`, `du`). Write/Edit는 의도적으로 미포함 — 파일 쓰기 순간 Claude Code permission prompt가 뜨고(1차 게이트), SKILL.md 지시 레벨에서도 사용자 확인 후 작성(2차 게이트).
- **발동**: `disable-model-invocation: true` 유지. 명시 호출 전용.
- **문서·버전 동반 갱신**: README의 `/worktree-config` 참조와 Features 표의 "Conversational config" 행, `plugin.json`·`marketplace.json` description, 버전 3.0.3 → 3.1.0. 릴리즈 워크플로 관례대로 기능 커밋에 버전 범프 포함.
- **hook 무변경**: `worktree-create.sh`의 include/link 소비 로직은 이 이슈 범위 밖. 스킬은 파일 생산만 담당.

## Testing Decisions

- 좋은 테스트 = 외부 행동 검증: 스킬 호출 시 스캔 결과 제안이 나오는가, 확인 전에 파일이 써지지 않는가, 병합이 기존 내용을 보존하는가. SKILL.md 내부 문구 매칭은 테스트 아님.
- **정적 검증**: `unset CLAUDECODE && claude plugin validate .` — 리네임 후 스킬 frontmatter 유효성.
- **라이브 검증**: `claude --plugin-dir ./plugins/worktree-plus --session-id <uuid> -p "..."` + `--resume <uuid>` 방식 (이슈 009에서 확립한 seam). 알려진 한계: headless `-p` 모드는 쓰기 승인 채널이 없어 Write 단계는 "This command requires approval"로 막힘 — 스캔·제안까지 headless로 검증하고 쓰기·병합은 대화형 세션에서 확인 (이슈 009 "테스트 하네스 한계" 참조).
- 시나리오: (a) include/link 파일 없는 저장소에서 신규 작성, (b) 기존 파일 있는 저장소에서 병합·보존, (c) 죽은 항목 감지, (d) git config 기능 회귀 없음.

## Out of Scope

- hook 스크립트 변경 (include/link 소비 로직, 로그 포맷).
- 기존 워크트리에 include/link 소급 적용(re-sync) 기능.
- `.gitignore` 자체 수정.
- 모델 자동 발동 (`disable-model-invocation` 해제).
- 신규 git config 키 추가.

## Further Notes

- 리네임은 minor 범프 근거(관례: renames = minor). 구이름 `/worktree-config` 호출은 리네임 후 실패 — README에서 참조를 전부 교체할 것.
- SKILL.md의 기존 "Narrow allowed-tools scope" gotcha 문구는 "config 전용" 경계를 서술하므로, 확장 후 "config + include/link 파일 세팅, 쓰기는 프롬프트 게이트" 경계로 갱신 필요.
- 구현 시 공식 문서 재확인: `https://code.claude.com/docs/en/skills.md` (frontmatter 필드 — 이슈 009 세션에서 2026-07-08 기준 name/description/disable-model-invocation/allowed-tools 확인됨, 구조 변경이므로 재확인 권장).
