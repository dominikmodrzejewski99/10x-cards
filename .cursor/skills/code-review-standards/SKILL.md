---
name: code-review-standards
description: Review Angular/TypeScript code for compliance with project coding standards. Use when the user asks for a code review, wants to check code quality, or needs to validate files against coding conventions.
---

# Code Review Against Coding Standards

Review code for compliance with the project coding standards defined in `.cursor/rules/coding-standards.mdc`.

## Instructions

1. Read the changed files (from a PR, diff, or files the user provides).
2. Read `.cursor/rules/coding-standards.mdc` for the authoritative rule set.
3. Walk through each section of the [review checklist](CHECKLIST.md).
4. Report findings using severity levels:
   - **CRITICAL** - must fix; violates a hard rule
   - **WARNING** - should fix; deviates from a recommended pattern
   - **INFO** - optional improvement or stylistic suggestion

## Output Format

```
## Code Review Summary

### file-path.ts

**CRITICAL**: [description of the violation and which rule it breaks]
**WARNING**: [description and rule reference]
**INFO**: [suggestion]

### another-file.ts
...

## Stats
- Critical: N
- Warnings: N
- Info: N
```

## Severity Guidelines

| Severity | Examples |
|----------|----------|
| CRITICAL | Missing type annotations, `any` usage, `protected` access modifier, NgModules, `@Input`/`@Output` decorators, missing `OnPush`, nested subscriptions, `ngClass`/`ngStyle` |
| WARNING | Missing `Signal` postfix on public signal, class member ordering violation, business logic in component instead of service, missing `takeUntilDestroyed()` |
| INFO | Could use `computed()` instead of manual derivation, consider `httpResource()`, template could be simplified |

## Additional Resources

- For the full review checklist, see [CHECKLIST.md](CHECKLIST.md)
