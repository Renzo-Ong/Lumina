import { Router } from "express";
import { register, login, me, createLibrarian } from "../controllers/auth.controller";
import { requireAuth, requireRole } from "../middleware/auth";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.get("/me", requireAuth, me);
authRoutes.post("/librarians", requireAuth, requireRole("LIBRARIAN"), createLibrarian);
