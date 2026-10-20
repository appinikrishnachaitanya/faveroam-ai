"use client";

export default function ErrorRecovery({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="page-recovery">
    <p className="micro-label">TASTEPASSPORT</p>
    <h1>Your Passport hit a display problem.</h1>
    <p>We couldn't display the latest update. Try restoring your last successfully displayed Passport in this browser tab.</p>
    <button onClick={reset}>Restore my Passport view</button>
    <p><a href="/">Start a new Passport</a></p>
    <p className="helper">If a guest backup is available, it will be restored here. Saving or making new changes still requires an active server session. Starting a new Passport clears the open guest view; saved account Passports are unaffected.</p>
  </main>;
}
