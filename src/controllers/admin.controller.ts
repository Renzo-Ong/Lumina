import { Request, Response } from "express";
import { WorkStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";

// GET /admin/stats — powers the librarian dashboard
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [totalWorks, approvedWorks, pendingWorks, openAccessWorks, totalStudents, totalCollections] =
    await Promise.all([
      prisma.work.count(),
      prisma.work.count({ where: { status: WorkStatus.APPROVED } }),
      prisma.work.count({ where: { status: WorkStatus.PENDING } }),
      prisma.work.count({ where: { openAccess: true, status: WorkStatus.APPROVED } }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.collection.count(),
    ]);

  res.json({
    totalWorks,
    approvedWorks,
    pendingWorks,
    openAccessWorks,
    totalStudents,
    totalCollections,
  });
});

// GET /admin/users — manage users
export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, institution: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ items: users });
});
