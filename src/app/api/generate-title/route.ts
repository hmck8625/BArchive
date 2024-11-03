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
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "あなたは与えられた文章から簡潔で適切なタイトルを生成するアシスタントです。20文字以内でタイトルを提案してください。"
        },
        {
          role: "user",
          content: `以下の文章に適切なタイトルをつけてください：\n\n${content}`
        }
      ],
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