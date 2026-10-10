// cast: "auto" types each value by its input: numbers, booleans, a radio
// group as one key, a multiple select as an array, dates as strings. The
// default (no cast) still reads strings, as obfo always has.
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import obfo from "@johnhenry/obfo";

const { document } = new Window();
document.body.innerHTML = `
  <form data-obfo-container="{}">
    <input name="age" type="number" value="20">
    <input name="empty" type="number" value="">
    <input name="subscribe" type="checkbox" checked>
    <input name="size" type="radio" value="s">
    <input name="size" type="radio" value="m" checked>
    <select name="tags" multiple><option selected>js</option><option>css</option><option selected>html</option></select>
    <input name="born" type="date" value="2000-01-01">
    <input name="label" value="20" data-obfo-cast="string">
  </form>`;
const form = document.querySelector("form");

assert.deepEqual(obfo(form, { cast: "auto" }), {
  age: 20,
  empty: null, // not 0
  subscribe: true,
  size: "m",
  tags: ["js", "html"],
  born: "2000-01-01",
  label: "20", // an element's own data-obfo-cast wins
});

assert.deepEqual(obfo(form), {
  age: "20",
  empty: "",
  subscribe: "on",
  size: "m", // the last radio's value, checked or not
  tags: "js",
  born: "2000-01-01",
  label: "20",
});

console.log("02 ok");
