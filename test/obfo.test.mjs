import { test } from "node:test";
import assert from "node:assert/strict";
import obfo, { obfo as named, defaultParse } from "@johnhenry/obfo";
import { dom } from "./dom.mjs";

test("the default export and the named export are the same function", () => {
  assert.equal(named, obfo);
});

test("needs no DOM globals", () => {
  assert.equal(typeof globalThis.HTMLInputElement, "undefined");
  const { root } = dom(`<form data-obfo-container="{}"><input name="a" value="1"></form>`);
  assert.deepEqual(obfo(root), { a: "1" });
});

test('{} containers map names to values', () => {
  const { root } = dom(`<form data-obfo-container="{}"><input name="first" value="Jon"><input name="last" value="Doe"></form>`);
  assert.deepEqual(obfo(root), { first: "Jon", last: "Doe" });
});

test("[] containers push values in document order and ignore names", () => {
  const { root } = dom(`<form data-obfo-container="[]"><input name="first" value="Jon"><input data-obfo-name="x" value="Doe"></form>`);
  assert.deepEqual(obfo(root), ["Jon", "Doe"]);
});

test("textarea and select are inputs", () => {
  const { root } = dom(`<form data-obfo-container="{}">
    <textarea name="bio">hello</textarea>
    <select name="pick"><option>a</option><option selected>b</option></select>
  </form>`);
  assert.deepEqual(obfo(root), { bio: "hello", pick: "b" });
});

test("nested containers use data-obfo-name, and other elements are transparent", () => {
  const { root } = dom(`<form data-obfo-container="{}">
    <h1>Title</h1>
    <label>First <input name="first" value="Jon"></label>
    <fieldset data-obfo-container="{}" data-obfo-name="address">
      <legend>Address</legend>
      <div><span><input name="city" value="Anytown"></span></div>
    </fieldset>
    <div data-obfo-container="[]" data-obfo-name="media">
      <div><img alt=""><input type="hidden" value="abc.jpg"></div>
      <div><img alt=""><input type="hidden" value="def.jpg"></div>
    </div>
    <div data-obfo-container="[]" data-obfo-name="matrix">
      <div data-obfo-container="[]"><input value="1"><input value="2"></div>
      <div data-obfo-container="{}"><input name="k" value="v"></div>
    </div>
  </form>`);
  assert.deepEqual(obfo(root), {
    first: "Jon",
    address: { city: "Anytown" },
    media: ["abc.jpg", "def.jpg"],
    matrix: [["1", "2"], { k: "v" }],
  });
});

test("a fieldset's name attribute works as its key", () => {
  const { root } = dom(`<form data-obfo-container="{}"><fieldset name="inner" data-obfo-container="{}"><input name="a" value="1"></fieldset></form>`);
  assert.deepEqual(obfo(root), { inner: { a: "1" } });
});

test("a child of a {} container without a name throws", () => {
  const { root } = dom(`<form data-obfo-container="{}"><input value="x"></form>`);
  assert.throws(() => obfo(root), /data-obfo-name is required for nested objects/);
  const nested = dom(`<form data-obfo-container="{}"><div data-obfo-container="[]"></div></form>`).root;
  assert.throws(() => obfo(nested), /data-obfo-name is required/);
});

test("when names repeat in a {} container, the last one wins", () => {
  const { root } = dom(`<form data-obfo-container="{}"><input name="a" value="1"><input name="a" value="2"></form>`);
  assert.deepEqual(obfo(root), { a: "2" });
});

test("a root without data-obfo-container reads as null, unless options.container says otherwise", () => {
  const { root } = dom(`<form><input name="a" value="1"></form>`);
  assert.equal(obfo(root), null);
  assert.deepEqual(obfo(root, { container: "{}" }), { a: "1" });
  assert.deepEqual(obfo(root, { container: "[]" }), ["1"]);
  assert.equal(obfo(root, { container: "nope" }), null);
});

test("options.container doesn't override the root's own data-obfo-container", () => {
  const { root } = dom(`<form data-obfo-container="[]"><input name="a" value="1"></form>`);
  assert.deepEqual(obfo(root, { container: "{}" }), ["1"]);
});

test("called on an input, obfo returns that input's value", () => {
  const { root } = dom(`<input value="solo" data-obfo-cast="string">`);
  assert.equal(obfo(root), "solo");
  const { root: box } = dom(`<input type="checkbox" checked data-obfo-cast>`);
  assert.equal(obfo(box), true);
});

test("buttons are ignored, except the submitter in options.submit", () => {
  const { document, root } = dom(`<form data-obfo-container="{}">
    <input name="a" value="1">
    <button name="b1" value="x">B</button>
    <button type="button" name="b2" value="x">B</button>
    <input type="submit" name="s" value="Go">
    <input type="image" name="i" value="img" alt="">
    <input type="button" name="ib" value="Click">
    <input type="reset" name="r" value="Reset">
  </form>`);
  assert.deepEqual(obfo(root), { a: "1" });
  const submitter = document.querySelector("[name=s]");
  assert.deepEqual(obfo(root, { submit: submitter }), { a: "1", s: "Go" });
  const button = document.querySelector("[name=b1]");
  assert.deepEqual(obfo(root, { submit: button }), { a: "1", b1: "x" });
  assert.deepEqual(obfo(root, { submit: false }), { a: "1" });
  assert.equal(obfo(document.querySelector("[name=r]")), undefined);
});

test("data-obfo-value reads an element's text", () => {
  const { root } = dom(`<form data-obfo-container="{}"><p data-obfo-value data-obfo-name="note">Call after <b>five</b></p></form>`);
  assert.deepEqual(obfo(root), { note: "Call after five" });
});

test("data-obfo-cast casts", () => {
  const { root } = dom(`<form data-obfo-container="{}">
    <input name="s" value="20" data-obfo-cast="string">
    <input name="n" value="20" data-obfo-cast="number">
    <input name="empty" value="" data-obfo-cast="number">
    <input name="big" value="9007199254740993" data-obfo-cast="bigint">
    <input name="d" value="2000-01-01" data-obfo-cast="date">
    <input name="nul" value="x" data-obfo-cast="null">
    <input name="undef" value="x" data-obfo-cast="undefined">
    <input name="cb" type="checkbox" data-obfo-cast="checkbox">
    <input name="rd" type="radio" checked data-obfo-cast="radio">
    <input name="truthy" value="x" data-obfo-cast="checkbox">
    <input name="falsy" value="" data-obfo-cast="checkbox">
    <input name="unknown" value="x" data-obfo-cast="whatever">
  </form>`);
  const value = obfo(root);
  assert.deepEqual(value, {
    s: "20",
    n: 20,
    empty: 0,
    big: 9007199254740993n,
    d: new Date("2000-01-01"),
    nul: null,
    undef: undefined,
    cb: false,
    rd: true,
    truthy: true,
    falsy: false,
    unknown: "x",
  });
  assert.ok("undef" in value);
});

test("an empty data-obfo-cast casts by the input's type", () => {
  const { root } = dom(`<form data-obfo-container="{}">
    <input name="cb" type="checkbox" checked data-obfo-cast>
    <input name="age" type="number" value="20" data-obfo-cast>
    <input name="born" type="date" value="2000-01-01" data-obfo-cast>
    <input name="text" value="x" data-obfo-cast>
  </form>`);
  assert.deepEqual(obfo(root), { cb: true, age: 20, born: new Date("2000-01-01"), text: "x" });
});

test("without a cast, checkboxes and radios read their value whatever their state (the 0.0.9 behavior)", () => {
  const { root } = dom(`<form data-obfo-container="{}">
    <input name="cb" type="checkbox">
    <input name="r" type="radio" value="a" checked>
    <input name="r" type="radio" value="b">
    <select name="m" multiple><option>x</option><option selected>y</option><option selected>z</option></select>
    <input name="age" type="number" value="20">
  </form>`);
  assert.deepEqual(obfo(root), { cb: "on", r: "b", m: "y", age: "20" });
});

test("file and files casts read input[type=file] and throw elsewhere", () => {
  const { window, document, root } = dom(`<form data-obfo-container="{}">
    <input name="one" type="file" data-obfo-cast="file">
    <input name="many" type="file" multiple data-obfo-cast="files">
  </form>`);
  assert.deepEqual(obfo(root), { one: null, many: document.querySelector("[name=many]").files });
  const transfer = new window.DataTransfer();
  transfer.items.add(new window.File(["a"], "a.txt"));
  transfer.items.add(new window.File(["b"], "b.txt"));
  document.querySelector("[name=one]").files = transfer.files;
  document.querySelector("[name=many]").files = transfer.files;
  const value = obfo(root);
  assert.equal(value.one.name, "a.txt");
  assert.equal(value.many.length, 2);

  const bad = dom(`<form data-obfo-container="{}"><input name="x" data-obfo-cast="file"></form>`).root;
  assert.throws(() => obfo(bad), /data-obfo-cast='file' can only be used with input\[type=file\]/);
  const bad2 = dom(`<form data-obfo-container="{}"><input name="x" data-obfo-cast="files"></form>`).root;
  assert.throws(() => obfo(bad2), /data-obfo-cast='files'/);
});

test("a bigint cast on text that isn't an integer throws", () => {
  const { root } = dom(`<form data-obfo-container="{}"><input name="x" value="1.5" data-obfo-cast="bigint"></form>`);
  assert.throws(() => obfo(root), SyntaxError);
});

test('cast: "auto" types values by input type', () => {
  const { root } = dom(`<form data-obfo-container="{}">
    <input name="age" type="number" value="20">
    <input name="blank" type="number" value="">
    <input name="volume" type="range" value="30">
    <input name="sub" type="checkbox" checked>
    <input name="off" type="checkbox">
    <input name="size" type="radio" value="s">
    <input name="size" type="radio" value="m" checked>
    <input name="size" type="radio" value="l">
    <input name="none" type="radio" value="a">
    <input name="none" type="radio" value="b">
    <select name="tags" multiple><option selected>js</option><option>css</option><option selected>html</option></select>
    <select name="one"><option>x</option><option selected>y</option></select>
    <input name="born" type="date" value="2000-01-01">
    <input name="at" type="time" value="10:30">
    <input name="local" type="datetime-local" value="2000-01-01T10:30">
    <input name="files" type="file">
    <input name="text" value="hi">
    <textarea name="area">x</textarea>
    <p data-obfo-value data-obfo-name="note">text</p>
  </form>`);
  assert.deepEqual(obfo(root, { cast: "auto" }), {
    age: 20,
    blank: null,
    volume: 30,
    sub: true,
    off: false,
    size: "m",
    none: null,
    tags: ["js", "html"],
    one: "y",
    born: "2000-01-01",
    at: "10:30",
    local: "2000-01-01T10:30",
    files: [],
    text: "hi",
    area: "x",
    note: "text",
  });
});

test('cast: "auto" reads files as an array of File', () => {
  const { window, document, root } = dom(`<form data-obfo-container="{}"><input name="f" type="file" multiple></form>`);
  const transfer = new window.DataTransfer();
  transfer.items.add(new window.File(["a"], "a.txt"));
  document.querySelector("input").files = transfer.files;
  const { f } = obfo(root, { cast: "auto" });
  assert.ok(Array.isArray(f));
  assert.equal(f[0].name, "a.txt");
});

test('an element\'s own data-obfo-cast wins over cast: "auto", and data-obfo-cast="auto" works per element', () => {
  const { root } = dom(`<form data-obfo-container="{}">
    <input name="age" type="number" value="20" data-obfo-cast="string">
    <input name="born" type="date" value="2000-01-01" data-obfo-cast>
    <input name="n" type="number" value="5">
  </form>`);
  assert.deepEqual(obfo(root, { cast: "auto" }), { age: "20", born: new Date("2000-01-01"), n: 5 });
  const { root: one } = dom(`<form data-obfo-container="{}"><input name="n" type="number" value="5" data-obfo-cast="auto"><input name="m" type="number" value="6"></form>`);
  assert.deepEqual(obfo(one), { n: 5, m: "6" });
});

test('auto radios: a [] container keeps only the checked one; a lone radio reads null when unchecked', () => {
  const { document, root } = dom(`<form data-obfo-container="[]">
    <input type="radio" name="r" value="a">
    <input type="radio" name="r" value="b" checked>
  </form>`);
  assert.deepEqual(obfo(root, { cast: "auto" }), ["b"]);
  assert.equal(obfo(document.querySelector("[value=a]"), { cast: "auto" }), null);
  assert.equal(obfo(document.querySelector("[value=b]"), { cast: "auto" }), "b");
});

test("a custom parse receives the element and its cast", () => {
  const seen = [];
  const { root } = dom(`<form data-obfo-container="{}"><input name="a" value="x" data-obfo-cast="upper"><input name="b" value="y"></form>`);
  const parse = (element, cast) => {
    seen.push([element.getAttribute("name"), cast]);
    return cast === "upper" ? element.value.toUpperCase() : defaultParse(element, cast);
  };
  assert.deepEqual(obfo(root, { parse }), { a: "X", b: "y" });
  assert.deepEqual(seen, [["a", "upper"], ["b", null]]);
  seen.length = 0;
  obfo(root, { parse, cast: "auto" });
  assert.deepEqual(seen, [["a", "upper"], ["b", "auto"]]);
});

test("defaultParse defaults its cast to string", () => {
  const { root } = dom(`<input value="7">`);
  assert.equal(defaultParse(root), "7");
  assert.equal(defaultParse(root, "number"), 7);
});

test("a field named __proto__ becomes an own property, not the result's prototype", () => {
  const { root } = dom(`<form data-obfo-container="{}">
    <fieldset data-obfo-container="{}" data-obfo-name="__proto__"><input name="isAdmin" value="true"></fieldset>
    <input name="constructor" value="c">
  </form>`);
  const value = obfo(root);
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
  assert.equal(value.isAdmin, undefined);
  assert.ok(Object.prototype.hasOwnProperty.call(value, "__proto__"));
  assert.deepEqual(Object.keys(value), ["__proto__", "constructor"]);
  assert.equal(value.constructor, "c");
  assert.equal(JSON.stringify(value), '{"__proto__":{"isAdmin":"true"},"constructor":"c"}');
});

test("an unknown data-obfo-container value reads as null and its children are not read", () => {
  const { root } = dom(`<form data-obfo-container="{}"><div data-obfo-container="?" data-obfo-name="odd"><input value="x"></div></form>`);
  assert.deepEqual(obfo(root), { odd: null });
});
