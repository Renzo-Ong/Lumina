import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../middleware/errorHandler";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  institution: z.string().optional(),
  // Only allow self-registering as a student. Librarian accounts should be
  // created by an existing librarian via the admin-only endpoint below —
  // otherwise anyone could sign up with admin rights.
  role: z.literal(Role.STUDENT).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(userId: string, role: Role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function toPublicUser(user: { id: string; name: string; email: string; role: Role; institution: string | null }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, institution: user.institution };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      institution: data.institution,
      role: Role.STUDENT,
    },
  });

  const token = signToken(user.id, user.role);
  res.status(201).json({ token, user: toPublicUser(user) });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);
  if (!passwordMatches) throw new ApiError(401, "Invalid email or password");

  const token = signToken(user.id, user.role);
  res.json({ token, user: toPublicUser(user) });
});

// GET /auth/me — used by the frontend to restore session on page load
export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) throw new ApiError(404, "User not found");
  res.json({ user: toPublicUser(user) });
});

// POST /auth/librarians — librarian-only endpoint to create another librarian
// account. Kept separate from public registration on purpose.
export const createLibrarian = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.omit({ role: true }).parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { ...data, passwordHash, role: Role.LIBRARIAN },
  });

  res.status(201).json({ user: toPublicUser(user) });
});
