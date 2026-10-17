import Link from "next/link";
export default function Privacy() {
  return (
    <main className="privacy-page">
      <Link href="/">← TastePassport</Link>
      <h1>Your tastes belong to you.</h1>
      <p>
        You can explore without creating an account. Guest Passports live
        temporarily in server memory and expire after inactivity or restart.
      </p>
      <h2>When you choose to save</h2>
      <p>
        An account stores the latest Passport per city: confirmed tastes, Qloo
        discoveries and evidence, explicit feedback and your My Vibe shortlist.
        If you save an outing, we also store its date, destination and chosen
        stops. Plans can be deleted individually and are removed when you delete
        your account. They do not represent bookings.
        We do not save conversation history, model-only comparisons, provider
        credentials or guest-session tokens in account storage. Saved evidence
        is dated; it is not a guarantee of current venue availability.
      </p>
      <h2>External services</h2>
      <p>
        Qloo receives cultural IDs, concepts, bounded preferences and the
        selected destination—not your account email or password. Gemini may
        receive cultural messages, taste context and discovery metadata to
        interpret requests and select tools. Supabase manages account
        authentication and saved Passport storage. Do not enter personal
        identifiers into taste or conversation fields.
      </p>
      <h2>Your controls</h2>
      <p>
        Saving is explicit. You can delete each saved city from My Passports.
        New Passport clears the current guest session; it does not delete an
        explicitly saved account copy. Sign out clears the current screen. Reset
        conversation preserves the Passport and your explicit likes.
      </p>
      <h2>Debug logs</h2>
      <p>
        Optional backend logs contain fixed event names, counts, statuses and
        random trace IDs. They omit account credentials, emails, passwords, raw
        conversations, signed tokens and service response bodies.
      </p>
      <h2>Account deletion</h2>
      <p>
        Open My Passports, expand Delete my account, re-enter your password and
        type DELETE to permanently remove the account and saved Passports. This
        requires connected account storage. Operators must still publish
        applicable retention/contact details and review this notice for their
        jurisdiction before launch.
      </p>
    </main>
  );
}
