export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}
export interface CodeBlockProps {
  language: string;
  code: string;
  children: React.ReactNode;
}
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}