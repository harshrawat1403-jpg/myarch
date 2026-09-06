import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { PrismaElectionRepository } from "../../../src/modules/elections/infrastructure/prisma-election-repository";

const prismaError = (code: string, message = "transaction error") =>
  new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: "test" });

describe("Slice 5 serializable lifecycle retries", () => {
  it("retries P2034 at most three times", async () => {
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(prismaError("P2034"))
      .mockRejectedValueOnce(prismaError("P2034"))
      .mockImplementationOnce(async (operation) => operation({}));
    const repository = new PrismaElectionRepository({ $transaction: transaction } as never);
    const operation = vi.fn().mockResolvedValue("completed");

    await expect((repository as any).serializable(operation)).resolves.toBe("completed");
    expect(transaction).toHaveBeenCalledTimes(3);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries only the raw PostgreSQL serialization wrapper, not other failures", async () => {
    const transaction = vi.fn().mockRejectedValue(prismaError("P2010", "Code: `40001`. Message: conflict"));
    const repository = new PrismaElectionRepository({ $transaction: transaction } as never);
    await expect((repository as any).serializable(vi.fn())).rejects.toMatchObject({ code: "P2010" });
    expect(transaction).toHaveBeenCalledTimes(3);

    const nonSerializable = vi.fn().mockRejectedValue(prismaError("P2010", "void deserialization"));
    const nonRetryingRepository = new PrismaElectionRepository({ $transaction: nonSerializable } as never);
    await expect((nonRetryingRepository as any).serializable(vi.fn())).rejects.toMatchObject({ code: "P2010" });
    expect(nonSerializable).toHaveBeenCalledTimes(1);
  });
});
