import { NextRequest, NextResponse } from "next/server";
import { replies, prospects } from "@/lib/store";

// GET — List all replies, optionally filtered by prospectId
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const prospectId = url.searchParams.get("prospectId");

  let allReplies = replies.getAll();

  if (prospectId) {
    allReplies = allReplies.filter((r) => r.prospectId === prospectId);
  }

  // Enrich with prospect info
  const enriched = allReplies.map((r) => {
    const prospect = r.prospectId ? prospects.getById(r.prospectId) : null;
    return {
      ...r,
      prospect: prospect
        ? { id: prospect.id, name: prospect.name, phoneNumber: prospect.phoneNumber }
        : null,
    };
  });

  return NextResponse.json(enriched);
}

// PUT — Mark replies as read
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { ids } = body;

  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  replies.markRead(ids);
  return NextResponse.json({ success: true });
}
