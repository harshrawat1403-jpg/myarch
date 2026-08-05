import type { Prisma, PrismaClient } from "@prisma/client";
import type { NotificationChannel, NotificationTemplateId } from "../domain/entities";
import type { NotificationRepository } from "../application/ports/notification-repository";

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(entry: {
    recipientUserId: string;
    channel: NotificationChannel;
    template: NotificationTemplateId;
    payload: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const created = await this.prisma.notification.create({
      data: {
        recipientUserId: entry.recipientUserId,
        channel: entry.channel,
        template: entry.template,
        payload: entry.payload as Prisma.InputJsonValue,
        status: "PENDING",
      },
      select: { id: true },
    });
    return created;
  }

  async markSent(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  async markFailed(id: string, reason: string): Promise<void> {
    console.error(`[notifications] notification ${id} failed: ${reason}`);
    await this.prisma.notification.update({
      where: { id },
      data: { status: "FAILED" },
    });
  }
}
