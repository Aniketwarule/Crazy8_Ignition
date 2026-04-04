import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, SlidersHorizontal, Zap, Users, TrendingUp, X } from 'lucide-react'
import Header from '../components/playground/Header'
import APIService from '../utils/APIService'
import { COMMUNITY_AGENTS } from '../types/models'

type SortOption = 'popular' | 'newest' | 'price-low' | 'price-high'

export default function Marketplace() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<any[]>(COMMUNITY_AGENTS)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data = await APIService.getAgents()
        if (Array.isArray(data)) {
          setAgents(data)
        } else if (data?.agents) {
          setAgents(data.agents)
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
  }, [])

  const filteredAgents = useMemo(() => {
    let result = [...agents]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.creator?.toLowerCase().includes(q)
      )
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => (a.cost || 0) - (b.cost || 0))
        break
      case 'price-high':
        result.sort((a, b) => (b.cost || 0) - (a.cost || 0))
        break
      case 'newest':
        result.reverse()
        break
      default:
        break
    }

    return result
  }, [agents, searchQuery, sortBy])

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark transition-colors">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* ─── Page Header ─── */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-content dark:text-content-dark mb-3">
            Marketplace
          </h1>
          <p className="text-content-secondary dark:text-content-dark-secondary text-base max-w-md mx-auto">
            Discover community-built AI agents. Pay per prompt, no subscriptions.
          </p>
        </div>

        {/* ─── Search & Filters ─── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents by name, description, or creator..."
              className="input-field !pl-11 !rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort & Filter */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input-field !w-auto !pr-8 !rounded-xl appearance-none cursor-pointer text-sm"
            >
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary !px-3 !py-3 !rounded-xl ${showFilters ? '!bg-accent-green/5 !border-accent-green/20' : ''}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-content-secondary dark:text-content-dark-secondary">
            {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} available
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-accent-green hover:underline"
            >
              Clear search
            </button>
          )}
        </div>

        {/* ─── Agent Grid ─── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-secondary dark:bg-surface-dark-secondary flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-content dark:text-content-dark mb-1">No agents found</h3>
            <p className="text-sm text-content-secondary dark:text-content-dark-secondary">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => navigate(`/home?tab=community`)}
                className="card p-5 text-left hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-purple/10 dark:bg-accent-purple/15 flex items-center justify-center">
                    <Users className="w-5 h-5 text-accent-purple" />
                  </div>
                  <span className="badge badge-green text-[11px] font-semibold">
                    {agent.cost} ALGO
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-base font-semibold text-content dark:text-content-dark mb-1 group-hover:text-accent-green transition-colors">
                  {agent.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-content-secondary dark:text-content-dark-secondary leading-relaxed line-clamp-2 mb-3">
                  {agent.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border dark:border-border-dark">
                  {agent.creator && (
                    <span className="text-xs text-accent-purple font-medium">
                      {agent.creator}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider group-hover:text-accent-green transition-colors">
                    Use Agent →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
