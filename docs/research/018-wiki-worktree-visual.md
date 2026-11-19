# 기존 위키 자료 조사: worktree-plus와 vision-powers

기존 위키와 연결된 로컬 원문을 확인했다. 아래 자료는 README의 문제와 의도를 설명하는 데 쓸 수 있다. 플러그인의 효과나 다른 도구의 기능 부재를 검증한 실험은 아니다.

## worktree-plus

- **작업 보존과 정리.** [ub-mode 위키](../../wiki/summaries/ub-mode.md#L43)는 사용하지 않는 작업 공간을 회수하기 전에 커밋하지 않은 작업을 확인하도록 정리한다. [원본 스킬](../../references/ub-mode/SKILL.md#L143)은 사용 중인지 확인하고 미커밋 작업은 결정을 기다리라고 지시한다. [원본 저장소](https://github.com/unclebob/ub-mode). 이는 README의 삭제 전 작업 보존이라는 목적을 뒷받침하는 다른 저자의 운영 지침이다. 실제 손실 빈도나 worktree-plus의 차단 효과는 측정하지 않는다.
- **병렬 작업의 독립성.** [ClawTeam 위키](../../wiki/summaries/clawteam.md#L9)와 [원본 README](../../references/ClawTeam/README.md#L191)는 작업자마다 별도 worktree를 배정한다고 설명한다. [원본 저장소](https://github.com/HKUDS/ClawTeam). 이는 독립된 작업 공간을 반복해서 만들고 관리하는 사용 맥락을 보여 준다. 충돌이 전혀 없다는 보장이나 설정 파일 복사의 필요성을 입증하지는 않는다.
- **근거 공백.** 위 두 자료는 `.env` 복사, 원격 추적, 재진입, 기본 Claude Code 동작에 대한 README의 구체적 비교를 검증하지 않는다. 해당 비교는 별도 구현과 공식 문서 확인이 필요하다.

## vision-powers

- **관계를 보여 주는 매체.** [HTML 글 위키](../../wiki/summaries/unreasonable-effectiveness-html.md#L3)와 [로컬 원문](../../raw-articles/The%20unreasonable%20effectiveness%20of%20HTML.md#L45)은 코드 변경과 호출 관계를 주석, 상자, 화살표로 보여 주는 예를 든다. [원문](https://thariqs.github.io/html-effectiveness/). 이는 README가 말하는 공간적 관계와 탐색 가능한 결과물의 의도를 직접 뒷받침한다. 저자의 제안과 데모이며, 마크다운 대비 이해도 향상을 측정한 실험은 아니다.
- **판단 전 변경 이해.** [explain-diff 위키](../../wiki/summaries/explain-diff-skill.md#L18)와 [로컬 원문](../../raw-articles/explain-diff.md#L22)은 주변 시스템 배경, 구체적 예시와 그림, 코드 설명, 이해 확인 퀴즈를 요구한다. [원본 gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524). 이는 diff-visual의 README에 있는 이해를 먼저 돕는 구성과 잘 맞는다. 원본은 제안된 작업 방식이지 퀴즈의 학습 효과나 자동 검토 차단을 입증하지 않는다.
