import { NextRequest, NextResponse } from "next/server";
import { templates } from "@/lib/store";
import { deleteMetaTemplate } from "@/lib/whatsapp";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = templates.getById(id);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = templates.update(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = templates.getById(id);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (template.metaId) {
    try { await deleteMetaTemplate(template.name); } catch { /* continue */ }
  }

  templates.delete(id);
  return NextResponse.json({ success: true });
}
