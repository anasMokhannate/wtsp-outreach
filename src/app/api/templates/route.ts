import { NextRequest, NextResponse } from "next/server";
import { templates } from "@/lib/store";
import { createMetaTemplate } from "@/lib/whatsapp";

export async function GET() {
  return NextResponse.json(templates.getAll());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, category, language, headerType, headerText, headerSamples, bodyText, bodySamples, footerText, buttons, syncToMeta } = body;

  if (!name || !bodyText) {
    return NextResponse.json({ error: "Name and body text are required" }, { status: 400 });
  }

  const template = templates.create({
    name,
    category: category || "MARKETING",
    language: language || "en_US",
    headerType: headerType || null,
    headerText: headerText || null,
    headerSamples: Array.isArray(headerSamples) && headerSamples.length > 0 ? headerSamples : null,
    bodyText,
    bodySamples: Array.isArray(bodySamples) && bodySamples.length > 0 ? bodySamples : null,
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
      // Local template was saved, but Meta sync failed. Return 502 so UI can show the error.
      return NextResponse.json(
        { error: `Template saved locally but Meta sync failed: ${message}`, template },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(template, { status: 201 });
}
