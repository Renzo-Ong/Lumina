import { Router } from "express";
import { getStats, listUsers } from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware/auth";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole("LIBRARIAN"));

adminRoutes.get("/stats", getStats);
adminRoutes.get("/users", listUsers);
