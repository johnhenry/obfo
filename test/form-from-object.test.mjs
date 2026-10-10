import { test } from "node:test";
import assert from "node:assert/strict";
import obfo, { fill, formFromObject } from "@johnhenry/obfo";
import { dom } from "./dom.mjs";

const samples = [
  {},
  [],
  { a: "text" },
  { title: "Notes", count: 3, done: false, tags: ["a", "b"], owner: null },
  { nested: { deeper: { deepest: [1, [2, [3]], { x: true }] } } },
  [1, "two", true, null, [], {}, [[]]],
  { empty: "", zero: 0, negative: -1.5, big: 1e21, small: 5e-7, max: Number.MAX_SAFE_INTEGER },
  { multiline: "line one\nline two\n", spaces: "  padded  ", unicode: "héllo ✓ 日本" },
  { "": "empty key", "with space": 1, "a.b": 2, "quote\"key": 3 },
  JSON.parse('{"__proto__": {"isAdmin": true}, "constructor": "c"}'),
  { html: "<img src=x onerror=alert(1)>", amp: "a & b < c" },
];

for (const [index, value] of samples.entries()) {
  test(`obfo(formFromObject(value)) deep-equals value, with and without cast: "auto" (sample ${index})`, () => {
    const { document } = dom();
    const form = formFromObject(value, { document });
    assert.equal(form.localName, "form");
    document.body.append(form);
    assert.deepEqual(obfo(form), value);
    assert.deepEqual(obfo(form, { cast: "auto" }), value);
    assert.equal(JSON.stringify(obfo(form)), JSON.stringify(value));
  });
}

test("the generated structure: fieldsets with legends, labelled inputs, casts", () => {
  const { document } = dom();
  const form = formFromObject({ s: "x", n: 1, b: true, z: null, o: { k: "v" }, l: ["i"] }, { document });
  assert.equal(form.getAttribute("data-obfo-container"), "{}");
  const input = (name) => form.querySelector(`[data-obfo-name="${name}"]`);
  assert.equal(input("s").type, "text");
  assert.equal(input("s").closest("label").querySelector("span").textContent, "s");
  assert.equal(input("n").type, "number");
  assert.equal(input("n").getAttribute("step"), "any");
  assert.equal(input("n").getAttribute("data-obfo-cast"), "number");
  assert.equal(input("b").type, "checkbox");
  assert.equal(input("b").checked, true);
  assert.equal(input("z").type, "hidden");
  assert.equal(input("o").localName, "fieldset");
  assert.equal(input("o").querySelector("legend").textContent, "o");
  assert.equal(input("l").getAttribute("data-obfo-container"), "[]");
  assert.equal(input("l").querySelector("span").textContent, "[0]");
  assert.equal(form.querySelector("button"), null);
});

test("strings with line breaks become textareas", () => {
  const { document } = dom();
  const form = formFromObject({ a: "one\ntwo" }, { document });
  assert.equal(form.querySelector("[name=a]").localName, "textarea");
});

test("values are text, never HTML", () => {
  const { document } = dom();
  const form = formFromObject({ "<b>key</b>": "<img src=x onerror=alert(1)>", list: ["<script>alert(1)</script>"] }, { document });
  assert.equal(form.querySelectorAll("img, script, b").length, 0);
});

test("undefined keys are dropped and undefined array items become null, as JSON.stringify does", () => {
  const { document } = dom();
  const value = { a: undefined, b: [undefined, 1] };
  const form = formFromObject(value, { document });
  assert.deepEqual(obfo(form), JSON.parse(JSON.stringify(value)));
});

test("non-JSON values throw a TypeError naming the path", () => {
  const { document } = dom();
  const bad = [
    [{ when: new Date() }, /when is a Date/],
    [{ a: { b: [1, Number.NaN] } }, /a\.b\[1\] is NaN/],
    [{ inf: Infinity }, /inf is Infinity/],
    [{ m: new Map() }, /m is a Map/],
    [{ f() {} }, /f is a function/],
    [{ big: 1n }, /big is a bigint/],
    [{ s: Symbol("s") }, /s is a symbol/],
  ];
  for (const [value, message] of bad) {
    assert.throws(() => formFromObject(value, { document }), (error) => error instanceof TypeError && message.test(error.message));
  }
});

test("the root must be a plain object or an array, and a document must exist", () => {
  const { document } = dom();
  for (const root of ["text", 1, null, undefined, new Date(), new (class Thing {})()]) {
    assert.throws(() => formFromObject(root, { document }), /plain object or an array/);
  }
  assert.ok(formFromObject(Object.create(null), { document }));
  assert.equal(globalThis.document, undefined);
  assert.throws(() => formFromObject({}), /needs a document/);
});

test("a generated form can be filled with a value of the same shape", () => {
  const { document } = dom();
  const form = formFromObject({ title: "", count: 0, done: false, tags: ["", ""], owner: null }, { document });
  const next = { title: "Next", count: 9, done: true, tags: ["x", "y"], owner: null };
  fill(form, next);
  assert.deepEqual(obfo(form), next);
});
