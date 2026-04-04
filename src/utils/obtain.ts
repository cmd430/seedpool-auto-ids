/**
 * https://github.com/cmd430/cmd430-utils/blob/master/src/Utils/obtain.ts
 */

export abstract class SmartResponse <T = any> extends Response {
  public abstract get data (): T
}

/**
 * returns a `SmartResponse` that is a `Response` object with an aditional property `data` that contains the
 * resolved `text()` or `json()` data if the response type header has the correct type, `data` is undefined
 * if the response type is not text or json, all Response properties and methods remain usable including `body`
 *
 * @example
 * const { ok, data } = await obtain('https://jsonplaceholder.typicode.com/todos/1')
 *
 * console.log('request was status code 2xx?', ok)
 * console.log('request data:', data)
 */
export async function obtain <T = any> (...[ input, init ]: Parameters<typeof fetch>): Promise<SmartResponse<T>> {
  const res = await fetch(input, init)

  const contentType = res.headers.get('content-type')

  if (contentType?.includes('json')) {
    Object.defineProperty(res, 'data', {
      enumerable: true,
      writable: false,
      value: await res.clone().json() as T
    })
  }

  if (contentType?.includes('text')) {
    Object.defineProperty(res, 'data', {
      enumerable: true,
      writable: false,
      value: await res.clone().text()
    })
  }

  return res as SmartResponse<T>
}
