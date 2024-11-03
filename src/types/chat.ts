export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}


export interface MemoData {
  content: string
  category: string
  importance: number
  relatedMemos: string[]
}

export interface Memo extends MemoData {
  id: string
  title: string
  created_at: string
}

export interface Category {
  id: string
  name: string
  created_at: string
}