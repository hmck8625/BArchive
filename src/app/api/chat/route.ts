// app/api/chat/route.ts

import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

// 環境変数チェック
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 型定義
type ChatMessage = {
  message: string;
  context?: Array<{ role: string; content: string; }>;
}

type APIErrorDetails = {
  message: string;
  type?: string;
  code?: string;
}

// メタプロンプトの定義
const META_PROMPT = `あなたはユーザーの内省を促すアシスタントです。
以下の指針に従って会話を進めてください：

1. ユーザーの発言から、より深い気づきを得られそうな点があれば、
   質問を通じてその探求を促してください。

2. ユーザーの思考や感情のパターンに気づいた場合は、
   それを共有し、その背景について一緒に考えることを提案してください。

3. 批判や否定は避け、常に受容的で共感的な態度を保ってください。

4. ユーザーが自身の経験や考えを振り返るきっかけとなるような
   オープンな質問を心がけてください。

5. 一度に問いかける質問は1つまでとし、ユーザーが考える余地を
   十分に残してください。`;

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

    // 会話履歴の準備（最大3回分）
    const conversationHistory = context.slice(-6); // role+contentで1回分で2要素なので6つまで

    // OpenAI API呼び出しの準備
    console.log('Preparing OpenAI API call with message:', message);

    // メッセージの構築
    const messages = [
      { role: "system", content: META_PROMPT },
      ...conversationHistory,
      { role: "user", content: message }
    ];

    // ChatGPT APIの呼び出し
    console.log('Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
      temperature: 0.7, // より自然な応答を促す
      max_tokens: 500, // 応答の長さを制限
    });
    console.log('OpenAI API response received');

    // レスポンスの検証
    if (!completion.choices?.[0]?.message?.content) {
      console.error('Invalid response from OpenAI:', completion);
      return NextResponse.json(
        { error: 'Invalid response from AI' },
        { status: 500 }
      );
    }

    const answer = completion.choices[0].message.content;
    console.log('Processing complete. Answer:', answer.substring(0, 50) + '...');

    console.log('--- Chat API Request Completed Successfully ---');
    return NextResponse.json({ 
      answer,
      // 更新された会話履歴を返す
      context: [
        ...conversationHistory,
        { role: "user", content: message },
        { role: "assistant", content: answer }
      ].slice(-6) // 最新の3回分のみ保持
    });

  } catch (error) {
    console.error('--- Chat API Error ---');
    
    // OpenAIのエラーハンドリング
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error:', {
        status: error.status,
        message: error.message,
        code: error.code,
        type: error.type
      });
      
      const errorDetails: APIErrorDetails = {
        message: error.message,
        type: error.type,
        code: error.code !== null ? error.code : undefined
      };
      
      return NextResponse.json(
        {
          error: 'OpenAI API Error',
          details: errorDetails
        },
        { status: error.status || 500 }
      );
    }

    // その他のエラー
    console.error('Unexpected error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    console.log('--- Chat API Request Ended ---');
  }
}