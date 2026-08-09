import type { Prisma, PrismaClient } from "@prisma/client";
import type { NotificationChannel, NotificationRecord, NotificationTemplateId } from "../domain/entities";
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

  async listInAppForRecipient(recipientUserId: string, limit: number): Promise<NotificationRecord[]> {
    const rows = await this.prisma.notification.findMany({
      where: { recipientUserId, channel: "IN_APP" },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      template: row.template as NotificationTemplateId,
      payload: row.payload as Record<string, unknown>,
      createdAt: row.createdAt,
      readAt: row.readAt,
    }));
  }

  async markRead(id: string, recipientUserId: string): Promise<boolean> {
    const result = await this.prisma.notification.updateMany({
      where: { id, recipientUserId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count > 0) return true;
    // Either truly not found/not owned, or already read — either way this
    // recipient's own row exists and is already marked read counts as
    // success (idempotent "mark as read", not an error).
    const existing = await this.prisma.notification.findFirst({ where: { id, recipientUserId }, select: { id: true } });
    return existing !== null;
  }
}
