// src/components/MemoDialog.tsx

'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth' 
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
import { X } from "lucide-react"
import { SupabaseClient } from '@supabase/supabase-js'
import { Memory, Category, ExistingMemo } from '@/types'

interface MemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (memoData: MemoData) => Promise<void>;
  supabase: SupabaseClient;
}

interface MemoData {
  content: string;
  category_id: string;
  importance: number;
  relatedMemos?: string[];
  user_id?: string;  // user_idを追加
}



export function MemoDialog({ open, onOpenChange, onSave, supabase }: MemoDialogProps) {
  const [memoText, setMemoText] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [importance, setImportance] = useState(1)
  const [relatedMemos, setRelatedMemos] = useState<ExistingMemo[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [existingMemos, setExistingMemos] = useState<ExistingMemo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth() 

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return  // ユーザーが未認証の場合は早期リターン

      try {
        // カテゴリーの取得 - ユーザー固有のカテゴリーを取得
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name')
          .order('name')
          .eq('user_id', user.id)      // 現在のユーザーのデータのみを取得

        if (categoriesError) throw categoriesError
        setCategories(categoriesData || [])

        // メモの取得 - ユーザー固有のメモを取得
        const { data: memosData, error: memosError } = await supabase
          .from('memories')
          .select('id, title')
          .order('created_at', { ascending: false })
          .eq('user_id', user.id)      // 現在のユーザーのデータのみを取得

        if (memosError) throw memosError
        setExistingMemos(memosData || [])

      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    if (open) {
      fetchData()
    }
  }, [open, supabase, user])  // userを依存配列に追加

  const handleSave = async () => {
    if (!memoText.trim() || !selectedCategory || !user) {
      alert('Please fill in the required fields');
      return;
    }
  
    setIsLoading(true);
    try {
      const memoData: MemoData = {
        content: memoText,
        category_id: selectedCategory,
        importance,
        relatedMemos: relatedMemos.map(memo => memo.id),
        user_id: user.id // ユーザーIDを追加
      };
  
      await onSave(memoData);
      resetForm();
    } catch (error) {
      console.error('Error saving memo:', error);
      alert('Failed to save memo');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setMemoText("")
    setSelectedCategory("")
    setImportance(1)
    setRelatedMemos([])
  }

  const addRelatedMemo = (memoId: string) => {
    const selectedMemo = existingMemos.find(m => m.id === memoId)
    if (selectedMemo && !relatedMemos.some(m => m.id === memoId)) {
      setRelatedMemos(prev => [...prev, selectedMemo])
    }
  }

  const removeRelatedMemo = (memoId: string) => {
    setRelatedMemos(prev => prev.filter(m => m.id !== memoId))
  }

  const availableMemos = existingMemos.filter(
    memo => !relatedMemos.some(m => m.id === memo.id)
  )

  return (
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-[700px] max-h-[80dvh] h-auto overflow-hidden flex flex-col">
    {!user ? (
      <div className="p-4 text-center">
        Please log in to create memos.
      </div>
    ) : (
      <>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create a new memo</DialogTitle>
        </DialogHeader>
    
        {/* スクロール可能な本文エリア */}
        <div className="flex-1 overflow-y-auto px-1">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Memo Content <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Type your memo here..."
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                className="min-h-[200px] text-base leading-relaxed p-4 resize-y"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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

            <div className="grid gap-2">
              <label className="text-sm font-medium">Importance</label>
              <Select 
                value={String(importance)} 
                onValueChange={(value) => setImportance(Number(value))}
              >
                <SelectTrigger>
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

            <div className="grid gap-2">
              <label className="text-sm font-medium">Related Memos (Optional)</label>
              
              {/* Selected Memos Display */}
              {relatedMemos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {relatedMemos.map(memo => (
                    <div 
                      key={memo.id}
                      className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md"
                    >
                      <span className="text-sm">{memo.title}</span>
                      <button
                        type="button"
                        onClick={() => removeRelatedMemo(memo.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Memo Selection */}
              {availableMemos.length > 0 && (
                <Select onValueChange={addRelatedMemo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add related memo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMemos.map((memo) => (
                      <SelectItem key={memo.id} value={memo.id}>
                        {memo.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {/* 固定フッター */}
        <div className="flex justify-end space-x-2 pt-4 border-t mt-auto flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading || !memoText.trim() || !selectedCategory}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </>
    )}
  </DialogContent>
</Dialog>
  )
}