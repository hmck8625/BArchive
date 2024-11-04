// src/components/auth/TermsDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TermsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccept: () => void
}

export function TermsDialog({ open, onOpenChange, onAccept }: TermsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>利用規約</DialogTitle>
          <DialogDescription>
            サービスをご利用いただく前に、以下の利用規約をご確認ください。
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[50vh] mt-4">
          <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold">1. はじめに</h3>
            <p>本利用規約は、当サービスの利用条件を定めるものです。</p>

            <h3 className="text-lg font-semibold">2. サービスの利用</h3>
            <p>当サービスは、メモリーの記録と管理を目的としています。</p>

            <h3 className="text-lg font-semibold">3. 禁止事項</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>不正アクセスなど、システムに負荷をかける行為</li>
              <li>他のユーザーに害を及ぼす行為</li>
              <li>違法または公序良俗に反する情報の投稿</li>
            </ul>

            <h3 className="text-lg font-semibold">4. 個人情報の取り扱い</h3>
            <p>収集した個人情報は、適切に管理し、サービスの提供にのみ使用します。</p>

            {/* 必要に応じて規約を追加 */}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onAccept}>同意する</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}