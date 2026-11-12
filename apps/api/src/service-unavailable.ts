import { ServiceUnavailableException } from '@nestjs/common'

export async function orUnavailable<T>(
  operation: () => Promise<T>,
  message: string,
  handleExpectedError?: (error: unknown) => void,
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    handleExpectedError?.(error)
    throw new ServiceUnavailableException(message)
  }
}
