---
name: pull-request
description: Conventions for git commits and pull request descriptions in this repo. Use when writing a commit message or opening/updating a pull request.
---

# Commit and pull request conventions

## Commits
- Do not add a `Co-Authored-By` trailer.

## Pull requests
- Open pull requests as drafts.
- Keep the description concise. Use nested bullets: the point on the top level, its reason/detail indented beneath.

Structure the body with these sections (headings in Japanese, matching the team):

### 概要
- What the change is and does. Short.

### 設計判断
- Only decisions that came out of discussion with the user — things asked via a question, or points the user raised.
- Do NOT include restatements of the original requirements, or plain facts/procedures. Those belong in 補足 or nowhere.
- Each item is a decision on the top level with its reason nested beneath.

### レビュー観点
- **内部品質** — structure, separation of responsibilities, refactors/cleanups.
- **外部品質** — behaviour guaranteed by tests, and how it was verified.

### 補足
- Anything else (deploy steps, environment notes, caveats). Keep it short.
