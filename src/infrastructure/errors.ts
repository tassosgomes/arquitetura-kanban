export class InfrastructureError extends Error {
  constructor(
    message = "A dependency failed. Try again later.",
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "InfrastructureError";
  }
}
