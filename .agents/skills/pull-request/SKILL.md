---
name: pull-request
description: Conventions for git commits and pull request descriptions in this repo. Use when writing a commit message or opening/updating a pull request.
---

# Commit and pull request conventions

## Commits

- Do not add a `Co-Authored-By` trailer.

## Pull requests

- Open pull requests as drafts.
- Keep the description concise. Use nested bullets: point on top, reason/detail indented.

Structure the body with these sections (headings in Japanese, matching the team):

### 概要

- What the change is and does. Short.

### 設計判断

- Only decisions from discussion with the user. Restatements of requirements or facts belong in 補足 or nowhere.
- Each item is a decision on the top level with its reason nested beneath.

### レビュー観点

- **内部品質** — structure, separation of responsibilities, refactors/cleanups.
- **外部品質** — behaviour guaranteed by tests, and how it was verified.

### 補足

- Anything else (deploy steps, environment notes, caveats). Keep it short.
