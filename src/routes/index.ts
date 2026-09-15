import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { worksRoutes } from "./works.routes";
import { savedWorksRoutes } from "./savedWorks.routes";
import { collectionsRoutes } from "./collections.routes";
import { adminRoutes } from "./admin.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/works", worksRoutes);
apiRouter.use("/saved-works", savedWorksRoutes);
apiRouter.use("/collections", collectionsRoutes);
apiRouter.use("/admin", adminRoutes);
