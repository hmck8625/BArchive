import { useState, useEffect, useRef} from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/lib/hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@supabase/supabase-js'
import { X, Plus, Pencil } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/lib/hooks/useAuth';  // useAuthを追加
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "null",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "null"
)

interface ChatWindowProps {
  open: boolean;
  onClose: () => void;
}

interface Category {
  id: string;
  name: string;
}

interface ExistingMemo {
  id: string;
  title: string;
}

export function ChatWindow({ open, onClose }: ChatWindowProps) {
  const { user } = useAuth();  // useAuthを使用
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, generateNotePreview, saveNote } = useChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // メモ作成用の状態
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [importance, setImportance] = useState(1);
  const [relatedMemos, setRelatedMemos] = useState<ExistingMemo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingMemos, setExistingMemos] = useState<ExistingMemo[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null); 

  // カテゴリ作成用の状態を追加
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // カテゴリーと既存メモのフェッチ
  useEffect(() => {
    if (isNoteDialogOpen && user) {  // userチェックを追加
      const fetchData = async () => {
        try {
          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('id, name')
            .eq('user_id', user.id)  // ユーザーのカテゴリのみを取得
            .order('name');

          if (categoriesError) throw categoriesError;
          setCategories(categoriesData || []);

          const { data: memosData, error: memosError } = await supabase
            .from('memories')
            .select('id, title')
            .eq('user_id', user.id)  // ユーザーのメモのみを取得
            .order('created_at', { ascending: false });

          if (memosError) throw memosError;
          setExistingMemos(memosData || []);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };

      fetchData();
    }
  }, [isNoteDialogOpen, user]);  // user を依存配列に追加


  // カテゴリ更新ハンドラー
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

  // カテゴリ作成ハンドラー
  const handleCreateCategory = async () => {
    if (!user || !newCategoryName.trim()) return;

    setIsCreatingCategory(true);
    try {
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({
          name: newCategoryName.trim(),
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => [...prev, newCategory]);
      setSelectedCategory(newCategory.id);
      setIsNewCategoryDialogOpen(false);
      setNewCategoryName("");
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Convert to Note ボタンのハンドラー
  const handleConvertToNote = async () => {
    setIsSummarizing(true);
    try {
      const preview = await generateNotePreview();
      if (preview) {
        setEditedTitle(preview.title);
        setEditedContent(preview.content);
        setIsNoteDialogOpen(true);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Failed to generate summary');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input.trim());
    setInput('');
  };

  // メモの保存ハンドラー
  const handleSaveNote = async () => {
    if (!editedTitle.trim() || !editedContent.trim() || !selectedCategory || !user) {
      alert('Please fill in all required fields');
      return;
    }

    const noteData = {
      title: editedTitle.trim(),
      content: editedContent.trim(),
      category_id: selectedCategory,
      importance,
      relatedMemos: relatedMemos.map(memo => memo.id),
      user_id: user.id  // user_idを追加
    };

    const result = await saveNote(noteData);
    if (result.success) {
      setIsNoteDialogOpen(false);
      resetNoteForm();
    } else {
      alert('Failed to save note');
    }
  };

  // フォームのリセット
  const resetNoteForm = () => {
    setEditedTitle('');
    setEditedContent('');
    setSelectedCategory('');
    setImportance(1);
    setRelatedMemos([]);
  };

  // 関連メモの追加と削除
  const addRelatedMemo = (memoId: string) => {
    const selectedMemo = existingMemos.find(m => m.id === memoId);
    if (selectedMemo && !relatedMemos.some(m => m.id === memoId)) {
      setRelatedMemos(prev => [...prev, selectedMemo]);
    }
  };

  const removeRelatedMemo = (memoId: string) => {
    setRelatedMemos(prev => prev.filter(m => m.id !== memoId));
  };

  // メッセージやローディング状態が変更されたときのスクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // ウィンドウが開かれたときのスクロール
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [open]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  // LoadingAnimation コンポーネント
  function LoadingAnimation() {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-bounce">😊</div>
      </div>
    );
  }
   
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 bg-gradient-to-b from-purple-50 to-pink-50">
          <DialogHeader className="flex flex-row justify-between items-center p-4 border-b">
            <DialogTitle className="text-lg font-semibold">Chat</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
        
          <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-white text-gray-900'
                        : 'bg-white text-gray-900'
                    } shadow-sm`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {(isLoading || isSummarizing) && (
                <div className="flex justify-center items-center py-4">
                  <LoadingAnimation />
                  {isSummarizing && (
                    <div className="text-sm text-gray-500 mt-2">
                      Generating summary...
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
 
          <div className="p-4 space-y-2">
            <Button
              onClick={handleConvertToNote}
              variant="ghost"
              className="w-full text-gray-500 hover:text-gray-700 flex items-center gap-2 h-10"
              disabled={isSummarizing}
            >
              <span className="text-sm">
                {isSummarizing ? 'Generating Summary...' : 'Convert to Note'}
              </span>
            </Button>
            
            <div className="flex items-center gap-2 bg-white rounded-full p-2 shadow-sm">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Talk to me..."
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                disabled={isSummarizing}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || isSummarizing}
                size="icon"
                className="h-8 w-8 rounded-full bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
 
      {/* メモ編集用のダイアログ */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Note title..."
              />
            </div>
 
            <div className="grid gap-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Note content..."
                className="min-h-[200px]"
              />
            </div>
 
            <div className="grid gap-2">
              <label className="text-sm font-medium">Category</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
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
                  onClick={() => {
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setIsNewCategoryDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
 
            <div className="grid gap-2">
              <label className="text-sm font-medium">Importance (1-5)</label>
              <input
                type="range"
                min="1"
                max="5"
                value={importance}
                onChange={(e) => setImportance(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-muted-foreground">
                {importance}
              </div>
            </div>
 
            <div className="grid gap-2">
              <label className="text-sm font-medium">Related Memos</label>
              {relatedMemos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {relatedMemos.map(memo => (
                    <div 
                      key={memo.id}
                      className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md"
                    >
                      <span className="text-sm">{memo.title}</span>
                      <button
                        onClick={() => removeRelatedMemo(memo.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <Select onValueChange={addRelatedMemo}>
                <SelectTrigger>
                  <SelectValue placeholder="Add related memo" />
                </SelectTrigger>
                <SelectContent>
                  {existingMemos
                    .filter(memo => !relatedMemos.some(m => m.id === memo.id))
                    .map((memo) => (
                      <SelectItem key={memo.id} value={memo.id}>
                        {memo.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
 
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>
              Save Note
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
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Category Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Enter category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
          </div>
 
          <div className="flex justify-end space-x-2">
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
        </DialogContent>
      </Dialog>
    </>
  );
 }