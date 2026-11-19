# README 개편 그릴 재개

2026-11-20에 사용자가 poteto-mode의 pause safely를 요청해 중단했다. 조사와 문구 협의 단계다. README 구현 승인은 아직 없다.

## 다음 세션의 첫 행동

아래 마지막 one-minute-pr 초안을 보여주고, 제작 의도에 맞는지 질문 하나만 한다. 사용자가 새 지시를 주면 그 지시를 먼저 따른다. 전체 플러그인 목록이나 문서 구조 논의를 다시 시작하지 않는다.

> 에이전트가 쓴 PR·MR 본문이 길고 장황해서, 정작 무엇을 봐야 하는지 찾기 어려웠습니다. one-minute-pr은 변경 이유, 영향, 실제 검증 결과를 짧고 읽기 좋은 본문으로 정리합니다. 리뷰어가 변경을 판단하는 데 필요한 내용을 먼저 보여주는 것이 목표입니다.

이 문구는 에이전트의 제안이다. 사용자가 아직 승인하지 않았다. 위 문구의 영문판도 아직 확정하지 않았다.

## 목표와 결정

- 마켓 README 두 언어와 개별 플러그인 README를 개편한다. 핵심은 기능 나열이 아니라 해결하려는 문제, 만든 의도, 목표를 전달하는 것이다.
- 순서는 codex-advisor, one-minute-pr, worktree-plus, vision-powers, skill-creator-pro, toolbox, notebooklm-connector다.
- 처음 다섯 개를 대표로, 뒤의 두 개를 보조로 다룬다. claw-mo, claw-mux, vibeproxy-kit, rubber-duck-tutor는 거의 안 쓰는 실험용으로 비중을 줄인다. 삭제 요청은 없다.
- 한 줄 선택표를 처음에는 수락했지만 이후 사용자가 why와 의도를 강조했다. 한 줄 제한이나 최종 레이아웃이 확정됐다고 취급하지 않는다.
- 사용자는 one-minute-pr의 출발점이 길고 장황한 에이전트 PR·MR 본문에 대한 불만이며, 아티클을 참고해서 만들었다고 설명했다.
- 기존 llm-wiki의 아티클과 레포에서 유사한 문제의식을 찾아 소개를 보강하라는 요청이다. 새 외부 자료를 광범위하게 찾으라는 뜻이 아니다.

## 대화 방식

사용자는 여러 번 한 번에 하나씩 그릴하라고 정정했다. 짧은 실제 문구 예시를 먼저 보여주고, 추천 이유와 출처를 붙인 뒤 질문 하나만 한다. 추상적인 배치 설명만 하지 않는다. 사용자가 요청하면 영문과 바로 아래 한글 번역을 보여준다.

README에 들어갈 문구와 에이전트의 편집 메모를 명확히 분리한다. 마지막 혼선은 에이전트가 "Breck의 AI 요약 비판과 Hugo의 증거 중심 PR 사례를 연결합니다"를 초안 목록에 섞어 쓴 것이다. 사용자는 그 말을 README에 쓸 것인지 물었다. 그 문장은 편집 메모라고 정정했다. 참고 링크를 개별 README 아래에 두는 것은 제안일 뿐 아직 승인받지 않았다.

프로젝트 AGENTS.md에 따라 그릴 결정은 spec/issue에 기록하고, 그릴이 끝나 사용자와 이해를 확인한 뒤 구현한다. README만 고치려는 단계에서 플러그인 기능을 추가하지 않는다. 제작자의 실제 의도와 외부 사례에서 얻은 해석을 구분한다.

## 저장된 자료

- [명세](../specs/018-readme-redesign.md)에 범위, 순서, 미결 결정을 기록했다.
- [이슈](../issues/018-readme-redesign.md)에 실행 전 작업과 조사 메모 링크가 있다.
- [검토와 PR 조사](../research/018-wiki-review-pr.md)는 OpenQodex, Elephant Goldfish Model, Breck, Hugo 자료를 정리한다.
- [worktree와 시각화 조사](../research/018-wiki-worktree-visual.md)는 ub-mode, ClawTeam, Thariq의 HTML 글, Geoffrey Litt의 explain-diff를 정리한다.
- [스킬 제작과 유틸리티 조사](../research/018-wiki-skills-util-research.md)는 Anthropic, Addy Osmani, Pocock handoff, notebooklm-skill과 간접 근거를 정리한다.

위키 요약에서 후보를 찾고 연결된 원문과 로컬 참고 저장소를 읽었다. 루트 에이전트도 OpenQodex의 인용 검사 코드, Elephant Goldfish README, ub-mode 정리 지침, ClawTeam worktree 예시, explain-diff 원문, Anthropic 평가 절차, Pocock handoff, notebooklm-skill README를 대조했다. 외부 사례는 우리 플러그인의 성능이나 효과를 측정한 증거가 아니다. toolbox의 인계 자료가 네 유틸리티 전체를 뒷받침하지는 않는다.

## 영상 문제는 미해결

사용자는 예전에 README 데모가 재생됐는데 지금 안 된다고 보고했다. 다음 사실을 확인했다.

- Chrome의 develop README에서 미디어 재생 불가와 비활성화된 재생 버튼을 확인했다. 새로고침 후에도 같았다.
- 로그인한 Chrome에서 영문 첨부 주소를 직접 열면 S3 영상 주소로 이동한다. Chrome 미디어 진단에서 H.264/AAC, 1920×1080, 약 70초, 디코딩 및 재생 시작 기록을 확인했다. 영상 전체를 끝까지 시청한 검증은 아니다.
- 익명 HTTP 요청은 영문과 한글 첨부 주소 모두 404였다. 로그인 README 오류와 익명 404를 같은 원인이라고 확정하지 않는다.
- video 마크업은 2026-05-16부터 사용됐고, 2026-07-18에 영문 영상 UUID만 바뀌었다. 한글 영상은 이전 UUID를 유지한다.
- [GitHub Community 209976](https://github.com/orgs/community/discussions/209976)에 같은 마크업이 로그인 페이지의 콘텐츠 보안 정책에 막히는 재현 보고가 있다. video 태그 대신 첨부 URL을 독립된 줄로 쓰면 해결됐다고 작성자가 확인했다. GitHub의 공식 원인 발표는 아니다.
- 우리 로그인 README의 콘솔 오류는 아직 확인하지 않았다. 다음 진단은 해당 페이지의 콘텐츠 보안 정책 차단 오류를 확인하는 것이다. 이어 저장하지 않은 미리보기에서 단독 URL 방식과 비교할 수 있다. 원인 확인 전 파일 삭제, 접근 권한, 코덱 문제라고 단정하지 않는다.

영상 주소는 README.md와 README.ko.md의 12행에 있다. 일시적인 S3 서명 주소는 기록하거나 재사용하지 않는다.

브라우저 자동화 연결은 처음 실패했다. 사용자가 설치 후 재시도하자 cua.getApp("Google Chrome")으로 네이티브 접근이 됐다. 브라우저 호스트 목록은 여전히 없었지만 앱 접근은 가능했다. 이전 도구의 요소 번호나 JavaScript 변수는 새 세션에서 재사용하지 않는다.

## Git와 검증 상태

- 저장소는 /Users/leejuo/Desktop/project/claude-code-zero, 브랜치는 develop이다.
- 중단 전 기준 HEAD는 d7dc28c7a46f07bd908fee53e400af3747ff7760이다. 이번 중단 저장 커밋은 그 뒤에 생성한다.
- 이번 세션은 명세, 이슈, 조사 메모 세 개와 이 인계 문서만 추가했다. README, 플러그인 코드, 버전은 바꾸지 않았다.
- 실행 중인 조사 에이전트는 없다. 시작한 개발 서버나 테스트 프로세스도 없다.
- 실행 코드 변경이 없어 테스트와 플러그인 검증은 하지 않았다. 인계 파일과 Git 상태를 확인한 뒤 로컬 wip 커밋으로 보존한다. push나 PR은 하지 않는다.
- 재개 후 git status와 마지막 커밋을 확인한다. 향후 README 구현 시 명령 목록과 실제 컴포넌트를 대조한다. 현재 마켓에는 삭제된 context-health-visual이 남아 있고, 한국어 codex-advisor 목록에는 codex-transfer가 빠져 있다.

현재 사용한 스킬은 poteto-mode, technical-writing, unslop, grill-with-docs가 호출하는 grilling/domain-modeling, research와 swarm이다. 다음 세션은 poteto-mode와 grill-with-docs로 이어갈 수 있다. 완료 후 이 임시 인계 내용을 명세에 반영하고 인계 파일은 저장소 규칙에 따라 정리한다.
