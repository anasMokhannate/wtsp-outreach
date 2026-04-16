import { NextResponse } from "next/server";
import { replies, prospects, messages } from "@/lib/store";

// GET — List conversations (grouped by prospect) with latest reply and unread count
export async function GET() {
  const allReplies = replies.getAll();
  const allMessages = messages.getAll();

  // Group replies by prospectId (or fromPhone for unknown prospects)
  const convMap = new Map<
    string,
    {
      prospectId: string | null;
      fromPhone: string;
      lastReply: typeof allReplies[0];
      unreadCount: number;
      totalReplies: number;
      totalSent: number;
    }
  >();

  for (const r of allReplies) {
    const key = r.prospectId || r.fromPhone;
    const existing = convMap.get(key);

    if (!existing) {
      convMap.set(key, {
        prospectId: r.prospectId,
        fromPhone: r.fromPhone,
        lastReply: r,
        unreadCount: r.isRead ? 0 : 1,
        totalReplies: 1,
        totalSent: 0,
      });
    } else {
      existing.totalReplies++;
      if (!r.isRead) existing.unreadCount++;
      // allReplies is sorted newest first, so the first entry is already the latest
    }
  }

  // Count sent messages per prospect
  for (const m of allMessages) {
    if (m.status === "SENT" || m.status === "DELIVERED" || m.status === "READ") {
      const conv = convMap.get(m.prospectId);
      if (conv) conv.totalSent++;
    }
  }

  // Enrich with prospect info
  const conversations = Array.from(convMap.values()).map((conv) => {
    const prospect = conv.prospectId
      ? prospects.getById(conv.prospectId)
      : null;

    return {
      id: conv.prospectId || conv.fromPhone,
      prospectId: conv.prospectId,
      fromPhone: conv.fromPhone,
      prospectName: prospect?.name || null,
      prospectPhone: prospect?.phoneNumber || conv.fromPhone,
      lastMessage: conv.lastReply.messageText,
      lastMessageAt: conv.lastReply.timestamp,
      unreadCount: conv.unreadCount,
      totalReplies: conv.totalReplies,
      totalSent: conv.totalSent,
    };
  });

  // Sort by last message time (newest first)
  conversations.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  return NextResponse.json(conversations);
}
