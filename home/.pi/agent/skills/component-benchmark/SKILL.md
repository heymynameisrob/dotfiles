---
name: component-benchmark
description: >-
  Creates focused component performance benchmarks. Use when the user asks to benchmark a UI component, add a .bench test, stress-test rendering, compare performance before/after a change, or investigate component scaling limits.
---

# Component benchmark workflow

Use this skill to turn a vague performance concern into a reproducible benchmark, then report what the numbers mean.

## Workflow

1. **Analyze the component first**
   - Read the component and nearby tests/stories.
   - Identify expensive paths: mount/setup, computed reductions, watchers, prop updates, list rendering, DOM measurement, event handlers, exposed methods, async work.
   - Check existing test tooling and naming conventions.
   - Prefer a separate `.bench.ts` file next to the component, not a normal `.test.ts` file.

2. **Discuss the benchmark plan with the user**
   - Summarize what could be benchmarked and what each option would prove.
   - Ask for confirmation when the benchmark target is ambiguous or there are tradeoffs.
   - Include sample counts/iterations in the plan. Avoid single-sample benchmarks unless the user explicitly wants a quick smoke run.
   - Be clear whether a scenario includes setup cost or isolates only the operation under test.

3. **Create the benchmark test**
   - Use the project's benchmark runner and component test utilities.
   - Keep benchmark data deterministic and generated in-file unless there is an existing fixture convention.
   - Benchmark multiple realistic input sizes when investigating scaling, for example small/medium/large.
   - Include at least 3 samples/iterations for noisy UI work, unless runtime is prohibitive.
   - Clean up mounted components after every benchmark iteration.
   - Mock stable DOM measurements like `offsetHeight`/`offsetWidth` when layout is not the thing being measured.
   - Keep timing assertions out of normal unit tests; benchmark files should measure, not enforce fragile CI thresholds.

4. **Run and report**
   - Run the benchmark command and capture output to a log file if it may be verbose.
   - If changing implementation, run the benchmark before and after the change when practical.
   - Also run relevant unit tests to guard correctness.
   - Report:
     - command(s) run
     - benchmark scenarios
     - before/after table when available
     - notable variance or unreliable samples
     - what the benchmark actually measured
     - what it did **not** measure
     - concrete performance improvement suggestions

## Good benchmark scenarios

Pick scenarios based on component behavior:

- Initial mount/setup cost
- Updating important props
- Appending/removing/replacing list data
- Calling exposed methods
- User interactions such as scroll, filter, search, expand/collapse
- Expensive slot rendering, if slots are central to the component
- Async state transitions, if they are part of the real cost

## Report template

~~~markdown
## Benchmark report

Command:

```bash
<command>
```

### Scenarios

| Scenario | Input sizes | Notes |
|---|---:|---|
| ... | ... | ... |

### Results

| Scenario | Small | Medium | Large |
|---|---:|---:|---:|
| ... | ... | ... | ... |

### Interpretation

- ...

### Suggestions

1. ...
2. ...

### Verification

- `<unit test command>`: passed/failed
~~~

## Guardrails

- Do not present benchmark numbers as absolute truth; note local machine and CI variance.
- Do not benchmark only the happy-path micro-operation if real users pay setup/render costs too.
- Do not optimize based on benchmark results without preserving behavior with unit tests.
- If benchmark runtime becomes excessive, reduce input sizes or iterations and explain the tradeoff.
