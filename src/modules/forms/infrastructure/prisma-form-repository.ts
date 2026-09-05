import type { Prisma, PrismaClient, Form as PrismaForm, FormField as PrismaFormField } from "@prisma/client";
import { PublishedFormImmutableError } from "../domain/errors";
import type { CreateFormData, CreateFormFieldData, FormFilters, FormRecord, FormStatus, UpdateFormData } from "../domain/entities";
import type { FormRepository } from "../application/ports/form-repository";

type FormWithFields = PrismaForm & { fields: PrismaFormField[]; electionApplicationForm?: { electionId: string } | null; coreCommitteeSelectionApplicationForm?: { selectionId: string } | null };

export class PrismaFormRepository implements FormRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateFormData): Promise<FormRecord> {
    const row = await this.prisma.form.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        deadline: data.deadline ?? null,
        committeeId: data.committeeId ?? null,
        createdByUserId: data.createdByUserId,
        fields: { create: data.fields.map(toFieldCreate) },
      },
      include: { fields: true, electionApplicationForm: true, coreCommitteeSelectionApplicationForm: true },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<FormRecord | null> {
    const row = await this.prisma.form.findUnique({
      where: { id },
      include: { fields: true, electionApplicationForm: true, coreCommitteeSelectionApplicationForm: true },
    });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateFormData): Promise<FormRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const result = await tx.form.updateMany({
        where: { id, status: "DRAFT" },
        data: {
          title: data.title,
          description: data.description,
          deadline: data.deadline,
          committeeId: data.committeeId,
          updatedAt: new Date(),
        },
      });
      if (result.count !== 1) throw new PublishedFormImmutableError();
      if (data.fields) {
        await tx.formField.deleteMany({ where: { formId: id } });
        await tx.formField.createMany({
          data: data.fields.map((field) => ({ formId: id, ...toFieldCreate(field) })),
        });
      }
      const updated = await tx.form.findUnique({ where: { id }, include: { fields: true, electionApplicationForm: true, coreCommitteeSelectionApplicationForm: true } });
      if (!updated) throw new Error("Updated form could not be loaded");
      return updated;
    });
    return toDomain(row);
  }

  async setStatus(id: string, status: FormStatus, at: Date): Promise<FormRecord> {
    const data = status === "PUBLISHED"
      ? { status, publishedAt: at }
      : status === "CLOSED"
        ? { status, closedAt: at }
        : { status, archivedAt: at };
    const row = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "forms" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const [electionLink, selectionLink] = await Promise.all([
        tx.electionApplicationForm.findUnique({ where: { formId: id }, include: { election: true } }),
        tx.coreCommitteeSelectionApplicationForm.findUnique({ where: { formId: id }, include: { selection: true } }),
      ]);
      if (electionLink?.election.status === "APPLICATION_OPEN" || selectionLink?.selection.status === "APPLICATION_OPEN") throw new PublishedFormImmutableError();
      return tx.form.update({ where: { id }, data, include: { fields: true, electionApplicationForm: true, coreCommitteeSelectionApplicationForm: true } });
    });
    return toDomain(row);
  }

  async search(filters: FormFilters): Promise<readonly FormRecord[]> {
    const rows = await this.prisma.form.findMany({
      where: {
        status: filters.status,
        title: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      },
      include: { fields: true, electionApplicationForm: true, coreCommitteeSelectionApplicationForm: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDomain);
  }
}

function toFieldCreate(field: CreateFormFieldData) {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    description: field.description ?? null,
    required: field.required ?? false,
    options: field.options?.length ? [...field.options] : undefined,
    validation: field.validation ? { ...field.validation } : undefined,
    displayOrder: field.displayOrder,
  };
}

function toDomain(row: FormWithFields): FormRecord {
  return {
    id: row.id,
    electionId: row.electionApplicationForm?.electionId ?? null,
    title: row.title,
    description: row.description,
    status: row.status,
    deadline: row.deadline,
    committeeId: row.committeeId,
    createdByUserId: row.createdByUserId,
    publishedAt: row.publishedAt,
    closedAt: row.closedAt,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    fields: [...row.fields].sort((a, b) => a.displayOrder - b.displayOrder).map((field) => ({
      id: field.id,
      formId: field.formId,
      key: field.key,
      label: field.label,
      type: field.type,
      description: field.description,
      required: field.required,
      options: Array.isArray(field.options) ? field.options.filter((value): value is string => typeof value === "string") : [],
      validation: isValidation(field.validation) ? field.validation : null,
      displayOrder: field.displayOrder,
    })),
  };
}

function isValidation(value: unknown): value is { min?: number; max?: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (record.min === undefined || typeof record.min === "number") && (record.max === undefined || typeof record.max === "number");
}
