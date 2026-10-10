// A form marked up with {} and [] containers reads as one nested object;
// labels, headings and layout elements are looked through, buttons ignored.
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import obfo from "@johnhenry/obfo";

const { document } = new Window();
document.body.innerHTML = `
  <form data-obfo-container="{}">
    <h1>Profile</h1>
    <label>First <input name="first" value="Jon"></label>
    <label>Last <input name="last" value="Doe"></label>
    <fieldset data-obfo-container="{}" data-obfo-name="address">
      <legend>Address</legend>
      <input name="street" value="123 Main St">
      <input name="city" value="Anytown">
    </fieldset>
    <div data-obfo-container="[]" data-obfo-name="tags">
      <input value="JavaScript"><input value="HTML"><input value="CSS">
    </div>
    <button type="submit" name="save" value="yes">Save</button>
  </form>`;
const form = document.querySelector("form");

const value = obfo(form);
assert.deepEqual(value, {
  first: "Jon",
  last: "Doe",
  address: { street: "123 Main St", city: "Anytown" },
  tags: ["JavaScript", "HTML", "CSS"],
});

// The submitter is the one button that is read.
const withSubmitter = obfo(form, { submit: form.querySelector("button") });
assert.equal(withSubmitter.save, "yes");

console.log("01 ok:", JSON.stringify(value));
