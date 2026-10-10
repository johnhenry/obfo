// fill(form, value) writes a value into the same structure obfo reads, so
// reading it back gives the value; keys you leave out are left alone.
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import obfo, { fill } from "@johnhenry/obfo";

const { document } = new Window();
document.body.innerHTML = `
  <form data-obfo-container="{}">
    <input name="name">
    <input name="age" type="number">
    <input name="admin" type="checkbox">
    <select name="roles" multiple><option>reader</option><option>writer</option><option>owner</option></select>
    <div data-obfo-container="[]" data-obfo-name="tags"><input><input></div>
  </form>`;
const form = document.querySelector("form");
const options = { cast: "auto" };

const value = { name: "Ada", age: 36, admin: true, roles: ["reader", "owner"], tags: ["math", "engines"] };
assert.equal(fill(form, value, options), form);
assert.deepEqual(obfo(form, options), value);

// A partial value changes only what it names.
fill(form, { age: 37 }, options);
assert.deepEqual(obfo(form, options), { ...value, age: 37 });

console.log("03 ok");
