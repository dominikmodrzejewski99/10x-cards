You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices
- Use strict type checking
- Always add explicit type annotations on every property, variable, parameter, and return type — even when the type is obvious (`@typescript-eslint/typedef`). Examples:
  - Properties: `public name: string = 'default';`
  - Variables: `const count: number = 0;`
  - Parameters: `(event: MouseEvent) => ...`
  - Function return types: `public getData(): Observable<User[]> { ... }`
  - `inject()`: `private readonly router: Router = inject(Router);`
  - `input()` / `input.required()`: `public user: InputSignal<UserData> = input.required<UserData>();`
  - `output()`: `public selected: OutputEmitterRef<UserData> = output<UserData>();`
  - `signal()`: `public loadingSignal: WritableSignal<boolean> = signal<boolean>(false);`
  - `computed()`: `public readonly fullNameSignal: Signal<string> = computed<string>(() => ...);`
  - `model()`: `public valueSignal: ModelSignal<string> = model<string>('');`
- Always add access modifiers (`public`, `private`) — do NOT use `protected`
- Avoid the `any` type; define a proper interface or use `unknown` when the type is uncertain
- Use utility types (`Partial`, `Pick`, `Omit`, `Record`, etc.) in interfaces

## Angular Best Practices

- Always use standalone components — do NOT use NgModules
- Do NOT set `standalone: true` inside Angular decorators; it is the default since Angular v19+
- Use signals for state management
- Implement lazy loading for feature routes using `loadComponent()`
- Do NOT use `@HostBinding` and `@HostListener` decorators; use the `host` object in `@Component` or `@Directive` instead
- Use `NgOptimizedImage` for all static images (`NgOptimizedImage` does not work for inline base64 images)
- Use `ngSrc` instead of `src` on `<img>` elements when using `NgOptimizedImage`
- This project is zoneless — zone.js is NOT included in the production build (`"polyfills": []`)
- zone.js is ONLY added in the `angular.json` → `test` section polyfills because Karma/Jasmine TestBed requires it
- Do NOT add zone.js to the build polyfills
- Use Angular signals for reactivity, not zone-based change detection
- Use `resource()` or `httpResource()` for reactive async data fetching with signals (experimental)

## Accessibility Requirements

- Must pass all AXE checks
- Must follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes
- Consider Angular Aria (developer preview) for accessible headless components

### Components

- Keep components small and focused on a single responsibility
- Use `input()`, `output()`, and `model()` signal functions instead of decorators
- Use `computed()` for derived state
- Use `linkedSignal()` for dependent reactive state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in the `@Component` decorator
- Use separate `.html` and `.scss` files for components — always use SCSS, never plain CSS
- Do NOT use `ngClass`; use `class` bindings instead
- Do NOT use `ngStyle`; use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Use `linkedSignal()` when state depends on other signals
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals; use `update` or `set` instead
- Use `@ngrx/signals` (Signal Store) for shared state management — old `@ngrx/store`, `@ngrx/effects` have been removed
- Prefer moving business logic into shared services

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use `@let` for template-local variables
- Regular expressions are supported in templates (e.g., `@let isValid = /\d+/.test(value)`)
- Use the `async` pipe to handle observables
- Do not use arrow functions in templates (they are not supported)

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
- Keep business logic in services, not in components

## RxJS and Subscriptions

- Do not use nested subscriptions; use RxJS operators like `switchMap`
- Always handle unsubscription — use `takeUntilDestroyed()` when possible, or unsubscribe manually
- Prefer `BehaviorSubject` / `ReplaySubject` over `Subject` when you need the current value
- Use RxJS operators (`map`, `switchMap`, `tap`) when `subscribe` is not necessary

## Routing

- Use the global `@app-routes.ts` file
- Use route guards (`AuthGuard`, `PermissionGuard`)

## Forms
- Prefer Signal Forms over Reactive Forms (experimental in Angular v21, uses `form()` and `[formField]` directive)
- Use custom validators and separate them into a shared file
- Display validation messages near form fields

## Communication with API

- Use `httpResource()` for reactive data fetching where applicable (experimental)
- Use `catchError` and return user-friendly error messages
- Use interceptors to globally handle authorization, errors, and the default limit (`9999`)

## Security

- Do not use `[innerHTML]` without `DomSanitizer`
- Validate user data on the frontend side as well
- Use guards adjusted to role-based permissions

## Unit Testing
- Tests are written using Jest (via `jest-preset-angular` in Nx)
- Angular v21 defaults to Vitest for new projects — consider migrating in the future

## Styles

- Use BEM methodology
- Avoid global styles
- Do not use `!important` or `::ng-deep`
- Use `@use`, `@mixin`, `@include`
- Add colors to `colors.scss`; use shared styles for typography
- Prefer scoped styles

## External Libraries

- Update carefully and perform regression testing
- Add libraries only after team approval

## Translation

- Always use the `translate` pipe or `translate.instant()` method with a translation key
- When adding new translation keys, check whether they already exist in a shared group

## Signal Naming Convention
- Private signals do not have the `Signal` postfix
- Public signals must have the `Signal` postfix, e.g., `public readonly itemsSignal: WritableSignal<PageHeaderAction[]> = signal([]);`

## Class Member Ordering

Members inside a class must follow this order:

### 1. Imports (at file top)
1. Angular libraries (`@angular/core`, `@angular/common`, etc.)
2. Third-party libraries (RxJS, Angular Material, etc.)
3. Project modules, services, and components (relative paths)
4. Other items (if any)
5. Local enums and types

### 2. Signal inputs and outputs
- `input()`, `output()`, `model()`
- Input signals, output signals

### 3. Injected dependencies
- `inject()` calls

### 4. Class properties
- **Public** variables
- **Private** variables
- `readonly` members are grouped within their access modifier
- `signal()` members are grouped within their access modifier; `computed()` is placed where it is logically used
- Subscriptions (e.g., `subs = new Subscription()`)
- `FormGroup` and form controls (if applicable)
- `ViewChild` / `ViewChildren`

### 5. Constructor and Angular lifecycle hooks
1. `constructor()`
2. `ngOnInit()` — place `effect()` calls here
3. `ngAfterViewInit()`, `ngOnChanges()`, etc.
4. `ngOnDestroy()`

### 6. Methods
1. Getters / Setters
2. Public methods (component API)
3. Template-accessible methods
4. Private helper methods (internal logic)
