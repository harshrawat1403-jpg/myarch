import type { PrismaClient } from "@prisma/client";
import type { NotificationRecipientLookup } from "../application/ports/notification-recipient-lookup";

export class PrismaNotificationRecipientLookup implements NotificationRecipientLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findEmailByUserId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  }
}
