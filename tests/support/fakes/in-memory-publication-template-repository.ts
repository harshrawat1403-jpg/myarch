import type { PublicationTemplateRecord, PublicationType } from "../../../src/modules/publications";
import type { PublicationTemplateRepository } from "../../../src/modules/publications/application/ports/publication-template-repository";

export class InMemoryPublicationTemplateRepository implements PublicationTemplateRepository {
  private readonly byId = new Map<string, PublicationTemplateRecord>();

  seed(record: PublicationTemplateRecord): void {
    this.byId.set(record.id, record);
  }

  async listActive(type?: PublicationType): Promise<PublicationTemplateRecord[]> {
    return [...this.byId.values()].filter((t) => t.status === "ACTIVE" && (type ? t.type === type : true));
  }

  async findById(id: string): Promise<PublicationTemplateRecord | null> {
    return this.byId.get(id) ?? null;
  }
}
