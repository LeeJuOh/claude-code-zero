# 기존 위키 근거: 스킬 제작과 유틸리티

이 메모는 세 README의 문제 설명을 보강할 후보 근거다. 자료는 제작자의 실제 동기를 증명하지 않는다. 외부 사례와 현재 플러그인의 기능을 구분한다.

## skill-creator-pro

- 스킬이 호출되는지와 호출 후 작업을 잘하는지는 다른 질문이다. [Anthropic Skills 위키](../../wiki/summaries/anthropic-skills.md#L33)는 동일 과제의 스킬 유무 비교와 사람의 산출물 검토를 설명한다. 같은 문서 [53~57행](../../wiki/summaries/anthropic-skills.md#L53)은 호출 평가가 실제 결과 품질을 검증하지 않는다고 구분한다. [원본 skill-creator](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/skill-creator/SKILL.md)도 평가와 설명 개선을 별도 단계로 둔다. README에서는 두 평가가 왜 필요한지 설명할 수 있다.
- [Addy Osmani 스킬 위키](../../wiki/summaries/addyosmani-agent-skills.md#L45)는 호출, 지시 준수, 결과가 서로 다를 수 있다고 설명한다. [원본 평가 안내](https://github.com/addyosmani/agent-skills/blob/main/evals/README.md)와 로컬 [평가 안내](../../references/agent-skills/evals/README.md#L42)는 플러그인 유무 비교와 호출 후 행동 실패 사례를 기록한다. 특정 모델과 과제의 관찰이므로 이 플러그인의 성능 보장은 아니다.

## toolbox

아래는 `handoff`에 대한 간접 근거다. 네 유틸리티 전체의 필요성이나 효과를 입증하지는 않는다.

- [Pocock 인계 위키](../../wiki/summaries/handoff-prototype-pocock.md#L8)와 [원문 클립](../../raw-articles/handoff%20Move%20Context%20Between%20Agent%20Sessions.md#L22)은 결정, 미결 사항, 다음 목표와 기존 파일 경로를 남기는 이유를 설명한다. [원문](https://www.aihero.dev/skills-handoff)은 다음 세션이 전체 대화를 다시 읽지 않고 이어갈 수 있도록 인계 문서를 제안한다. 성공률을 비교한 실험은 아니다.
- [컨텍스트 인계 비교](../../wiki/comparisons/context-handoff-resume-patterns.md#L6)는 자동 압축과 디스크에 남는 인계 문서를 구분한다. [긴 컨텍스트 논문 클립](../../raw-articles/You%20don%E2%80%99t%20need%20long%20context.md#L47)과 [원문](https://arxiv.org/html/2611.05306v1)은 긴 입력을 외부에 두고 필요한 부분을 읽는 접근을 연구한다. 이 논문은 toolbox의 인계 기능과 자동 압축을 직접 비교하지 않았다. README는 다음 세션에 작업 상태와 근거 위치를 전달한다는 목적까지만 말할 수 있다.

## notebooklm-connector

- [NotebookLM 스킬 참고 저장소](../../references/notebooklm-skill/README.md#L31)는 문서 탐색, 근거 없는 API 생성, 브라우저와 편집기 사이 복사를 문제로 제시한다. [원본 저장소](https://github.com/PleasePrompto/notebooklm-skill)의 자체 주장이다. 환각 감소나 토큰 절약 수치를 이 플러그인의 검증 결과로 옮길 수 없다.
- [긴 컨텍스트 논문 위키](../../wiki/summaries/you-dont-need-long-context-paper.md#L1)와 [원문](https://arxiv.org/html/2611.05306v1)은 긴 입력을 외부에 두고 필요한 부분만 읽는 접근을 다룬다. 이는 문서 전체를 매번 컨텍스트에 넣지 않으려는 목적의 간접 근거다. NotebookLM의 정확도나 이 플러그인의 토큰 사용량을 측정한 연구는 아니다.
- [DoorDash 검색 근거 위키](../../wiki/summaries/doordash-decoupled-search-grounding.md#L36)와 [원문](https://careersatdoordash.com/blog/how-doordash-reduced-llm-search-costs-by-98-without-losing-accuracy/)은 검색 결과에 제목, URL, 발췌를 붙여 출처 추적을 지원한 사례다. 다른 검색 시스템의 사례다. 인용이 답의 정확성을 보장하거나 NotebookLM의 답이 항상 업로드된 자료에만 근거한다고 입증하지 않는다.

README에는 업로드한 자료를 바탕으로 질문하고 인용을 확인하는 목적을 쓸 수 있다. 자료 누락, 답변 오류, 인용의 적합성은 사용자가 확인해야 한다. 자동 후속 질문은 빈틈을 찾으려는 절차이며 완전한 답을 보장하지 않는다.
