# Agent Note: Runtime Boundary Quality Gates

Status: implemented

## Problem

Production code had several runtime-boundary shortcuts: native `fetch` with generic JSON assertions, local-storage casts, request-header casts, error-code property probing, and temporary IPC introspection using `any` and `@ts-ignore`. These shortcuts hid malformed external data and made it difficult to prevent additional violations while legacy code was removed incrementally.

## Decision

- Add `src/shared/http/axios-json-client.ts` as a small cross-feature Axios boundary. Each caller creates and owns its Axios instance; its explicit JSON, raw, and stream methods treat response data as `unknown`, validate JSON with Zod or streams with a caller-provided guard, and raise a safe `HttpError` for transport, timeout, status, or validation failures.
- Migrate manual update discovery to that boundary. Its GitHub, updater, package, and redirect contracts now have Zod schemas; the redirect is explicitly handled as a 3xx response.
- Migrate Google OAuth, profile, project-context, credit, and quota requests from native `fetch` to a module-owned Axios request boundary. Existing Zod response parsing and status-specific behavior remain in the service. Account and configured HTTP(S) proxies become explicit Axios proxy options; HTTP(S) environment variables and `NO_PROXY` are delegated to Axios' Node adapter, while the Electron proxy fallback is converted to an explicit Axios proxy option.
- Migrate the development-only Vite readiness probe in the Electron entry point to Axios. It preserves the original retry-on-network-or-non-2xx behavior and still loads the development URL after retry exhaustion; raw IPC packet logging now accepts `unknown` rather than an unchecked `any`.
- Reuse the existing `TrayTexts` contract for tray-menu translations instead of treating a same-process typed value as `any`.
- Tighten cloud-account repository update inputs to `CloudTokenData` and `CloudQuotaData`, while retaining Zod parsing before encrypted persistence.
- Keep the preload bridge minimal and use Electron's `IpcRendererEvent` type for internal IPC listeners instead of exposing or propagating `any`.
- Parse persisted Antigravity executable configuration with Zod before path resolution. The schema matches the persisted nullable executable contract and normalizes `null` as not configured; an invalid higher-priority document is ignored so the compatible configuration location can still provide a valid fallback; control-flow narrowing replaces local executable-path assertions.
- Validate the proxy file-store index and every persisted record with Zod. Truncated, unsupported-version, or malformed records now follow the existing safe-start semantics: an invalid document yields an empty store, while invalid entries do not hide valid handles in a current-version index.
- Parse upstream Google error bodies through a Zod envelope before classifying rate limits. Known detail fields use independent recoverable Zod narrowing, so a malformed sibling cannot erase a valid reason; malformed detail entries are skipped, and passthrough preserves unknown structured retry hints for the existing bounded scanner.
- Validate OpenAI batch JSONL records and body containers with Zod before extracting protocol fields. Batch metadata uses a string-record schema, while request bodies remain explicitly opaque after their object boundary is established.
- Validate Gemini multipart metadata with Zod while preserving raw nullish-selection compatibility: an absent or `null` nested `file` may use a top-level display name, but a present malformed non-null `file` yields no metadata name so the controller uses the multipart filename; likewise, a malformed preferred display-name alias cannot fall through to its secondary alias. Error response status extraction now uses a shared `Error`-instance guard, so plain external objects cannot manufacture an HTTP status.
- Make persisted app settings schema-driven at read time, and use the shared theme schema for local storage.
- Validate account-index and installed package manifests with local Zod schemas before returning typed data. A syntactically valid but structurally invalid account index is rejected and left untouched; an invalid version manifest retains the existing fallback-to-null behavior.
- Make typed cloud-account settings reads require a caller-provided Zod schema. Invalid persisted values retain the existing default-value fallback, while the strict raw read API remains available only for callers that immediately validate their own complete document.
- Validate identity-profile baselines and last-known-good markers before recovery logic reads their fields. Invalid markers remain unusable, and invalid global baselines retain the existing warning-and-null fallback.
- Replace ad-hoc error-code casts with `instanceof Error`-based guards. Replace synthetic request-header records with Node's `IncomingHttpHeaders` and remove root IPC debugging suppression. `Record<never, never>` remains valid for oRPC's empty context, but now has the `EmptyIpcContext` name. The root IPC error envelope is closed: it retains validated `AppError` data and Zod-validated local-import error data, but drops arbitrary upstream `ORPCError.data` keys.
- Add `verify:type-boundaries` with a checked-in historical baseline. It blocks new production `any`, double assertions, native `fetch`, unvalidated direct JSON casts, and `@ts-ignore`; tests, mocks, and generated sources are excluded. A third-party adapter exemption must declare owner, issue, expiry, and reason.
- Add React Doctor as a pull-request changed-lines blocker. Telemetry, score sharing, and supply-chain analysis are disabled. React Scan is a Vite-injected entry only when `ANTIGRAVITY_ENABLE_REACT_SCAN=1` is set for a development session; it is neither bundled nor placed in CI.

## Alternatives considered

- A global Axios instance with interceptors was rejected because main-process and proxy callers require different adapters, credentials, and failure semantics.
- A blanket ban on `unknown`, `never`, and all assertions was rejected because runtime boundaries and empty protocol contexts need them. The policy requires immediate narrowing or an explicit exemption instead.
- Replacing Google API transport without preserving its proxy source order, cancellation behavior, status handling, and OAuth retry semantics was rejected.
- A full React component-style rewrite was rejected. React Doctor first enforces measurable changed-line findings; component composition standards need a separate design change.

## Consequences

New external JSON call sites must provide a Zod schema before domain code reads the payload. Typed cloud-account settings reads must pass their schema to the persistence boundary; raw reads must be parsed immediately by their owner. New native fetches and unsafe escape hatches fail the type-boundary gate unless they are legacy-baselined or use a time-bounded, owned exemption. Existing baseline entries may be removed as code is remediated; adding new entries requires an intentional baseline update review. New feature-specific IPC error data must be explicitly modeled and validated before the root error middleware can expose it to the renderer.

React Doctor's workflow needs pull-request, issue, and status write permissions to report changed-line findings. It is configured with no telemetry and no supply-chain network analysis; the action download itself remains a necessary CI dependency.

React Scan is a development dependency and its current package performs a version check when explicitly enabled. It must not be enabled where that development-only outbound request is prohibited.

## Verification

- Focused Vitest coverage validates Axios status/schema handling, Google OAuth retry/cancellation/proxy behavior, error guards, theme parsing, update payload schemas, invalid persisted account/version JSON handling, cloud setting fallback on schema failures, and invalid identity-profile baseline handling.
- The type-boundary script has Node test coverage for baseline enforcement and controlled exemptions.
- Type checking, proxy-guard tests, governance checks, formatting, and a manual React Doctor baseline scan are recorded with this change after implementation.
