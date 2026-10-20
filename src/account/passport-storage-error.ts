/** Report only fixed stages and validated database error codes; never log record data. */
export type PassportStorageStage =
  | "request"
  | "auth"
  | "list"
  | "restore-read"
  | "restore-snapshot"
  | "restore-session"
  | "save-session"
  | "save-snapshot"
  | "save-upsert";

export function safePassportStorageCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "unknown";
  const code = (error as { code?: unknown }).code;
  if (typeof code !== "string") return "unknown";
  return /^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/.test(code) ? code : "unknown";
}

export function passportStorageFailure(stage: PassportStorageStage, error: unknown) {
  const code = safePassportStorageCode(error);
  const preserved = "Your current Passport is preserved.";
  if (stage === "save-session")
    return { status: 410, message: `Your Passport session expired. Recreate the Passport and try again. ${preserved}`, code };
  if (stage === "save-snapshot")
    return { status: 422, message: `This Passport could not be prepared for saving. ${preserved}`, code };
  if (stage === "restore-snapshot")
    return { status: 422, message: "This saved Passport cannot be restored in the current format.", code };
  if (code === "42P01" || code === "PGRST205")
    return { status: 503, message: `Passport storage is missing a required database table or migration. ${preserved}`, code };
  if (code === "42501")
    return { status: 503, message: `Passport storage permissions need attention. ${preserved}`, code };
  if (code === "23514")
    return { status: 503, message: `Passport storage rejected a database constraint. ${preserved}`, code };
  return {
    status: stage === "list" ? 503 : 502,
    message: stage === "list"
      ? "Saved Passports are temporarily unavailable."
      : `Could not save or restore Passport. ${preserved}`,
    code,
  };
}
