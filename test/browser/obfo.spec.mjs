// Real inputs, real events, real realms, in Chromium, Firefox and WebKit.
import { test, expect } from "@playwright/test";

const mount = async (page, markup) => {
  await page.goto("/test/browser/fixture.html");
  await page.waitForSelector("html[data-ready=true]");
  await page.evaluate((html) => {
    document.getElementById("stage").innerHTML = html;
  }, markup);
};

const typed = `<form id="fo" data-obfo-container="{}">
  <input name="age" type="number" value="20">
  <input name="volume" type="range" value="30">
  <input name="subscribe" type="checkbox" checked>
  <input name="size" type="radio" value="s">
  <input name="size" type="radio" value="m" checked>
  <select name="tags" multiple><option selected>js</option><option>css</option><option selected>html</option></select>
  <input name="born" type="date" value="2000-01-01">
  <input name="at" type="time" value="10:30">
  <input name="avatar" type="file" multiple>
  <p data-obfo-value data-obfo-name="note">  Call   after <b>five</b>  </p>
  <button type="reset">Reset</button>
</form>`;

test('cast: "auto" reads real inputs, including chosen files', async ({ page }) => {
  await mount(page, typed);
  await page.setInputFiles("[name=avatar]", [
    { name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("a") },
    { name: "b.txt", mimeType: "text/plain", buffer: Buffer.from("bb") },
  ]);
  const value = await page.evaluate(() => {
    const v = lib.obfo(document.getElementById("fo"), { cast: "auto" });
    return { ...v, avatar: v.avatar.map((f) => [f.constructor.name, f.name, f.size]) };
  });
  expect(value).toEqual({
    age: 20,
    volume: 30,
    subscribe: true,
    size: "m",
    tags: ["js", "html"],
    born: "2000-01-01",
    at: "10:30",
    avatar: [["File", "a.txt", 1], ["File", "b.txt", 2]],
    note: "Call after five",
  });
});

test("observe reports real typing, clicks and resets", async ({ page }) => {
  await mount(page, typed);
  await page.evaluate(() => {
    lib.observe(document.getElementById("fo"), (value, event) => calls.push([value, event.type]), { cast: "auto" });
  });
  await page.fill("[name=age]", "21");
  await expect.poll(() => page.evaluate(() => calls.at(-1)?.[0].age)).toBe(21);

  // Leaving the field fires its own change (a separate edit); let it land.
  await page.locator("[name=age]").blur();
  await page.waitForTimeout(50);
  const before = await page.evaluate(() => calls.length);
  await page.click("[name=subscribe]"); // fires input and change: one call
  await expect.poll(() => page.evaluate(() => calls.at(-1)?.[0].subscribe)).toBe(false);
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => calls.length)).toBe(before + 1);

  await page.check("[name=size][value=s]");
  await expect.poll(() => page.evaluate(() => calls.at(-1)?.[0].size)).toBe("s");

  await page.selectOption("[name=tags]", ["css"]);
  await expect.poll(() => page.evaluate(() => calls.at(-1)?.[0].tags)).toEqual(["css"]);

  await page.click("button[type=reset]");
  await expect
    .poll(() => page.evaluate(() => calls.at(-1)))
    .toEqual([
      expect.objectContaining({ age: 20, subscribe: true, size: "m", tags: ["js", "html"] }),
      "reset",
    ]);
});

test("fill writes real inputs, and a Date lands in date, time and datetime-local inputs", async ({ page }) => {
  await mount(page, `<form id="fo" data-obfo-container="{}">
    <input name="age" type="number"><input name="ok" type="checkbox">
    <input name="size" type="radio" value="s"><input name="size" type="radio" value="m">
    <select name="tags" multiple><option>js</option><option>css</option></select>
    <input name="d" type="date"><input name="t" type="time"><input name="l" type="datetime-local">
    <input name="f" type="file">
  </form>`);
  const value = await page.evaluate(() => {
    const form = document.getElementById("fo");
    lib.fill(form, {
      age: 36, ok: true, size: "m", tags: ["css"],
      d: new Date("2000-01-02"), t: new Date(2000, 0, 2, 9, 5), l: new Date(2000, 0, 2, 9, 5), f: ["ignored"],
    }, { cast: "auto" });
    return lib.obfo(form, { cast: "auto" });
  });
  expect(value).toEqual({ age: 36, ok: true, size: "m", tags: ["css"], d: "2000-01-02", t: "09:05", l: "2000-01-02T09:05", f: [] });
});

test("formFromObject round-trips JSON through real inputs", async ({ page }) => {
  await mount(page, "");
  const samples = [
    { title: "Notes", count: 3, done: false, tags: ["a", "b"], owner: null },
    { big: 1e21, small: 5e-7, negative: -1.5, zero: 0, text: "  padded  ", lines: "one\ntwo", html: "<b>x</b>" },
    [[1, [2]], { "": "empty key", "a b": true }],
  ];
  const results = await page.evaluate((values) => values.map((value) => {
    const form = lib.formFromObject(value);
    document.getElementById("stage").append(form);
    return lib.obfo(form);
  }), samples);
  expect(results).toEqual(samples);
});

test("a form in an iframe (another realm) reads, fills and observes from the parent page", async ({ page }) => {
  await mount(page, `<iframe id="frame" srcdoc='<form data-obfo-container="{}"><input name="a" value="1"><input name="n" type="number" value="2"><button>Go</button></form>'></iframe>`);
  await page.waitForFunction(() => document.getElementById("frame").contentDocument?.querySelector("form"));
  const result = await page.evaluate(async () => {
    const frame = document.getElementById("frame");
    const form = frame.contentDocument.querySelector("form");
    const read = lib.obfo(form, { cast: "auto" });
    const seen = [];
    lib.observe(form, (value, event) => seen.push([value, event instanceof frame.contentWindow.Event]), { cast: "auto" });
    lib.fill(form, { a: "x", n: 5 }, { cast: "auto", dispatch: true });
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { read, seen };
  });
  expect(result).toEqual({ read: { a: "1", n: 2 }, seen: [[{ a: "x", n: 5 }, true]] });
});
