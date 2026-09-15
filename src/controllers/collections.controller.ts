import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../middleware/errorHandler";
import { logActivity } from "../services/activity.service";

export const listCollections = asyncHandler(async (req: Request, res: Response) => {
  const collections = await prisma.collection.findMany({
    where: { userId: req.user!.userId },
    include: { items: { include: { savedWork: { include: { work: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ items: collections });
});

const createSchema = z.object({
  name: z.string().min(1).max(60),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const createCollection = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const collection = await prisma.collection.create({
    data: { ...data, userId: req.user!.userId },
  });
  await logActivity(req.user!.userId, "CREATED_COLLECTION", undefined, collection.name);
  res.status(201).json({ collection });
});

const addItemSchema = z.object({ savedWorkId: z.string() });

export const addToCollection = asyncHandler(async (req: Request, res: Response) => {
  const { savedWorkId } = addItemSchema.parse(req.body);

  const collection = await prisma.collection.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!collection) throw new ApiError(404, "Collection not found");

  const savedWork = await prisma.savedWork.findFirst({
    where: { id: savedWorkId, userId: req.user!.userId },
  });
  if (!savedWork) throw new ApiError(404, "Saved work not found — save it before adding to a collection");

  const item = await prisma.collectionItem.upsert({
    where: { collectionId_savedWorkId: { collectionId: collection.id, savedWorkId } },
    update: {},
    create: { collectionId: collection.id, savedWorkId },
  });

  await logActivity(req.user!.userId, "ADDED_TO_COLLECTION", savedWork.workId, collection.name);
  res.status(201).json({ item });
});

export const removeFromCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await prisma.collection.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!collection) throw new ApiError(404, "Collection not found");

  await prisma.collectionItem.delete({
    where: {
      collectionId_savedWorkId: { collectionId: collection.id, savedWorkId: req.params.savedWorkId },
    },
  });
  res.status(204).send();
});
