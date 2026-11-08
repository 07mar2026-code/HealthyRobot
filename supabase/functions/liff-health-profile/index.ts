const allowedOrigin = "https://07mar2026-code.github.io";
const lineChannelId = "2010801069";
const consentVersion = "2026-11-08";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};

function reply(status: number, code: string) {
  return Response.json({ ok: status === 200, code }, { status, headers: corsHeaders });
}

function measurementIsValid(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && value >= min && value <= max && Number.isInteger(value * 10);
}

async function verifyLineUser(accessToken: string): Promise<string | null> {
  const verifyUrl = new URL("https://api.line.me/oauth2/v2.1/verify");
  verifyUrl.searchParams.set("access_token", accessToken);
  const verification = await fetch(verifyUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (verification.status === 400 || verification.status === 401) return null;
  if (!verification.ok) throw new Error("LINE token verification unavailable");
  const { client_id, expires_in } = await verification.json();
  if (client_id !== lineChannelId || !Number.isFinite(expires_in) || expires_in <= 0) return null;

  const profile = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: "Bearer " + accessToken },
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (profile.status === 401 || profile.status === 403) return null;
  if (!profile.ok) throw new Error("LINE profile unavailable");
  const { userId } = await profile.json();
  return typeof userId === "string" && /^U[0-9a-f]{32}$/.test(userId) ? userId : null;
}

Deno.serve(async (request) => {
  if (request.headers.get("Origin") !== allowedOrigin) return reply(403, "origin_not_allowed");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return reply(405, "method_not_allowed");

  const accessToken = request.headers.get("Authorization")?.match(/^Bearer ([^\s,]+)$/i)?.[1];
  if (!accessToken || accessToken.length > 2048) return reply(401, "line_login_required");
  if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json") {
    return reply(415, "json_required");
  }

  try {
    const lineUserId = await verifyLineUser(accessToken);
    if (!lineUserId) return reply(401, "line_login_required");

    const data = await request.json().catch(() => null);
    if (!data || data.consentVersion !== consentVersion || data.consent !== true ||
      !["female", "male", "other"].includes(data.gender) ||
      !Number.isInteger(data.age) || data.age < 1 || data.age > 120 ||
      !measurementIsValid(data.heightCm, 80, 250) || !measurementIsValid(data.weightKg, 20, 400)) {
      return reply(400, "invalid_profile");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const apiKey = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !apiKey) return reply(503, "save_unavailable");

    const headers = new Headers({
      apikey: apiKey,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    });
    if (!keys.default) headers.set("Authorization", "Bearer " + apiKey);
    const now = new Date().toISOString();
    const saved = await fetch(new URL("/rest/v1/liff_health_profiles?on_conflict=line_user_id", supabaseUrl), {
      method: "POST",
      headers,
      body: JSON.stringify({
        line_user_id: lineUserId,
        gender: data.gender,
        age: data.age,
        height_cm: data.heightCm,
        weight_kg: data.weightKg,
        consent_version: consentVersion,
        consented_at: now,
        updated_at: now,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!saved.ok) return reply(503, "save_unavailable");

    return reply(200, "saved");
  } catch {
    return reply(503, "save_unavailable");
  }
});
