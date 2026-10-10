// observe(form, callback) calls back with the form's object after every
// edit, once per edit (input + change), and stops when unsubscribed.
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { observe } from "@johnhenry/obfo";

const window = new Window();
const { document } = window;
document.body.innerHTML = `
  <form data-obfo-container="{}">
    <input name="name" value="Jon">
    <input name="age" type="number" value="20">
    <input name="subscribe" type="checkbox">
  </form>`;
const form = document.querySelector("form");
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

const seen = [];
const stop = observe(form, (value) => seen.push(value), { cast: "auto", immediate: true });
assert.deepEqual(seen, [{ name: "Jon", age: 20, subscribe: false }]); // immediate

// What typing into the age field does:
const age = form.querySelector("[name=age]");
age.value = "21";
age.dispatchEvent(new window.Event("input", { bubbles: true }));
await nextTask();
assert.deepEqual(seen.at(-1), { name: "Jon", age: 21, subscribe: false });

// A checkbox click fires input and change: one call.
const box = form.querySelector("[name=subscribe]");
box.checked = true;
box.dispatchEvent(new window.Event("input", { bubbles: true }));
box.dispatchEvent(new window.Event("change", { bubbles: true }));
await nextTask();
assert.equal(seen.length, 3);
assert.equal(seen.at(-1).subscribe, true);

stop();
age.value = "99";
age.dispatchEvent(new window.Event("input", { bubbles: true }));
await nextTask();
assert.equal(seen.length, 3);

console.log("04 ok");
