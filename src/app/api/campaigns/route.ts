import { NextRequest, NextResponse } from "next/server";
import { campaigns, templates as templateStore } from "@/lib/store";

export async function GET() {
  const all = campaigns.getAll().map((c) => ({
    ...c,
    templates: c.templateIds.map((tid) => templateStore.getById(tid)).filter(Boolean),
  }));
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, templateIds } = body;

  if (!name) {
    return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  }

  const campaign = campaigns.create({ name, description, templateIds });
  const withTemplates = {
    ...campaign,
    templates: campaign.templateIds.map((tid: string) => templateStore.getById(tid)).filter(Boolean),
  };

  return NextResponse.json(withTemplates, { status: 201 });
}
