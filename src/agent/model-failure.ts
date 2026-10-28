/** Bounded diagnostic categories; never inspect or emit provider response bodies. */
export function modelFailureReason(error: unknown, signal?: AbortSignal): string {
  const value = error as {status?:number; name?:string};
  if (value?.status === 429) return "rate-limit";
  if (signal?.aborted) return signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled";
  if (value?.name === "TimeoutError" || value?.status === 504) return "timeout";
  if (typeof value?.status === "number") return "provider";
  return "transport";
}
