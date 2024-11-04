import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/chat';
import { useAuth } from '@/lib/hooks/useAuth';  // useAuthをインポート

interface NotePreview {
  title: string;
  content: string;
}

interface NoteData {
  title: string;
  content: string;
  category_id: string;
  importance: number;
  relatedMemos?: string[];
  user_id?: string;  // user_idを追加
}

export const useChat = () => {
  const { user } = useAuth();  // useAuthを使用
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notePreview, setNotePreview] = useState<NotePreview | null>(null);

  // カテゴリ作成関連の関数を追加
  const createCategory = async (categoryName: string) => {
    if (!user || !categoryName.trim()) {
      throw new Error('User not authenticated or invalid category name');
    }

    try {
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({
          name: categoryName.trim(),
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      return newCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };

  const fetchMessages = async () => {
    if (!user) return;  // ユーザーが未認証の場合は早期リターン

    try {
      console.log('Fetching messages from Supabase...');
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)  // ユーザーのメッセージのみを取得
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.log('Fetched messages:', data);
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (content: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');  // ユーザー認証チェック

    console.log('2. sendMessage開始');
    setIsLoading(true);

    try {
      // 1. ユーザーメッセージをSupabaseに保存
      const { error: userError } = await supabase
        .from('chat_messages')
        .insert([{
          role: 'user',
          content: content.trim(),
          user_id: user.id  // ユーザーIDを追加
        }]);

      if (userError) throw userError;

      // 2. ChatGPT APIを呼び出し（変更なし）
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content.trim() }),
      });

      if (!response.ok) throw new Error(`API call failed: ${response.status}`);
      const data = await response.json();

      // 3. AIの応答をSupabaseに保存
      const { error: assistantError } = await supabase
        .from('chat_messages')
        .insert([{
          role: 'assistant',
          content: data.answer,
          user_id: user.id  // ユーザーIDを追加
        }]);

      if (assistantError) throw assistantError;

      // 4. メッセージ一覧を更新
      await fetchMessages();

    } catch (error) {
      console.error('sendMessageでエラー発生:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: 要約とタイトルの生成
  const generateNotePreview = async () => {
    try {
      const lastMessages = messages.slice(-10);
      
      const conversationText = lastMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');
  
      // 1. 要約を生成
      const summarizationPrompt = `
        以下のチャット内容について、重要な学びと次のアクションを整理してください。

        【テーマと目的】
        チャットの主題：
        達成したかったこと：

        【主要な学び】（3-5点）
        - 
        - 
        - 

        【課題と解決策】
        課題：
        対応策：

        【具体的なアクション】
        明日から実践すること：
        - 

        追加で調査が必要なこと：
        - 

        【次回に向けて】
        深堀りしたい点：
        - 

        ※具体例を含め、実践可能な形で記述してください。

        #会話の内容
        ${conversationText}
      `;
  
      const summaryResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: summarizationPrompt }),
      });
  
      if (!summaryResponse.ok) {
        throw new Error(`API call failed: ${summaryResponse.status}`);
      }
  
      const summaryData = await summaryResponse.json();
      const summary = summaryData.answer;
  
      // 2. タイトルを生成
      const titleResponse = await fetch('/api/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: summary }),
      });
  
      if (!titleResponse.ok) {
        throw new Error(`Failed to generate title: ${titleResponse.status}`);
      }
  
      const { title } = await titleResponse.json();
  
      // プレビューを状態にセット
      const preview = {
        title,
        content: summary
      };
      setNotePreview(preview);
      
      return preview;
    } catch (error) {
      console.error('Error generating note preview:', error);
      return null;
    }
  };

  // メモの保存処理
  // Step 2: メモの保存
  const saveNote = async (noteData: NoteData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // カテゴリIDが "new_category:名前" の形式の場合、新しいカテゴリを作成
      if (noteData.category_id.startsWith('new_category:')) {
        const newCategoryName = noteData.category_id.split(':')[1];
        const newCategory = await createCategory(newCategoryName);
        noteData.category_id = newCategory.id;
      }

      // 1. メモの基本情報を保存
      const { data: newMemo, error: memoError } = await supabase
        .from('memories')
        .insert([{
          title: noteData.title,
          content: noteData.content,
          category_id: noteData.category_id,
          importance: noteData.importance,
          created_at: new Date().toISOString(),
          user_id: user.id
        }])
        .select()
        .single();

      if (memoError) {
        console.error('Memo save error:', memoError);
        throw memoError;
      }

      // 2. 関連メモの関係を保存（双方向）
      if (noteData.relatedMemos && noteData.relatedMemos.length > 0) {
        // まず、関連メモが現在のユーザーのものかを確認
        const { data: userMemos, error: userMemosError } = await supabase
          .from('memories')
          .select('id')
          .eq('user_id', user.id)
          .in('id', noteData.relatedMemos);

        if (userMemosError) throw userMemosError;

        // ユーザーの所有するメモIDのみを抽出
        const validRelatedMemoIds = userMemos.map(memo => memo.id);

        // 有効な関連メモがある場合のみ関係を作成
        if (validRelatedMemoIds.length > 0) {
          const relations = validRelatedMemoIds.flatMap(targetId => [
            {
              source_memo_id: newMemo.id,
              target_memo_id: targetId
            },
            {
              source_memo_id: targetId,
              target_memo_id: newMemo.id
            }
          ]);

          const { error: relationsError } = await supabase
            .from('memory_relations')
            .insert(relations);

          if (relationsError) throw relationsError;
        }
      }

      setNotePreview(null);
      
      return {
        success: true,
        id: newMemo.id
      };
    } catch (error) {
      console.error('Error saving note:', error);
      return {
        success: false,
        id: null
      };
    }
  };

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  return {
    messages,
    isLoading,
    sendMessage,
    notePreview,
    generateNotePreview,
    saveNote,
    createCategory,  // createCategory関数をエクスポート
  };
};