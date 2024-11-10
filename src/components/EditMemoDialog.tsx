//components/EditMemoDialog.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Check, ChevronsUpDown, X, Plus, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@/lib/hooks/useAuth'  // useAuthをインポート
import { Memory, Category, ExistingMemo} from '@/types'  // 共通の型をインポート

interface EditMemoDialogProps {
  memo: Memory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  supabase: SupabaseClient;
  onMemoryUpdate?: () => Promise<void>;  // 追加
}

export function EditMemoDialog({ memo, open, onOpenChange, onSave, supabase, onMemoryUpdate}: EditMemoDialogProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [importance, setImportance] = useState(1)
  const [relatedMemos, setRelatedMemos] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [existingMemos, setExistingMemos] = useState<ExistingMemo[]>([])
  const [openCombobox, setOpenCombobox] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth() 

  // 新規カテゴリ作成関連の状態
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // 初期データのロード
  useEffect(() => {
    if (memo) {
      setTitle(memo.title)
      setContent(memo.content)
      setCategoryId(memo.category_id)
      setImportance(memo.importance)
      setRelatedMemos(memo.relatedMemos || [])
    }
    if (memo?.id) {
      fetchRelatedMemos(memo.id)
    }
  }, [memo])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return  // ユーザーチェックを追加

      try {
        // カテゴリの取得
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name')
          .order('name')
          .eq('user_id', user.id)

        setCategories(categoriesData || [])

        // 既存メモの取得（自分以外）
        if (memo) {
          const { data: memosData } = await supabase
            .from('memories')
            .select('id, title')
            .neq('id', memo.id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          setExistingMemos(memosData || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    if (open) {
      fetchData()
    }
  }, [open, memo, supabase, user])  // user を依存配列に追加

  // カテゴリ更新処理
  const handleUpdateCategory = async () => {
    if (!user || !editingCategory || !newCategoryName.trim()) return;

    setIsCreatingCategory(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: newCategoryName.trim() })
        .eq('id', editingCategory.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // カテゴリリストを更新
      setCategories(prev => 
        prev.map(cat => 
          cat.id === editingCategory.id 
            ? { ...cat, name: newCategoryName.trim() } 
            : cat
        )
      );
      
      // ダイアログを閉じる
      setIsNewCategoryDialogOpen(false);
      setNewCategoryName("");
      setEditingCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // カテゴリ編集を開始する関数
  const startEditingCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setIsNewCategoryDialogOpen(true);
  };

  // handleSave の修正
  const handleSave = async () => {
    if (!memo || !title.trim() || !content.trim() || !categoryId || !user) {
      alert('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      const { error: updateError } = await supabase
        .from('memories')
        .update({
          title,
          content,
          category_id: categoryId,
          importance,
          updated_at: new Date().toISOString(),
          user_id: user.id  // user_id を追加
        })
        .eq('id', memo.id)

      if (updateError) throw updateError

  
      // 関連メモの更新
      if (relatedMemos.length > 0) {
        // 既存の関連を削除
        const { error: deleteError } = await supabase
          .from('memory_relations')
          .delete()
          .eq('source_memo_id', memo.id)
  
        if (deleteError) throw deleteError
  
        // 新しい関連を追加
        const relations = relatedMemos.map(targetId => ({
          source_memo_id: memo.id,
          target_memo_id: targetId
        }))
  
        const { error: relationsError } = await supabase
          .from('memory_relations')
          .insert(relations)
  
        if (relationsError) throw relationsError
      } else {
        // 関連メモがない場合は、既存の関連をすべて削除
        await supabase
          .from('memory_relations')
          .delete()
          .eq('source_memo_id', memo.id)
      }
  
      onSave()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating memo:', error)
      alert('Failed to update memo')
    } finally {
      setIsLoading(false)
    }
  }

// メモの関連データを取得する関数
  const fetchRelatedMemos = async (memoId: string) => {
    console.log('Fetching related memos for:', memoId);
    const { data, error } = await supabase
      .from('memory_relations')
      .select('target_memo_id')
      .eq('source_memo_id', memoId);
      
    console.log('Related memos data:', data);
    console.log('Related memos error:', error);
    
    if (data) {
      const relatedIds = data.map(relation => relation.target_memo_id);
      console.log('Extracted related ids:', relatedIds);
      setRelatedMemos(relatedIds);
    }
  };
  
    // カテゴリ作成処理
    const handleCreateCategory = async () => {
      if (!user || !newCategoryName.trim()) return
  
      setIsCreatingCategory(true)
      try {
        const { data: newCategory, error } = await supabase
          .from('categories')
          .insert({
            name: newCategoryName.trim(),
            user_id: user.id
          })
          .select()
          .single()
  
        if (error) throw error
  
        // カテゴリリストを更新
        setCategories(prev => [...prev, newCategory])
        
        // 新しく作成したカテゴリを選択
        setCategoryId(newCategory.id)
        
        // ダイアログを閉じる
        setIsNewCategoryDialogOpen(false)
        setNewCategoryName("")
      } catch (error) {
        console.error('Error creating category:', error)
        alert('Failed to create category')
      } finally {
        setIsCreatingCategory(false)
      }
    }

    return (
      <>
{/* メインの編集ダイアログ */}
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-[700px] sm:h-[90vh] h-[100dvh] flex flex-col">
    <DialogHeader className="px-4 py-2 border-b flex-shrink-0">
      <DialogTitle>Edit Memo</DialogTitle>
    </DialogHeader>
    
    {/* スクロール可能なメインコンテンツ */}
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Title Section */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Title <span className="text-red-500">*</span>
          </label>
          <Textarea
            id="title"
            placeholder="Memo title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-h-[60px] w-full"
          />
        </div>

        {/* Content Section */}
        <div className="space-y-2">
          <label htmlFor="content" className="text-sm font-medium">
            Content <span className="text-red-500">*</span>
          </label>
          <Textarea
            id="content"
            placeholder="Memo content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[300px] text-base leading-relaxed p-4 w-full"
          />
        </div>

        {/* Category Section */}
        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium">
            Category <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="flex justify-between items-center">
                      <span>{cat.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 w-6"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startEditingCategory(cat);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsNewCategoryDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Importance Section */}
        <div className="space-y-2">
          <label htmlFor="importance" className="text-sm font-medium">
            Importance
          </label>
          <Select 
            value={String(importance)} 
            onValueChange={(value) => setImportance(Number(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select importance level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 - Low Priority</SelectItem>
              <SelectItem value="2">2 - Medium-Low Priority</SelectItem>
              <SelectItem value="3">3 - Medium Priority</SelectItem>
              <SelectItem value="4">4 - Medium-High Priority</SelectItem>
              <SelectItem value="5">5 - High Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Related Memos Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Related Memos</label>
          <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto bg-white">
            <div className="space-y-2">
              {existingMemos.map((memo) => (
                <div key={memo.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={memo.id}
                    checked={relatedMemos.includes(memo.id)}
                    onChange={() => {
                      setRelatedMemos(prev =>
                        prev.includes(memo.id)
                          ? prev.filter(id => id !== memo.id)
                          : [...prev, memo.id]
                      )
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor={memo.id} className="ml-2 text-sm">
                    {memo.title}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 下部の余白を追加 */}
        <div className="h-4" />
      </div>
    </div>

    {/* 固定フッター */}
    <div className="border-t bg-white p-4 flex justify-end gap-2 flex-shrink-0">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button 
        onClick={handleSave}
        disabled={isLoading || !title.trim() || !content.trim() || !categoryId}
      >
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* Category Creation/Edit Dialog */}
<Dialog 
  open={isNewCategoryDialogOpen} 
  onOpenChange={(open) => {
    setIsNewCategoryDialogOpen(open);
    if (!open) {
      setEditingCategory(null);
      setNewCategoryName("");
    }
  }}
>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>
        {editingCategory ? 'Edit Category' : 'Create New Category'}
      </DialogTitle>
    </DialogHeader>
    
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Category Name <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="Enter category name..."
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="w-full"
        />
      </div>
    </div>

    <DialogFooter className="px-4 py-4 border-t">
      <div className="flex justify-end gap-2 w-full">
        <Button 
          variant="outline" 
          onClick={() => {
            setIsNewCategoryDialogOpen(false);
            setEditingCategory(null);
            setNewCategoryName("");
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
          disabled={isCreatingCategory || !newCategoryName.trim()}
        >
          {isCreatingCategory 
            ? (editingCategory ? 'Updating...' : 'Creating...') 
            : (editingCategory ? 'Update' : 'Create')}
        </Button>
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </>
  )
}