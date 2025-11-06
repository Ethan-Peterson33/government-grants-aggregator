import slugify from "slugify";
import { prisma } from "../src/lib/prisma";

async function main() {
  const grants = await prisma.grant.findMany({
    where: {
      agencyId: null,
      OR: [
        { agencyName: { not: null } },
        { legacyAgency: { not: null } },
      ],
    },
    select: {
      id: true,
      agencyName: true,
      legacyAgency: true,
    },
  });

  let linked = 0;

  for (const grant of grants) {
    const raw = (grant.agencyName ?? grant.legacyAgency ?? "").trim();
    if (!raw) continue;

    const slug = slugify(raw, { lower: true, strict: true });
    if (!slug) continue;

    const agency = await prisma.agency.upsert({
      where: { slug },
      update: { agency_name: raw },
      create: { slug, agency_name: raw },
      select: { id: true },
    });

    await prisma.grant.update({
      where: { id: grant.id },
      data: { agencyId: agency.id, agencyName: raw },
    });

    linked += 1;
  }

  console.log(`Linked ${linked} grants`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
