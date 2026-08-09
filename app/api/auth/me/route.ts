import { NextResponse } from "next/server";
import { requireUser, toPublicUser } from "@/lib/auth";
import { getConfig } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const config = await getConfig();
  return NextResponse.json({
    user: toPublicUser(user),
    config: {
      siteTitle: config.siteTitle,
      welcomeNote: config.welcomeNote,
      messageCreditCost: config.messageCreditCost,
      voiceCreditCost: config.voiceCreditCost,
      mediaCreditCost: config.mediaCreditCost,
      levels: config.levels,
    },
  });
}
