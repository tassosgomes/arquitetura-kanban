import { Prisma } from "@/generated/prisma/client";
import { ValidationError } from "@/domain/errors";
import { InfrastructureError } from "@/infrastructure/errors";

function knownPrismaError(error: unknown): Prisma.PrismaClientKnownRequestError | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error;
  }
  if (
    error instanceof InfrastructureError &&
    error.cause instanceof Prisma.PrismaClientKnownRequestError
  ) {
    return error.cause;
  }
  return undefined;
}

export function mapPrismaCatalogError(error: unknown): never {
  const prismaError = knownPrismaError(error);
  if (prismaError?.code === "P2002") {
    throw new ValidationError("Nome já em uso por um registro ativo.", {
      name: ["Já existe um registro ativo com este nome."],
    });
  }

  throw error;
}
