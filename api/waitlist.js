// Vercel serverless function — lives at /api/waitlist and is called by the
// waitlist form in index.html.
//
// Setup (in your Vercel project → Settings → Environment Variables):
//   RESEND_API_KEY — from resend.com/api-keys
//
// That's the only variable needed. Resend's current "Global Contacts" model
// doesn't require an Audience or Segment ID to create a contact — those are
// now optional, purely for internal organization. See:
// https://resend.com/docs/dashboard/segments/migrating-from-audiences-to-segments
//
// Leaving RESEND_API_KEY unset is safe — the function just returns a clear
// error instead of crashing, so add the real value yourself whenever ready.
//
// Optional: if you later want waitlist signups grouped into a Segment (e.g.
// the "General" one shown in your dashboard, or a new "Waitlist" one you
// create), grab its ID from the Segments tab and add it to the request body
// below as: segments: ["your-segment-id"]

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

  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY env var");
    return res.status(500).json({ error: "Waitlist isn't configured yet — try again soon" });
  }

  try {
    const resendRes = await fetch("https://api.resend.com/contacts", {
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
    });

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