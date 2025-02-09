// app/api/generate-title/route.ts
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは与えられた文章から簡潔で適切なタイトルを生成するアシスタントです。
    以下の条件に従ってタイトルを生成してください：
    - 文章の内容が一目でわかる
    - 20文字以内
    - 「」や""などの装飾は不要
    - メモ書き、業務振り返り、反省、内省などの文章が対象
    - タイトルのみを出力する`
        },
        {
          role: "user",
          content: `以下の文章にタイトルをつけてください：\n\n${content}`
        }
      ],
      temperature: 0.3, // 適度な創造性を持たせる
    });

    const title = completion.choices[0]?.message?.content || "無題";
    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}