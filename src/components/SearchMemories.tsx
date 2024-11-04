// components/SearchMemories.tsx
import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { useMemorySearch } from "@/lib/hooks/useMemorySearch"
import { Memory } from '@/types'

interface SearchMemoriesProps {
  memories: Memory[]
  onSearchResults: (results: Memory[]) => void
}

export const SearchMemories = ({ memories, onSearchResults }: SearchMemoriesProps) => {
  const { searchQuery, setSearchQuery, searchResults } = useMemorySearch(memories)

  useEffect(() => {
    onSearchResults(searchResults)
  }, [searchResults, onSearchResults])

  return (
    <Input
      type="search"
      placeholder="メモを検索..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="bg-white"
    />
  )
}
