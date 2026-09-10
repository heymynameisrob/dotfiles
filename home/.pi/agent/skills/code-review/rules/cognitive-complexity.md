# Cognitive complexity review guide

## Purpose

Reduce the number of decisions, states, and dependencies that a reviewer must
remember at the same time. Do not optimise for fewer lines or a lower score alone.

Apply the control-flow rules to all code. Apply the component rules when reviewing
UI code, especially Vue components. Review the changed behaviour and its relevant
callers. Do not demand unrelated refactors of existing code.

## Control-flow rules

These rules follow Sonar's Cognitive Complexity paper, version 1.7. The score
estimates the effort needed to understand control flow. It does not measure every
part of code readability.

- **Reduce nesting before reducing line count.** A decision inside another
  decision requires the reader to remember the outer conditions. In the paper's
  model, three nested `if` statements score 6. Three separate, top-level `if`
  statements score 3.
- **Use guard clauses to keep the main path flat.** Handle missing data, invalid
  input, denied access, and cancelled actions early. Avoid wrapping the main
  operation in several `if` blocks. An early `return` adds no score, although its
  condition still does.
- **Remove unnecessary `else` blocks after an exit.** If a branch returns or
  throws, let the remaining path continue at the outer level. Keep an `else` when
  it makes two meaningful alternatives easier to compare.
- **Give complex conditions meaningful names.** Prefer a condition such as
  `canMoveWorkflow` over a repeated mixture of permissions, feature flags, archive
  state, and route checks. The name must explain the rule, not merely hide the
  expression.
- **Simplify mixed Boolean logic.** Expressions that switch between `&&` and
  `||`, especially with negated groups, require careful reading. Split them into
  named conditions when this exposes the business rule. Parentheses clarify
  grouping, but do not remove the underlying complexity.
- **Use `switch` for alternatives based on one value.** The paper charges one
  structural increment for the whole `switch`, rather than one for every case.
  Keep each case simple. Do not use `switch (true)` merely to disguise unrelated
  conditions.
- **Use readable shorthand, not compressed logic.** Optional chaining, nullish
  defaults, and a simple ternary can be clearer than a longer equivalent. Avoid
  nested ternaries. Preserve the distinction between a missing value and valid
  values such as `false`, `0`, or `''`.
- **Extract meaningful operations, not arbitrary blocks.** A helper should give
  a coherent operation a clear name and contract. Stop extracting when the reader
  must jump between functions to understand one simple action. Moving complexity
  is not always reducing it.
- **Keep exception handling easy to follow.** Each `catch` is a decision. Nested
  recovery paths add more complexity. Preserve required error handling. Use
  `finally` for unconditional cleanup where appropriate. The paper does not add
  a score for `try` or `finally` themselves.
- **Review unusual control flow closely.** Recursion and labelled jumps require
  the reader to follow a less direct path. Prefer a simpler equivalent when one
  exists. Do not replace a clear recursive algorithm merely to reduce its score.

## Component and template rules

These are review recommendations informed by reading n8n `editor-ui` components
and Vue documentation. They are not additional Sonar scoring rules.

- **Give each component a clear purpose.** A component can coordinate several
  steps that serve one purpose. Question components that also own unrelated
  loading, validation, conversion, navigation, and display policies.
- **Split components by behaviour, not by file length.** Extract a section when
  it has a clear responsibility and a small interface. Do not split a template
  merely because it is long. A child that needs most of its parent's state may
  not be a useful boundary.
- **Keep templates focused on rendering.** Simple conditions and direct event
  forwarding are fine. Move multi-step handlers, data transformations, and complex
  display decisions into named functions or computed values.
- **Make display precedence explicit.** When loading, editing, errors, empty
  data, and normal content compete for the same area, define which state wins in
  one place. Preserve the order of existing `v-if` branches during refactoring.
- **Use named states for mutually exclusive modes.** Prefer a type such as
  `'idle' | 'loading' | 'ready' | 'error'` when exactly one state can apply. Keep
  separate Booleans for genuinely independent facts. Do not replace every set of
  flags with a large state machine.
- **Use typed mappings for simple state-to-display choices.** Labels, icons, and
  variants often belong in a mapping keyed by a known state type. Keep procedural
  logic as code. Avoid building a generic configuration system for a small local
  decision.
- **Question each new behaviour flag.** Ask which combinations are valid and how
  the flag interacts with existing props. A growing set of mode flags can indicate
  separate use cases that need separate wrappers or components.
- **Reuse established UI components.** Existing design-system controls remove
  local interaction logic that reviewers would otherwise need to understand.
  Prefer composition and slots over recreating controls or adding many unrelated
  modes to one wrapper.

## State and side-effect rules

- **Keep computed getters and display helpers free of side effects.** Reading a
  value must not unexpectedly reset pagination, mutate shared state, emit events,
  or start a request. Check functions called by computed getters, not just the
  getter body.
- **Keep one authoritative value for each fact.** Derive values with `computed`
  instead of copying them into refs and keeping the copies aligned with watchers.
  Separate draft or historical state is valid, but its purpose and reset rules
  must be clear.
- **Make state ownership and updates easy to trace.** Use clear props, events,
  models, and store actions. Question behaviour that requires following a
  component ref, an event bus, and a store watcher to find who changes a value.
- **Use watchers for a specific side effect.** A reviewer should be able to
  explain: "When X changes, do Y." Watcher chains that update each other need
  close review. A watcher is not a substitute for a direct action handler or a
  computed value.
- **Make asynchronous behaviour explicit.** For each request, identify its
  inputs, loading state, success path, failure path, and cleanup. Explain what
  happens if the inputs change before the response arrives. Keep stale-response
  checks when simplifying code.
- **Extract composables around a coherent concern.** Search and pagination,
  execution control, or selection state can form useful boundaries. Moving all
  of a component's logic into one large `useComponent()` function usually changes
  its location, not its complexity.
- **Keep business rules consistent across controls.** Related buttons, menus,
  tooltips, and handlers should use the same eligibility rule when their behaviour
  is meant to match. Keep visibility, disabled state, and authorisation distinct
  where they have different meanings. UI checks do not replace server-side
  authorisation.

## How to apply this guide

- **Use the score as a warning, not a verdict.** Sonar commonly uses 15 per
  function as a default threshold. This is an adjustable starting point, not a
  scientifically established limit. Do not apply it to an entire Vue component
  or repository.
- **Treat three nested control-flow levels as a review prompt.** This is a local
  review suggestion, not a threshold from the paper. Ask whether guards or a
  meaningful helper would make the code clearer. Do not count ordinary HTML
  nesting as control-flow nesting.
- **Review templates and state flow separately from function scores.** The paper
  does not define a complete Vue component metric. Check the actual analyser and
  version before relying on exact scoring behaviour. Do not claim a measured
  score unless it was measured.
- **Require behaviour to remain unchanged.** A lower score does not justify
  changed branch precedence, lost error handling, different event order, missing
  cleanup, or altered request behaviour.
- **Trace one interaction from start to finish.** Pick an action such as changing
  a parameter, selecting a resource, or publishing a workflow. Follow it from the
  UI event to the state update and back to the rendered result. If understanding
  it requires many unrelated files or hidden callbacks, the design can still be
  hard to understand even when every function has a low score.
- **Make review comments specific.** Identify what the reader must remember,
  which decisions or state changes make this difficult, and the smallest useful
  improvement. Do not request a refactor solely because a file is long or a
  threshold is exceeded.

Final review question:

> Does this change reduce what the next developer must remember, or does it only
> move that information somewhere else?

## Examples from n8n editor-ui

These examples informed the guide. They are observations from the source reading,
not permanent findings or instructions to refactor these files. Recheck the current
code before using an example in a review.

Paths are relative to `packages/frontend/editor-ui/src/` in the n8n repository.

- **Guard clauses:** `app/components/WorkflowCard.vue`, `deleteWorkflowById`,
  separates cancelled confirmation, request failure, and successful deletion.
- **Typed display mapping:** `app/components/WorkflowCard.vue`,
  `publicationIndicators`, requires an explicit display configuration for each
  publication status.
- **Small rendering boundary:**
  `features/ndv/runData/components/RunDataPaginationBar.vue` accepts pagination
  values and emits updates. It does not need to understand workflow execution or
  data retrieval.
- **Hidden side effect:** `features/ndv/runData/components/RunData.vue`,
  `getFilteredData`, also resets `currentPage`. A computed getter calls this
  helper. This shows why reviewers must check state changes, not only branch
  count.
- **Display precedence:** `features/ndv/runData/components/RunData.vue` has a long
  sequence of competing content states.
  `features/ndv/parameters/components/ParameterInput.vue` combines parameter types,
  expression modes, editor types, and dialog states. Both illustrate the need for
  explicit precedence and behaviour-based boundaries.
- **Asynchronous safeguards:**
  `features/ndv/parameters/components/ResourceLocator/ResourceLocator.vue`,
  `loadResources`, captures a request key and checks it after the request. Any
  simplification must preserve its handling of changed inputs.

## Sources and limits

- [Cognitive Complexity, version 1.7](https://www.sonarsource.com/docs/CognitiveComplexity.pdf),
  especially pages 5–9 and Appendix B. The paper defines the control-flow metric.
- [Author's refactoring Q&A](https://community.sonarsource.com/t/webinar-refactoring-with-cognitive-complexity/45331/2).
  Covers thresholds, extraction limits, and why aggregate scores should not be
  pass/fail gates.
- [Empirical validation study](https://arxiv.org/abs/2007.12520).
  Reports an association with comprehension time and subjective ratings, but
  mixed results for other measures. A low score does not prove that code is easy
  to understand or correct.
- Vue documentation:
  [computed values](https://vuejs.org/guide/essentials/computed.html),
  [watchers](https://vuejs.org/guide/essentials/watchers.html), and
  [composables](https://vuejs.org/guide/reusability/composables.html).
