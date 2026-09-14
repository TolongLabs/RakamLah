export class RakamError extends Error {
  constructor(message, exitCode = 4, details = {}) {
    super(message)
    this.name = 'RakamError'
    this.exitCode = exitCode
    this.details = details
  }
}

export const invalidInput = (message, details) => new RakamError(message, 2, details)
export const missingDependency = (message, details) => new RakamError(message, 3, details)
export const operationFailed = (message, details) => new RakamError(message, 4, details)
export const verificationFailed = (message, details) => new RakamError(message, 5, details)
