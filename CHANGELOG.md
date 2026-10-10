# Changelog

## 0.0.0 — npm scope migration (2026-10-10)

**Provenance:** previously published as [`obfo`](https://www.npmjs.com/package/obfo), last unscoped version 0.0.9 (2024-07-27). `@johnhenry/obfo` restarts at `0.0.0` under the family's convention for adopted packages. npm's 0.0.9 was published from two commits that were never pushed (b126091, 42db921: the declaration widened from `HTMLFormElement` to `HTMLElement`); this release's history includes them. Under npm's caret rules `^0.0.0` matches only `0.0.0`, so pin exactly until a deliberate `0.1.0`.

`obfo(form, options)` reads every form the way 0.0.9 did, apart from the one fix marked below: `test/compat.test.mjs` runs a vendored copy of 0.0.9 side by side with this code over a corpus of forms (the demo page's included). Everything else is additive. All in 29d7ea9 (#2).

### Fixes

- **obfo no longer needs DOM globals, and reads forms in other realms.** 0.0.9 decided what an input is with `element instanceof HTMLInputElement` (and `HTMLTextAreaElement`, `HTMLSelectElement`, `HTMLButtonElement`) against the globals of the window that loaded obfo. A form inside an iframe has its own classes, so every input failed the check and read as nothing; in Node without those globals it threw a `ReferenceError`. Element kinds now come from `localName`, and `observe`/`fill` take `Event` and timers from the element's own window. Fixed in 29d7ea9 (#2); the Playwright suite reads, fills and observes an iframe's form from the parent page.
- **`input type="button"` and `type="reset"` are ignored like every other button.** The README already said buttons are ignored; 0.0.9 skipped `button` elements and `submit`/`image` inputs but read these two inputs' labels into the result. This is the one deliberate difference from 0.0.9 (`test/compat.test.mjs` pins it). Fixed in 29d7ea9 (#2).
- **A field named `__proto__` becomes an own property.** 0.0.9 assigned `parent[name] = value`, so a container named `__proto__` replaced the result object's prototype, and its fields showed up as inherited properties. Keys are now defined with `Object.defineProperty`. This matters for forms you didn't write; see Honest limitations in the README. Fixed in 29d7ea9 (#2).

### Added

- **`cast` option and `data-obfo-cast="auto"`: typed values.** Numbers for `number`/`range` (empty is `null`), booleans for checkboxes, a radio group as its checked value, multiple selects as arrays, dates as strings, files as `File[]`. Opt-in, so default reads are unchanged.
- **`container` option:** the container for a root element without `data-obfo-container`, so a plain `<form>` reads as an object instead of `null`.
- **`fill(element, value, options)`:** writes an object into a form, the inverse of `obfo`; partial values change only what they name; `dispatch: true` fires `input`/`change` on changed fields.
- **`observe(element, callback, options)`:** calls back with the form's object on `input`, `change` and `reset`, a task later so one edit makes one call (`debounce`, `immediate`, `signal`, `onError`); returns an unsubscribe function. A first version coalesced in a microtask; the Playwright suite showed browsers run microtasks between a click's `input` and `change`, so a checkbox click called back twice. The happy-dom regression test reproduces the sequence.
- **`formFromObject(value, options)`:** a simple form for a plain JSON value that `obfo` reads back as the same value, with no options; data is set as attributes and text, never parsed as HTML.
- **Named exports** `obfo` and `defaultParse` alongside the default export, and module types for all of them in `index.d.ts` (it replaces the ambient `declare module "obfo"`, which the scoped name no longer matches).

### Tests

0.0.9 had none (`npm test` printed "no test specified"). Now: 99 `node:test` tests under happy-dom (including every README example, checked against its `// logs` comment, and the 0.0.9 compatibility corpus), a `tsc` type-consumer check, five self-verifying examples, and a Playwright suite in Chromium, Firefox and WebKit.

### Housekeeping

- `exports`, `type: "module"`, a `files` allowlist (0.0.9 shipped the 100 KB logo and the demo page), `engines.node >=26.0.0` with `.nvmrc`, an ISC `LICENSE` file (the license `package.json` always declared), `homepage` on opensource.johnhenry.me.
- CI and publishing from `johnhenry/workflows` (push to `main` publishes with provenance when the version is new).

## 0.0.9 (2024-07-27) and earlier

Published as the unscoped `obfo`, without a changelog. Reconstructed from git and the registry:

- **0.0.9** (2024-07-27): the declaration accepts any `HTMLElement` (b126091).
- **0.0.8** (2024-07-24): the declaration takes a result type argument (cd38813).
- **0.0.6, 0.0.7** (2024-07-24): first type declaration (b68594f, fbe534f); demo update (6e951ad).
- **0.0.5** (2024-06-19): the input check runs at call time, so importing obfo in Node no longer throws (ffa6e03).
- **0.0.3, 0.0.4** (2024-06-11): attributes simplified to `data-obfo-container` and `data-obfo-name`; `data-obfo-value` reads text from non-inputs (53c1ce4, 1116c10).
- **0.0.2** (2024-06-10): buttons and `submit`/`image` inputs are skipped unless passed as `options.submit` (38314ec).
- **0.0.0, 0.0.1** (2024-06-09): first release (9bb39b1, 151d970).
