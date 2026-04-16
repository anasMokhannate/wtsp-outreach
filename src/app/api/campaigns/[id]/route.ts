import { NextRequest, NextResponse } from "next/server";
import { campaigns, templates as templateStore, messages } from "@/lib/store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = campaigns.getById(id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...campaign,
    templates: campaign.templateIds.map((tid) => templateStore.getById(tid)).filter(Boolean),
    messages: messages.getByCampaign(id),
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = campaigns.update(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...updated,
    templates: updated.templateIds.map((tid) => templateStore.getById(tid)).filter(Boolean),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  campaigns.delete(id);
  return NextResponse.json({ success: true });
}
