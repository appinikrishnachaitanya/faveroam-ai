"use client";

export default function ErrorRecovery({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="page-recovery">
    <p className="micro-label">TASTEPASSPORT</p>
    <h1>Let’s get your discoveries back.</h1>
    <p>This view couldn’t load. Try again to recover the page.</p>
    <button onClick={reset}>Try again</button>
    <p><a href="/">Start a new Passport</a></p>
    <p className="helper">Starting over clears the open guest view. Any Passport explicitly saved to your account remains there.</p>
  </main>;
}
