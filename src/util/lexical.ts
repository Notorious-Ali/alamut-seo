type LexicalNode = {
  children?: LexicalNode[]
  fields?: {
    url?: unknown
    value?: {
      alt?: unknown
      url?: unknown
    }
  }
  text?: unknown
  type?: unknown
}

function walk(
  node: LexicalNode,
  onText: (text: string) => void,
  onLink: (url: string) => void,
  onImage: (image: { alt?: string; src: string }) => void,
): void {
  if (node.type === 'text' && typeof node.text === 'string') {
    onText(node.text)
  }

  if (node.type === 'link') {
    const url = node.fields?.url

    if (typeof url === 'string' && url.length > 0) {
      onLink(url)
    }
  }

  if (node.type === 'upload') {
    const value = node.fields?.value
    const src = value?.url
    const alt = value?.alt

    if (typeof src === 'string' && src.length > 0) {
      onImage({ alt: typeof alt === 'string' ? alt : undefined, src })
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, onText, onLink, onImage)
    }
  }
}

function traverse(
  json: unknown,
  onText: (text: string) => void,
  onLink: (url: string) => void,
  onImage: (image: { alt?: string; src: string }) => void,
): void {
  if (!json || typeof json !== 'object') {
    return
  }

  let node = json as LexicalNode

  // Stored Lexical documents are wrapped as { root: { ... } }; unwrapped
  // editor state arrives as the root node itself.
  if (
    !Array.isArray(node.children) &&
    'root' in node &&
    node.root &&
    typeof node.root === 'object'
  ) {
    node = node.root as LexicalNode
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, onText, onLink, onImage)
    }
  } else {
    walk(node, onText, onLink, onImage)
  }
}

/**
 * Flattens a Lexical editor JSON state into plain text (whitespace-joined).
 */
export function extractTextFromLexical(json: unknown): string {
  const parts: string[] = []

  traverse(json, (text) => parts.push(text), () => {}, () => {})

  return parts.join(' ').trim()
}

/**
 * Collects link URLs from Lexical `link` nodes, in document order.
 */
export function extractLinksFromLexical(json: unknown): string[] {
  const urls: string[] = []

  traverse(json, () => {}, (url) => urls.push(url), () => {})

  return urls
}

/**
 * Collects images ({ src, alt }) from Lexical `upload` nodes, in document order.
 */
export function extractImagesFromLexical(
  json: unknown,
): Array<{ alt?: string; src: string }> {
  const images: Array<{ alt?: string; src: string }> = []

  traverse(json, () => {}, () => {}, (image) => images.push(image))

  return images
}
