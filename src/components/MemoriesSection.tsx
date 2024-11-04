// src/components/MemoriesSection.tsx
import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth' 
import { Card } from "@/components/ui/card"
import { formatDate } from '@/lib/utils/formatDate'
import { EditMemoDialog } from '@/components/EditMemoDialog'
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Memory } from '@/types'

interface MemoriesSectionProps {
  memories: Memory[]
  isLoading?: boolean
  supabase: any // Supabaseのクライアントインスタンス
  onMemoryUpdate: () => void // メモが更新された時のコールバック
}

export function MemoriesSection({ 
  memories, 
  isLoading = false, 
  supabase,
  onMemoryUpdate 
}: MemoriesSectionProps) {
  const { user } = useAuth()  // 追加
  const [editingMemo, setEditingMemo] = useState<Memory | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [memoToDelete, setMemoToDelete] = useState<Memory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedMemos, setExpandedMemos] = useState<Set<string>>(new Set())

  // 文字列を省略する関数
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return `${text.slice(0, maxLength)}...`
  }

  // メモの展開/折りたたみを切り替える
  const toggleMemoExpansion = (memoId: string) => {
    setExpandedMemos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(memoId)) {
        newSet.delete(memoId)
      } else {
        newSet.add(memoId)
      }
      return newSet
    })
  }
  
  // メモの編集権限チェック
  const canEditMemo = useCallback((memo: Memory) => {
    return user && memo.user_id === user.id
  }, [user])

  const handleEdit = useCallback((memo: Memory) => {
    if (!canEditMemo(memo)) {
      alert('このメモを編集する権限がありません')
      return
    }
    setEditingMemo(memo)
    setIsEditDialogOpen(true)
  }, [canEditMemo])

  const handleDeleteClick = useCallback((memo: Memory) => {
    if (!canEditMemo(memo)) {
      alert('このメモを削除する権限がありません')
      return
    }
    setMemoToDelete(memo)
    setIsDeleteDialogOpen(true)
  }, [canEditMemo])

  // メモを削除する
  const handleDelete = async () => {
    if (!memoToDelete || isDeleting || !user) return
    if (memoToDelete.user_id !== user.id) return

    setIsDeleting(true)
    try {
      // 関連付けの削除（source）
      const { error: sourceError } = await supabase
        .from('memory_relations')
        .delete()
        .eq('source_memo_id', memoToDelete.id)

      if (sourceError) throw sourceError

      // 関連付けの削除（target）
      const { error: targetError } = await supabase
        .from('memory_relations')
        .delete()
        .eq('target_memo_id', memoToDelete.id)

      if (targetError) throw targetError

      // メモ本体の削除
      const { error: deleteError } = await supabase
        .from('memories')
        .delete()
        .eq('id', memoToDelete.id)
        .eq('user_id', user.id)  // ユーザーIDの確認を追加

      if (deleteError) throw deleteError

      setIsDeleteDialogOpen(false)
      setMemoToDelete(null)
      await onMemoryUpdate()

    } catch (error) {
      console.error('Error in delete process:', error)
      alert('メモの削除中にエラーが発生しました')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mb-6">
      <h2 className="text-gray-700 mb-2">{memories.length} Knowledge Archives</h2>
      
      {isLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <Card key={memory.id} className="p-4 bg-[#F0F7FF]">
              <div className="flex gap-1">
                <div className="flex-1 min-w-0">
                  {/* タイトルセクション */}
                  {memory.title && (
                    <div className="border-b border-gray-200 pb-2 mb-3">
                      <h3 className="font-medium text-gray-900">
                        {memory.title}
                      </h3>
                    </div>
                  )}
                  
                  {/* コンテンツセクション */}
                  <div className="prose prose-sm max-w-none">
                    {memory.content.length > 100 && !expandedMemos.has(memory.id) ? (
                      <div>
                        <p className="text-sm text-gray-600">
                          {truncateText(memory.content, 100)}
                        </p>
                        <button
                          onClick={() => toggleMemoExpansion(memory.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                        >
                          続きを読む
                        </button>
                      </div>
                    ) : memory.content.length > 100 ? (
                      <div>
                        <p className="text-sm text-gray-600">{memory.content}</p>
                        <button
                          onClick={() => toggleMemoExpansion(memory.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                        >
                          折りたたむ
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">{memory.content}</p>
                    )}
                  </div>

                  {/* メタ情報セクション */}
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-gray-400">
                      {formatDate(memory.created_at)}
                    </p>
                    {memory.categories && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {memory.categories.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* アクションボタン */}
                {canEditMemo(memory) && (
                <div className="flex flex-col gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-7 w-7"
                    onClick={() => handleEdit(memory)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-7 w-7"
                    onClick={() => handleDeleteClick(memory)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <EditMemoDialog
        memo={editingMemo}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={() => {
          onMemoryUpdate()
          setIsEditDialogOpen(false)
        }}
        supabase={supabase}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>メモを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              このメモ「{memoToDelete?.title}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-500 hover:bg-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}