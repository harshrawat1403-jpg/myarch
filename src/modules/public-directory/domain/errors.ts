export class PublicProfileNotFoundError extends Error {
  constructor() {
    super("Profile not found");
    this.name = "PublicProfileNotFoundError";
  }
}
