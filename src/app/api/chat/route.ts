// app/api/chat/chat.ts
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

// エラーハンドリング用の型
type ErrorResponse = {
  error: string;
  details?: any;
};

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
    let messageData;
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

    const { message } = messageData;

    // メッセージの検証
    if (!message) {
      console.error('Message is empty');
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // OpenAI API呼び出しの準備
    console.log('Preparing OpenAI API call with message:', message);

    // ChatGPT APIの呼び出し
    console.log('Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
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
    return NextResponse.json({ answer });

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
      
      return NextResponse.json(
        {
          error: 'OpenAI API Error',
          details: {
            message: error.message,
            type: error.type,
            code: error.code
          }
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

// 環境変数の検証用ヘルパー関数（必要に応じて使用）
function validateEnvironment() {
  const requiredEnvVars = ['OPENAI_API_KEY'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
  }
}