export class ConfigError extends Error {
  constructor(message: string) {
    super(message)

    // Explicitly set prototype, otherwise instanceof won't work
    Object.setPrototypeOf(this, ConfigError.prototype)
  }
}
