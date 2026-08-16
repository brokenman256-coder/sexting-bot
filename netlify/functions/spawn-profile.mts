import type { Config } from "@netlify/functions";

/** Every 30 minutes — spawn one established companion if under the 30/day cap. */
export default async () => {
  const base =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "https://nightline-chat.netlify.app";
  const secret =
    process.env.CRON_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "";

  const url = `${base.replace(/\/$/, "")}/api/cron/spawn-profile`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "x-cron-secret": secret,
        "User-Agent": "nightline-profile-bot/2",
      },
    });
    const text = await res.text();
    console.log("spawn-profile", res.status, text.slice(0, 400));
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("spawn-profile failed", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  schedule: "*/30 * * * *",
};
