# obfo examples

Runnable, self-verifying examples. Each one asserts the behavior it demonstrates and exits 0 on success. They run in Node against [happy-dom](https://github.com/capricorn86/happy-dom) (a dev dependency); obfo itself only needs the elements, so the same code runs unchanged in a browser.

| Example | Demonstrates |
| --- | --- |
| [`01-a-form-reads-as-a-nested-object.mjs`](./01-a-form-reads-as-a-nested-object.mjs) | `{}` and `[]` containers read as one nested object; labels, headings and a `fieldset`'s `legend` are looked through, and the submit button is ignored unless passed as `options.submit`. |
| [`02-auto-cast-gives-numbers-booleans-and-arrays.mjs`](./02-auto-cast-gives-numbers-booleans-and-arrays.mjs) | `cast: "auto"` reads a number input as a number (an empty one as `null`, not `0`), a checkbox as a boolean, a radio group as its checked value and a multiple select as an array, while an element's own `data-obfo-cast` still wins; without the option every value is the same string obfo 0.0.9 returned. |
| [`03-fill-is-the-inverse-of-obfo.mjs`](./03-fill-is-the-inverse-of-obfo.mjs) | `fill` writes a value that `obfo` reads back unchanged, and a partial value changes only the fields it names. |
| [`04-observe-reports-the-object-as-the-form-is-edited.mjs`](./04-observe-reports-the-object-as-the-form-is-edited.mjs) | `observe` reports the typed object after each edit, makes one call for a checkbox's `input` + `change`, and goes quiet after unsubscribing. |
| [`05-a-form-generated-from-json-reads-back-as-the-same-json.mjs`](./05-a-form-generated-from-json-reads-back-as-the-same-json.mjs) | `formFromObject` builds a form that `obfo` reads back as the same JSON with no options; an HTML-looking string stays text, a multi-line string gets a `textarea`, and a `Date` is refused with its path. |

| Page | Demonstrates |
| --- | --- |
| [`demo.html`](./demo.html) | A larger form (nested containers, hidden inputs, checkboxes, a date, files, three submit buttons) read on submit with the clicked button as `options.submit`, and read live with `observe` and `cast: "auto"`. **Not** part of `npm run examples`: serve the repo root (`node scripts/serve.mjs`) and open `http://localhost:4759/examples/demo.html`. `test/compat.test.mjs` reads its form with both 0.0.9 and the current code and checks they agree. |

## Running

```sh
npm run examples      # run all in sequence
npm run example:01    # run one
node examples/01-a-form-reads-as-a-nested-object.mjs
```

## Runtime requirements (honest edition)

Plain Node >= 26 with happy-dom, no browser needed. happy-dom has no layout, so it can't show what a browser does with `innerText` whitespace, native click events or real file pickers; `test/browser/` (Playwright, Chromium, Firefox and WebKit) covers those.
