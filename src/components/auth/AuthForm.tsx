// src/components/auth/AuthForm.tsx
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
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { TermsDialog } from './TermsDialog'
import { ResetPassword } from './ResetPassword'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

export function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        if (!acceptedTerms) {
          setShowTerms(true)
          return
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        
        toast.success('確認メールを送信しました。メールボックスをご確認ください。')
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (showResetPassword) {
    return <ResetPassword onBack={() => setShowResetPassword(false)} />
  }

  return (
    <>
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>{isLogin ? 'ログイン' : '新規登録'}</CardTitle>
          <CardDescription>
            {isLogin ? 'アカウントにログイン' : '新しいアカウントを作成'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <Input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {!isLogin && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  <span onClick={() => setShowTerms(true)} className="underline">
                    利用規約
                  </span>
                  に同意する
                </label>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {isLogin ? 'ログイン' : '登録'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
          </Button>
          {isLogin && (
            <Button
              type="button"
              variant="link"
              onClick={() => setShowResetPassword(true)}
            >
              パスワードをお忘れですか？
            </Button>
          )}
        </CardFooter>
      </Card>

      <TermsDialog
        open={showTerms}
        onOpenChange={setShowTerms}
        onAccept={() => {
          setAcceptedTerms(true)
          setShowTerms(false)
        }}
      />
    </>
  )
}