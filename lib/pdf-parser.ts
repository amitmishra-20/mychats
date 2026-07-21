// Polyfill DOMMatrix for Node.js (pdfjs-dist legacy build requires it)
if (typeof globalThis.DOMMatrix === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    constructor() {}
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
  };
}

let pdfjsLoaded = false;

async function loadPdfjs() {
  if (pdfjsLoaded) return;
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).pdfjsWorker = worker;
  pdfjsLoaded = true;
}

/**
 * Extract text from a PDF file, page by page.
 *
 * @param buffer - The PDF file as an ArrayBuffer (from file.arrayBuffer())
 * @returns Array of strings, one per page
 */
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string[]> {
  await loadPdfjs();
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  } as Parameters<typeof pdfjsLib.getDocument>[0]).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    if (text.trim()) {
      pages.push(text);
    }
  }

  return pages;
}

/**
 * Split text into chunks of approximately `chunkSize` words
 * with `overlap` words shared between consecutive chunks.
 */
export function chunkText(
  text: string,
  chunkSize: number = 300,
  overlap: number = 50
): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    const combined = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    const wordCount = combined.split(/\s+/).length;

    if (wordCount > chunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      const words = currentChunk.split(/\s+/).filter(Boolean);
      currentChunk = words.slice(-overlap).join(" ") + " " + sentence;
    } else {
      currentChunk = combined;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
