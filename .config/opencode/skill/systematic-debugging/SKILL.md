---
name: systematic-debugging
description: Fix bugs using Dan Abramov's systematic debugging method. Use when debugging, fixing bugs, investigating errors, or when the user mentions "bug", "broken", "not working", "debug", or "investigate".
allowed-tools: Read, Grep, Glob, Bash, Edit, mcp__playwright__*, mcp__google-devtools__*
---

# Systematic Bug Fixing

A disciplined approach to debugging based on Dan Abramov's methodology. The key insight: **without a verifiable reproduction case, any attempted fix is guesswork**.

## The Process

### Step 1: Establish a Reproduction Case

Before attempting ANY fix, create a reliable repro that demonstrates the bug.

A valid repro must specify:
1. **Actions**: Exact steps to trigger the bug
2. **Expected**: What should happen
3. **Actual**: What actually happens

```markdown
## Repro
1. Navigate to /settings
2. Click "Save" without changing anything
3. Expected: No action, button stays enabled
4. Actual: Error toast appears, button disabled permanently
```

**If you cannot reproduce the bug, stop.** Ask for more information. Do not guess.

#### Using Browser Tools for UI Bugs

When the bug involves user interactions, visual issues, or browser behavior, use available MCP tools to create verifiable repros:

**Playwright MCP** (if available):
- `browser_navigate` - Navigate to the page where the bug occurs
- `browser_snapshot` - Capture accessibility tree to verify page state
- `browser_click`, `browser_type` - Reproduce user interactions programmatically
- `browser_console_messages` - Check for JavaScript errors or warnings
- `browser_network_requests` - Verify API calls and responses
- `browser_take_screenshot` - Capture visual state for comparison
- `browser_evaluate` - Run JavaScript to measure values (scroll position, element dimensions, timing)

**Example: Converting a visual bug to a verifiable repro**
```
1. browser_navigate to /dashboard
2. browser_snapshot to get current state
3. browser_click on "Load More" button
4. browser_evaluate: `() => window.scrollY` to capture scroll position
5. browser_click on item
6. browser_evaluate: `() => window.scrollY` to check if scroll jumped
7. Compare values - if different, bug reproduced
```

**Google DevTools MCP** (if available):
- Inspect network requests and responses
- Check console for errors and warnings
- Examine DOM state and computed styles
- Profile performance issues

### Step 2: Transform the Repro When Necessary

If the repro relies on something you cannot verify (visual glitches, timing issues, "it feels slow"), convert it to something measurable:

| Unverifiable | Measurable Transformation |
|--------------|---------------------------|
| Visual jitter | `browser_evaluate` scroll position before/after |
| "Slow" | `browser_evaluate` with `performance.now()` timing |
| "Sometimes fails" | `browser_console_messages` to capture errors |
| Layout broken | `browser_snapshot` accessibility tree comparison |
| API failing | `browser_network_requests` to check status codes |
| Click not working | `browser_click` + `browser_snapshot` to verify state change |

**Critical validation**: Confirm that a known fix still produces positive results with your new repro. If your transformed repro doesn't catch known bugs, it's the wrong repro.

### Step 3: Methodically Reduce Code Surface

Follow this disciplined workflow:

```
1. Verify the bug exists (run repro)
2. Remove ONE element (component, hook, import, style)
3. Run repro again
4. If bug persists → commit this removal, continue from step 2
5. If bug disappears → reset, remove something SMALLER
```

**Rules:**
- At every point, maintain a checkpoint where the bug still happens
- Each step must reduce the surface area
- Never skip the verification step
- If you remove something and the bug vanishes, that removal was too aggressive

This is "well-founded recursion" - you must always make measurable progress.

**Using Playwright for automated verification:**
After each code change, re-run the browser repro steps to verify the bug still exists. This is faster and more reliable than manual testing.

### Step 4: Identify Root Cause

Through systematic elimination, you'll narrow down to the exact cause. Only then should you:

1. Understand WHY this code causes the bug
2. Determine the correct fix (not just a workaround)
3. Verify the fix with your original repro
4. Check for similar patterns elsewhere in the codebase

## Browser Debugging Workflow

When debugging UI/browser bugs with MCP tools available:

```
1. Navigate to the page
2. Take initial snapshot/screenshot
3. Reproduce user actions with browser_click, browser_type
4. Capture measurable state (console, network, evaluate)
5. Compare expected vs actual
6. If bug confirmed, begin code elimination
7. After each code change, re-run steps 1-5
8. When bug disappears, last removal was the cause
```

## Key Principles

### Avoid Theory-Driven Debugging

Hypotheses are valuable, but **never abandon your reproducible bug to chase speculation**.

Bad:
> "I think it might be a race condition in the auth flow, let me refactor that..."

Good:
> "My repro still fails. Let me continue eliminating code until I find the cause."

### Always Return to the Repro

After any investigation tangent, return to your repro. Ask:
- Does the bug still reproduce?
- Has my understanding changed?
- Am I closer to the root cause?

### Discipline Over Intuition

Humans make the same mistakes as AI when debugging:
- Form theories
- Test tangents
- Lose sight of the original failing case

The systematic approach works precisely because it doesn't rely on intuition.

## Checklist Before Declaring Fixed

- [ ] Original repro no longer reproduces the bug
- [ ] Understood WHY the bug occurred (not just WHAT fixed it)
- [ ] No regression in related functionality
- [ ] Fix addresses root cause, not symptoms
- [ ] If UI bug: verified with browser tools that the issue is resolved
