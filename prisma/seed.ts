import { PrismaClient, Role, WorkSource, WorkStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Categories ──
  const categories = await Promise.all(
    ["AI in Education", "AI Ethics", "NLP", "Digital Equity"].map((name) =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, slug: name.toLowerCase().replace(/\s+/g, "-") },
      })
    )
  );

  // ── Test accounts ──
  const passwordHash = await bcrypt.hash("password123", 10);

  const librarian = await prisma.user.upsert({
    where: { email: "librarian@library.edu" },
    update: {},
    create: {
      name: "Dr. Elena Cruz",
      email: "librarian@library.edu",
      passwordHash,
      role: Role.LIBRARIAN,
      institution: "University of the Philippines",
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@library.edu" },
    update: {},
    create: {
      name: "Maria Santos",
      email: "student@library.edu",
      passwordHash,
      role: Role.STUDENT,
      institution: "University of the Philippines",
    },
  });

  // ── Sample works (mirrors the frontend mock data) ──
  const aiEdu = categories.find((c) => c.name === "AI in Education")!;

  await prisma.work.upsert({
    where: { openAlexId: "W_SAMPLE_001" },
    update: {},
    create: {
      openAlexId: "W_SAMPLE_001",
      title:
        "Artificial Intelligence in Philippine Higher Education: Adoption Barriers and Opportunities",
      abstractText:
        "This study examines the barriers and enabling factors affecting AI adoption in Philippine universities through a survey of 412 faculty members across 18 institutions.",
      year: 2023,
      journal: "Journal of Educational Technology",
      doi: "10.1234/jet.2023.0041",
      authors: ["Reyes, M. A.", "Santos, J. L.", "Cruz, D. P."],
      method: "Survey",
      country: "Philippines",
      citationCount: 87,
      openAccess: true,
      source: WorkSource.MANUAL,
      status: WorkStatus.APPROVED,
      categoryId: aiEdu.id,
      addedById: librarian.id,
      reviewedById: librarian.id,
      reviewedAt: new Date(),
    },
  });

  console.log("Seed complete:", { librarian: librarian.email, student: student.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
