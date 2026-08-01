import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { exportPuzzleDef, savePuzzleDef } from "@/lib/db/puzzle-io";
import { requireConstructor } from "@/lib/auth/constructors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // The editor writes straight into the published library.
  const denied = await requireConstructor();
  if (denied) return denied;

  const { id } = await params;
  const def = await exportPuzzleDef(id);
  if (!def) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let slug = `${def.slug}-copy`;
  let n = 2;
  while (await prisma.puzzle.findUnique({ where: { slug } })) {
    slug = `${def.slug}-copy-${n++}`;
  }

  const copy = await savePuzzleDef({
    ...def,
    slug,
    title: `${def.title} (copy)`,
    status: "draft",
    publicationDate: undefined,
  });
  return NextResponse.json({ id: copy.id });
}
