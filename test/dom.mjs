// A fresh happy-dom window per call. No DOM globals are installed: obfo has
// to work from the elements alone (the 0.0.9 code needed a global
// HTMLInputElement and threw a ReferenceError here).
import { Window } from "happy-dom";

export const dom = (markup = "") => {
  const window = new Window();
  const { document } = window;
  document.body.innerHTML = markup;
  return { window, document, root: document.body.firstElementChild };
};

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
