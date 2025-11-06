import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 12));

  const agency = await prisma.agency.findUnique({ where: { slug: params.slug } });
  if (!agency) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [total, grants] = await Promise.all([
    prisma.grant.count({ where: { agencyId: agency.id } }),
    prisma.grant.findMany({
      where: { agencyId: agency.id },
      orderBy: { title: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ agency, grants, total, page, pageSize });
}
