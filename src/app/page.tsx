// my-app/src/app/page.tsx
'use client'

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChatWindow } from "@/components/ChatWindow"
import { SearchMemories } from '@/components/SearchMemories'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Library, MessageCircle, PenLine, User } from "lucide-react"
import { createClient } from '@supabase/supabase-js'
import { MemoriesSection } from '@/components/MemoriesSection'
import MemoVisualization from '@/components/MemoVisualization'
import { MemoDialog } from '@/components/MemoDialog'

import { AuthForm } from "@/components/auth/AuthForm"
import { UserMenu } from "@/components/auth/UserMenu"
import { useAuth } from "../lib/hooks/useAuth"
import { Memory } from '@/types'

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "null",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "null"
)

interface MemoryRelation {
  source_memo_id: string;
  target_memo_id: string;
  // 必要に応じて、関係の追加情報を定義
  // 例: created_at: string;
}



export default function Component() {
  const { user, loading: authLoading } = useAuth()
  const [isMemoOpen, setIsMemoOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isVisualizationOpen, setIsVisualizationOpen] = useState(false)

  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  
  
  // メモリーの取得を認証状態に依存させる
  useEffect(() => {
    if (user) {  // ユーザーが認証されている場合のみデータを取得
      fetchMemories()
    }
  }, [user])  // userを依存配列に追加

  const fetchMemories = async () => {
    try {
      if (!user) return  // ユーザーが未認証の場合は早期リターン

      // メモとカテゴリ情報を取得
      const { data: memoriesData, error: memoriesError } = await supabase
      .from('memories')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('user_id', user.id)      // 現在のユーザーのデータのみを取得
      .order('created_at', { ascending: false })
  
      if (memoriesError) throw memoriesError
  
      // 関連メモの情報を取得
      const { data: relationsData, error: relationsError } = await supabase
        .from('memory_relations')
        .select(`
          source_memo_id,
          target_memo_id,
          target_memo:memories!memory_relations_target_memo_id_fkey (
            id,
            title
          )
        `)
  
      if (relationsError) throw relationsError
  

      // メモデータに関連メモの情報を追加
      const memoriesWithRelations = memoriesData.map(memo => ({
        ...memo,
        relatedMemos: relationsData
          .filter(rel => rel.source_memo_id === memo.id)
          .map(rel => rel.target_memo_id)
      }))
  
      setMemories(memoriesWithRelations)
      setFilteredMemories(memoriesWithRelations)
    } catch (error) {
      console.error('Error fetching memories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // メモが更新されたときの処理
  const handleMemoryUpdate = useCallback(() => {
    fetchMemories()
  }, [])

  // 検索結果を処理する関数
  const handleSearchResults = useCallback((results: Memory[]) => {
    console.log('Setting filtered memories:', results);
    setFilteredMemories(results);
  }, []);

  const handleMemoSave = async (memoData: {
    content: string
    category_id: string
    importance: number
    relatedMemos?: string[]
    user_id?: string  // オプショナルとして追加
  }) => {
    try {
      if (!user) return  // ユーザーが未認証の場合は早期リターン
      setIsLoading(true)

      // 1. タイトルの生成
      const titleResponse = await fetch('/api/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: memoData.content }),
      })

      if (!titleResponse.ok) {
        throw new Error('Failed to generate title')
      }

      const { title } = await titleResponse.json()

      // 2. メモの保存 - user_idを追加
      const { data: newMemo, error: memoError } = await supabase
        .from('memories')
        .insert([
          {
            title,
            content: memoData.content,
            category_id: memoData.category_id,
            importance: memoData.importance,
            created_at: new Date().toISOString(),
            user_id: user.id  // ユーザーIDを追加
          }
        ])
        .select()
        .single()

      if (memoError) {
        console.error('Memo save error:', memoError)
        throw memoError
      }

      // 3. 関連メモの関係を保存
      if (memoData.relatedMemos && memoData.relatedMemos.length > 0) {
        // 双方向の関係を作成
        const relations = memoData.relatedMemos.flatMap(targetId => [
          {
            source_memo_id: newMemo.id,
            target_memo_id: targetId
          },
          // 逆方向の関係も作成（双方向リンク）
          {
            source_memo_id: targetId,
            target_memo_id: newMemo.id
          }
        ])

        const { error: relationsError } = await supabase
          .from('memory_relations')
          .insert(relations)

        if (relationsError) {
          console.error('Relations save error:', relationsError)
          throw relationsError
        }
      }

      // 4. 成功時の処理
      setIsMemoOpen(false)
      fetchMemories()

    } catch (error) {
      console.error('Error saving memory:', error)
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert('メモの保存に失敗しました')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ログインしていない場合は認証画面を表示
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <AuthForm />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] relative">
      <div className="p-4 main-content-wrapper">
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-8 mt-6"> {/* mt-6 を追加 */}
          <Button 
            variant="ghost" 
            className="bg-[#F3E5F5] text-purple-800 hover:bg-[#E1BEE7]"
            onClick={() => setIsVisualizationOpen(true)}
          >
            <Library className="mr-2 h-4 w-4" />
            Archive
          </Button>
          <UserMenu email={user?.email} />
        </div>
  
        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-8 bg-purple-400 rounded-sm transform hover:scale-y-110 transition-transform" />
              <div className="w-3 h-6 bg-purple-300 rounded-sm transform hover:scale-y-110 transition-transform" />
              <div className="w-3 h-10 bg-orange-400 rounded-sm transform hover:scale-y-110 transition-transform" />
              <div className="w-3 h-7 bg-orange-300 rounded-sm transform hover:scale-y-110 transition-transform" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Lets archive your learning</h1>
        </div>
  
        {/* Search Bar */}
        <div className="mb-6">
          <SearchMemories 
            memories={memories} 
            onSearchResults={handleSearchResults} 
          />
        </div>
  
        {/* Memories Section */}
        <MemoriesSection 
          memories={filteredMemories}
          isLoading={isLoading}
          supabase={supabase}
          onMemoryUpdate={handleMemoryUpdate}
        />

        </div>
      </div>
  
    {/* Bottom Navigation - クラス名を変更 */}
    <div className="bottom-nav-fixed">
      <div className="flex justify-around p-2">
        <Button variant="ghost" size="sm" onClick={() => setIsMemoOpen(true)}>
          <PenLine className="h-4 w-4 mr-1" />
          Memo
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setIsChatOpen(true)}>
          <MessageCircle className="h-4 w-4 mr-1" />
          Chat
        </Button>
      </div>
    </div>
  
      {/* Memo Dialog */}
      <MemoDialog
        open={isMemoOpen}
        onOpenChange={setIsMemoOpen}
        onSave={handleMemoSave}
        supabase={supabase}
      />

      {/* Visualization Dialog */}
      <Dialog open={isVisualizationOpen} onOpenChange={setIsVisualizationOpen}>
        <DialogContent className="max-w-[90vw] h-[90vh]">
          <DialogHeader>
            <DialogTitle>Memory Visualization</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <MemoVisualization />
          </div>
        </DialogContent>
      </Dialog>
  
      {/* ChatWindow */}
      <ChatWindow
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  )
}