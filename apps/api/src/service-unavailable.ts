import { ServiceUnavailableException } from '@nestjs/common'

export async function orUnavailable<T>(
  operation: () => Promise<T>,
  message: string,
  rethrowExpectedError?: (error: unknown) => void,
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    rethrowExpectedError?.(error)
    throw new ServiceUnavailableException(message)
  }
}
