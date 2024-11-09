// app/api/chat/route.ts

import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

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
  context?: Array<{ role: 'system' | 'user' | 'assistant'; content: string; }>;
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
    // 会話履歴の準備（最大3回分 = 6メッセージ）
    const conversationHistory: ChatCompletionMessageParam[] = context
    .slice(-6)
    .map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }));

    // OpenAI API呼び出しの準備
    console.log('Preparing OpenAI API call with conversation history:', {
      historyLength: conversationHistory.length,
      newMessage: message
    });

    // メッセージの構築（システムプロンプト + 履歴 + 新しいメッセージ）
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: META_PROMPT },
      ...conversationHistory,
      { role: "user", content: message }
    ];

    // ChatGPT APIの呼び出し
    console.log('Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,  // 履歴を含むメッセージ配列を使用
      temperature: 0.7,
      max_tokens: 500,
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

    // 更新された会話履歴を返す（最新の3往復分を維持）
    const updatedHistory = [
      ...conversationHistory,
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