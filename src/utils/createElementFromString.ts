export function createElementsFromString (HTMLString: string): DocumentFragment {
  const range = new Range()
  const fragment = range.createContextualFragment(HTMLString)
  return fragment
}

export function createElementFromString<T extends HTMLElement = HTMLElement> (HTMLString: string): T {
  return createElementsFromString(HTMLString).firstElementChild! as T
}
