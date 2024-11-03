// components/SearchMemories.tsx
import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { useMemorySearch } from "@/lib/hooks/useMemorySearch"

interface SearchMemoriesProps {
  memories: any[]
  onSearchResults: (results: any[]) => void
}

export const SearchMemories = ({ memories, onSearchResults }: SearchMemoriesProps) => {
  const { searchQuery, setSearchQuery, searchResults } = useMemorySearch(memories)

  // 検索結果を親コンポーネントに渡す
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