// app/api/delete-account/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 1. まず、ユーザーのメモIDを取得
    const { data: userMemos, error: memosQueryError } = await supabase
      .from('memories')
      .select('id')
      .eq('user_id', userId)

    if (memosQueryError) {
      console.error('Error querying user memos:', memosQueryError)
      return NextResponse.json(
        { error: 'Failed to query user memos' },
        { status: 500 }
      )
    }

    const memoIds = userMemos.map(memo => memo.id)

    if (memoIds.length > 0) {
      // 2. memory_relations の削除
      const { error: relationsError } = await supabase
        .from('memory_relations')
        .delete()
        .or(`source_memo_id.in.(${memoIds.map(id => `'${id}'`).join(',')}),target_memo_id.in.(${memoIds.map(id => `'${id}'`).join(',')})`)

      if (relationsError) {
        console.error('Error deleting relations:', relationsError)
        return NextResponse.json(
          { error: 'Failed to delete relations' },
          { status: 500 }
        )
      }
    }

    // 3. チャットメッセージの削除
    const { error: chatError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId)

    if (chatError) {
      console.error('Error deleting chat messages:', chatError)
      return NextResponse.json(
        { error: 'Failed to delete chat messages' },
        { status: 500 }
      )
    }

    // 4. memories の削除
    const { error: memoriesError } = await supabase
      .from('memories')
      .delete()
      .eq('user_id', userId)

    if (memoriesError) {
      console.error('Error deleting memories:', memoriesError)
      return NextResponse.json(
        { error: 'Failed to delete memories' },
        { status: 500 }
      )
    }

    // 5. カテゴリの削除
    const { error: categoriesError } = await supabase
      .from('categories')
      .delete()
      .eq('user_id', userId)

    if (categoriesError) {
      console.error('Error deleting categories:', categoriesError)
      return NextResponse.json(
        { error: 'Failed to delete categories' },
        { status: 500 }
      )
    }

    // 6. ユーザーのセッションを削除
    await supabase.auth.admin.signOut(userId)

    // 7. 最後にユーザーを削除
    const { error: userError } = await supabase.auth.admin.deleteUser(userId)

    if (userError) {
      console.error('Error deleting user:', userError)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in delete account handler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}