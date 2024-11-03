// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'

// 環境変数の型チェック
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// データベースの型定義
export type Memory = {
  id: string
  content: string
  created_at: string
}

// データベースの型定義
export type Database = {
  public: {
    Tables: {
      memories: {
        Row: Memory // 取得時の型
        Insert: Omit<Memory, 'id' | 'created_at'> // 挿入時の型
        Update: Partial<Omit<Memory, 'id'>> // 更新時の型
      }
    }
  }
}

// Supabaseクライアントの作成
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// 便利な型エクスポート
export type SupabaseClient = typeof supabase