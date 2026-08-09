import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getConfig, spendCredits } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Accepts base64 media from client for chat attachment.
 * Stores as data-URL reference (client already has it); validates size/type.
 * For production scale, swap to S3 / Vercel Blob.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await req.json();
  const dataUrl = String(body.dataUrl || "");
  const mediaType = String(body.mediaType || "image") as
    | "image"
    | "audio"
    | "video"
    | "voice_note";

  if (!dataUrl.startsWith("data:")) {
    return NextResponse.json({ error: "Invalid media" }, { status: 400 });
  }

  // ~4MB limit for data URLs in this MVP
  if (dataUrl.length > 5_500_000) {
    return NextResponse.json(
      { error: "File too large (max ~4MB). Compress and retry." },
      { status: 400 }
    );
  }

  const mime = dataUrl.slice(5, dataUrl.indexOf(";"));
  if (mediaType === "image" && !mime.startsWith("image/")) {
    return NextResponse.json({ error: "Expected image" }, { status: 400 });
  }
  if (
    (mediaType === "audio" || mediaType === "voice_note") &&
    !mime.startsWith("audio/")
  ) {
    return NextResponse.json({ error: "Expected audio" }, { status: 400 });
  }

  const cfg = await getConfig();
  if (user.level < 1) {
    return NextResponse.json({ error: "Media not allowed" }, { status: 403 });
  }

  // Reserve media credit (actual spend happens on chat send)
  if (user.credits < cfg.mediaCreditCost) {
    return NextResponse.json(
      { error: "Not enough credits for media" },
      { status: 402 }
    );
  }

  return NextResponse.json({
    ok: true,
    mediaUrl: dataUrl,
    mediaType,
    creditCost: cfg.mediaCreditCost,
  });
}
