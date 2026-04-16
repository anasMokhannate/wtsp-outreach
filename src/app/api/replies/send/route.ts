import { NextRequest, NextResponse } from "next/server";
import { prospects, messages } from "@/lib/store";
import { sendTextMessage } from "@/lib/whatsapp";

// POST — Send a text reply to a prospect
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prospectId, text } = body;

  if (!prospectId || !text?.trim()) {
    return NextResponse.json(
      { error: "prospectId and text are required" },
      { status: 400 }
    );
  }

  const prospect = prospects.getById(prospectId);
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  try {
    const result = await sendTextMessage(prospect.phoneNumber, text.trim());

    const msg = messages.create({
      campaignId: "direct",
      prospectId: prospect.id,
      templateId: null,
      bodyText: text.trim(),
      status: "SENT",
      metaMessageId: result.messages?.[0]?.id || null,
      errorMessage: null,
      sentAt: new Date().toISOString(),
    });

    return NextResponse.json(msg);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send message" },
      { status: 500 }
    );
  }
}
