/**
 * The casts `data-obfo-cast` (and the `cast` option) accept. An empty string
 * uses the input's `type` as the cast.
 */
export type Cast =
  | "string"
  | "checkbox"
  | "radio"
  | "number"
  | "bigint"
  | "date"
  | "file"
  | "files"
  | "null"
  | "undefined"
  | "auto"
  | "";

/** Reads one element. `cast` is its `data-obfo-cast`, else `options.cast`, else `null`. */
export type Parse = (element: Element, cast: string | null) => unknown;

/** Options for `obfo` (and the read half of `fill` and `observe`). */
export interface ObfoOptions {
  /** The cast for elements without `data-obfo-cast`; `"auto"` types every value. */
  cast?: Cast;
  /** The container for a root element that has no `data-obfo-container`. */
  container?: "{}" | "[]";
  /** The submitting button, read like an input instead of ignored. */
  submit?: Element | null | false;
  /** Reads one element; defaults to `defaultParse`. */
  parse?: Parse;
}

export interface FillOptions extends ObfoOptions {
  /** Fire `input` and `change` on every element whose value changed. Default `false`. */
  dispatch?: boolean;
}

export interface ObserveOptions extends ObfoOptions {
  /** Milliseconds to wait for a pause in events. Default `0`: same-task events coalesce into one microtask call. */
  debounce?: number;
  /** Also call back once, synchronously, with the current value. Default `false`. */
  immediate?: boolean;
  /** Unsubscribes when aborted. */
  signal?: AbortSignal;
  /** Receives errors thrown while reading; without it they are thrown from the event handler. */
  onError?: (error: unknown) => void;
}

export interface FormFromObjectOptions {
  /** The document to create elements in. Default: the global `document`. */
  document?: Document;
}

/** A JSON value `formFromObject` can build a form for. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

/** Read a form (or any element) into a nested object. */
export function obfo<T = any>(element: Element, options?: ObfoOptions): T;
export default obfo;

/** The built-in casts; the default `parse` option. */
export function defaultParse(element: Element, cast?: string | null): unknown;

/** Write a nested object into a form, the inverse of `obfo`. Returns the element. */
export function fill<E extends Element>(
  element: E,
  value: unknown,
  options?: FillOptions
): E;

/** Call back with the form's object on every `input`, `change` and `reset`. Returns an unsubscribe function. */
export function observe<T = any>(
  element: Element,
  callback: (value: T, event: Event | null) => void,
  options?: ObserveOptions
): () => void;

/** Build a form for a plain JSON object or array that `obfo` reads back as the same value. */
export function formFromObject(
  value: { [key: string]: JsonValue | undefined } | JsonValue[],
  options?: FormFromObjectOptions
): HTMLFormElement;
