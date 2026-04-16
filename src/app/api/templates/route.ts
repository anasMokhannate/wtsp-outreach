import { NextRequest, NextResponse } from "next/server";
import { templates } from "@/lib/store";
import { createMetaTemplate } from "@/lib/whatsapp";

export async function GET() {
  return NextResponse.json(templates.getAll());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, category, language, headerType, headerText, bodyText, footerText, buttons, syncToMeta } = body;

  if (!name || !bodyText) {
    return NextResponse.json({ error: "Name and body text are required" }, { status: 400 });
  }

  const template = templates.create({
    name,
    category: category || "MARKETING",
    language: language || "en_US",
    headerType: headerType || null,
    headerText: headerText || null,
    bodyText,
    footerText: footerText || null,
    buttons: buttons || null,
  });

  if (syncToMeta) {
    try {
      const metaResult = await createMetaTemplate(template);
      const updated = templates.update(template.id, { metaId: metaResult.id, metaStatus: "PENDING" });
      return NextResponse.json(updated, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Meta sync failed";
      return NextResponse.json({ ...template, metaSyncError: message }, { status: 201 });
    }
  }

  return NextResponse.json(template, { status: 201 });
}
