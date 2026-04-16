import { NextRequest, NextResponse } from "next/server";
import { settings } from "@/lib/store";

export async function GET() {
  return NextResponse.json(settings.get());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const saved = settings.save(body);
  return NextResponse.json(saved);
}
