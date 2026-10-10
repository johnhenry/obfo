// Compiled by `npm run typecheck` (tsc -p test/types). It imports the package
// by its own name, so it checks the published `exports` + `types`, and it
// exercises every export.
import obfo, {
  obfo as named,
  defaultParse,
  fill,
  observe,
  formFromObject,
  type Cast,
  type ObfoOptions,
  type FillOptions,
  type ObserveOptions,
  type Parse,
  type JsonValue,
} from "@johnhenry/obfo";

declare const form: HTMLFormElement;
declare const input: HTMLInputElement;

const cast: Cast = "auto";
const parse: Parse = (element, c) => (c === "upper" ? String((element as HTMLInputElement).value).toUpperCase() : defaultParse(element, c));
const options: ObfoOptions = { cast, container: "{}", submit: null, parse };

const settings = obfo<{ volume: number; muted: boolean }>(form, options);
const volume: number = settings.volume;
const loose = named(input);
const same: typeof obfo = named;

const filled: HTMLFormElement = fill(form, { volume: 3 }, { dispatch: true, cast: "auto" } satisfies FillOptions);

const controller = new AbortController();
const observeOptions: ObserveOptions = { debounce: 100, immediate: true, signal: controller.signal, onError: (error) => console.error(error), cast: "auto" };
const stop: () => void = observe<{ volume: number }>(form, (value, event) => {
  const v: number = value.volume;
  const e: Event | null = event;
  void v;
  void e;
}, observeOptions);
stop();

const json: JsonValue = { a: [1, "b", true, null, { c: "d" }] };
const generated: HTMLFormElement = formFromObject({ a: 1, b: [json] }, { document });
const fromArray: HTMLFormElement = formFromObject([1, 2, 3]);

// @ts-expect-error formFromObject takes an object or array, not a primitive
formFromObject("text");
// @ts-expect-error container is "{}" or "[]"
obfo(form, { container: "object" });

void [volume, loose, same, filled, generated, fromArray];
