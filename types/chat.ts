export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

/**
 * Represents an uploaded PDF document.
 * This is what the /api/documents/list endpoint returns.
 *
 * Note: This is NOT the same as the database row.
 * The database stores individual chunks — this is the grouped view
 * (one entry per PDF file, not per chunk).
 */
export interface Document {
  document_id: string;
  file_name: string;
  total_chunks: number;
  uploaded_at: string;
  is_shared?: boolean;
}

export interface CodeBlockProps {
  language: string;
  code: string;
  children: React.ReactNode;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}
