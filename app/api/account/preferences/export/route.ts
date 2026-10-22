import { accountRows, currentUser, gcpAccountConfigured } from "../../../../../src/account/gcp";
import { privateJson } from "../../../../../src/account/server";
import { exportTasteProfile, validProfileId } from "../../../../../src/account/profile-record";
import { debugRequest } from "../../../../../src/agent/debug";

export function GET(request: Request) {
  return debugRequest("account.preferences", async () => {
    if (!gcpAccountConfigured()) return privateJson({ error: "Profile storage is unavailable." }, 503);
    try {
      const user = await currentUser();
      if (!user) return privateJson({ error: "Sign in to export your profiles." }, 401);
      const id = new URL(request.url).searchParams.get("id");
      if (id && !validProfileId(id)) return privateJson({ error: "Invalid profile identifier." }, 400);
      const rows = id ? [await accountRows(user.uid, "profiles").doc(id).get()] :
        (await accountRows(user.uid, "profiles").orderBy("updated_at", "desc").get()).docs;
      if (id && !rows[0]?.exists) return privateJson({ error: "Profile not found." }, 404);
      const profiles = rows.filter(row => row.exists).map(row => exportTasteProfile({ id: row.id, ...row.data() } as Parameters<typeof exportTasteProfile>[0]));
      return Response.json({ schema: "tastepassport.profile-export", version: 1, profiles }, { headers: {
        "Cache-Control": "private, no-store", Vary: "Cookie", "Content-Disposition": 'attachment; filename="tastepassport-profiles.json"',
      } });
    } catch { return privateJson({ error: "Profiles could not be exported. Please retry." }, 503); }
  });
}
