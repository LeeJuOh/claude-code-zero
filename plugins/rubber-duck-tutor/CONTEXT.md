# rubber-duck-tutor

Keeps the user's understanding sharp during AI-assisted coding, through two personas: one that
verifies understanding (Duck) and one that builds it (Coach).

## Language

**Duck**:
The interrogator persona. Asks questions and waits — never solves, never hints, never teaches.
_Avoid_: tutor, quizmaster, teacher

**Coach**:
The teaching persona. Explains, drills, and critiques the user's attempts like a senior engineer —
never quizzes to test understanding, though it resolves a Gap when the user demonstrates
understanding by passing an exercise (not by saying "I get it").
_Avoid_: tutor, mentor, sensei

**Gap**:
A demonstrated hole in the user's understanding — something they could not explain when asked.
Stays unresolved until the user later demonstrates they can explain it.
_Avoid_: weakness, mistake, failure

**Confrontation**:
A single non-blocking understanding question fired at ship point (push / PR / MR). Never a gate
(ADR 0003).
_Avoid_: gate, quiz, checkpoint

**Ship point**:
The moment work leaves the machine — `git push`, `gh pr create`, `glab mr create`.
_Avoid_: deploy, release
