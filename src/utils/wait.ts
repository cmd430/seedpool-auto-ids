/**
 * https://github.com/cmd430/cmd430-utils/blob/master/src/Utils/wait.ts
 */

/**
 * Async Wait
 */
export function wait (delay: WaitOptions): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  const { minutes = 0, seconds = 0, milliseconds = 0 } = delay

  setTimeout(resolve, (1000 * 60 * minutes) + (1000 * seconds) + milliseconds)

  return promise
}

export interface WaitOptions {
  minutes?: number
  seconds?: number
  milliseconds?: number
}
