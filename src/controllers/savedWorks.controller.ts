import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../middleware/errorHandler";
import { logActivity } from "../services/activity.service";

// ── GET /saved-works — the logged-in student's library ──
export const listSavedWorks = asyncHandler(async (req: Request, res: Response) => {
  const savedWorks = await prisma.savedWork.findMany({
    where: { userId: req.user!.userId },
    include: {
      work: { include: { category: true } },
      notes: true,
      tags: { include: { tag: true } },
    },
    orderBy: { savedAt: "desc" },
  });
  res.json({ items: savedWorks });
});

// ── POST /saved-works { workId } — bookmark a work ──
const saveSchema = z.object({ workId: z.string() });

export const saveWork = asyncHandler(async (req: Request, res: Response) => {
  const { workId } = saveSchema.parse(req.body);

  const work = await prisma.work.findUnique({ where: { id: workId } });
  if (!work) throw new ApiError(404, "Work not found");

  const savedWork = await prisma.savedWork.upsert({
    where: { userId_workId: { userId: req.user!.userId, workId } },
    update: {},
    create: { userId: req.user!.userId, workId },
  });

  await logActivity(req.user!.userId, "SAVED_WORK", workId);
  res.status(201).json({ savedWork });
});

// ── DELETE /saved-works/:workId — unbookmark ──
export const unsaveWork = asyncHandler(async (req: Request, res: Response) => {
  await prisma.savedWork
    .delete({
      where: { userId_workId: { userId: req.user!.userId, workId: req.params.workId } },
    })
    .catch(() => {
      throw new ApiError(404, "This work is not in your saved list");
    });

  await logActivity(req.user!.userId, "UNSAVED_WORK", req.params.workId);
  res.status(204).send();
});

// ── POST /saved-works/:id/notes { content } ──
const noteSchema = z.object({ content: z.string().min(1) });

export const addNote = asyncHandler(async (req: Request, res: Response) => {
  const { content } = noteSchema.parse(req.body);

  const savedWork = await prisma.savedWork.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!savedWork) throw new ApiError(404, "Saved work not found");

  const note = await prisma.note.create({ data: { savedWorkId: savedWork.id, content } });
  res.status(201).json({ note });
});

// ── POST /saved-works/:id/tags { name } — attaches a tag, creating it if new ──
const tagSchema = z.object({ name: z.string().min(1).max(40) });

export const addTag = asyncHandler(async (req: Request, res: Response) => {
  const { name } = tagSchema.parse(req.body);

  const savedWork = await prisma.savedWork.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!savedWork) throw new ApiError(404, "Saved work not found");

  const tag = await prisma.tag.upsert({
    where: { userId_name: { userId: req.user!.userId, name } },
    update: {},
    create: { userId: req.user!.userId, name },
  });

  await prisma.savedWorkTag.upsert({
    where: { savedWorkId_tagId: { savedWorkId: savedWork.id, tagId: tag.id } },
    update: {},
    create: { savedWorkId: savedWork.id, tagId: tag.id },
  });

  res.status(201).json({ tag });
});
