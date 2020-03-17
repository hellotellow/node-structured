/**
 * Collection of LintError's
 */
export class LintErrors extends Error {
  constructor(message: string, readonly lintErrors: LintError[]) {
    super(message)

    // Explicitly set prototype, otherwise instanceof won't work
    Object.setPrototypeOf(this, LintErrors.prototype)
  }
}

export default class LintError extends Error {
  constructor(readonly path: string, message: string) {
    super(message)

    // Explicitly set prototype, otherwise instanceof won't work
    Object.setPrototypeOf(this, LintError.prototype)
  }
}
