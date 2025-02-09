// app/api/generate-title/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 環境変数チェック
if (!process.env.GOOGLE_API_KEY) {
  console.error('GOOGLE_API_KEY is not set in environment variables');
}

// GoogleGenerativeAIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(request: Request) {
  console.log('--- Generate Title API Request Started ---');

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
    const { content } = await request.json();
    
    if (!content) {
      console.error('Content is empty');
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Geminiモデルの初期化
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // プロンプトの設定
    const prompt = `
    以下の条件に従って、与えられた文章から、**簡潔かつ行動を促すような**タイトルを生成してください：
    
    **【条件】**
    *   **一目で内容を理解させる:** 文章の**核となるテーマ**、**重要な学び**、または**具体的なアクション**を明確に示すこと。
    *   **簡潔さ:** 15文字以内 (20文字は長すぎる。パッと見て内容が分かる方が重要)。
    *   **装飾の排除:** 「」や""などの装飾は不要。
    *   **対象:** メモ書き、業務振り返り、反省、内省などの文章。特に、論理的で冷徹な上司との会話をまとめたサマリー。
    *   **出力形式:** タイトルのみを出力。
    
    **【重要視する点】**
    *   **行動喚起:** タイトルを見ただけで、**次に何をすべきか**が想起されるような、具体的なアクションを連想させること。
    *   **キーワードの活用:** 文章内で特に重要なキーワードを積極的に使用すること。
    
    **【タイトルの例】**
    *   「目的意識の徹底とXX案件」
    *   「論理的思考の強化とXX対策」
    *   「XXプロジェクト：再発防止策実行」
    *   「報連相改善：XXプロジェクトから学ぶ」
    
    **【文章】**
    ${content}`;

    // Gemini APIの呼び出し
    console.log('Calling Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const title = response.text().trim() || "無題";

    console.log('Generated title:', title);
    console.log('--- Generate Title API Request Completed Successfully ---');

    return NextResponse.json({ title });

  } catch (error) {
    console.error('--- Generate Title API Error ---');
    console.error('Error details:', error);

    // エラーレスポンスの生成
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: 'Failed to generate title',
        details: errorMessage
      },
      { status: 500 }
    );

  } finally {
    console.log('--- Generate Title API Request Ended ---');
  }
}