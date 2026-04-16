import { NextRequest, NextResponse } from "next/server";
import { prospects, messages } from "@/lib/store";

export async function GET() {
  const allMessages = messages.getAll();
  const all = prospects.getAll().map((p) => ({
    ...p,
    _count: { messages: allMessages.filter((m) => m.prospectId === p.id).length },
  }));
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (Array.isArray(body)) {
    let count = 0;
    for (const p of body) {
      if (p.phoneNumber) {
        prospects.create(p);
        count++;
      }
    }
    return NextResponse.json({ count }, { status: 201 });
  }

  const { phoneNumber, name, email, tags } = body;
  if (!phoneNumber) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const prospect = prospects.create({ phoneNumber, name, email, tags });
  return NextResponse.json(prospect, { status: 201 });
}
