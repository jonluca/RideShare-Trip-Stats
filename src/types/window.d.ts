declare global {
  import type $ from "jquery";
  interface Window {
    $: $;
    jQuery: $;
  }
}
export {};
