import { NextRequest, NextResponse } from "next/server";
import { campaigns, templates as templateStore, prospects as prospectStore, messages } from "@/lib/store";
import { sendTemplateMessage } from "@/lib/whatsapp";
import {
  extractVariables,
  buildParamsArray,
  VariableMapping,
} from "@/lib/template-vars";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const {
    prospectIds,
    headerVariables,
    bodyVariables,
  }: {
    prospectIds?: string[];
    headerVariables?: Record<number, VariableMapping>;
    bodyVariables?: Record<number, VariableMapping>;
  } = body;

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

  const headerVarNums = extractVariables(template.headerText);
  const bodyVarNums = extractVariables(template.bodyText);
  const headerMappings = headerVariables || {};
  const bodyMappings = bodyVariables || {};

  // Validate all required variables have a mapping
  const missingHeader = headerVarNums.filter((n) => !headerMappings[n]);
  const missingBody = bodyVarNums.filter((n) => !bodyMappings[n]);
  if (missingHeader.length > 0 || missingBody.length > 0) {
    return NextResponse.json(
      {
        error: `Missing variable mappings. Header: ${missingHeader.join(", ") || "none"}, Body: ${missingBody.join(", ") || "none"}`,
      },
      { status: 400 }
    );
  }

  campaigns.update(id, { status: "RUNNING", launchedAt: new Date().toISOString() });

  let totalSent = 0;
  let totalFailed = 0;

  for (const prospect of targets) {
    const prospectData = {
      name: prospect.name,
      email: prospect.email,
      phoneNumber: prospect.phoneNumber,
    };

    const headerParams =
      headerVarNums.length > 0
        ? buildParamsArray(headerVarNums, headerMappings, prospectData)
        : undefined;
    const bodyParams =
      bodyVarNums.length > 0
        ? buildParamsArray(bodyVarNums, bodyMappings, prospectData)
        : undefined;

    try {
      const result = await sendTemplateMessage(
        prospect.phoneNumber,
        template.name,
        template.language,
        { headerParams, bodyParams }
      );
      messages.create({
        campaignId: id,
        prospectId: prospect.id,
        templateId: template.id,
        bodyText: null,
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
        bodyText: null,
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
