// Runs every JavaScript example in README.md and checks each console.log
// against the `// logs <value>` comments, in order. An example runs against
// the HTML block that precedes it (since the previous JavaScript block).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as obfoModule from "@johnhenry/obfo";
import { dom, sleep } from "./dom.mjs";

const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const blocks = [...readme.matchAll(/```(\w+)\n([\s\S]*?)```/g)].map(([, lang, code]) => ({ lang, code }));

const examples = [];
let html = "";
for (const { lang, code } of blocks) {
  if (lang === "html") html = code;
  if (lang === "javascript" || lang === "js") {
    if (code.includes("// logs")) examples.push({ html, code });
    html = "";
  }
}

const expectations = (code) =>
  [...code.matchAll(/\/\/ logs (.+)$/gm)].map(([, expression]) => new Function(`return (${expression});`)());

test("the README has runnable examples", () => {
  assert.ok(examples.length >= 9, `found ${examples.length}`);
});

for (const [index, { html, code }] of examples.entries()) {
  test(`README example ${index + 1}: ${code.split("\n").find((line) => line.includes("// logs")).trim().slice(0, 70)}`, async () => {
    const { window, document } = dom(html);
    const logs = [];
    const console = { log: (value) => logs.push(value) };
    const body = code.replace(/^import .*$/gm, "");
    const run = new Function(
      "obfo", "fill", "observe", "formFromObject", "defaultParse", "document", "window", "Event", "console",
      `return (async () => {\n${body}\n})();`
    );
    globalThis.document = document; // README examples run in a browser
    try {
      await run(obfoModule.default, obfoModule.fill, obfoModule.observe, obfoModule.formFromObject, obfoModule.defaultParse, document, window, window.Event, console);
      await sleep(5); // observe calls back in a microtask
    } finally {
      delete globalThis.document;
    }
    assert.deepEqual(logs, expectations(code));
  });
}
