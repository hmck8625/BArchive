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
import { Alert, AlertDescription } from "@/components/ui/alert"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('環境変数が設定されていません。')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    
    if (!isLogin && !acceptedTerms) {
      setShowTerms(true)
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) {
          switch (error.message) {
            case 'Invalid login credentials':
              throw new Error('メールアドレスまたはパスワードが間違っています')
            default:
              throw error
          }
        }
        toast.success('ログインしました')
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        })
        
        if (error) {
          switch (error.message) {
            case 'User already registered':
              throw new Error('このメールアドレスは既に登録されています')
            case 'Password should be at least 6 characters':
              throw new Error('パスワードは6文字以上で入力してください')
            default:
              throw error
          }
        }
        
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('このメールアドレスは既に登録されています')
        }
        
        toast.success('確認メールを送信しました。メールボックスをご確認ください。')
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('認証中にエラーが発生しました')
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
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                メールアドレス
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className={errorMessage ? "border-destructive" : ""}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                パスワード
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                className={errorMessage ? "border-destructive" : ""}
              />
              {!isLogin && (
                <p className="text-sm text-muted-foreground">
                  パスワードは8文字以上で入力してください
                </p>
              )}
            </div>
            {!isLogin && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  disabled={loading}
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
              {loading ? '処理中...' : (isLogin ? 'ログイン' : '登録')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setIsLogin(!isLogin)
              setErrorMessage('')
            }}
            disabled={loading}
          >
            {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
          </Button>
          {isLogin && (
            <Button
              type="button"
              variant="link"
              onClick={() => setShowResetPassword(true)}
              disabled={loading}
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