# Code Review Checklist

Use this checklist when reviewing code. Mark each item as pass/fail and note any violations.

## TypeScript

- [ ] Explicit type annotation on every property, variable, parameter, and return type - includes primitives, objects, `inject()`, signal functions (`InputSignal`, `OutputEmitterRef`, `WritableSignal`, `Signal`, `ModelSignal`), and all local `const`/`let` declarations
- [ ] Access modifiers (`public`, `private`) on every member - `protected` is NOT allowed
- [ ] No `any` - proper interfaces or `unknown` used instead
- [ ] Utility types (`Partial`, `Pick`, `Omit`, `Record`) used in interfaces where appropriate

## Angular Patterns

- [ ] Standalone components only - no NgModules
- [ ] No `standalone: true` in decorators (default since v19+)
- [ ] `ChangeDetectionStrategy.OnPush` set in `@Component`
- [ ] No `@HostBinding` / `@HostListener` - `host` object used instead
- [ ] No `ngClass` / `ngStyle` - `class` and `style` bindings used instead
- [ ] `NgOptimizedImage` used for static images

## Signals & State

- [ ] `input()`, `output()`, `model()` used instead of `@Input` / `@Output` decorators
- [ ] `computed()` for derived state
- [ ] `linkedSignal()` for dependent reactive state
- [ ] No `mutate` on signals - `update` or `set` used instead
- [ ] No NgRx usage

## Templates

- [ ] Native control flow (`@if`, `@for`, `@switch`) - no `*ngIf` / `*ngFor` / `*ngSwitch`
- [ ] `@let` used for template-local variables
- [ ] No arrow functions in templates
- [ ] `async` pipe used for observables
- [ ] Template logic kept simple

## Services

- [ ] `inject()` used instead of constructor injection
- [ ] `providedIn: 'root'` for singletons
- [ ] Business logic lives in services, not components

## RxJS

- [ ] No nested subscriptions - operators like `switchMap` used instead
- [ ] Unsubscription handled (`takeUntilDestroyed()` preferred)
- [ ] `BehaviorSubject` / `ReplaySubject` preferred over `Subject` when current value is needed

## Forms

- [ ] Signal Forms preferred (`form()` + `[formField]`)
- [ ] Custom validators in a shared file
- [ ] Validation messages displayed near fields

## API Communication

- [ ] `catchError` with user-friendly messages
- [ ] Interceptors for authorization, errors, default limit

## Security

- [ ] No `[innerHTML]` without `DomSanitizer`
- [ ] Frontend validation present
- [ ] Guards match role-based permissions

## Styles

- [ ] BEM methodology
- [ ] No `!important` or `::ng-deep`
- [ ] `@use`, `@mixin`, `@include` used
- [ ] Colors in `colors.scss`
- [ ] Scoped styles

## Translation

- [ ] `translate` pipe or `translate.instant()` with keys
- [ ] New keys checked against shared groups

## Signal Naming

- [ ] Private signals - no `Signal` postfix
- [ ] Public signals - `Signal` postfix present

## Class Member Ordering

- [ ] **Imports**: Angular -> third-party -> project -> other -> local enums/types
- [ ] **Signal I/O**: `input()`, `output()`, `model()` first in class body
- [ ] **Injected deps**: `inject()` calls next
- [ ] **Properties**: public -> private, with `readonly` / `signal()` grouped by access modifier
- [ ] **Lifecycle**: `constructor()` -> `ngOnInit()` (with `effect()`) -> other hooks -> `ngOnDestroy()`
- [ ] **Methods**: getters/setters -> public -> template-accessible -> private helpers
