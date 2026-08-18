export const SEARCH_SUBMIT_EVENT = "odysseia:search-submit";

export function dispatchSearchSubmit() {
  window.dispatchEvent(new Event(SEARCH_SUBMIT_EVENT));
}
