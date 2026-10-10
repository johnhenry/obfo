// Backward compatibility: without the new options, the current obfo reads
// every form in this corpus exactly as obfo 0.0.9 did.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import obfo from "@johnhenry/obfo";
import legacy from "./fixtures/obfo-0.0.9.mjs";
import { dom } from "./dom.mjs";

// 0.0.9 needs these as globals; the current code doesn't.
const withLegacyGlobals = (window, fn) => {
  const names = ["HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement", "HTMLButtonElement"];
  for (const name of names) globalThis[name] = window[name];
  try {
    return fn();
  } finally {
    for (const name of names) delete globalThis[name];
  }
};

const demo = (await readFile(new URL("../examples/demo.html", import.meta.url), "utf8")).match(/<form[\s\S]*<\/form>/)[0];

const corpus = {
  demo,
  "object container": `<form data-obfo-container="{}"><input name="first" value="Jon"><input name="last" value="Doe"></form>`,
  "array container": `<form data-obfo-container="[]"><input name="first" value="Jon"><input value="Doe"></form>`,
  "no container": `<form><input name="a" value="1"></form>`,
  "nested and transparent": `<form data-obfo-container="{}">
    <label>A <input name="a" value="1"></label>
    <fieldset data-obfo-container="{}" data-obfo-name="f"><legend>x</legend><div><input name="b" value="2"></div></fieldset>
    <div data-obfo-container="[]" data-obfo-name="l"><div><input value="3"></div><div data-obfo-container="[]"><input value="4"></div></div>
    <div data-obfo-container="?" data-obfo-name="odd"><input value="x"></div>
  </form>`,
  "every cast": `<form data-obfo-container="{}">
    <input name="s" value="20" data-obfo-cast="string">
    <input name="n" value="20" data-obfo-cast="number">
    <input name="e" value="" data-obfo-cast="number">
    <input name="big" value="12" data-obfo-cast="bigint">
    <input name="d" value="2000-01-01" data-obfo-cast="date">
    <input name="nul" data-obfo-cast="null">
    <input name="und" data-obfo-cast="undefined">
    <input name="cb" type="checkbox" checked data-obfo-cast="checkbox">
    <input name="rd" type="radio" data-obfo-cast="radio">
    <input name="t" value="x" data-obfo-cast="checkbox">
    <input name="ty" type="number" value="3" data-obfo-cast>
    <input name="td" type="date" value="2000-01-01" data-obfo-cast>
    <input name="f1" type="file" data-obfo-cast="file">
    <input name="other" value="x" data-obfo-cast="whatever">
  </form>`,
  "uncast inputs": `<form data-obfo-container="{}">
    <input name="cb" type="checkbox"><input name="r" type="radio" value="a" checked><input name="r" type="radio" value="b">
    <select name="m" multiple><option>x</option><option selected>y</option></select>
    <select name="s"><option>x</option><option selected>y</option></select>
    <textarea name="t">text</textarea><input name="h" type="hidden" value="h">
    <input name="n" type="number" value="5"><input name="dup" value="1"><input name="dup" value="2">
  </form>`,
  "buttons": `<form data-obfo-container="{}"><input name="a" value="1"><button name="b" value="x">B</button><input type="submit" name="s" value="S"><input type="image" name="i" alt=""></form>`,
  "text values": `<form data-obfo-container="{}"><p data-obfo-value data-obfo-name="p">Para <i>graph</i></p><span data-obfo-value data-obfo-name="n" data-obfo-cast="number">7</span></form>`,
};

for (const [name, markup] of Object.entries(corpus)) {
  test(`reads like 0.0.9: ${name}`, () => {
    const { window, root } = dom(markup);
    const expected = withLegacyGlobals(window, () => legacy(root));
    assert.deepEqual(obfo(root), expected);
  });
}

test("reads like 0.0.9: an input read directly, and the submitter option", () => {
  const { window, document, root } = dom(corpus.buttons);
  for (const element of [document.querySelector("[name=a]"), document.querySelector("button")]) {
    assert.deepEqual(obfo(element), withLegacyGlobals(window, () => legacy(element)));
  }
  for (const submit of [document.querySelector("button"), document.querySelector("[type=submit]"), false]) {
    assert.deepEqual(obfo(root, { submit }), withLegacyGlobals(window, () => legacy(root, { submit })));
  }
});

test("reads like 0.0.9: a missing name throws the same message prefix", () => {
  const { window, root } = dom(`<form data-obfo-container="{}"><input value="x"></form>`);
  assert.throws(() => withLegacyGlobals(window, () => legacy(root)), /^Error: data-obfo-name is required for nested objects$/);
  assert.throws(() => obfo(root), /^Error: data-obfo-name is required for nested objects \(/);
});

test("the one deliberate difference: input type=button and type=reset are skipped like other buttons", () => {
  const { window, root } = dom(`<form data-obfo-container="{}"><input name="a" value="1"><input type="button" name="b" value="B"><input type="reset" name="r" value="R"></form>`);
  assert.deepEqual(withLegacyGlobals(window, () => legacy(root)), { a: "1", b: "B", r: "R" });
  assert.deepEqual(obfo(root), { a: "1" });
});
