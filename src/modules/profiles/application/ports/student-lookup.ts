/**
 * Minimal, read-only port — the same pattern as students/application/ports/
 * batch-lookup.ts: a shared Prisma model (StudentProfile) read directly
 * rather than importing the students module's application layer, keeping
 * the two modules' business logic decoupled while both read the one table
 * (docs/architecture/05_System_Architecture.md).
 */
export interface StudentLookup {
  findById(id: string): Promise<{ id: string; batchId: string; userId: string; fullName: string } | null>;
}
