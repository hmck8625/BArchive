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

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Component() {
  const [isMemoOpen, setIsMemoOpen] = useState(false)
  const [memories, setMemories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isVisualizationOpen, setIsVisualizationOpen] = useState(false)
  const [filteredMemories, setFilteredMemories] = useState(memories)

  // メモリーの取得
  useEffect(() => {
    fetchMemories()
  }, [])

  const fetchMemories = async () => {
    try {
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
          .map(rel => ({
            id: rel.target_memo.id,
            title: rel.target_memo.title
          }))
      }))
  
      setMemories(memoriesWithRelations)
      setFilteredMemories(memoriesWithRelations) // 初期状態では全てのメモを表示
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
  const handleSearchResults = useCallback((results) => {
      console.log('Setting filtered memories:', results)
      setFilteredMemories(results)
    }, [])

  const handleMemoSave = async (memoData: {
    content: string
    category_id: string
    importance: number
    relatedMemos?: string[]
  }) => {
    try {
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

      // 2. メモの保存
      const { data: newMemo, error: memoError } = await supabase
        .from('memories')
        .insert([
          {
            title,
            content: memoData.content,
            category_id: memoData.category_id,
            importance: memoData.importance,
            created_at: new Date().toISOString(),
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

  return (
    <div className="min-h-screen bg-[#FAF9F6] relative">
      <div className="p-4 pb-20">
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-8">
          <Button 
            variant="ghost" 
            className="bg-[#F3E5F5] text-purple-800 hover:bg-[#E1BEE7]"
            onClick={() => setIsVisualizationOpen(true)}
          >
            <Library className="mr-2 h-4 w-4" />
            Archive
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
          </Button>
        </div>
  
        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-2">
              <div className="flex">
                <div className="w-8 h-8 bg-purple-300 rounded-full" />
                <div className="w-8 h-8 bg-orange-300 rounded-full -ml-2" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Keep memories with me.</h1>
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
  
      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex justify-around">
        <Button variant="ghost" size="sm" onClick={() => setIsMemoOpen(true)}>
          <PenLine className="h-4 w-4 mr-1" />
          Memo
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setIsChatOpen(true)}>
          <MessageCircle className="h-4 w-4 mr-1" />
          Chat
        </Button>
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