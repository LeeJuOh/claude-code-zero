# Learning Science Principles

Consult this document when adapting exercises or making judgment calls about learning approach. These principles explain WHY the techniques in the main skill work.

Adapted from [learning-opportunities](https://github.com/DrCatHicks/learning-opportunities) by Dr. Cat Hicks.
Licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Original authors: Cat Hicks, Carol Lee, Kristen Foster-Marks.

---

## The Generation Effect

**Finding:** People encode information better when they produce it rather than passively consume it. Testing produces better delayed retention than passive review, even when immediate performance is worse.

**In practice:** Having users generate predictions, explanations, or solutions — even wrong ones — produces better learning than showing the answer first.

**Risk in AI-assisted work:** Accepting generated code skips the active processing that builds understanding.

**Application:** Prediction exercises, generation-before-instruction, teach-it-back prompts.

---

## Pre-testing

**Finding:** Attempting to figure out an answer *before* learning new information produces stronger memory — even when the pre-learning attempt was wrong.

**Key research:** Giebl et al. found that novice programmers who attempted problems before searching performed better than those who searched immediately.

**Application:** Ask "what do you predict will happen" before tracing code. Ask "how would you approach this" before showing implementations. Wrong predictions are valuable data, not failures.

---

## The Spacing Effect

**Finding:** Distributing learning over time produces better retention than cramming into a single session.

**Learner misconception:** Spacing feels easier than cramming, so people rarely believe it works better.

**Risk in AI-assisted work:** Machine velocity pushes into constant "cram" — completing work in large pushes without returning to reflect.

**Application:** Retrieval check-ins at session starts. Return to the same area at multiple times during a project.

---

## The Worked Example Effect

**Finding:** Studying worked examples (complete solutions with steps shown) produces better initial learning than problem-solving, particularly for novices. This reverses for experts, where shown steps become redundant ("expertise reversal effect").

**In practice:** AI-generated solutions function like worked examples — beneficial for building initial schemas, but if learners never transition to generating solutions themselves, they miss retrieval practice and stay in "novice mode."

**Application:** Use the fading technique: start with complete examples, progressively remove steps, and have the learner fill gaps. This is why the duck skill's fading scaffolding works — it adapts to demonstrated expertise rather than treating everyone the same.

---

## Desirable Difficulties

**Finding:** Conditions that make learning slower or harder in the short term often produce better long-term retention and transfer.

**Implications:**
- Exercises should require effort without being frustrating
- Struggle during learning is often a sign it's working, not failing
- Slowing down can produce more value over time than optimizing for throughput

**Application:** Don't simplify exercises just because the learner struggles. Scaffold when stuck, but don't eliminate the challenge.

---

## Fluency Illusion

**Finding:** When information feels easy to process, we overestimate how well we've learned it.

**Risk in AI-assisted work:** Generated code that compiles and looks clean creates the illusion of understanding. The fluency of the output masks gaps in the mental model.

**Application:** Test actual understanding through explanation and prediction. "Can you explain it?" defeats the illusion that reading it was enough.

---

## Effort Illusion

**Finding:** People mistake the *feeling* of working hard for actual learning. High output can coexist with skill stagnation.

**Risk in AI-assisted work:** Shipping lots of AI-generated code feels like growth even when you're not building transferable understanding. Production velocity and burnout can decrease the ability to verify and self-monitor.

**Application:** Use retrieval exercises to test actual understanding. Volume of output is not evidence of learning — only demonstrated explanation and prediction are.

---

## Active vs. Passive Processing

**Finding:** Active engagement (retrieving, explaining, generating) beats passive review (reading, watching, accepting).

**Application:**
- Asking "what do you think this does" beats explaining what it does
- Having users locate code beats showing them code
- Teach-it-back exercises test real understanding

---

## Dynamic Testing

**Finding:** Errors during learning, when followed by corrective feedback, enhance retention compared to error-free learning.

**Critical nuance:** This requires clear, direct feedback. Errors without correction, or with vague feedback, don't produce the benefit.

**Application:** When learners are wrong, be direct about what's incorrect, then explore why. Don't soften wrongness into ambiguity.

---

## Transfer and Interleaving

**Finding:** Learning transfers better when explicitly connected to underlying principles. Mental models build more efficiently when concepts appear in varied contexts.

**Application:** After hands-on practice, prompt transfer: "This is an example of [pattern]. Where else might you use this?" Mix concepts rather than drilling one.

---

## Metacognition

**Finding:** Learners who monitor their own learning strategies outperform those who don't, independent of raw ability.

**Risk in AI-assisted work:** Constant production velocity suppresses metacognitive monitoring. Users who don't pause to ask "am I actually learning this?" may not notice skill degradation.

**Application:** Build reflection moments into workflows. The confidence check ("rate 1-10") is a metacognitive prompt — it forces self-assessment.

---

## The Six Risks of AI-Assisted Coding

These principles point to a specific risk profile:

1. **Generation effect undermined** — accepting generated code skips active processing
2. **Fluency illusion amplified** — clean generated code feels understood when it isn't
3. **Effort illusion unchecked** — high output volume feels like growth but may mask skill stagnation
4. **Spacing effect eliminated** — machine velocity pushes constant cramming
5. **Metacognition suppressed** — fast workflows don't leave room to self-monitor
6. **Testing and retrieval underused** — fewer opportunities to benefit from self-testing

The rubber duck tutor counteracts these by reintroducing: active generation (explanations, predictions), retrieval practice (teach-back, check-ins), deliberate pauses (quick checks before approval), and explicit metacognition (confidence ratings, gap identification).

---

## Sources

- Bjork, R. A., Dunlosky, J., & Kornell, N. (2013). Self-regulated learning: Beliefs, techniques, and illusions.
- Dunlosky, J. et al. (2013). Improving students' learning with effective learning techniques.
- Giebl, S. et al. (2021). Answer first or Google first?
- Hicks, C. M., Lee, C. S., & Foster-Marks, K. (2025). The New Developer: AI Skill Threat.
- Kalyuga, S. (2007). Expertise reversal effect and its implications for learner-tailored instruction.
- Roediger III, H. L., & Karpicke, J. D. (2006). The power of testing memory.
- Soderstrom, N. C., & Bjork, R. A. (2015). Learning versus performance.
- Sweller, J., & Cooper, G. A. (1985). The use of worked examples as a substitute for problem solving in learning algebra.
- Tankelevitch, L. et al. (2024). The metacognitive demands and opportunities of generative AI.
