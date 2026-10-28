/** Owns one cancellable request whose result may update the current draft. */
export function createLatestRequest() {
  let active: AbortController | undefined;

  return {
    start(): AbortController {
      active?.abort();
      active = new AbortController();
      return active;
    },
    isCurrent(controller: AbortController): boolean {
      return active === controller && !controller.signal.aborted;
    },
    cancel(): void {
      active?.abort();
      active = undefined;
    },
  };
}
