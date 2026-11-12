import { ServiceUnavailableException } from '@nestjs/common'

export async function orUnavailable<T>(operation: () => Promise<T>, message: string): Promise<T> {
  try {
    return await operation()
  } catch {
    throw new ServiceUnavailableException(message)
  }
}
