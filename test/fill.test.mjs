import { test } from "node:test";
import assert from "node:assert/strict";
import obfo, { fill } from "@johnhenry/obfo";
import { dom } from "./dom.mjs";

const blank = `<form data-obfo-container="{}">
  <input name="name">
  <input name="age" type="number">
  <input name="volume" type="range" min="0" max="100">
  <input name="admin" type="checkbox">
  <input name="size" type="radio" value="s">
  <input name="size" type="radio" value="m">
  <select name="tags" multiple><option>js</option><option>css</option><option>html</option></select>
  <select name="one"><option>x</option><option>y</option></select>
  <input name="born" type="date">
  <textarea name="bio"></textarea>
  <p data-obfo-value data-obfo-name="note"></p>
  <fieldset data-obfo-container="{}" data-obfo-name="address">
    <label>Street <input name="street"></label>
    <label>City <input name="city"></label>
  </fieldset>
  <div data-obfo-container="[]" data-obfo-name="list">
    <div><input></div><div><input></div><div><input></div>
  </div>
  <div data-obfo-container="[]" data-obfo-name="matrix">
    <div data-obfo-container="[]"><input><input></div>
    <div data-obfo-container="{}"><input name="k"></div>
  </div>
</form>`;

const full = {
  name: "Ada",
  age: 36,
  volume: 70,
  admin: true,
  size: "m",
  tags: ["js", "html"],
  one: "y",
  born: "1815-12-10",
  bio: "line one\nline two",
  note: "a note",
  address: { street: "1 Analytical Way", city: "London" },
  list: ["a", "b", "c"],
  matrix: [["1", "2"], { k: "v" }],
};

test('fill then obfo round-trips a value under cast: "auto"', () => {
  const { root } = dom(blank);
  const returned = fill(root, full, { cast: "auto" });
  assert.equal(returned, root);
  assert.deepEqual(obfo(root, { cast: "auto" }), full);
});

test("obfo then fill into a blank copy reproduces the form", () => {
  const { root: source } = dom(blank);
  fill(source, full, { cast: "auto" });
  const value = obfo(source, { cast: "auto" });
  const { root: target } = dom(blank);
  fill(target, value, { cast: "auto" });
  assert.deepEqual(obfo(target, { cast: "auto" }), value);
});

test("fill writes only what is present", () => {
  const { root } = dom(blank);
  fill(root, full, { cast: "auto" });
  fill(root, { age: 37, address: { city: "Paris" }, list: ["z"] }, { cast: "auto" });
  assert.deepEqual(obfo(root, { cast: "auto" }), {
    ...full,
    age: 37,
    address: { street: "1 Analytical Way", city: "Paris" },
    list: ["z", "b", "c"],
  });
});

test("fill never creates elements: extra array items are ignored", () => {
  const { root } = dom(`<form data-obfo-container="[]"><input><input></form>`);
  fill(root, ["a", "b", "c", "d"]);
  assert.deepEqual(obfo(root), ["a", "b"]);
});

test("only own properties are written: a field named constructor is not filled from Object.prototype", () => {
  const { document, root } = dom(`<form data-obfo-container="{}"><input name="constructor" value="keep"><input name="toString" value="keep"></form>`);
  fill(root, {});
  assert.equal(document.querySelector("[name=constructor]").value, "keep");
  assert.equal(document.querySelector("[name=toString]").value, "keep");
  fill(root, JSON.parse('{"__proto__": "own", "constructor": "set"}'));
  assert.equal(document.querySelector("[name=constructor]").value, "set");
});

test("null and undefined clear text inputs; values are stringified", () => {
  const { root } = dom(`<form data-obfo-container="{}"><input name="a" value="x"><input name="b" value="y"><input name="c"></form>`);
  fill(root, { a: null, b: undefined, c: 42 });
  assert.deepEqual(obfo(root), { a: "", b: "", c: "42" });
});

test("with the default (string) cast, checkboxes and radios are left alone", () => {
  const { document, root } = dom(`<form data-obfo-container="{}"><input name="cb" type="checkbox"><input name="r" type="radio" value="a"></form>`);
  fill(root, { cb: true, r: "a" });
  assert.equal(document.querySelector("[name=cb]").checked, false);
  assert.equal(document.querySelector("[name=r]").checked, false);
  assert.equal(document.querySelector("[name=cb]").value, "on");
});

test("boolean casts set checked; on a non-toggle they set a truthy or empty value", () => {
  const { document, root } = dom(`<form data-obfo-container="{}">
    <input name="cb" type="checkbox" data-obfo-cast="checkbox">
    <input name="rd" type="radio" data-obfo-cast>
    <input name="flag" value="" data-obfo-cast="checkbox">
  </form>`);
  fill(root, { cb: true, rd: true, flag: true });
  assert.deepEqual(obfo(root), { cb: true, rd: true, flag: true });
  fill(root, { cb: false, rd: false, flag: false });
  assert.deepEqual(obfo(root), { cb: false, rd: false, flag: false });
  assert.equal(document.querySelector("[name=flag]").value, "");
});

test("auto radios: filling null unchecks the group", () => {
  const { root } = dom(`<form data-obfo-container="{}"><input type="radio" name="r" value="a" checked><input type="radio" name="r" value="b"></form>`);
  fill(root, { r: "b" }, { cast: "auto" });
  assert.deepEqual(obfo(root, { cast: "auto" }), { r: "b" });
  fill(root, { r: null }, { cast: "auto" });
  assert.deepEqual(obfo(root, { cast: "auto" }), { r: null });
});

test("a multiple select is filled from an array without a cast too", () => {
  const { document, root } = dom(`<form data-obfo-container="{}"><select name="m" multiple><option>a</option><option>b</option><option>c</option></select></form>`);
  fill(root, { m: ["a", "c"] });
  const selected = Array.from(document.querySelector("select").options, (o) => o.selected);
  assert.deepEqual(selected, [true, false, true]);
});

test("number and bigint casts round-trip", () => {
  const { root } = dom(`<form data-obfo-container="{}"><input name="n" data-obfo-cast="number"><input name="b" data-obfo-cast="bigint"></form>`);
  const value = { n: 2.5, b: 12345678901234567890n };
  fill(root, value);
  assert.deepEqual(obfo(root), value);
});

test("a Date is formatted for date, month, time and datetime-local inputs", () => {
  const { document, root } = dom(`<form data-obfo-container="{}">
    <input name="d" type="date" data-obfo-cast>
    <input name="dt" type="datetime-local" data-obfo-cast="date">
    <input name="text" data-obfo-cast="date">
    <input name="m" type="month" data-obfo-cast="date">
  </form>`);
  const value = {
    d: new Date("2000-01-02"),
    dt: new Date("2000-01-02T10:30"),
    text: new Date("2000-01-02T03:04:05.006Z"),
    m: new Date("2000-03"),
  };
  fill(root, value);
  assert.equal(document.querySelector("[name=d]").value, "2000-01-02");
  assert.equal(document.querySelector("[name=dt]").value, "2000-01-02T10:30");
  assert.equal(document.querySelector("[name=m]").value, "2000-03");
  assert.deepEqual(obfo(root), value);
  fill(root, { d: "1999-12-31" });
  assert.equal(document.querySelector("[name=d]").value, "1999-12-31");

  // Without a date cast the input keeps a string, formatted the same way.
  const { root: plain } = dom(`<form data-obfo-container="{}"><input name="t" type="time"><input name="l" type="datetime-local"><input name="d" type="date"></form>`);
  fill(plain, { t: new Date(2000, 0, 2, 9, 5, 7), l: new Date(2000, 0, 2, 9, 5), d: new Date("2000-01-02") }, { cast: "auto" });
  assert.deepEqual(obfo(plain, { cast: "auto" }), { t: "09:05:07", l: "2000-01-02T09:05", d: "2000-01-02" });
});

test("file inputs and null/undefined casts are skipped", () => {
  const { document, root } = dom(`<form data-obfo-container="{}">
    <input name="f" type="file">
    <input name="n" value="keep" data-obfo-cast="null">
  </form>`);
  fill(root, { f: ["x"], n: "changed" });
  assert.equal(document.querySelector("[name=f]").files.length, 0);
  assert.equal(document.querySelector("[name=n]").value, "keep");
});

test("data-obfo-value elements get text, never HTML", () => {
  const { document, root } = dom(`<form data-obfo-container="{}"><p data-obfo-value data-obfo-name="note"></p></form>`);
  fill(root, { note: "<b>bold</b>" });
  const p = document.querySelector("p");
  assert.equal(p.textContent, "<b>bold</b>");
  assert.equal(p.children.length, 0);
});

test("buttons are not filled, except the submitter", () => {
  const { document, root } = dom(`<form data-obfo-container="{}"><input name="a"><button name="b" value="orig">B</button></form>`);
  fill(root, { a: "1", b: "x" });
  assert.equal(document.querySelector("button").value, "orig");
  fill(root, { b: "x" }, { submit: document.querySelector("button") });
  assert.equal(document.querySelector("button").value, "x");
});

test("options.container lets fill walk a form without data-obfo-container", () => {
  const { root } = dom(`<form><input name="a"></form>`);
  fill(root, { a: "1" });
  assert.equal(obfo(root, { container: "{}" }).a, "");
  fill(root, { a: "1" }, { container: "{}" });
  assert.deepEqual(obfo(root, { container: "{}" }), { a: "1" });
});

test("fill on a single input writes that input", () => {
  const { root } = dom(`<input type="number">`);
  fill(root, 5, { cast: "auto" });
  assert.equal(obfo(root, { cast: "auto" }), 5);
});

test("a mismatched shape is ignored rather than thrown", () => {
  const { root } = dom(blank);
  fill(root, { address: "not an object", list: { 0: "x" }, matrix: null }, { cast: "auto" });
  fill(root, "not an object");
  fill(root, null);
  assert.equal(obfo(root, { cast: "auto" }).address.city, "");
});

test("dispatch: true fires input and change only on elements that changed", () => {
  const { window, root } = dom(`<form data-obfo-container="{}"><input name="a" value="same"><input name="b" value="old"><input name="c" type="checkbox"></form>`);
  const events = [];
  for (const type of ["input", "change"]) {
    root.addEventListener(type, (event) => {
      assert.ok(event instanceof window.Event);
      assert.equal(event.bubbles, true);
      events.push(`${type}:${event.target.name}`);
    });
  }
  fill(root, { a: "same", b: "new", c: true }, { cast: "auto", dispatch: true });
  assert.deepEqual(events, ["input:b", "change:b", "input:c", "change:c"]);
  events.length = 0;
  fill(root, { b: "newer" });
  assert.deepEqual(events, []);
});
