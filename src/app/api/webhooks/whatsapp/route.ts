import { NextRequest, NextResponse } from "next/server";
import {
  settings as settingsStore,
  prospects,
  messages,
  replies,
} from "@/lib/store";

// GET — Meta webhook verification (hub.mode, hub.verify_token, hub.challenge)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const s = settingsStore.get();

  if (
    mode === "subscribe" &&
    token &&
    s.webhookVerifyToken &&
    token === s.webhookVerifyToken
  ) {
    // Return the challenge as plain text (Meta expects this)
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST — Incoming webhook events from Meta
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Meta sends a top-level "entry" array
  const entries = body.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];

    for (const change of changes) {
      if (change.field !== "messages") continue;

      const value = change.value || {};

      // Handle incoming messages
      if (value.messages) {
        for (const msg of value.messages) {
          handleIncomingMessage(msg, value.contacts);
        }
      }

      // Handle status updates (sent -> delivered -> read)
      if (value.statuses) {
        for (const status of value.statuses) {
          handleStatusUpdate(status);
        }
      }
    }
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ status: "ok" });
}

function handleIncomingMessage(
  msg: {
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: { body: string };
    image?: { id: string; mime_type: string; caption?: string };
    video?: { id: string; mime_type: string; caption?: string };
    audio?: { id: string; mime_type: string };
    document?: { id: string; mime_type: string; filename?: string; caption?: string };
    sticker?: { id: string; mime_type: string };
    reaction?: { emoji: string; message_id: string };
    location?: { latitude: number; longitude: number; name?: string };
    button?: { text: string; payload: string };
    interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
  },
  contacts?: { profile?: { name?: string }; wa_id?: string }[]
) {
  const fromPhone = msg.from;

  // Try to find matching prospect
  const prospect = prospects.getByPhone(fromPhone);

  // Extract message text based on type
  let messageText: string | null = null;
  let mediaType: string | null = null;

  switch (msg.type) {
    case "text":
      messageText = msg.text?.body || null;
      break;
    case "image":
      mediaType = "image";
      messageText = msg.image?.caption || "[Image]";
      break;
    case "video":
      mediaType = "video";
      messageText = msg.video?.caption || "[Video]";
      break;
    case "audio":
      mediaType = "audio";
      messageText = "[Audio message]";
      break;
    case "document":
      mediaType = "document";
      messageText = msg.document?.caption || `[Document: ${msg.document?.filename || "file"}]`;
      break;
    case "sticker":
      mediaType = "sticker";
      messageText = "[Sticker]";
      break;
    case "reaction":
      messageText = `Reacted with ${msg.reaction?.emoji || ""}`;
      break;
    case "location":
      mediaType = "location";
      messageText = msg.location?.name || `[Location: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
      break;
    case "button":
      messageText = msg.button?.text || "[Button reply]";
      break;
    case "interactive":
      messageText =
        msg.interactive?.button_reply?.title ||
        msg.interactive?.list_reply?.title ||
        "[Interactive reply]";
      break;
    default:
      messageText = `[${msg.type || "Unknown"} message]`;
  }

  // If prospect doesn't exist and we have contact info, auto-create
  let prospectId = prospect?.id || null;
  if (!prospect) {
    const contactName =
      contacts?.find((c) => c.wa_id === fromPhone)?.profile?.name || null;
    const newProspect = prospects.create({
      phoneNumber: fromPhone,
      name: contactName || undefined,
    });
    prospectId = newProspect.id;
  }

  replies.create({
    prospectId,
    fromPhone,
    messageText,
    mediaType,
    metaMessageId: msg.id || null,
    timestamp: msg.timestamp
      ? new Date(parseInt(msg.timestamp) * 1000).toISOString()
      : new Date().toISOString(),
  });
}

function handleStatusUpdate(status: {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}) {
  const statusMap: Record<string, string> = {
    sent: "SENT",
    delivered: "DELIVERED",
    read: "READ",
    failed: "FAILED",
  };

  const newStatus = statusMap[status.status];
  if (newStatus && status.id) {
    messages.updateStatus(status.id, newStatus);
  }
}
