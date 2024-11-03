'use client'

import React, { useState, useEffect } from 'react'
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
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { SupabaseClient } from '@supabase/supabase-js'

interface Category {
  id: string
  name: string
}

interface ExistingMemo {
  id: string
  title: string
}

interface Memo {
  id: string
  title: string
  content: string
  category_id: string
  importance: number
  created_at: string
  categories: {
    id: string
    name: string
  }
  relatedMemos: string[]
}

interface EditMemoDialogProps {
  memo: Memo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
  supabase: SupabaseClient
}

export function EditMemoDialog({ memo, open, onOpenChange, onSave, supabase }: EditMemoDialogProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [importance, setImportance] = useState(1)
  const [relatedMemos, setRelatedMemos] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [existingMemos, setExistingMemos] = useState<ExistingMemo[]>([])
  const [openCombobox, setOpenCombobox] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
      fetchRelatedMemos(memo.id);
    }
  }, [memo])

  // カテゴリと既存メモのロード
  useEffect(() => {
    const fetchData = async () => {
      try {
        // カテゴリの取得
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name')
          .order('name')

        setCategories(categoriesData || [])

        // 既存メモの取得（自分以外）
        if (memo) {
          const { data: memosData } = await supabase
            .from('memories')
            .select('id, title')
            .neq('id', memo.id)
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
  }, [open, memo, supabase])

  const handleSave = async () => {
    if (!memo || !title.trim() || !content.trim() || !categoryId) {
      alert('Please fill in all required fields')
      return
    }
  
    setIsLoading(true)
    try {
      // 基本的なメモ情報の更新
      const { error: updateError } = await supabase
        .from('memories')
        .update({
          title,
          content,
          category_id: categoryId,
          importance,
          updated_at: new Date().toISOString()
        })
        .eq('id', memo.id)

        console.log('Updating memo:', {
          id: memo.id,
          title,
          content,
          category_id: categoryId,
          importance
        })
  
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
  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Memo</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Title input */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Memo title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
  
          {/* Content input */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Content <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Memo content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
  
          {/* Category selection */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
  
          {/* Importance slider */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Importance (1-5)</label>
            <Slider
              value={[importance]}
              onValueChange={([value]) => setImportance(value)}
              max={5}
              min={1}
              step={1}
            />
            <div className="text-center text-sm text-muted-foreground">
              {importance}
            </div>
          </div>
  
          {/* Related memos - チェックボックスバージョン */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Related Memos</label>
            <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto">
              <div className="grid gap-2">
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
        </div>
  
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading || !title.trim() || !content.trim() || !categoryId}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}