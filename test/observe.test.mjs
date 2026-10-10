import { test } from "node:test";
import assert from "node:assert/strict";
import { observe, fill } from "@johnhenry/obfo";
import { dom, flush, sleep } from "./dom.mjs";

const markup = `<form data-obfo-container="{}">
  <input name="name" value="Jon">
  <input name="age" type="number" value="20">
  <input name="sub" type="checkbox">
</form>`;

const type = (window, input, value) => {
  input.value = value;
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
};

test("calls back with the form's object and the event on input", async () => {
  const { window, document, root } = dom(markup);
  const calls = [];
  observe(root, (value, event) => calls.push([value, event?.type]), { cast: "auto" });
  type(window, document.querySelector("[name=age]"), "21");
  assert.equal(calls.length, 0, "the call is made a task later, not synchronously");
  await flush();
  assert.deepEqual(calls, [[{ name: "Jon", age: 21, sub: false }, "input"]]);
});

test("the events of one edit make one call, even with microtasks between them", async () => {
  const { window, document, root } = dom(markup);
  const calls = [];
  observe(root, (value) => calls.push(value), { cast: "auto" });
  const box = document.querySelector("[name=sub]");
  box.checked = true;
  box.dispatchEvent(new window.Event("input", { bubbles: true }));
  // A browser runs microtasks between a native click's input and change
  // events; a microtask-based coalescer called back twice (found by the
  // Playwright suite).
  await Promise.resolve();
  await Promise.resolve();
  box.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();
  assert.deepEqual(calls, [{ name: "Jon", age: 20, sub: true }]);
  type(window, document.querySelector("[name=name]"), "Ada");
  await flush();
  assert.equal(calls.length, 2);
});

test("debounce waits for a pause and reports the last state", async () => {
  const { window, document, root } = dom(markup);
  const calls = [];
  observe(root, (value) => calls.push(value.name), { debounce: 30 });
  const input = document.querySelector("[name=name]");
  type(window, input, "A");
  await sleep(10);
  type(window, input, "Ad");
  await sleep(10);
  type(window, input, "Ada");
  await sleep(10);
  assert.deepEqual(calls, []);
  await sleep(60);
  assert.deepEqual(calls, ["Ada"]);
});

test("immediate calls back once, synchronously, with a null event", () => {
  const { root } = dom(markup);
  const calls = [];
  observe(root, (value, event) => calls.push([value.name, event]), { immediate: true });
  assert.deepEqual(calls, [["Jon", null]]);
});

test("the returned function unsubscribes, including a pending call", async () => {
  const { window, document, root } = dom(markup);
  const calls = [];
  const stop = observe(root, (value) => calls.push(value));
  type(window, document.querySelector("[name=name]"), "Ada");
  stop();
  stop(); // idempotent
  await flush();
  type(window, document.querySelector("[name=name]"), "Bea");
  await flush();
  assert.deepEqual(calls, []);
});

test("an AbortSignal unsubscribes, and an aborted one never subscribes", async () => {
  const { window, document, root } = dom(markup);
  const calls = [];
  const controller = new AbortController();
  observe(root, (value) => calls.push(value), { signal: controller.signal });
  controller.abort();
  type(window, document.querySelector("[name=name]"), "Ada");
  await flush();
  assert.deepEqual(calls, []);
  const stop = observe(root, (value) => calls.push(value), { signal: AbortSignal.abort(), immediate: true });
  assert.equal(typeof stop, "function");
  assert.deepEqual(calls, []);
});

test("reset reports the values after the reset, not before", async () => {
  const { window, document, root } = dom(markup);
  const calls = [];
  observe(root, (value, event) => calls.push([value.name, event.type]));
  document.querySelector("[name=name]").value = "Changed";
  root.reset();
  await sleep(5);
  assert.deepEqual(calls, [["Jon", "reset"]]);
  void window;
});

test("fill with dispatch: true is observed as one edit", async () => {
  const { root } = dom(markup);
  const calls = [];
  observe(root, (value) => calls.push(value), { cast: "auto" });
  fill(root, { name: "Ada", age: 36, sub: true }, { cast: "auto", dispatch: true });
  await flush();
  assert.deepEqual(calls, [{ name: "Ada", age: 36, sub: true }]);
});

test("onError receives read errors", async () => {
  const { window, document, root } = dom(`<form data-obfo-container="{}"><input name="n" data-obfo-cast="bigint" value="1"></form>`);
  const errors = [];
  observe(root, () => assert.fail("no value"), { onError: (error) => errors.push(error) });
  type(window, document.querySelector("input"), "1.5");
  await flush();
  assert.equal(errors.length, 1);
  assert.ok(errors[0] instanceof SyntaxError);
});

test("events from outside the element are not heard", async () => {
  const { window, document, root } = dom(`${markup}<input id="outside">`);
  const calls = [];
  observe(root, (value) => calls.push(value));
  type(window, document.getElementById("outside"), "x");
  await flush();
  assert.deepEqual(calls, []);
});
