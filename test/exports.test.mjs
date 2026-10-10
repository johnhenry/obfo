// Types drift gate: every value export declared in index.d.ts exists at
// runtime, and every runtime export is declared.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as runtime from "@johnhenry/obfo";

test("index.d.ts declares exactly the runtime exports", async () => {
  const source = (await readFile(new URL("../index.d.ts", import.meta.url), "utf8"))
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const declared = new Set();
  for (const [, name] of source.matchAll(/^export (?:declare )?(?:function|const|let|class) (\w+)/gm)) declared.add(name);
  if (/^export default /m.test(source)) declared.add("default");
  assert.deepEqual([...declared].sort(), Object.keys(runtime).sort());
});

test("package.json exports point at files that exist and ship", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const entry = pkg.exports["."];
  for (const file of [entry.types, entry.default, pkg.main, pkg.types]) {
    const path = file.replace(/^\.\//, "");
    assert.ok(pkg.files.includes(path), `${path} is in files`);
    await readFile(new URL(`../${path}`, import.meta.url));
  }
  assert.equal(pkg.dependencies, undefined, "zero runtime dependencies");
});
