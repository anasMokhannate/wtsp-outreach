import { NextResponse } from "next/server";
import { templates, campaigns, prospects, messages } from "@/lib/store";

export async function GET() {
  const allMessages = messages.getAll();

  const byStatus: Record<string, number> = {};
  for (const m of allMessages) {
    byStatus[m.status] = (byStatus[m.status] || 0) + 1;
  }

  const recentCampaigns = campaigns.getAll().slice(0, 5).map((c) => ({
    ...c,
    templates: c.templateIds.map((tid) => templates.getById(tid)).filter(Boolean),
    _count: { messages: allMessages.filter((m) => m.campaignId === c.id).length },
  }));

  return NextResponse.json({
    templates: templates.getAll().length,
    campaigns: campaigns.getAll().length,
    prospects: prospects.getAll().length,
    messages: { total: allMessages.length, byStatus },
    recentCampaigns,
  });
}
