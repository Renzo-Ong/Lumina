import { Router } from "express";
import {
  listWorks,
  getWork,
  createWork,
  updateWork,
  deleteWork,
  approveWork,
  rejectWork,
} from "../controllers/works.controller";
import { requireAuth, requireRole } from "../middleware/auth";

export const worksRoutes = Router();

// Search is usable while logged out too (browsing doesn't require an account);
// requireAuth is only enforced where role matters.
worksRoutes.get("/", listWorks);
worksRoutes.get("/:id", getWork);

worksRoutes.post("/", requireAuth, requireRole("LIBRARIAN"), createWork);
worksRoutes.put("/:id", requireAuth, requireRole("LIBRARIAN"), updateWork);
worksRoutes.delete("/:id", requireAuth, requireRole("LIBRARIAN"), deleteWork);
worksRoutes.post("/:id/approve", requireAuth, requireRole("LIBRARIAN"), approveWork);
worksRoutes.post("/:id/reject", requireAuth, requireRole("LIBRARIAN"), rejectWork);
