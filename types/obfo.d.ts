// Assuming obfo is a function that takes a form reference and returns a Promise of an object
declare module "obfo" {
  // Adjust the parameter and return types based on the actual implementation
  export default function <T = object>(formRef: HTMLFormElement): T;
}
