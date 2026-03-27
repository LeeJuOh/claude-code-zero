# Learning Science Principles

Consult this document when adapting exercises or making judgment calls about learning approach. These principles explain WHY the techniques in the main skill work.

Adapted from [learning-opportunities](https://github.com/DrCatHicks/learning-opportunities) by Dr. Cat Hicks.
Licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Original authors: Cat Hicks, Carol Lee, Kristen Foster-Marks.

---

## Core Insight: We're Often Wrong About What Helps Us Learn

Misconceptions about learning are common and predict long-term performance differences. Our minds confuse the *experience of effort* with *actual learning*, and the *experience of fluency* with *actual knowledge*. Strategies that feel high-effort often aren't productive, while strategies that feel easy can work better than expected. At the same time, productive struggle is more valuable than we realize — learners need mistakes and feedback to progress.

Focusing on long-term learning outcomes, rather than short-term performance, helps learners. This is why the duck skill feels uncomfortable at first — it's working.

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

**Learner misconception:** Spacing feels easier than cramming, so people rarely believe it works better. In studies, spacing produces better performance for the majority of participants, yet most believe massing had been more effective.

**Risk in AI-assisted work:** Machine velocity pushes into constant "cram" — completing work in large pushes without returning to reflect.

**Application:** Retrieval check-ins at session starts. Return to the same area at multiple times during a project.

---

## The Worked Example Effect

**Finding:** Studying worked examples (complete solutions with steps shown) produces better initial learning than problem-solving, particularly for novices. This reverses for experts, where shown steps become redundant ("expertise reversal effect").

**Learner misconception:** Learners often do not seek out enough examples, but those who study worked examples outperform those who spend equivalent time problem-solving with no example exposure.

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

**Finding:** When information feels easy to process or easy to look up, we overestimate how well we've learned it.

**Learner misconception:** Smooth reading or easy recognition creates a sense of familiarity that we mistake for durable knowledge.

**Risk in AI-assisted work:** Generated code that compiles and looks clean creates the illusion of understanding. The fluency of the output masks gaps in the mental model.

**Application:** Test actual understanding through explanation and prediction. "Can you explain it?" defeats the illusion that reading it was enough.

---

## Effort Illusion

**Finding:** People mistake the *feeling* of working hard for actual learning. High output can coexist with skill stagnation.

**Learner misconception:** Grinding through tasks creates a sense of productivity that may not correspond to skill development.

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

**Finding:** Learners who monitor and adjust their own learning strategies outperform those who don't, independent of raw ability. Experts learn to harness strategic metacognitive practices to transcend their original cognitive constraints.

**Key capabilities:**
- Monitoring: knowing when you understand vs. when you don't
- Control: adjusting strategies based on that monitoring
- Calibration: accurately judging your own competence

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

- Bjork, R. A., Dunlosky, J., & Kornell, N. (2013). Self-regulated learning: Beliefs, techniques, and illusions. *Annual Review of Psychology*, 64(1), 417-444.
- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. *Psychological Science in the Public Interest*, 14(1), 4-58.
- Ericsson, K. A., Hoffman, R. R., & Kozbelt, A. (Eds.). (2018). *The Cambridge Handbook of Expertise and Expert Performance*. Cambridge University Press.
- Giebl, S., Mena, S., Storm, B. C., Bjork, E. L., & Bjork, R. A. (2021). Answer first or Google first? *Psychology Learning & Teaching*, 20(1), 58-75.
- Hicks, C. M., Lee, C. S., & Foster-Marks, K. (2025). The New Developer: AI Skill Threat. https://doi.org/10.31234/osf.io/2gej5_v2
- Hicks, C. (2025). Cognitive helmets for the AI bicycle: Part 1. *Fight for the Human*. https://www.fightforthehuman.com/cognitive-helmets-for-the-ai-bicycle-part-1/
- Kalyuga, S. (2007). Expertise reversal effect and its implications for learner-tailored instruction. *Educational Psychology Review*, 19(4), 509-539.
- Kang, S. H. (2016). Spaced repetition promotes efficient and effective learning. *Policy Insights from the Behavioral and Brain Sciences*, 3(1), 12-19.
- Kornell, N. (2009). Optimising learning using flashcards: Spacing is more effective than cramming. *Applied Cognitive Psychology*, 23(9), 1297-1317.
- Murphy, D. H., Little, J. L., & Bjork, E. L. (2023). The value of using tests in education as tools for learning. *Educational Psychology Review*, 35(3), 89.
- Roediger III, H. L., & Karpicke, J. D. (2006). The power of testing memory. *Perspectives on Psychological Science*, 1(3), 181-210.
- Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning. *Instructional Science*, 35(6), 481-498.
- Skulmowski, A., & Xu, K. M. (2022). Understanding cognitive load in digital and online learning. *Educational Psychology Review*, 34(1), 171-196.
- Soderstrom, N. C., & Bjork, R. A. (2015). Learning versus performance. *Perspectives on Psychological Science*, 10(2), 176-199.
- Sweller, J., & Cooper, G. A. (1985). The use of worked examples as a substitute for problem solving in learning algebra. *Cognition and Instruction*, 2(1), 59-89.
- Tankelevitch, L. et al. (2024). The metacognitive demands and opportunities of generative AI. *CHI Conference on Human Factors in Computing Systems*, 1-24.
