// types/index.ts

export interface Memory {
  id: string
  title: string
  content: string
  created_at: string
  category_id: string
  importance: number
  user_id: string
  categories: Category
  relatedMemos: string[]
}

export interface Category {
  id: string;
  name: string;
  user_id?: string;
}

export interface MemoryRelation {
  source_memo_id: string
  target_memo_id: string
  created_at: string
}

// APIのレスポンス型
export interface ApiResponse<T> {
  data: T | null
  error: Error | null
}

export interface ExistingMemo {
  id: string;
  title: string;
  user_id?: string;  // user_idをオプショナルに変更
}