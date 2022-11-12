declare global {
  interface Window {
    $: import("jquery");
    jQuery: import("jquery");
  }
}
export {};
