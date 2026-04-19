# Taste Gate — Pre-output Checklist

diagram-generator 출력물이 최종 리포트에 들어가기 **전** 반드시 통과해야 하는 체크리스트. `scripts/taste-gate.js`가 이 파일의 규칙을 JSON으로 변환해 실행.

## Type fit
- [ ] 타입이 섹션 의도에 맞나? (diagram-type-selection.md 재확인)
- [ ] 3-column 테이블로 같은 정보 전달 가능? → 그렇다면 **다이어그램 삭제**

## Remove test
- [ ] 노드 하나 지워도 독자가 이해 가능? → 그 노드 **불필요**
- [ ] 두 노드가 항상 붙어 다님? → **하나로 병합**
- [ ] arrow가 layout만으로 명백함? → arrow **삭제**
- [ ] label이 색/모양으로 이미 signal? → label **삭제**

## Signal
- [ ] accent (focal) ≤ 2?
- [ ] legend가 사용된 모든 타입 커버 + 쓸데없는 항목 없음?
- [ ] Complexity budget (density-rules.md) 준수?

## Technical (파서 안정성)
- [ ] arrow label에 opaque mask? (없으면 선이 label을 통과)
- [ ] `writing-mode: vertical` 없음?
- [ ] Mermaid classDef에 `rgba()` / `rgb()` 없음? (파서 붕괴)
- [ ] classDef에 `color:` 없음? (다크모드 파괴, CSS 오버라이드 사용)
- [ ] sequenceDiagram message에 `{}[]<>&` 없음?
- [ ] stateDiagram-v2에 `<br/>` 없음?

## Typography
- [ ] 사람 이름 / 노드 이름 = body sans (mono 금지)?
- [ ] 기술 콘텐츠 (포트, URL, 경로, 필드 타입) = mono?
- [ ] JetBrains Mono 없음?

## Automation

`scripts/taste-gate.js`는 위 체크리스트 중 **프로그램적으로 검증 가능한 항목**을 자동화:

- Mermaid syntax validation (rgba / color / 특수문자 탐지)
- accent 개수 카운트
- 노드/arrow 개수 카운트
- Complexity budget 위반 탐지

수동 판단 필요 항목(Remove test, Type fit)은 section-analyzer와 diagram-generator의 시스템 프롬프트에 포함시켜 간접 강제.

## 위반 시 동작

1. 자동 검증 실패 → diagram-generator 재호출 (해당 섹션만, max 2회)
2. 2회 재시도 후에도 실패 → 해당 섹션의 다이어그램 **제외**, warn 로그 + 리포트 생성은 계속
