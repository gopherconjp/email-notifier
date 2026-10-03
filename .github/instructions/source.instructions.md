---
name: source
description: "Use when writing or editing production TypeScript in src. Covers file order, comments, contracts, and API surface."
applyTo: "src/**/*.ts"
---

# Source file conventions

(Test files have their own additional rules; see `tests.instructions.md`.)

## Order within a file

- Module-level constants (limits, lookup tables) first, before type definitions.
- Main logic near the top, helpers below; rely on hoisting for forward references.

## Comments

- Keep only comments with non-obvious rationale; don't restate tested behaviour.

## Contracts & defensive code

- Assert violated preconditions explicitly (throw); don't silently coerce bad values.
- Don't guard runtime-impossible cases (e.g. platform-guaranteed fields). Keep only type-required guards or genuinely malformable input — secrets, external HTTP responses, parser-optional fields.

## API surface

- Give exports concrete return types; no `unknown` on public boundaries.
- Export only production-used symbols; no test-only exports.
- Keep runtime dependencies minimal.
