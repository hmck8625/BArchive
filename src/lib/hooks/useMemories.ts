// src/lib/hooks/useMemories.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Memory {
  id: string
  content: string
  created_at: string
}

export const useMemories = () => {
  const [memories, setMemories] = useState<Memory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchMemories = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMemories(data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMemories()
  }, [])

  return { memories, isLoading, error, refetch: fetchMemories }
}