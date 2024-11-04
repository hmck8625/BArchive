// src/components/auth/ResetPassword.tsx
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

interface ResetPasswordProps {
  onBack: () => void
}

export function ResetPassword({ onBack }: ResetPasswordProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      toast.success('パスワードリセットのメールを送信しました')
      onBack()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>パスワードをリセット</CardTitle>
        <CardDescription>
          登録したメールアドレスにリセット用のリンクを送信します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            リセットメールを送信
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" onClick={onBack} className="w-full">
          戻る
        </Button>
      </CardFooter>
    </Card>
  )
}