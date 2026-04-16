import { NextRequest, NextResponse } from "next/server";
import {
  replies,
  messages,
  prospects,
  templates,
} from "@/lib/store";

// GET — Full conversation thread for a prospect (sent messages + replies interleaved)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  const { prospectId } = await params;

  const prospect = prospects.getById(prospectId);
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  // Get all sent messages to this prospect
  const sentMessages = messages.getByProspect(prospectId).map((m) => {
    const template = m.templateId ? templates.getById(m.templateId) : null;
    return {
      id: m.id,
      type: "sent" as const,
      text: template ? template.bodyText : "[Template message]",
      templateName: template?.name || null,
      status: m.status,
      timestamp: m.sentAt || m.createdAt,
    };
  });

  // Get all replies from this prospect
  const prospectReplies = replies.getByProspect(prospectId);

  // Mark unread replies as read
  const unreadIds = prospectReplies.filter((r) => !r.isRead).map((r) => r.id);
  if (unreadIds.length > 0) {
    replies.markRead(unreadIds);
  }

  const replyItems = prospectReplies.map((r) => ({
    id: r.id,
    type: "received" as const,
    text: r.messageText,
    mediaType: r.mediaType,
    status: null,
    timestamp: r.timestamp,
  }));

  // Merge and sort by timestamp
  const thread = [...sentMessages, ...replyItems].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );

  return NextResponse.json({
    prospect: {
      id: prospect.id,
      name: prospect.name,
      phoneNumber: prospect.phoneNumber,
      tags: prospect.tags,
    },
    thread,
    totalSent: sentMessages.length,
    totalReceived: replyItems.length,
  });
}
