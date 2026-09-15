import { Request, Response } from "express";
import { z } from "zod";
import { Prisma, WorkSource, WorkStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../middleware/errorHandler";
import { logActivity } from "../services/activity.service";

// ── GET /works — search + filter (students see APPROVED only; librarians see all) ──
const searchSchema = z.object({
  q: z.string().optional(),
  year: z.coerce.number().optional(),
  method: z.string().optional(),
  category: z.string().optional(),
  status: z.nativeEnum(WorkStatus).optional(), // librarian-only filter, e.g. ?status=PENDING
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
});

export const listWorks = asyncHandler(async (req: Request, res: Response) => {
  const params = searchSchema.parse(req.query);
  const isLibrarian = req.user?.role === "LIBRARIAN";

  const where: Prisma.WorkWhereInput = {
    status: isLibrarian && params.status ? params.status : isLibrarian ? undefined : WorkStatus.APPROVED,
    year: params.year,
    method: params.method,
    category: params.category ? { slug: params.category } : undefined,
    ...(params.q && {
      OR: [
        { title: { contains: params.q, mode: "insensitive" } },
        { authors: { has: params.q } },
        { abstractText: { contains: params.q, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.work.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.work.count({ where }),
  ]);

  res.json({ items, total, page: params.page, pageSize: params.pageSize });
});

export const getWork = asyncHandler(async (req: Request, res: Response) => {
  const work = await prisma.work.findUnique({
    where: { id: req.params.id },
    include: { category: true },
  });
  if (!work) throw new ApiError(404, "Work not found");
  if (work.status !== WorkStatus.APPROVED && req.user?.role !== "LIBRARIAN") {
    throw new ApiError(404, "Work not found");
  }
  res.json({ work });
});

// ── POST /works — librarian manually adds a work ──
const createWorkSchema = z.object({
  title: z.string().min(3),
  abstractText: z.string().optional(),
  year: z.number().optional(),
  journal: z.string().optional(),
  doi: z.string().optional(),
  authors: z.array(z.string()).default([]),
  method: z.string().optional(),
  country: z.string().optional(),
  openAccess: z.boolean().default(false),
  categoryId: z.string().optional(),
});

export const createWork = asyncHandler(async (req: Request, res: Response) => {
  const data = createWorkSchema.parse(req.body);

  const work = await prisma.work.create({
    data: {
      ...data,
      source: WorkSource.MANUAL,
      status: WorkStatus.APPROVED, // librarian-authored works don't need self-approval
      addedById: req.user!.userId,
      reviewedById: req.user!.userId,
      reviewedAt: new Date(),
    },
  });

  await logActivity(req.user!.userId, "IMPORTED_WORK", work.id, "Manually added work");
  res.status(201).json({ work });
});

// ── PUT /works/:id — librarian edits metadata ──
const updateWorkSchema = createWorkSchema.partial();

export const updateWork = asyncHandler(async (req: Request, res: Response) => {
  const data = updateWorkSchema.parse(req.body);
  const work = await prisma.work.update({ where: { id: req.params.id }, data });
  await logActivity(req.user!.userId, "EDITED_WORK", work.id);
  res.json({ work });
});

// ── DELETE /works/:id — librarian removes a work ──
export const deleteWork = asyncHandler(async (req: Request, res: Response) => {
  await prisma.work.delete({ where: { id: req.params.id } });
  await logActivity(req.user!.userId, "DELETED_WORK", req.params.id);
  res.status(204).send();
});

// ── POST /works/:id/approve and /reject — librarian moderates OpenAlex imports ──
export const approveWork = asyncHandler(async (req: Request, res: Response) => {
  const work = await prisma.work.update({
    where: { id: req.params.id },
    data: { status: WorkStatus.APPROVED, reviewedById: req.user!.userId, reviewedAt: new Date() },
  });
  await logActivity(req.user!.userId, "APPROVED_WORK", work.id);
  res.json({ work });
});

export const rejectWork = asyncHandler(async (req: Request, res: Response) => {
  const work = await prisma.work.update({
    where: { id: req.params.id },
    data: { status: WorkStatus.REJECTED, reviewedById: req.user!.userId, reviewedAt: new Date() },
  });
  await logActivity(req.user!.userId, "REJECTED_WORK", work.id);
  res.json({ work });
});
