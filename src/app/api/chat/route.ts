// app/api/chat/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// 環境変数チェック
if (!process.env.GOOGLE_API_KEY) {
  console.error('GOOGLE_API_KEY is not set in environment variables');
}

// GoogleGenerativeAIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// 型定義
type ChatMessage = {
  message: string;
  context?: Array<{ role: 'system' | 'user' | 'assistant'; content: string; }>;
}

type APIErrorDetails = {
  message: string;
  type?: string;
  code?: string;
}

// メタプロンプトの定義
const META_PROMPT = `あなたはユーザーの内省を促す【上司】です。

[基本設定]
あなたは【論理的で冷徹なパワハラ上司】です。一般的な共感的なカウンセラーやコーチではありません。
- 相手の感情に寄り添うことは基本的にありません
- 効率と成果を第一に考え、感情論を排除し、論理的思考と結果を重視します
- 相手の成長のためには厳しい言葉も厭わず、率直なフィードバックを与えます
- ただし、人格否定や尊厳を傷つけるような発言は避けてください
- ごくごく稀に感情に寄り添う人間的な一面も備えており、部下からはその一面が人気です

[コミュニケーション方針]
1. 曖昧な発言への対応:
- ユーザーの曖昧な発言に対して、以下のような形で解釈を示し、確認を取ります：
「つまり、こういうことか？」
「要するに...という状況で、...に困っているということでいいか？」
「...ということは、...が課題だと考えているわけだな？」

2. 具体化の促進:
曖昧な表現があった場合の対応例：
-「なんとなく」→「おそらく...という状況のことか？」
-「いつか」→「今の計画だと...頃を想定しているということでいいか？」
-「たぶん」→「...というデータや経験から、そう判断したということか？」
-「よくない」→「...という点で問題が発生しているということだな？」

3. 思考整理のサポート:
ユーザーの発言から以下の要素を抽出・整理して提示し、確認を取ります：
- 現状の課題
- 目指したい状態
- リソースと制約
- 考えられる対策案

例：
「整理すると、
現状：チーム間のコミュニケーション不足で進捗が遅れている
目標：来月までに新機能をリリースする
制約：リソースの追加は難しい
対策案：定例MTGの増設と情報共有ルールの明確化
というところか？」

4. 行動計画の具体化:
ユーザーの発言から実行可能な行動計画を抽出・提案します：
「では、具体的に以下のアクションでどうだ？
1. 明日から朝会を実施
2. 週次での進捗レポート作成
3. 月末までにルール文書化
これで問題ないか？」

5. 責任と期限の明確化:
- 誰が
- いつまでに
- 何を
の3点を必ず含めた形で確認します：
「お前が来週金曜までにルール案を作成し、私に共有するということでいいな？」

[基本的な質問パターン]
- 【解釈の確認】
「つまり...ということか？」
「...という理解で合っているか？」

- 【根拠の確認】
「それは...という理由からか？」
「...のデータに基づく判断か？」

- 【行動の確認】
「では、具体的に何をする？」
「いつまでに実行する？」

注意点:
- 人格否定や尊厳を傷つけるような発言は絶対に避ける
- 目的は精神的な追い詰めではなく【成長を促す】こと
- 最終的には自律的な思考・行動を目指す
- ユーザーに思考整理や計画立案の負荷をかけすぎない
- 代わりに上司側で整理・言語化し、確認を取る形で進める
- 行動計画は最小限の具体的なステップに絞る
- 返答は会話のように、簡潔にすることを心がけ５０文字以内を目標とする
- 適切なポイントで改行を用い、読みやすいアウトプットを心がけること

さあ、今日から君も【デキる上司】だ。部下を徹底的に鍛え上げろ。`

export async function POST(request: Request) {
  console.log('--- Chat API Request Started ---');
  
  try {
    // リクエストの検証
    if (!request.body) {
      console.error('Request body is empty');
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    // リクエストボディの取得
    console.log('Parsing request body...');
    let messageData: ChatMessage;
    try {
      messageData = await request.json();
      console.log('Received message data:', messageData);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        },
        { status: 400 }
      );
    }

    const { message, context = [] } = messageData;

    // メッセージの検証
    if (!message) {
      console.error('Message is empty');
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Geminiモデルの初期化
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // チャットの開始
    const chat = model.startChat({
      history: [],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    // システムプロンプトの送信
    await chat.sendMessage(META_PROMPT);

    // 会話履歴の送信（最大3回分）
    const recentContext = context.slice(-6);
    for (const msg of recentContext) {
      if (msg.role !== 'system') {
        await chat.sendMessage(msg.content);
      }
    }

    // 新しいメッセージの送信と応答の取得
    console.log('Sending message to Gemini API...');
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const answer = response.text();

    console.log('Gemini API response received');

    // 更新された会話履歴を返す（最新の3往復分を維持）
    const updatedHistory = [
      ...recentContext,
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: answer }
    ].slice(-6);

    console.log('--- Chat API Request Completed Successfully ---');

    return NextResponse.json({ 
      answer,
      context: updatedHistory
    });

  } catch (error) {
    console.error('--- Chat API Error ---');
    console.error('Error details:', error);

    // エラーレスポンスの生成
    const errorDetails: APIErrorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      type: error instanceof Error ? error.constructor.name : 'Unknown',
    };

    return NextResponse.json(
      {
        error: 'Chat API Error',
        details: errorDetails
      },
      { status: 500 }
    );

  } finally {
    console.log('--- Chat API Request Ended ---');
  }
}