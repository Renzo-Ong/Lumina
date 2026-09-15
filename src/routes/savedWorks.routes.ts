import { Router } from "express";
import {
  listSavedWorks,
  saveWork,
  unsaveWork,
  addNote,
  addTag,
} from "../controllers/savedWorks.controller";
import { requireAuth } from "../middleware/auth";

export const savedWorksRoutes = Router();

savedWorksRoutes.use(requireAuth);

savedWorksRoutes.get("/", listSavedWorks);
savedWorksRoutes.post("/", saveWork);
savedWorksRoutes.delete("/:workId", unsaveWork);
savedWorksRoutes.post("/:id/notes", addNote);
savedWorksRoutes.post("/:id/tags", addTag);
