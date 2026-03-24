# Exercise Patterns & Techniques

Practical patterns for running effective duck sessions. The main SKILL.md defines WHEN to use each mode — this file covers HOW to execute exercises within those modes.

Adapted from [learning-opportunities](https://github.com/DrCatHicks/learning-opportunities) by Dr. Cat Hicks.
Licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Original authors: Cat Hicks, Carol Lee, Kristen Foster-Marks.

---

## Hands-on Code Exploration

**Prefer directing users to files over showing code snippets.** Having learners locate code themselves builds codebase familiarity and creates stronger memory traces than passively reading.

### Completion-style Prompts

Give enough context to orient, but have them find the key piece:

> Open `[file]` and find the `[component]`. What does it do with `[variable]`?

### Fading Scaffolding

Adjust guidance based on demonstrated familiarity:

- **Early:** "Open `[file]`, scroll to around line `[N]`, and find the `[function]`"
- **Later:** "Find where we handle `[feature]`"
- **Eventually:** "Where would you look to change how `[feature]` works?"

Fading adjusts the difficulty of the *question setup*, not the *answer*. At every level, the learner still generates the answer themselves. If they're struggling, move back UP the ladder (more specific question) rather than hinting at the answer.

### Pair Finding

After they locate code, have them find a parallel:

> We just looked at how `[function A]` handles `[task]`. Can you find another function that does something similar?

### Example-Problem Pairs

After exploring one instance, have them apply the pattern:

> We just saw how `[module A]` implements `[pattern]`. Now open `[module B]` — how would you apply the same approach there?

### When to Show Code Directly

Only show code snippets when:
- The snippet is very short (1-3 lines) and full context isn't needed
- Introducing new syntax they haven't encountered
- The file is large and searching would be frustrating rather than educational
- They're stuck and need to move forward

In all other cases, direct them to the file.

---

## Exercise Execution Patterns

### Prediction > Observation > Reflection

Best for: understanding behavior, exposing mental model gaps.

1. **Pause:** "What do you predict will happen when [specific scenario]?"
2. Wait for response
3. Walk through actual behavior together
4. **Pause:** "What surprised you? What matched your expectations?"

### Generation > Comparison

Best for: PR review, comparing approaches, understanding trade-offs.

1. **Pause:** "Before I show you how [X] was implemented, sketch out how you'd approach it"
2. Wait for response
3. Show the actual implementation
4. **Pause:** "What's similar? What's different, and why do you think it went this direction?"

### Trace the Path

Best for: understanding data/request flow, integration points.

1. Set up a concrete scenario with specific values
2. **Pause at each decision point:** "The request hits [component] now. What happens next?"
3. Wait before revealing each step
4. Continue through the full path

### Debug This

Best for: code verification, testing understanding of edge cases.

1. Present a plausible bug or edge case from the actual code
2. **Pause:** "What would go wrong here, and why?"
3. Wait for response
4. **Pause:** "How would you fix it?"
5. Discuss their approach

### Teach It Back

Best for: PR review, verifying deep understanding.

1. **Pause:** "Explain how [component] works as if I'm a new developer joining the project"
2. Wait for their explanation
3. Offer targeted feedback: what they nailed, what to refine
4. Do not attribute insight they didn't express — if they described WHAT but not WHY, acknowledge the what without crediting causal understanding

### Retrieval Check-in

Best for: session start on ongoing projects, spacing effect.

1. **Pause:** "Quick check — what do you remember about how [previous component] handles [scenario]?"
2. Wait for response
3. Fill gaps or confirm, then proceed with the session

Use this at the start of new sessions on ongoing projects. It activates spaced retrieval — the brain reconstructs knowledge, strengthening long-term memory.

---

## Techniques to Weave Into Any Mode

### Elaborative Interrogation

Ask "why", "how", and "when else" questions:
- "Why did we structure it this way rather than [alternative]?"
- "How would this behave differently if [condition changed]?"
- "In what context might [alternative] be a better choice?"

### Interleaving

Mix concepts rather than drilling one:
- "Which of these three recent changes would be affected if we modified [X]?"
- Don't ask five questions about the same function — spread across different components.

### Varied Practice Contexts

Apply the same concept in different scenarios:
- "We used this pattern for user auth — how would you apply it to API key validation?"
- "This error handling approach works here. Where else in the codebase would it help?"

### Concrete-to-Abstract Bridging

After hands-on work, transfer to broader contexts:
- "This is an example of [pattern]. Where else might you use this approach?"
- "What's the general principle here that you could apply to other projects?"

### Error Analysis

Examine mistakes and edge cases deliberately:
- "Here's a bug someone might accidentally introduce — what would go wrong and why?"
- Base scenarios on real patterns from the code, not contrived examples.

---

## Pair Finding with Explaining

After they locate code, prompt self-explanation before moving on:

> You found it. Before I say anything — what do you think this line does?

This combines the benefit of active code navigation (stronger memory traces) with self-explanation (deeper processing). Never skip the explanation step — finding code without understanding it just creates an illusion of familiarity.
