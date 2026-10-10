// formFromObject(value) builds a form for a plain JSON value; obfo reads it
// back as the same value with no options, and data never becomes markup.
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import obfo, { formFromObject } from "@johnhenry/obfo";

const { document } = new Window();
const value = {
  title: "Notes",
  count: 3,
  done: false,
  owner: null,
  body: "line one\nline two",
  tags: ["a", "b"],
  meta: { created: "2026-10-10", html: "<img src=x onerror=alert(1)>" },
};

const form = formFromObject(value, { document });
document.body.append(form);
assert.deepEqual(obfo(form), value);
assert.equal(form.querySelectorAll("img").length, 0);
assert.equal(form.querySelector("[name=body]").localName, "textarea");

assert.throws(() => formFromObject({ when: new Date() }, { document }), /when is a Date/);

console.log("05 ok:", form.querySelectorAll("input, textarea").length, "fields");
