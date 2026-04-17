import { NextResponse } from "next/server";
import { templates } from "@/lib/store";
import { fetchMetaTemplates } from "@/lib/whatsapp";

export async function POST() {
  try {
    const metaTemplates = await fetchMetaTemplates();
    const existing = templates.getAll();
    let imported = 0;
    let updated = 0;

    for (const mt of metaTemplates) {
      const name = mt.name as string;
      const components = (mt.components || []) as {
        type: string;
        text?: string;
        format?: string;
        example?: { header_text?: string[]; body_text?: string[][] };
      }[];

      const header = components.find((c) => c.type === "HEADER");
      const body = components.find((c) => c.type === "BODY");
      const footer = components.find((c) => c.type === "FOOTER");
      const buttons = components.find((c) => c.type === "BUTTONS");

      const headerSamples = header?.example?.header_text || null;
      const bodySamples = body?.example?.body_text?.[0] || null;

      const local = existing.find((t) => t.name === name);

      if (local) {
        templates.update(local.id, {
          metaId: mt.id as string,
          metaStatus: mt.status as string,
          category: mt.category as string,
          language: mt.language as string,
          headerSamples,
          bodySamples,
        });
        updated++;
      } else {
        templates.create({
          name,
          category: (mt.category as string) || "MARKETING",
          language: (mt.language as string) || "en_US",
          headerType: header?.format || null,
          headerText: header?.text || null,
          headerSamples,
          bodyText: body?.text || "",
          bodySamples,
          footerText: footer?.text || null,
          buttons: buttons ? JSON.stringify(buttons) : null,
        });
        // Update meta fields on the just-created template
        const all = templates.getAll();
        const created = all.find((t) => t.name === name);
        if (created) {
          templates.update(created.id, {
            metaId: mt.id as string,
            metaStatus: mt.status as string,
          });
        }
        imported++;
      }
    }

    return NextResponse.json({ total: metaTemplates.length, imported, updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
