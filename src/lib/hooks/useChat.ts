import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/chat';

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
}

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notePreview, setNotePreview] = useState<NotePreview | null>(null); 

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages from Supabase...');
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.log('Fetched messages:', data);
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (content: string): Promise<void> => {
    console.log('2. sendMessage開始');
    setIsLoading(true);

    try {
      // 1. ユーザーメッセージをSupabaseに保存
      const { error: userError } = await supabase
        .from('chat_messages')
        .insert([{ role: 'user', content: content.trim() }]);

      if (userError) throw userError;

      // 2. ChatGPT APIを呼び出し
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content.trim() }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();

      // 3. AIの応答をSupabaseに保存
      const { error: assistantError } = await supabase
        .from('chat_messages')
        .insert([{ role: 'assistant', content: data.answer }]);

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
        以下の会話を簡潔に要約してください。重要なポイントを箇条書きでまとめてください。
  
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

  // Step 2: メモの保存
  const saveNote = async (noteData: NoteData) => {
    try {
      // 1. メモの基本情報を保存
      const { data: newMemo, error: memoError } = await supabase
        .from('memories')
        .insert([{
          title: noteData.title,
          content: noteData.content,
          category_id: noteData.category_id,
          importance: noteData.importance,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
  
      if (memoError) {
        console.error('Memo save error:', memoError);
        throw memoError;
      }
  
      // 2. 関連メモの関係を保存（双方向）
      if (noteData.relatedMemos && noteData.relatedMemos.length > 0) {
        const relations = noteData.relatedMemos.flatMap(targetId => [
          {
            source_memo_id: newMemo.id,
            target_memo_id: targetId
          },
          // 逆方向の関係も作成
          {
            source_memo_id: targetId,
            target_memo_id: newMemo.id
          }
        ]);
  
        const { error: relationsError } = await supabase
          .from('memory_relations')
          .insert(relations);
  
        if (relationsError) {
          console.error('Relations save error:', relationsError);
          throw relationsError;
        }
      }
  
      // プレビューをクリア
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
    fetchMessages();
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    notePreview,
    generateNotePreview,
    saveNote,
  };
};
