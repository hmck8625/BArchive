// app/components/ChatWindow.tsx
import { useState, useEffect, useRef, useCallback, useMemo} from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/lib/hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@supabase/supabase-js'
import { X, Plus, Pencil } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/lib/hooks/useAuth';  // useAuthを追加
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { MessageSquare, Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Portal } from "@radix-ui/react-portal";


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
  initialMessage?: {
    id?: string;
    title?: string;
    content?: string;
  };
}
interface Category {
  id: string;
  name: string;
}

interface ExistingMemo {
  id: string;
  title: string;
}

export function ChatWindow({ open, onClose, initialMessage }: ChatWindowProps) {
  const MAX_CHARS = 200; // 最大文字数

  const { user } = useAuth();  // useAuthを使用
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, isLoading, sendMessage, generateNotePreview, saveNote, historySize, updateHistorySize } = useChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  
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
  const [initialMemoId, setInitialMemoId] = useState<string | undefined>();

  // カテゴリ作成用の状態を追加
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [hasInitialMessageSent, setHasInitialMessageSent] = useState(false);

  // IME入力中かどうかを管理するstate
  const [isComposing, setIsComposing] = useState(false);

  // 履歴サイズ変更用のセレクトボックス
  const handleHistorySizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value);
    updateHistorySize(newSize);
  };

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

// 初期メッセージの送信を処理
useEffect(() => {
  if (open && initialMessage?.content && !hasInitialMessageSent) {
    console.log('Setting initial message and ID...', {
      id: initialMessage.id,
      title: initialMessage.title,
    });

    // 重要: initialMemoIdを設定
    if (initialMessage.id) {
      setInitialMemoId(initialMessage.id);
      console.log('Set initialMemoId:', initialMessage.id);
    }
    
    const prompt = initialMessage.title
        ? `以下のメモについて、一緒に考えを深めていきましょう：
\`\`\`text
タイトル：
${initialMessage.title}
内容：
${initialMessage.content}
\`\`\`
このトピックで特に興味深いと感じた部分や、さらに掘り下げたい点について言及してください。`
    : initialMessage.content;
    sendMessage(prompt);
    setHasInitialMessageSent(true);
  }
    // チャットが閉じられたらフラグをリセット
    if (!open) {
      setHasInitialMessageSent(false);
      setInitialMemoId(undefined); // チャットが閉じられたらリセット
    }
  }, [open, initialMessage?.content, initialMessage?.title, initialMessage?.id, hasInitialMessageSent]);

    // モバイル端末の検出
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
      };
  
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);
  
    // 送信ボタンのハンドラー
    const handleSend = useCallback(() => {
      if (!inputRef.current) return;
      const value = inputRef.current.value.trim();
      if (!value) return;
      
      sendMessage(value);  // 単にメッセージ内容だけを渡す
      inputRef.current.value = '';
      inputRef.current.style.height = 'auto';
    }, [sendMessage]);
    
    // キー入力のハンドラー
    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // IME入力中は処理をスキップ
      if (isComposing) {
        return;
      }

      if (e.key === 'Enter') {
        if (isMobile) {
          // モバイルの場合は通常の改行として処理
          return;
        }
        
        if (e.shiftKey) {
          // Shift + Enterの場合は改行
          return;
        }
        
        // 通常のEnterの場合は送信
        e.preventDefault();
        handleSend();
      }
    };

  // IME入力開始時のハンドラー
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // IME入力終了時のハンドラー
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };
  

  // 高さ調整は必要な場合のみ
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const lines = textarea.value.split('\n').length;

    // 単純な計算で高さを設定（パフォーマンス重視）
    const newHeight = Math.min(lineHeight * lines, 200);
    if (textarea.offsetHeight !== newHeight) {
      textarea.style.height = `${newHeight}px`;
    }
  }, []);


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

  // コンポーネントの先頭で追加
  const titleInputRef = useRef<HTMLInputElement>(null);

  // useEffectを追加
  useEffect(() => {
    if (isNoteDialogOpen && titleInputRef.current) {
      // 入力フィールドのフォーカスを解除し、選択を解除
      titleInputRef.current.blur();
      titleInputRef.current.setSelectionRange(0, 0);
    }
  }, [isNoteDialogOpen]);

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
    console.log('summariging');

    setIsSummarizing(true);
    try {
      const preview = await generateNotePreview();
      if (preview) {
        setEditedTitle(preview.title);
        setEditedContent(preview.content);
        console.log('preview.title', preview.title);
        console.log('initialMemoId', initialMemoId);


        // 初期メモがある場合、それを関連メモとして設定
        if (initialMemoId) {
          console.log('initialMemoId', initialMemoId);
          const memo = existingMemos.find(m => m.id === initialMemoId);
          if (memo) {
            setRelatedMemos([memo]);
          }
        }
        setIsNoteDialogOpen(true);
      }

    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Failed to generate summary');
    } finally {
      setIsSummarizing(false);
    }
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
        <div className="animate-bounce text-sm text-gray-500">Generating...</div>
      </div>
    );
  }

  // MessageContentコンポーネントの修正
const MessageContent = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;
          return isInline ? (
            <code className={className} {...props}>
              {children}
            </code>
          ) : (
            <div className="max-w-full overflow-x-auto"> {/* コードブロックのラッパーを追加 */}
              <SyntaxHighlighter
                style={oneLight}
                language={match[1]}
                PreTag="div"
                className="rounded-md"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          );
        },
        p({ children }) {
          return <p className="whitespace-pre-wrap mb-4 break-words">{children}</p>; // break-words を追加
        },
        pre({ children }) {
          return <pre className="max-w-full overflow-x-auto">{children}</pre>; // pre タグにもスタイルを追加
        }
      }}
      className="prose prose-sm max-w-none break-words" // break-words を追加
    >
      {content}
    </ReactMarkdown>
  );
};
   
return (
  <>
    {/* メインチャットダイアログ */}
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] sm:h-[90vh] h-[92dvh] flex flex-col p-0 bg-gradient-to-b from-purple-50 to-pink-50">
        {/* ヘッダー */}
        <DialogHeader className="flex flex-row justify-between items-center p-4 border-b flex-shrink-0">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <span>Chat</span>
            <Button
              onClick={handleConvertToNote}
              variant="ghost"
              className="text-gray-500 hover:text-gray-700 flex items-center gap-2 h-8 text-sm"
              disabled={isSummarizing}
            >
              {isSummarizing ? 'Generating Summary...' : 'Convert to Note'}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 p-1 hover:bg-gray-100"
                >
                  <Info className="h-4 w-4 text-gray-400" />
                </Button>
              </PopoverTrigger>
              <Portal>
                <PopoverContent 
                  className="w-72 z-50" 
                  sideOffset={5}
                  side="bottom"
                  align="start"
                >
                  <div className="grid gap-2">
                    <h4 className="font-medium leading-none">Note変換について</h4>
                    <p className="text-sm text-gray-500">
                      AIとのやりとりをメモ化します。
                      直近５往復のメッセージを参照し振り返りやすいように取りまとめてくれます。
                    </p>
                  </div>
                </PopoverContent>
              </Portal>
            </Popover>
          </DialogTitle>
        </DialogHeader>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full px-4" ref={scrollAreaRef}>
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
                    } shadow-sm overflow-hidden break-words`}
                  >
                    <MessageContent content={message.content} />
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
        </div>

        {/* 履歴サイズ設定 */}
        <div className="px-4 py-2 border-t bg-white/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <MessageSquare className="h-4 w-4" />
              <span>会話履歴：</span>
            </label>
            <div className="flex items-center gap-2">
              <select 
                value={historySize}
                onChange={handleHistorySizeChange}
                className="pl-3 pr-8 py-1 text-sm border rounded-md bg-white/80 
                          shadow-sm hover:bg-white transition-colors 
                          focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={2}>2往復 (4メッセージ)</option>
                <option value={4}>4往復 (8メッセージ)</option>
                <option value={6}>6往復 (12メッセージ)</option>
              </select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <Info className="h-4 w-4 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="grid gap-2">
                    <h4 className="font-medium leading-none">会話履歴について</h4>
                    <p className="text-sm text-gray-500">
                      AIの応答に含める過去の会話数を設定します。
                      多いほど文脈を理解しやすくなりますが、応答が遅くなる可能性があります。
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* 入力エリア */}
        <div className="p-4 border-t bg-white/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
              <textarea
                ref={inputRef}
                onInput={handleInput}
                onKeyDown={handleKeyPress}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                maxLength={MAX_CHARS}
                placeholder={isMobile ? "メッセージを入力...(200文字まで)" : "メッセージを入力(200文字まで)... (Shift + Enter で改行)"}
                className="w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-base min-h-[44px] max-h-[200px] resize-none overflow-y-auto"
                style={{
                  fontSize: '16px',
                  lineHeight: '1.5',
                  WebkitTextSizeAdjust: '100%',
                }}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || isSummarizing}
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* メモ作成ダイアログ */}
    <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
      <DialogContent className="sm:max-w-[700px] sm:h-[90vh] h-[92dvh] flex flex-col">
        <DialogHeader className="px-4 py-2 border-b flex-shrink-0">
          <DialogTitle>Create New Note</DialogTitle>
        </DialogHeader>
        
        {/* スクロール可能なメインコンテンツ */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Title Section */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full"
              />
            </div>

            {/* Content Section */}
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Content <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Note content..."
                className="min-h-[300px] text-base leading-relaxed p-4 w-full"
              />
            </div>

            {/* Category Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
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

            {/* Importance Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Importance</label>
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
                <SelectTrigger className="w-full">
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

            {/* Bottom spacing */}
            <div className="h-4" />
          </div>
        </div>

        {/* 固定フッター */}
        <div className="border-t bg-white p-4 flex justify-end gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveNote}
            disabled={isLoading || !editedTitle.trim() || !editedContent.trim() || !selectedCategory}
          >
            {isLoading ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
);
}