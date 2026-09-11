// Vercel serverless function — lives at /api/waitlist and is called by the
// waitlist form in index.html.
//
// Setup (in your Vercel project → Settings → Environment Variables):
//   RESEND_API_KEY      — from resend.com/api-keys
//   RESEND_AUDIENCE_ID  — from resend.com/audiences (create an audience called
//                          something like "OG waitlist" and copy its ID)
//
// Leaving these unset is safe — the function just returns a clear error
// instead of crashing, so add the real values yourself whenever you're ready.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, handle } = req.body || {};

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY; // <-- add in Vercel env vars
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID; // <-- add in Vercel env vars

  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    console.error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID env vars");
    return res.status(500).json({ error: "Waitlist isn't configured yet — try again soon" });
  }

  try {
    const resendRes = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          unsubscribed: false,
          // Resend contacts don't have a native "X handle" field, so it's
          // tucked into first_name for now — fine for a waitlist, revisit if
          // you outgrow it.
          first_name: handle || undefined,
        }),
      }
    );

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", resendRes.status, errText);
      return res.status(502).json({ error: "Couldn't add you to the list right now" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Waitlist function error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
