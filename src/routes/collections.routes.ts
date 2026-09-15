import { Router } from "express";
import {
  listCollections,
  createCollection,
  addToCollection,
  removeFromCollection,
} from "../controllers/collections.controller";
import { requireAuth } from "../middleware/auth";

export const collectionsRoutes = Router();

collectionsRoutes.use(requireAuth);

collectionsRoutes.get("/", listCollections);
collectionsRoutes.post("/", createCollection);
collectionsRoutes.post("/:id/items", addToCollection);
collectionsRoutes.delete("/:id/items/:savedWorkId", removeFromCollection);
