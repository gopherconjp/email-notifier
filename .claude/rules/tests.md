---
paths:
  - "src/**/*.test.ts"
  - "src/test/**/*.ts"
---

<!-- DO NOT EDIT: Generated from /.github/instructions/tests.instructions.md. Edit /.github/instructions/tests.instructions.md instead. -->

# Test conventions

## Layout

- Colocate a test next to its source: `src/foo.ts` → `src/foo.test.ts`.
- Put shared fixtures and helpers in `src/test/`, not inline.

## Style

- Express the spec in the test name; no explanatory comments inside tests.
- Prefer table-driven tests (`it.each`) for plain data. Use separate `it`s when a table would need branching or function calls in the data.
- Compare objects with one `toEqual`, not per-field assertions.
- Only test realistic scenarios; don't re-declare production types in tests.

## Grouping

Group by the unit under test first, then by case type inside it. Omit a case-type group that has no cases.

```ts
describe("functionName", () => {
  describe("positive", () => {
    /* ... */
  });
  describe("semi-positive", () => {
    /* ... */
  });
  describe("negative", () => {
    /* ... */
  });
});
```

- **positive** — specified behaviour, including fallbacks and limit/size trimming.
- **semi-positive** — validation that rejects out-of-contract input.
- **negative** — abnormal external failures (e.g. a dependency returning an error).

## Boundaries

- Test through the public API; don't export internals for tests.
