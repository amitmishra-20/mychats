// pdfjs-dist legacy build's fake worker does `await import(workerSrc)` which
// Turbopack intercepts and breaks. By pre-loading the worker module and assigning
// it to globalThis.pdfjsWorker, the dynamic import is skipped entirely.
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).pdfjsWorker = pdfjsWorker;

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Extract text from a PDF file, page by page.
 *
 * How pdf.js works:
 * 1. Parse the PDF binary data into a document object
 * 2. Iterate through each page
 * 3. Call getTextContent() which returns structured text items
 *    (each item has the text string, position, font info, etc.)
 * 4. Join all items with spaces to reconstruct the page text
 *
 * @param buffer - The PDF file as an ArrayBuffer (from file.arrayBuffer())
 * @returns Array of strings, one per page
 */
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string[]> {
  const data = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Each item.str is a fragment of text on the page
    // Items are ordered by their position on the page (top-to-bottom, left-to-right)
    // Joining with space reconstructs the readable text
    // TextMarkedContent items don't have 'str', so we skip them
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
 *
 * Why sentence-aware splitting?
 * - Naive splitting (every N words) cuts sentences in half
 * - Sentence-aware splitting respects natural boundaries
 * - The overlap ensures context at boundaries isn't lost
 *
 * Example with chunkSize=5, overlap=2:
 *   "A B C D E F G H I J K L"
 *   → ["A B C D E", "D E F G H", "G H I J K"]
 *
 * Algorithm:
 * 1. Split text into sentences (by . ! ?)
 * 2. Accumulate sentences into a chunk until word count exceeds chunkSize
 * 3. When exceeded, save the current chunk
 * 4. Start next chunk with the last `overlap` words from previous chunk
 *
 * @param text - Full document text
 * @param chunkSize - Target words per chunk (default 300)
 * @param overlap - Words to overlap between chunks (default 50)
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  chunkSize: number = 300,
  overlap: number = 50
): string[] {
  const chunks: string[] = [];

  // Split by sentence boundaries (period, exclamation, question mark followed by space)
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    const combined = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    const wordCount = combined.split(/\s+/).length;

    if (wordCount > chunkSize) {
      // Current chunk is full — save it
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      // Start new chunk with last `overlap` words from current chunk
      const words = currentChunk.split(/\s+/).filter(Boolean);
      currentChunk = words.slice(-overlap).join(" ") + " " + sentence;
    } else {
      currentChunk = combined;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
