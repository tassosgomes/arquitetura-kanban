import { Prisma } from "@/generated/prisma/client";
import { ValidationError } from "@/domain/errors";

export function mapPrismaCatalogError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ValidationError("Nome já em uso por um registro ativo.", {
      name: ["Já existe um registro ativo com este nome."],
    });
  }

  throw error;
}
