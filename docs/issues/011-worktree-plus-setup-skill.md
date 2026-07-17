# 이슈 011 — worktree-plus `worktree-setup` 확장 구현 (슬라이스 S1~S4)

> 상태: **ready-for-agent** — 구현 착수 전 · 생성: 2026-07-17
> 스펙 (PRD): `docs/specs/011-worktree-plus-setup-skill.md` — 문제 정의, 유저 스토리, 구현/테스트 결정 전부 스펙 참조
> 대상 플러그인: `plugins/worktree-plus/` (v3.0.3 → v3.1.0)
> Seam: `skills/worktree-setup/SKILL.md` 단일 (기존 `skills/worktree-config/` 리네임). hook 스크립트 무변경.

## Slices (tracer bullets)

각 슬라이스는 모든 레이어를 관통하는 수직 슬라이스 — 단독 데모/검증 가능. 의존 순서: S1 → S2 → S3 → S4.

### S1 — 리네임 껍데기 (스토리 7, 8)

**What to build**: `worktree-config` 스킬을 `worktree-setup`으로 리네임(디렉터리·frontmatter name·description)하고, `allowed-tools`에 스캔용 읽기 명령(`git ls-files`, `du`)을 추가한다. 기존 git config 관리 동작은 그대로. `disable-model-invocation: true` 유지. 착수 전 공식 `skills.md`에서 frontmatter 필드 재확인 (스펙 Further Notes 참조).

**Acceptance criteria**:
- [ ] `unset CLAUDECODE && claude plugin validate .` 통과
- [ ] `claude --plugin-dir` 라이브 세션에서 `/worktree-setup` 호출로 기존 config 조회/변경 동작 회귀 없음
- [ ] 구이름 참조가 스킬 내부에 남아있지 않음

**Blocked by**: None — can start immediately.

### S2 — 스캔 → 제안 → 확인 → 신규 작성 (스토리 1, 2, 3, 6)

**What to build**: SKILL.md에 include/link 세팅 섹션 추가. `git ls-files --others --ignored --exclude-standard --directory`로 실존 무시 경로 스캔, `du -s` 크기 측정, `.gitignore` 주석으로 의도 보조 파악. copy/link 분류는 모델 재량이되 각 후보에 근거 표시, 브랜치별 의존성 link 요청 시 공유 오염 위험 설명. 제안 목록에 사용자 확인을 받은 뒤에만 파일 작성 (Write는 allowed-tools 밖 — permission prompt가 2차 게이트). SKILL.md 기존 "Narrow allowed-tools scope" gotcha 문구를 확장 후 경계(config + include/link 파일 세팅, 쓰기는 permission prompt 게이트)로 갱신.

**Acceptance criteria**:
- [ ] include/link 파일 없는 테스트 저장소에서 스캔→제안→확인→작성 end-to-end 성공 (쓰기 단계는 대화형 세션에서 검증 — headless `-p`는 쓰기 승인 채널 없음, 스펙 Testing Decisions 참조)
- [ ] headless 스캔·제안 실행에서 사용자 확인 전 Write 시도가 발생하지 않음
- [ ] 작성된 파일이 hook(`worktree-create.sh`)에서 실제로 소비됨 (워크트리 생성으로 확인)

**Blocked by**: S1.

### S3 — 병합 + 죽은 항목 감지 (스토리 4, 5)

**What to build**: 기존 `.worktreeinclude`/`.worktreelink`가 있을 때 누락 항목만 append, 기존 항목·주석·순서 보존. 디스크에 실존하지 않는 기존 항목은 사용자에게 보고(자동 삭제 아님).

**Acceptance criteria**:
- [ ] 주석·수작업 항목이 있는 기존 파일에 병합 후 원본 내용 전부 보존
- [ ] 이미 있는 항목 중복 append 없음
- [ ] 죽은 항목이 보고되고, 사용자 승인 없이 삭제되지 않음

**Blocked by**: S2.

### S4 — 문서·버전 (스토리 9)

**What to build**: README의 `/worktree-config` 참조 전부 `/worktree-setup`으로 교체, Features 표 "Conversational config" 행 갱신. `plugin.json`·`marketplace.json` description 갱신, 버전 3.0.3 → 3.1.0.

**Acceptance criteria**:
- [ ] `grep -r "worktree-config" plugins/worktree-plus/ .claude-plugin/` 결과 0건
- [ ] 양쪽 description이 확장된 실제 기능 반영
- [ ] `claude plugin validate .` 통과

**Blocked by**: S1–S3.
