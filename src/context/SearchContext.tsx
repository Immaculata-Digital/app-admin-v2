import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from 'react'

export type SearchFilter = {
  id: string
  label: string
  field: string
  type?: 'text' | 'number' | 'date'
  page?: string
}

type SearchContextValue = {
  query: string
  setQuery: (value: string) => void
  filters: SearchFilter[]
  setFilters: (filters: SearchFilter[], defaultFilterId?: string) => void
  selectedFilter?: SearchFilter
  selectFilter: (filterId: string) => void
  placeholder: string
  setPlaceholder: (value: string) => void
  searchOpen: boolean
  setSearchOpen: (value: boolean) => void
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined)

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const [query, setQuery] = useState('')
  const [filters, setFilterState] = useState<SearchFilter[]>([])
  const [selectedFilterId, setSelectedFilterId] = useState<string | undefined>()
  const [placeholder, setPlaceholder] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const setFilters = useCallback((nextFilters: SearchFilter[], defaultFilterId?: string) => {
    setFilterState(nextFilters)
    if (nextFilters.length === 0) {
      setSelectedFilterId(undefined)
      return
    }
    setSelectedFilterId(defaultFilterId ?? nextFilters[0].id)
  }, [])

  const selectedFilter = useMemo(() => {
    return filters.find((filter) => filter.id === selectedFilterId)
  }, [filters, selectedFilterId])

  const value = useMemo<SearchContextValue>(() => ({
    query,
    setQuery,
    filters,
    setFilters,
    selectedFilter,
    selectFilter: setSelectedFilterId,
    placeholder,
    setPlaceholder,
    searchOpen,
    setSearchOpen,
  }), [
    query,
    filters,
    setFilters,
    selectedFilter,
    placeholder,
    searchOpen,
  ])

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export const useSearch = () => {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch deve ser usado dentro de SearchProvider')
  return ctx
}

