"use strict";

/**
 * Array of HTML element classes that represent input elements.
 * @type {Array<Function>}
 */
const INPUT_ELEMENTS = [
  HTMLInputElement,
  HTMLTextAreaElement,
  HTMLSelectElement,
  HTMLButtonElement,
];
/**
 * Checks if the given element is an input element.
 *
 * @param {HTMLElement} element - The element to check.
 * @returns {boolean} - Returns true if the element is an input element, otherwise false.
 */
const isInputElement = (element) => {
  return INPUT_ELEMENTS.some((type) => element instanceof type);
};

/**
 * Parses the value of an HTML element based on the specified cast type.
 *
 * @param {HTMLElement} element - The HTML element to parse.
 * @param {string} [cast="string"] - The cast type to apply to the element's value.
 * @returns {*} The parsed value based on the cast type.
 * @throws {Error} If the cast type is "file" and the element is not an input[type=file].
 */
const DEFAULT_PARSER = (element, cast = "string") => {
  const { value } = element;
  const castType = cast === "" ? element.type : cast;

  switch (castType) {
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
      return element.files;
    case "string":
    default:
      return value;
  }
};

/**
 * Represents a utility function for parsing form elements and constructing an object.
 *
 * @param {HTMLElement} element - The form element to parse.
 * @param {Object} [options] - The options for parsing the form element.
 * @param {Function} [options.parse] - The parsing function to use. Defaults to `DEFAULT_PARSER`.
 * @param {Object} [parent] - The parent object to attach the parsed values to.
 * @returns {any} - The parsed value or the parent object with attached values.
 * @throws {Error} - Throws an error if `data-obfo-container-name` is missing for nested objects.
 */
const FormObject = (
  element,
  options = { parse: DEFAULT_PARSER },
  parent = null
) => {
  const parseValue = options.parse || DEFAULT_PARSER;
  const name = element.name || element.getAttribute("data-obfo-container-name");
  const cast = element.getAttribute("data-obfo-cast");
  const containerType = element.getAttribute("data-obfo-container-type");
  const tag = element.tagName.toLowerCase();
  if (isInputElement(element)) {
    if (element !== options.submit) {
      if (tag === "button") {
        return;
      }
      if (element.type === "submit") {
        return;
      }
      if (element.type === "image") {
        return;
      }
    }

    const value = parseValue(element, cast);
    if (!parent) {
      return value;
    }
    if (Array.isArray(parent)) {
      parent.push(value);
      return parent;
    }
    if (parent) {
      if (name === null) {
        throw new Error(
          "data-obfo-container-name is required for nested objects"
        );
      }
      parent[name] = value;
      return parent;
    }
  } else if (containerType) {
    const value =
      containerType === "[]" ? [] : containerType === "{}" ? {} : null;
    for (const child of element.children) {
      FormObject(child, options, value);
    }
    if (!parent) {
      return value;
    }
    if (Array.isArray(parent)) {
      parent.push(value);
      return parent;
    }
    if (parent) {
      if (name === null) {
        throw new Error(
          "data-obfo-container-name is required for nested objects"
        );
      }
      parent[name] = value;
      return parent;
    }
  } else {
    for (const child of element.children) {
      FormObject(child, options, parent);
    }
    return parent;
  }
};

export default FormObject;
