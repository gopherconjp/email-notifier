---
paths:
  - "src/**/*.ts"
---

# Source file conventions

(Test files have their own additional rules; see `tests.md`.)

## Order within a file
- Module-level constants (limits, lookup tables) go at the top, **before** type definitions — the values that constrain behaviour should be visible first.
- Put the main entry/logic near the top and supporting helpers below it; rely on function hoisting for forward references.

## Comments
- Don't restate behaviour that tests already pin down. Keep only comments that carry non-obvious rationale a reader couldn't infer from the code.

## Contracts & defensive code
- For a precondition that cannot legitimately be violated, assert it as an explicit contract (throw) rather than silently coercing a bad value into a plausible one.
- Don't guard cases that cannot occur given the runtime (e.g. a field the platform guarantees is present). Keep only guards the types require, or that defend genuinely malformable input — secrets, external HTTP responses, and fields a parser types as optional.

## API surface
- Give exported functions concrete return types; avoid `unknown` on a public boundary.
- Export only what production consumers use. Do not add an export solely for tests.
- Keep runtime dependencies minimal.
