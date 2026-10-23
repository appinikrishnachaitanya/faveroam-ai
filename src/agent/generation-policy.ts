/** Explicit native Gemini settings. These are ceilings, not target response lengths. */
// Keep Gemini's documented default as the baseline. Correctness and safety are
// enforced by schemas and server validation rather than low-temperature output.
export const GEMINI_TEMPERATURE = 1.0;
export function generationSettings(phase: "decision" | "response") {
  return {
    temperature: GEMINI_TEMPERATURE,
    // Structured calls need room for arguments and model reasoning. Short
    // conclusions/evidence selections have a separate, smaller output ceiling.
    maxOutputTokens: phase === "decision" ? 2048 : 4096,
  };
}
