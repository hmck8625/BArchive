import { useState, useMemo } from 'react'
import { Memory } from '@/types'

export function useMemorySearch(memories: Memory[]) {
  const [searchQuery, setSearchQuery] = useState('')

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return memories
    }

    const query = searchQuery.toLowerCase()
    return memories.filter(memory => {
      const titleMatch = memory.title?.toLowerCase().includes(query)
      const contentMatch = memory.content?.toLowerCase().includes(query)
      const categoryMatch = memory.categories?.name?.toLowerCase().includes(query)
      
      return titleMatch || contentMatch || categoryMatch
    })
  }, [memories, searchQuery])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
  } as const  // 戻り値の型を厳密に
}

// 戻り値の型を明示的に定義（必要に応じて）
export type UseMemorySearchReturn = {
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: Memory[]
}