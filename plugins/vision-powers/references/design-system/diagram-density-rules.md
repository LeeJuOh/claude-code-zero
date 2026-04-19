# Diagram Density Rules

한 다이어그램은 **가볍게**, 초과 시 여러 개로 쪼갠다. diagram-generator와 taste-gate.js가 이 파일의 상한을 **강제**한다.

## Complexity budget per type

| 항목 | Max | 위반 시 |
|---|---|---|
| 전체 노드 | 9 | overview + detail 2장 분리 |
| 전체 arrows / transitions | 12 | 그룹 추상화 후 서브다이어그램 |
| accent (focal) 개수 | **2** | focal 재선정 |
| sequence lifelines | 5 | 덜 중요한 actor 제거 |
| swimlane lanes | 5 | 병합 가능한 lane 합침 |
| quadrant items | 12 | top 12만 표시 |
| ER entities | 8 | 서브도메인별 분리 |
| nested levels | 6 | 플랫화 또는 서브다이어그램 |
| tree depth | 4 | 중간 레벨 단축 |
| layer stack | 6 | 두 스택으로 분리 |
| venn circles | 3 | 시각적 한계 |
| pyramid layers | 6 | 상단 6단계만 |

## Focal rule

- accent는 **1-2개에만** 적용
- 4개 이상 accent = focal을 결정하지 못한 상태 → 재설계
- accent가 전체 노드의 30% 초과 = 재설계

## Split rule

Complexity budget 초과 시:
1. Overview 다이어그램 1장 (max 5 노드, 핵심 관계만)
2. Detail 다이어그램 N장 (overview에 click link로 연결)

## 테이블 vs 다이어그램 결정

- 2-column 비교 → 테이블
- 3-column 테이블로 충분한 정보 → 테이블
- 노드 간 관계가 **핵심**일 때만 다이어그램

## Length cap

- HTML 리포트당 다이어그램 총 개수 최대 15
- 마크다운 리포트당 다이어그램 최대 10
