---
paths:
  - "src/**/*.test.ts"
  - "src/test/**/*.ts"
---

# Test conventions

## Layout

- Colocate a test next to its source: `src/foo.ts` → `src/foo.test.ts`.
- Put shared fixtures and helpers (mock builders, spies) in `src/test/`, not inline in each test file.

## Style

- Express the spec in the test name. Do not write explanatory comments inside tests.
- Prefer table-driven tests (`it.each`) when the cases are plain data. Do not force a table when it would need branching in the assertion or a function call in the data — use separate `it`s instead.
- Compare objects with a single deep-equal (`toEqual`) rather than many per-field assertions.
- Only test realistic scenarios. Do not assert cases that cannot occur at runtime.
- Assert against the real production types; do not re-declare a shape in the test.

## Grouping

Group by the unit under test first, then by case type inside it. Omit a case-type group that has no cases.

```
describe("functionName", () => {
  describe("positive", () => { /* ... */ });
  describe("semi-positive", () => { /* ... */ });
  describe("negative", () => { /* ... */ });
});
```

- **positive** — specified behaviour, including fallbacks and limit/size trimming.
- **semi-positive** — validation that rejects out-of-contract input.
- **negative** — abnormal external failures (e.g. a dependency returning an error).

## Boundaries

- Test through the public API. Do not export a production internal just so a test can reach it — drive it through the exported entry point instead.
