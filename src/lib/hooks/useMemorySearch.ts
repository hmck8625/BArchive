// hooks/useMemorySearch.ts
import { useState, useEffect, useCallback } from 'react'

interface Category {
  id: string
  name: string
}

interface RelatedMemo {
  id: string
  title: string
}

interface Memory {
  id: string
  title: string
  content: string
  category_id: string
  importance: number
  created_at: string
  categories: Category
  relatedMemos: RelatedMemo[]
}

export const useMemorySearch = (memories: Memory[]) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Memory[]>(memories)

  const searchMemories = useCallback((query: string) => {
    console.log('Searching with query:', query)
    console.log('Current memories:', memories)
    
    const lowercaseQuery = query.toLowerCase().trim()
    
    if (!lowercaseQuery) {
      console.log('Empty query, showing all memories')
      setSearchResults(memories)
      return
    }

    const filtered = memories.filter(memory => {
      // デバッグ用に各メモリの検索対象値をログ出力
      console.log('Checking memory:', {
        title: memory.title,
        content: memory.content,
        category: memory.categories?.name
      })
      
      const titleMatch = memory.title.toLowerCase().includes(lowercaseQuery)
      const contentMatch = memory.content.toLowerCase().includes(lowercaseQuery)
      const categoryMatch = memory.categories?.name.toLowerCase().includes(lowercaseQuery)
      
      const isMatch = titleMatch || contentMatch || categoryMatch
      console.log('Match result:', isMatch)
      
      return isMatch
    })

    console.log('Filtered results:', filtered)
    setSearchResults(filtered)
  }, [memories])

  useEffect(() => {
    searchMemories(searchQuery)
  }, [searchQuery, memories, searchMemories])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchMemories
  }
}