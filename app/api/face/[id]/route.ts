import { NextResponse } from "next/server";
import { getFaceBytes } from "@/lib/db-characters";

export const runtime = "nodejs";

/**
 * Serves AI-generated companion portraits.
 * Path: /api/face/<sha1>.jpg  (content-addressed → immutable, cache forever)
 * Public: portraits of fictional characters, no user data.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const hash = id.replace(/\.jpe?g$/i, "").toLowerCase();
  if (!/^[a-f0-9]{8,64}$/.test(hash)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const bytes = await getFaceBytes(hash);
  if (!bytes) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}