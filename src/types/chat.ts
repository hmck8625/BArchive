//types/chat.ts

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface MemoData {
  content: string;
  category_id: string;
  importance: number;
  relatedMemos?: string[];
  user_id?: string;  // user_idを追加
}

export interface Memo extends MemoData {
  id: string
  title: string
  created_at: string
}
