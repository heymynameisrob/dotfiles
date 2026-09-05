---
name: design-system-component-coverage
description: Audits an n8n Design System component or v2 migration against its real consumers. Use when given a component name to inventory consumer configurations, compare legacy and v2 APIs, review tests and stories, and produce an evidence-based coverage matrix before implementation changes.
compatibility: Run from the n8n repository. Requires rg, find, pnpm, and access to packages/frontend.
---

# Design System component coverage

Audit the component named in the skill argument. The argument can be a public export, folder name, or source path, for example `N8nSelect`, `N8nSelect2`, `Select`, or `src/v2/components/Select`.

Do not change implementation or tests unless the user explicitly asks. Do not infer coverage from a test title: cite the assertion that proves it.

## 1. Resolve the component

1. Find the repository root with `git rev-parse --show-toplevel`.
2. Read these files first:
   - `packages/frontend/AGENTS.md`
   - `packages/frontend/@n8n/design-system/src/index.ts`
   - `packages/frontend/@n8n/design-system/src/components/index.ts`
   - `packages/frontend/@n8n/design-system/src/styleguide/*.mdx`
3. Resolve the public export, source folder, and aliases. Do not assume that a `2` suffix maps directly to `src/v2`.
4. Find both implementations when this is a migration:
   - Legacy: `packages/frontend/@n8n/design-system/src/components/`
   - v2: `packages/frontend/@n8n/design-system/src/v2/components/`
5. Read all component files, types, tests, stories, and `component-*.md` files in the resolved folders.

Known exceptions include `N8nCheckbox`, whose current public export points to v2, and `N8nSwitch2`, whose source is under the legacy component tree. Treat `src/index.ts` as authoritative. A v2 folder can exist without a public export.

## 2. Inventory consumers

Search all of `packages/frontend`, excluding `dist`, coverage output, snapshots, and generated files.

Search for:

- Public names and aliases in imports and templates
- PascalCase and kebab-case tags
- Renamed imports
- Deep imports and imported types
- Wrapper components that pass props or slots through
- Dynamic components and render functions
- Tests and stories that use the component

For each production callsite, record:

- File and line
- Imported implementation or alias
- Static props and boolean shorthand
- Bound props, `v-bind` objects, and attribute fallthrough
- All `v-model` arguments and modifiers
- Events, payload use, and modifiers
- Named, scoped, and custom item slots
- Item/data shape, scale, nesting, disabled states, and empty states
- Conditional rendering and controlled state
- Classes, styles, ARIA attributes, refs, directives, and relevant container context
- Dependencies that affect behavior, such as dialog teleportation, forms, stores, or routing

Trace computed values and spread objects far enough to identify the runtime configuration. Mark values that cannot be resolved statically as `Needs runtime review`.

Group consumers by distinct behavior, not by file. Keep separate rows when combinations can expose different behavior, for example searchable plus custom option slots, or controlled open state inside a dialog.

## 3. Build the behavior contract

Compare legacy and v2 for each observed configuration. Review:

- Props, defaults, accepted values, and attribute forwarding
- Models and controlled/uncontrolled state
- Events, payloads, order, and timing
- Slots and slot props
- DOM structure and where classes or attributes are applied
- Focus, keyboard, roles, labels, disabled state, and screen-reader behavior
- Teleportation, stacking context, overflow, and layout
- Empty, large, nested, loading, and invalid data states

Use the relevant W3C APG pattern for interaction behavior. A matching TypeScript API alone does not prove compatibility.

## 4. Review test evidence

Check component unit tests, consumer tests, stories with interaction tests, and visual tests.

Classify evidence as:

- `Covered`: An automated test uses the real component and directly asserts the behavior.
- `Partially covered`: A test covers only part of the configuration or assertion.
- `Stubbed only`: A consumer test verifies parent wiring with the Design System component replaced.
- `Story only`: A story demonstrates the case but has no automated assertion.
- `Not covered`: No relevant automated evidence exists.
- `Needs update`: A test exists but asserts the legacy contract, uses the wrong alias, relies on obsolete DOM, or does not represent the current consumer.
- `Needs runtime review`: Static analysis cannot resolve the configuration.

Snapshots do not prove interaction, accessibility, event payload, focus, overflow, or scale behavior unless the specific contract is visible and intentionally asserted.

When reviewing a migration, identify missing characterization tests that should pass against the legacy implementation before the v2 implementation is changed.

## 5. Produce the report

Use this exact structure:

```markdown
# <Component> consumer coverage audit

## Resolution
- Public exports:
- Legacy source:
- v2 source:
- Tests:
- Stories and specification:

## Summary
- Production consumers:
- Distinct configurations:
- Covered:
- Partial or indirect:
- Not covered:
- Needs update:
- Needs runtime review:

## Coverage matrix
| ID | Consumer configuration | Representative consumers | Legacy behavior | v2 behavior | Test evidence | Status | Required action |
|---|---|---|---|---|---|---|---|
| C1 | ... | `path:line` | ... | ... | `test:line` or None | Covered | None |

## Test gaps in priority order
1. **P0 — ...**: Compatibility or accessibility risk. Add a legacy characterization test first.
2. **P1 — ...**: Common or complex consumer configuration.
3. **P2 — ...**: Lower-risk presentation or uncommon combination.

## Tests that need updates
- `path:line` — reason and required contract change.

## Suggested characterization tests
- Test name
  - Fixture/configuration:
  - Interaction:
  - Assertions:
  - Representative consumers:

## Limits
- Dynamic or runtime cases that the audit could not prove.
```

Every matrix row must cite at least one consumer. Every `Covered` row must cite a test file and the relevant assertion line. If multiple consumers share a row, explain why they are behaviorally equivalent.

## 6. Optional next step

If the user asks to proceed:

1. Confirm the proposed test cases with the user before writing unit tests.
2. Add missing characterization tests against the legacy implementation first.
3. Run the focused test file from `packages/frontend/@n8n/design-system` with `pnpm test <test-file>`.
4. Confirm that the tests pass on legacy or explain why the existing behavior cannot be retained.
5. Update the v2 implementation only after the contract is established.
6. Run focused tests, `pnpm lint`, and `pnpm typecheck` from the Design System package.
