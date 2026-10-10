# Obfo (Object Form)

<img src="./logo.webp" style="width:256px; height:256px">

Convert HTML Forms into nested JavaScript objects.

## Installation

```shell
npm install obfo
```

## Usage

```html
<form id="fo" data-obfo-container="{}">
  <input name="first" value="Jon" />
  <input name="last" value="Doe" />
</form>
```

```javascript
import obfo from "obfo";
const fo = document.getElementById("fo");
const ob = obfo(fo);
console.log(ob); // logs { first: "Jon", last: "Doe" }
```

## Attributes

To handle the differences between HTML forms and JavaScript object structures, we use data attributes to define container behavior.

### data-obfo-container

The `data-obfo-container` attribute groups elements into dictionaries (`{}`) or arrays (`[]`) when converting a form to an object.

An element is considered a "direct child" of a container if:

- It is an input (`input`, `textarea`, `select`) element or has a `data-obfo-container` attribute.
- There are no other elements between the container and the element.

Elements that are not inputs or do not have the `data-obfo-container` attribute are ignored. Unless specified with the `option.submit` parameter, `button` elements are also ignored.

Note: The `data-obfo-container` attribute must be set on the top form element.

#### data-obfo-container: {}

Direct children of `data-obfo-container="{}"` must have a `name` or `data-obfo-name` attribute set.

Example:

```html
<form id="fo" data-obfo-container="{}">
  <input name="first" value="Jon" />
  <input name="last" value="Doe" />
</form>
```

```javascript
import obfo from "obfo";
const fo = document.getElementById("fo");
const ob = obfo(fo);
console.log(ob); // logs { first: "Jon", last: "Doe" }
```

#### data-obfo-container: []

`name` and `data-obfo-name` attributes on direct children of `data-obfo-container="[]"` are ignored.

Example:

```html
<form id="fo" data-obfo-container="[]">
  <input name="first" value="Jon" />
  <input name="last" value="Doe" />
</form>
```

```javascript
import obfo from "obfo";
const fo = document.getElementById("fo");
const ob = obfo(fo);
console.log(ob); // logs ["Jon", "Doe"]
```

### data-obfo-name

This attribute is used as the key if the container is a direct child of a dictionary.

### data-obfo-value

This attribute is used to extract the text of a non-input element to use as a value.
It should be used in conjunction with `data-obfo-name` where a key is required.

### data-obfo-cast

The `data-obfo-cast` attribute casts the input value to a specific type. The available types are:

- `string` (default) - The value as is.
- `checkbox/radio` - `true` or `false` based on the "checked" state of the element.
- `number` - The value as a number.
- `bigint` - The value as a BigInt.
- `date` - The value as a Date object.
- `file` - Used on `input[type=file]`. Returns the first file object, which can later be read using `FileReader`.
- `files` - Returns a list of file objects (see `file` above).
- `null` - `null`
- `undefined` - `undefined`

If `data-obfo-cast` is used without a value, it defaults to the value of the "type" attribute.

Example:

```html
<input type="checkbox" data-obfo-cast="checkbox" />
<!-- is equivalent to -->
<input type="checkbox" data-obfo-cast />
```

### Comprehensive Examples

Example with nested objects:

```html
<form id="fo" data-obfo-container="{}">
  <input name="first" value="Jon" />
  <input name="last" value="Doe" />
  <div data-obfo-container="{}" data-obfo-name="address">
    <input name="street" value="123 Main St" />
    <input name="city" value="Anytown" />
  </div>
</form>
```

```javascript
import obfo from "obfo";
const fo = document.getElementById("fo");
const ob = obfo(fo);
console.log(ob); // logs { first: "Jon", last: "Doe", address: { street: "123 Main St", city: "Anytown" } }
```

Example with arrays:

```html
<form id="fo" data-obfo-container="{}">
  <div data-obfo-container="[]" data-obfo-name="tags">
    <input value="JavaScript" />
    <input value="HTML" />
    <input value="CSS" />
  </div>
</form>
```

```javascript
import obfo from "obfo";
const fo = document.getElementById("fo");
const ob = obfo(fo);
console.log(ob); // logs { tags: ["JavaScript", "HTML", "CSS"] }
```
