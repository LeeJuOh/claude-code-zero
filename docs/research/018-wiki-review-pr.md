# README 동기 조사. codex-advisor와 one-minute-pr

## codex-advisor

현재 README의 긴 실행 실패 사례보다 먼저, 작성 세션과 다른 시각으로 검토하고 그 결과도 근거로 다시 확인하려는 목적을 설명할 수 있다. 이 목적은 내부 기록 `docs/specs/016-codex-advisor-independence.md:11-26`에 있다. 이 기록의 모델 편향 설명은 설계 당시의 판단이며, 아래 외부 사례가 효과를 증명하는 것은 아니다.

- [OpenQodex](https://github.com/openqodex/openqodex). `wiki/summaries/openqodex.md`에서 찾고 `references/openqodex/README.md:33-35`, `references/openqodex/packages/review/src/evidence-check.ts:18-44`를 확인했다. 별도 리뷰어가 후보를 내고, 스크립트가 인용을 확인하며, 검수자가 후보를 판정한다. 리뷰 결과에도 확인이 필요하다는 동기를 뒷받침한다. 다만 이 도구는 별도 프로세스를 쓰며 반드시 다른 모델을 쓰지는 않는다. codex-advisor의 효과를 측정한 자료도 아니다.
- [Elephant Goldfish Model](https://github.com/google/elephant-goldfish-model). `wiki/summaries/elephant-goldfish-model.md`에서 찾고 `references/elephant-goldfish-model/README.md:16-18,101`을 확인했다. 앞선 대화를 보지 않은 검수자가 초안과 자료를 살펴 빠진 가정과 사각지대를 찾는다. 작성 맥락에서 벗어난 검수의 이유를 설명하는 사례다. 설계 문서 리뷰 사례이며 테스트나 사람의 판단을 대체한다고 주장하지 않는다.

## one-minute-pr

사용자가 밝힌 출발점은 에이전트가 쓴 PR과 MR 본문이 길고 장황해서 읽기 어렵다는 경험이다. `docs/specs/018-readme-redesign.md:38`에 기록되어 있다. 글들은 그 경험을 설명하는 외부 근거이며, 작성자의 경험이나 독창성의 증거는 아니다.

- [Colin Breck의 글](https://blog.colinbreck.com/i-dont-want-to-read-what-you-didnt-write/). 위키에서 관련 글을 찾고 `raw-articles/I Don’t Want to Read What You Didn’t Write.md:12-18,38`을 확인했다. 작성자는 상세한 AI PR 요약이 변경 이유, 가치, 위험, 리뷰어의 주의 지점을 빠뜨리는 경험을 설명한다. 변경 목록보다 판단에 필요한 맥락을 앞에 두는 동기에 맞는다. 개인 관찰이며 모든 에이전트 PR의 빈도를 보여 주지 않는다.
- [Hugo의 PR 작성 글](https://hugorcd.com/writing/what-my-pull-requests-look-like-now). `wiki/summaries/what-my-prs-look-like-now-hugorcd.md`와 `raw-articles/What My Pull Requests Look Like Now.md:11-25,115-121`을 확인했다. 설명만으로는 리뷰어가 작동을 확인할 수 없고, 의도와 실제 확인한 증거를 보여 주면 주의를 배분하는 데 도움이 된다는 개인 사례다. 글은 증거를 더하면서 본문이 길어진다고도 인정한다. 짧은 본문이 항상 낫다는 증거는 아니다. 좋은 설명이 테스트나 코드 리뷰를 대신하지도 않는다.
- [Hugo의 pr-writing 스킬](https://github.com/HugoRCD/hr-folio/tree/main/skills/pr-writing). `references/hr-folio/skills/pr-writing/SKILL.md:6-10,27-44`에서 문제, 변경, 증거, 세부 사항의 순서를 확인했다. 앞의 글이 실제 스킬에 적용된 사례다. 이 스킬은 증거 생성과 게시 전 확인을 요구하므로 기존 증거만 사용하는 one-minute-pr과 동일하다고 쓰면 안 된다.

현재 README의 리뷰 대기열 증가 주장은 위 개인 사례만으로 일반화할 수 없다. 한 분 안에 판단한다는 문구도 검증된 성과가 아니라 목표로 표현하는 편이 정확하다.
