import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/chat';
import { useAuth } from '@/lib/hooks/useAuth';  // useAuthをインポート

interface NotePreview {
  title: string;
  content: string;
}

interface ChatOptions {
  historySize?: number;  // 履歴の往復数（デフォルト3）
}

interface NoteData {
  title: string;
  content: string;
  category_id: string;
  importance: number;
  relatedMemos?: string[];
  user_id?: string;  // user_idを追加
}

export const useChat = (options: ChatOptions = { historySize: 1 }) => {
  const { user } = useAuth();  // useAuthを使用
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notePreview, setNotePreview] = useState<NotePreview | null>(null);
  const [historySize, setHistorySize] = useState(options.historySize || 3);

  // historySize変更用の関数を追加
  const updateHistorySize = (size: number) => {
    setHistorySize(size);
  };

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
    // デバッグログ追加
        console.log('現在のメッセージ一覧:', messages);
        
        // 直近の6メッセージを取得
        const messagesLimit = historySize * 2;
        const recentMessages = messages.slice(-messagesLimit);
        console.log(`直近${messagesLimit}メッセージ:`, recentMessages);

        const formattedMessages = recentMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        console.log('ChatGPTに送信するメッセージ履歴:', formattedMessages);

      // 1. ユーザーメッセージをSupabaseに保存
      const { error: userError } = await supabase
        .from('chat_messages')
        .insert([{
          role: 'user',
          content: content.trim(),
          user_id: user.id  // ユーザーIDを追加
        }]);

      if (userError) throw userError;

      // 2. ChatGPT APIを呼び出し（contextを追加）
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: content.trim(),
          context: recentMessages  // 会話履歴を追加
        }),
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
      const lastMessages = messages.slice(-5); // 要約するメッセージ数
      
      const conversationText = lastMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');
  
      // 1. 要約を生成
      // サマライズ用プロンプト
      const summarizationPrompt = `
      以下のチャット内容は、論理的で冷徹なパワハラ上司との会話です。この会話を後から見返し、教訓を最大限に活かせるように、以下の情報を整理してください。**このサマリーは、将来の意思決定や行動の指針となるように、具体的かつ実践的な形で記録されるべきです。**

      【サマリーの目的】
      このサマリーは、上司からのフィードバックを基に、自己改善のための具体的なアクションプランを作成し、**将来の類似状況に備えるための学びを蓄積すること**を目的とします。感情的な反応は排除し、事実と論理に基づいた分析を行ってください。

      【フォーマット】

      1. **上司からの主な指摘 (3-5点):**
        - 具体的にどのような点が批判されたのか、客観的に記述してください。感情的な解釈は避け、事実のみを記述すること。
        - 指摘事項は、具体的な発言内容を引用する形で記述してください。例：
          - 「『で、結局、何が言いたいんだ？』と、目的意識の欠如を指摘された。」
          - 「『机上で考えているだけでは何も変わらない。』と、行動の遅さを指摘された。」
        - 各指摘に対して、なぜそのように指摘されたのか、**根本的な原因**を分析し記述してください。表面的な反省だけでなく、根底にある思考の癖や知識不足、スキルの欠如など、深掘りして分析してください。

      2. **根本的な課題 (3-5点):**
        - 上司からの指摘を踏まえ、**根本的に改善すべき課題**を明確にリストアップしてください。
        - 各課題について、具体的な問題点、課題を放置した場合のリスク、そして**過去に同様の課題に直面した経験**を記述してください。過去の経験を振り返ることで、課題のパターンを認識し、再発防止に役立ててください。

      3. **具体的なアクションプラン (再発防止策を含む):**
        - 各課題を解決するために、明日から具体的にどのような行動を取るのか、詳細なアクションプランを記述してください。 **今回の教訓を活かし、今後同様の状況に陥らないための再発防止策を盛り込んでください。**
        - 各アクションプランには、以下の情報を含めてください。
          - **行動内容:** 具体的に何をするのか。
          - **目標数値:** どのような状態になれば改善されたと言えるのか、客観的な指標を設定してください。
          - **期限:** いつまでにその行動を完了するのか。
          - **必要なリソース:** その行動に必要な情報、ツール、またはサポートは何か。
          - **進捗管理:** どのように進捗状況を把握し、管理するのか。
          - **再発防止策:** 今後、同様の状況が発生しないように、どのような対策を講じるか。

      4. **主要な学びと教訓:**
        - 今回の会話から得られた主要な学びと教訓を、3〜5点にまとめてください。
        - 各学びと教訓は、**具体的な事例と結びつけて記述する**ことで、記憶に残りやすく、応用が利くようにしてください。
        - 例：「目的意識の重要性：タスクに取り組む前に、その目的と最終的な目標を明確に定義する必要がある。XXプロジェクトでは、目的を明確に定義していなかったため、方向性が定まらず、無駄な作業が発生した。」

      5. **今後の行動指針 (チェックリスト形式):**
        - 今回の学びと教訓を踏まえ、今後の行動指針をチェックリスト形式で記述してください。
        - このチェックリストを定期的に見返すことで、学んだ教訓を忘れずに、日々の業務に活かすことができます。
        - 例：
          - [ ] タスクに取り組む前に、目的と最終的な目標を明確に定義する。
          - [ ] 曖昧な表現や感情的な言葉を使わず、論理的に説明する。
          - [ ] 進捗状況を定期的に確認し、遅延が発生した場合は速やかに報告する。

      # 会話の内容
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
    historySize,          // 現在の履歴サイズを返す
    updateHistorySize,    // 履歴サイズ更新関数を返す
  };
};