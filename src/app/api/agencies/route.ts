import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Math.min(50, Number(searchParams.get("pageSize") ?? 20));

  const where = q
    ? {
        OR: [
          { slug: { contains: q, mode: "insensitive" as const } },
          { agency_name: { contains: q, mode: "insensitive" as const } },
          { agency_code: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, agencies] = await Promise.all([
    prisma.agency.count({ where }),
    prisma.agency.findMany({
      where,
      orderBy: { agency_name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ agencies, total, page, pageSize });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { slug, agency_name, agency_code, description, website, contacts } = body ?? {};

  if (!slug || !agency_name) {
    return NextResponse.json({ error: "slug and agency_name required" }, { status: 400 });
  }

  const result = await prisma.agency.upsert({
    where: { slug },
    update: { agency_name, agency_code, description, website, contacts },
    create: { slug, agency_name, agency_code, description, website, contacts },
  });

  return NextResponse.json(result);
}
