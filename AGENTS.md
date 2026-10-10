# Agent playbook

`@johnhenry/obfo` -- HTML forms to nested JavaScript objects and back (`obfo`, `fill`, `observe`, `formFromObject`). Single package, Node >= 26, `node:test` + happy-dom (`npm test`) and Playwright (`npm run test:browser`), ships source (`index.mjs`, `index.d.ts`); no build step. It is browser code with zero runtime dependencies: it must never touch a DOM global, only the elements it is given and their `ownerDocument.defaultView`.

`CLAUDE.md` in this directory is a symlink to this file.

## The verification loop (before every push)

1. `npm test` -- `node --test test/*.test.mjs` (0 failed, 0 skipped), then `tsc -p test/types`, then every `examples/NN-*.mjs`.
2. `npm run test:browser` -- Chromium, Firefox and WebKit. Firefox often can't launch in an agent sandbox ("Could not find profile folder"); then run `--project=chromium --project=webkit` and rely on CI for Firefox. Never claim a Firefox pass from a run that didn't launch it.
3. `npm pack --dry-run` -- read the file list: `index.mjs`, `index.d.ts`, `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json`, nothing else.
4. A genuinely fresh clone: `git clone . /tmp/obfo-verifyN && cd $_ && npm ci && npm test`.
5. Commit, push, close the issue with a comment naming the commit SHA.

CI (`.github/workflows/ci.yml`) calls `johnhenry/workflows`' reusable `ci.yml@v1` with `npm test`, the Playwright suite and `npm pack --dry-run`, plus `workflow-lint`; match it locally.

## Repo-specific gotchas

- **`obfo(form)` with no options must keep reading what 0.0.9 read.** Old consumers pin the unscoped name and will move over; `test/compat.test.mjs` runs the vendored 0.0.9 (`test/fixtures/obfo-0.0.9.mjs`) over a corpus and compares. New behavior goes behind an option or a cast (`cast: "auto"`), and a deliberate difference gets its own test there and a CHANGELOG line.
- **No `instanceof` against DOM classes, no `document`/`Event`/`setTimeout` globals.** 0.0.9's `instanceof HTMLInputElement` read nothing from forms in iframes. Use `localName`, and the element's own `ownerDocument.defaultView` for `Event` and timers (`formFromObject` is the one place a global `document` is a default, and it takes `options.document`).
- **`observe` coalesces in a task, not a microtask.** Browsers run microtasks between a native click's `input` and `change`, and before a reset has reset anything; a microtask version called back twice per checkbox click and only the Playwright suite saw it (happy-dom dispatches synchronously).
- **happy-dom is not a browser.** It has no layout: `innerText` keeps whitespace a browser collapses, events are synchronous, file pickers don't exist. Anything about real events, text or files needs a `test/browser/` case.
- **The README is executable.** `test/readme.test.mjs` runs every JavaScript block that has a `// logs` comment against the HTML block before it; edit the example and its comment together.

## Definition of done

- A regression test exists for any bug fixed, in `test/browser/` too when the bug is about real events, text or files.
- Anything the library does **not** do is stated in the README (Honest limitations, or the section of the function), not only in an issue comment.
- `CHANGELOG.md` has an entry citing the commit/PR; `examples/README.md` lists every example.
- `index.d.ts` matches the runtime (`test/exports.test.mjs` and `npm run typecheck` enforce the names and the types compile).

## Non-goals

- Validation. obfo reports what the form holds; constraint checking is `form.reportValidity()` or the caller's job.
- Creating or removing elements in `fill`, or a styled form builder. `formFromObject` makes a plain starting point.
- Runtime dependencies or a build step.

## Releases

`main` is the release branch. Bump `version` in `package.json` and add the dated `CHANGELOG.md` entry in a PR; merging it publishes through `.github/workflows/publish.yml` (npm trusted publishing, idempotent `npm view` guard), which then creates the `v<version>` tag and GitHub Release. Don't run `gh release create`. Don't rename `publish.yml`: npm trusted publishing is bound to that filename. The first publish of `@johnhenry/obfo` is the owner's (2FA); see johnhenry/ecosystem#1.
