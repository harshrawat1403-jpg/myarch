import type { PublicationTemplateRecord, PublicationType } from "../../domain/entities";

/** Read-only — templates are seeded once by prisma/seed.ts, never authored through the app in V4.0 (§13.1 starts the flow at "Choose Template"). */
export interface PublicationTemplateRepository {
  listActive(type?: PublicationType): Promise<PublicationTemplateRecord[]>;
  findById(id: string): Promise<PublicationTemplateRecord | null>;
}
