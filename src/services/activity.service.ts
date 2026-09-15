import { ActivityAction } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function logActivity(
  userId: string,
  action: ActivityAction,
  workId?: string,
  detail?: string
) {
  await prisma.activityLog.create({
    data: { userId, action, workId, detail },
  });
}
