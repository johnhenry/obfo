// obfo: HTML forms <-> nested JavaScript objects.
//
// The DOM is read structurally: elements with `data-obfo-container="{}"` or
// `"[]"` become objects or arrays, inputs (and `data-obfo-value` elements)
// become values, and every other element is transparent. `obfo` reads that
// structure, `fill` writes into it, `observe` re-reads it on every edit and
// `formFromObject` builds it from a plain JSON value.
//
// Zero dependencies. Nothing here uses a DOM global: element kinds are
// decided by `localName`, and `Event`, timers and `document` come from the
// element's own window, so forms inside iframes (another realm) work too.

const INPUT_TAGS = new Set(["input", "textarea", "select", "button"]);
const BUTTON_TYPES = new Set(["submit", "image", "button", "reset"]);
const CONTAINERS = new Set(["{}", "[]"]);

const LEAF = 1;
const CONTAINER = 2;
const TRANSPARENT = 3;
const SKIP = 4;

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

const isValueElement = (element) => element.hasAttribute("data-obfo-value");

/** Buttons never carry data unless they are the submitter (`options.submit`). */
const isButton = (element) =>
  element.localName === "button" ||
  (element.localName === "input" && BUTTON_TYPES.has(element.type));

const kindOf = (element, options) => {
  if (INPUT_TAGS.has(element.localName) || isValueElement(element)) {
    if (element !== options.submit && isButton(element)) return SKIP;
    return LEAF;
  }
  return element.getAttribute("data-obfo-container") ? CONTAINER : TRANSPARENT;
};

/** The key an element is stored under inside a `{}` container. */
const nameOf = (element) =>
  element.getAttribute("name") || element.getAttribute("data-obfo-name");

/** The cast an element is read with: its own attribute, else `options.cast`. */
const castOf = (element, options) => {
  const attribute = element.getAttribute("data-obfo-cast");
  if (attribute !== null) return attribute;
  return options.cast ?? null;
};

const textOf = (element) => element.innerText ?? element.textContent;

const newContainer = (type) => (type === "[]" ? [] : type === "{}" ? {} : null);

/**
 * Store a value. `Object.defineProperty` rather than assignment, so a form
 * field named `__proto__` becomes an ordinary own property instead of
 * replacing the result's prototype.
 */
const define = (object, key, value) => {
  Object.defineProperty(object, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
};

const attach = (parent, element, value) => {
  if (!parent) return;
  if (Array.isArray(parent)) {
    parent.push(value);
    return;
  }
  const name = nameOf(element);
  if (name === null) {
    throw new Error(
      `data-obfo-name is required for nested objects (a <${element.localName}> has neither name nor data-obfo-name)`
    );
  }
  define(parent, name, value);
};

/** Values for `data-obfo-cast="auto"` (and `options.cast: "auto"`). */
const autoValue = (element, value) => {
  if (isValueElement(element)) return value;
  switch (element.type) {
    case "number":
    case "range":
      return value === "" ? null : Number(value);
    case "checkbox":
      return element.checked;
    case "radio":
      return element.checked ? value : null;
    case "select-multiple":
      return Array.from(element.options)
        .filter((option) => option.selected)
        .map((option) => option.value);
    case "file":
      return Array.from(element.files ?? []);
    default:
      return value;
  }
};

/**
 * The default `parse` option: read one element's value with a cast.
 *
 * @param {Element} element
 * @param {string | null} [cast="string"]
 */
export const defaultParse = (element, cast = "string") => {
  const value = isValueElement(element) ? textOf(element) : element.value;

  const castType = cast === "" ? element.type : cast;

  switch (castType) {
    case "auto":
      return autoValue(element, value);
    case "bigint":
      return BigInt(value);
    case "number":
      return Number(value);
    case "checkbox":
    case "radio":
      switch (element.type) {
        case "checkbox":
        case "radio":
          return element.checked;
        default:
          return Boolean(value);
      }
    case "null":
      return null;
    case "undefined":
      return undefined;
    case "date":
      return new Date(value);
    case "file":
      if (element.type !== "file") {
        throw new Error(
          "data-obfo-cast='file' can only be used with input[type=file]"
        );
      }
      return element.files[0] || null;
    case "files":
      if (element.type !== "file") {
        throw new Error(
          "data-obfo-cast='files' can only be used with input[type=file]"
        );
      }
      return element.files;
    case "string":
    default:
      return value;
  }
};

/** Read with "auto", radios are groups: only the checked one has a value. */
const isAutoRadio = (element, cast) =>
  cast === "auto" && element.type === "radio" && !isValueElement(element);

const collect = (element, options, parent) => {
  const kind = kindOf(element, options);
  if (kind === SKIP) return;
  if (kind === TRANSPARENT) {
    for (const child of element.children) collect(child, options, parent);
    return;
  }
  if (kind === LEAF) {
    const cast = castOf(element, options);
    if (isAutoRadio(element, cast) && !element.checked) {
      // An unchecked radio never overwrites its group's key; it only makes
      // sure the key exists (null) when no radio in the group is checked.
      if (!parent || Array.isArray(parent)) return;
      const name = nameOf(element);
      if (name !== null && hasOwn(parent, name)) return;
      attach(parent, element, null);
      return;
    }
    attach(parent, element, (options.parse || defaultParse)(element, cast));
    return;
  }
  const value = newContainer(element.getAttribute("data-obfo-container"));
  if (value) {
    for (const child of element.children) collect(child, options, value);
  }
  attach(parent, element, value);
};

const rootContainerType = (element, options, kind) => {
  if (kind === CONTAINER) return element.getAttribute("data-obfo-container");
  if (kind === TRANSPARENT && CONTAINERS.has(options.container)) {
    return options.container;
  }
  return null;
};

/**
 * Read a form (or any element) into a nested object.
 *
 * @param {Element} element
 * @param {object} [options]
 */
const obfo = (element, options = {}) => {
  options = options || {};
  const kind = kindOf(element, options);
  if (kind === SKIP) return undefined;
  if (kind === LEAF) {
    const cast = castOf(element, options);
    if (isAutoRadio(element, cast) && !element.checked) return null;
    return (options.parse || defaultParse)(element, cast);
  }
  const type = rootContainerType(element, options, kind);
  if (type === null) return null;
  const value = newContainer(type);
  if (value) {
    for (const child of element.children) collect(child, options, value);
  }
  return value;
};

export { obfo };
export default obfo;

// ---------------------------------------------------------------------------
// fill: object -> form
// ---------------------------------------------------------------------------

const pad = (n, width = 2) => String(n).padStart(width, "0");

const localTime = (date) => {
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const seconds = date.getSeconds();
  const ms = date.getMilliseconds();
  if (!seconds && !ms) return base;
  return `${base}:${pad(seconds)}${ms ? `.${pad(ms, 3)}` : ""}`;
};

/** Format a Date for a date-like input, in the form `new Date(value)` reads back. */
const formatDate = (element, date) => {
  if (Number.isNaN(date.getTime())) return "";
  switch (element.type) {
    case "date": // new Date("YYYY-MM-DD") is UTC midnight
      return date.toISOString().slice(0, 10);
    case "month":
      return date.toISOString().slice(0, 7);
    case "datetime-local": // new Date("YYYY-MM-DDTHH:MM") is local time
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${localTime(date)}`;
    case "time":
      return localTime(date);
    default:
      return date.toISOString();
  }
};

const toText = (value) => (value == null ? "" : String(value));

const setValue = (element, text) => {
  if (element.value === text) return false;
  element.value = text;
  return true;
};

const setChecked = (element, checked) => {
  if (element.checked === checked) return false;
  element.checked = checked;
  return true;
};

const setSelected = (element, value) => {
  const wanted = new Set((Array.isArray(value) ? value : [value]).map(toText));
  let changed = false;
  for (const option of element.options) {
    const selected = wanted.has(option.value);
    if (option.selected !== selected) {
      option.selected = selected;
      changed = true;
    }
  }
  return changed;
};

const isToggle = (element) =>
  element.localName === "input" &&
  (element.type === "checkbox" || element.type === "radio");

/** Write one value into one element; returns whether anything changed. */
const writeLeaf = (element, value, options) => {
  if (isValueElement(element)) {
    const text = toText(value);
    if (element.textContent === text) return false;
    element.textContent = text;
    return true;
  }
  if (element.type === "file") return false; // browsers forbid setting files
  const cast = castOf(element, options);
  if (value instanceof Date && !isToggle(element) && cast !== "null" && cast !== "undefined") {
    return setValue(element, formatDate(element, value));
  }
  const castType = cast === "" ? element.type : cast;
  switch (castType) {
    case "null":
    case "undefined":
      return false;
    case "checkbox":
    case "radio":
      if (isToggle(element)) return setChecked(element, Boolean(value));
      if (Boolean(element.value) === Boolean(value)) return false;
      return setValue(element, value ? "on" : "");
    case "auto":
      switch (element.type) {
        case "checkbox":
          return setChecked(element, Boolean(value));
        case "radio":
          return setChecked(
            element,
            value != null && element.value === String(value)
          );
        case "select-multiple":
          return setSelected(element, value);
        default:
          return setValue(element, toText(value));
      }
    default:
      // Without a boolean cast a checkbox or radio reads its `value` whatever
      // its state, so there is no state to restore: leave it alone.
      if (isToggle(element)) return false;
      if (element.type === "select-multiple") {
        return setSelected(element, value);
      }
      return setValue(element, toText(value));
  }
};

const dispatchChange = (element) => {
  const EventClass =
    element.ownerDocument?.defaultView?.Event ?? globalThis.Event;
  element.dispatchEvent(new EventClass("input", { bubbles: true }));
  element.dispatchEvent(new EventClass("change", { bubbles: true }));
};

const fillLeaf = (element, value, options) => {
  if (writeLeaf(element, value, options) && options.dispatch) {
    dispatchChange(element);
  }
};

const isRecord = (value) => value !== null && typeof value === "object";

const fillChildren = (element, slot, options) => {
  for (const child of element.children) {
    const kind = kindOf(child, options);
    if (kind === SKIP) continue;
    if (kind === TRANSPARENT) {
      fillChildren(child, slot, options);
      continue;
    }
    let present;
    let value;
    if (slot.type === "[]") {
      const index = slot.index++;
      present = Array.isArray(slot.value) && index < slot.value.length;
      if (present) value = slot.value[index];
    } else {
      const name = nameOf(child);
      present =
        name !== null && isRecord(slot.value) && hasOwn(slot.value, name);
      if (present) value = slot.value[name];
    }
    if (!present) continue;
    if (kind === LEAF) {
      fillLeaf(child, value, options);
      continue;
    }
    const type = child.getAttribute("data-obfo-container");
    if (CONTAINERS.has(type)) {
      fillChildren(child, { type, value, index: 0 }, options);
    }
  }
};

/**
 * Write a nested object into a form: the inverse of `obfo`. Only keys (and
 * array indexes) that are present are written; everything else is left as it
 * is. Returns the element.
 *
 * @template {Element} E
 * @param {E} element
 * @param {unknown} value
 * @param {object} [options]
 * @returns {E}
 */
export const fill = (element, value, options = {}) => {
  options = options || {};
  const kind = kindOf(element, options);
  if (kind === SKIP) return element;
  if (kind === LEAF) {
    fillLeaf(element, value, options);
    return element;
  }
  const type = rootContainerType(element, options, kind);
  if (CONTAINERS.has(type)) {
    fillChildren(element, { type, value, index: 0 }, options);
  }
  return element;
};

// ---------------------------------------------------------------------------
// observe: call back with the object whenever the form is edited
// ---------------------------------------------------------------------------

const EVENTS = ["input", "change", "reset"];

/**
 * Call `callback(value, event)` with `obfo(element, options)` whenever the
 * element sees an `input`, `change` or `reset` event. The call is made in a
 * later task, so the events of one edit (a checkbox click fires `input` and
 * then `change`) make one call, and a reset is read after the fields are
 * reset; `debounce` (ms) waits for a pause instead. Returns an unsubscribe
 * function.
 *
 * @param {Element} element
 * @param {(value: any, event: Event | null) => void} callback
 * @param {object} [options]
 * @returns {() => void}
 */
export const observe = (element, callback, options = {}) => {
  const {
    debounce = 0,
    immediate = false,
    signal,
    onError,
    ...readOptions
  } = options || {};
  const view = element.ownerDocument?.defaultView ?? globalThis;
  let timer = null;
  let lastEvent = null;
  let stopped = false;

  const emit = () => {
    timer = null;
    if (stopped) return;
    const event = lastEvent;
    lastEvent = null;
    let value;
    try {
      value = obfo(element, readOptions);
    } catch (error) {
      if (onError) {
        onError(error);
        return;
      }
      throw error;
    }
    callback(value, event);
  };

  const cancel = () => {
    if (timer !== null) view.clearTimeout(timer);
    timer = null;
  };

  // Not a microtask: a browser runs microtasks after each listener of a
  // native event, between an edit's `input` and its `change`, and before a
  // `reset` has reset anything. A task later, all of that is done.
  const onEvent = (event) => {
    if (stopped) return;
    lastEvent = event;
    if (debounce > 0) cancel();
    else if (timer !== null) return;
    timer = view.setTimeout(emit, Math.max(0, debounce));
  };

  const unsubscribe = () => {
    if (stopped) return;
    stopped = true;
    cancel();
    for (const type of EVENTS) element.removeEventListener(type, onEvent);
    signal?.removeEventListener?.("abort", unsubscribe);
  };

  if (signal?.aborted) return () => {};
  for (const type of EVENTS) element.addEventListener(type, onEvent);
  signal?.addEventListener?.("abort", unsubscribe, { once: true });

  if (immediate) emit();
  return unsubscribe;
};

// ---------------------------------------------------------------------------
// formFromObject: plain JSON value -> form
// ---------------------------------------------------------------------------

const isPlainObject = (value) => {
  if (!isRecord(value) || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
};

const describe = (path) => (path === "" ? "the root value" : path);

const indexLabel = (path) => path.slice(path.lastIndexOf("["));

const buildField = (doc, value, key, path) => {
  if (Array.isArray(value) || isPlainObject(value)) {
    const fieldset = doc.createElement("fieldset");
    fieldset.setAttribute(
      "data-obfo-container",
      Array.isArray(value) ? "[]" : "{}"
    );
    if (key !== null) fieldset.setAttribute("data-obfo-name", key);
    const legend = doc.createElement("legend");
    legend.textContent = key ?? indexLabel(path);
    fieldset.append(legend);
    appendFields(doc, fieldset, value, path);
    return fieldset;
  }

  let input;
  if (typeof value === "string") {
    if (/[\r\n]/.test(value)) {
      input = doc.createElement("textarea");
      input.textContent = value;
    } else {
      input = doc.createElement("input");
      input.setAttribute("type", "text");
      input.setAttribute("value", value);
    }
  } else if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `formFromObject: ${describe(path)} is ${value}, which JSON can't hold`
      );
    }
    input = doc.createElement("input");
    input.setAttribute("type", "number");
    input.setAttribute("step", "any");
    input.setAttribute("data-obfo-cast", "number");
    input.setAttribute("value", String(value));
  } else if (typeof value === "boolean") {
    input = doc.createElement("input");
    input.setAttribute("type", "checkbox");
    input.setAttribute("data-obfo-cast", "checkbox");
    if (value) input.setAttribute("checked", "");
  } else if (value === null) {
    input = doc.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("data-obfo-cast", "null");
  } else {
    const what = isRecord(value)
      ? (value.constructor?.name ?? "object")
      : typeof value;
    throw new TypeError(
      `formFromObject: ${describe(path)} is a ${what}; only plain objects, arrays, strings, finite numbers, booleans and null are supported`
    );
  }
  if (key !== null) {
    input.setAttribute("name", key);
    input.setAttribute("data-obfo-name", key);
  }
  if (value === null) return input;
  const label = doc.createElement("label");
  const caption = doc.createElement("span");
  caption.textContent = key ?? indexLabel(path);
  label.append(caption, " ", input);
  return label;
};

const appendFields = (doc, parent, value, path) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      // JSON.stringify turns undefined array items into null; so do we.
      const field = item === undefined ? null : item;
      parent.append(buildField(doc, field, null, `${path}[${index}]`));
    });
    return;
  }
  for (const key of Object.keys(value)) {
    const item = value[key];
    if (item === undefined) continue; // dropped, as JSON.stringify does
    parent.append(buildField(doc, item, key, path ? `${path}.${key}` : key));
  }
};

/**
 * Build a simple form for a plain JSON value (an object or an array) that
 * `obfo` reads back as the same value. Values are set as attributes and
 * text, never parsed as HTML.
 *
 * @param {object | unknown[]} value
 * @param {{ document?: Document }} [options]
 * @returns {HTMLFormElement}
 */
export const formFromObject = (value, options = {}) => {
  const doc = options?.document ?? globalThis.document;
  if (!doc) {
    throw new TypeError("formFromObject needs a document: pass { document }");
  }
  if (!Array.isArray(value) && !isPlainObject(value)) {
    throw new TypeError("formFromObject needs a plain object or an array");
  }
  const form = doc.createElement("form");
  form.setAttribute("data-obfo-container", Array.isArray(value) ? "[]" : "{}");
  appendFields(doc, form, value, "");
  return form;
};
