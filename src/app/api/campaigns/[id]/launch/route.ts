import { NextRequest, NextResponse } from "next/server";
import { campaigns, templates as templateStore, prospects as prospectStore, messages } from "@/lib/store";
import { sendTemplateMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { prospectIds } = body;

  const campaign = campaigns.getById(id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.templateIds.length === 0) {
    return NextResponse.json({ error: "Campaign has no templates" }, { status: 400 });
  }

  const template = templateStore.getById(campaign.templateIds[0]);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 400 });

  const allProspects = prospectStore.getAll();
  const targets = prospectIds?.length
    ? allProspects.filter((p) => prospectIds.includes(p.id))
    : allProspects;

  if (targets.length === 0) {
    return NextResponse.json({ error: "No prospects selected" }, { status: 400 });
  }

  campaigns.update(id, { status: "RUNNING", launchedAt: new Date().toISOString() });

  let totalSent = 0;
  let totalFailed = 0;

  for (const prospect of targets) {
    try {
      const result = await sendTemplateMessage(prospect.phoneNumber, template.name, template.language);
      messages.create({
        campaignId: id,
        prospectId: prospect.id,
        templateId: template.id,
        status: "SENT",
        metaMessageId: result.messages?.[0]?.id || null,
        errorMessage: null,
        sentAt: new Date().toISOString(),
      });
      totalSent++;
    } catch (err) {
      messages.create({
        campaignId: id,
        prospectId: prospect.id,
        templateId: template.id,
        status: "FAILED",
        metaMessageId: null,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        sentAt: null,
      });
      totalFailed++;
    }
  }

  const updated = campaigns.update(id, {
    status: "COMPLETED",
    completedAt: new Date().toISOString(),
    totalSent,
    totalFailed,
  });

  return NextResponse.json(updated);
}
