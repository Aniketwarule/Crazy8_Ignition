import { useEffect, useState, useMemo } from 'react'
import { Cpu, Users, Search } from 'lucide-react'
import type { AIModel, ModelCategory } from '../../types/models'
import { BASE_MODELS, COMMUNITY_AGENTS } from '../../types/models'
import APIService from '../../utils/APIService'

interface ModelSelectorProps {
  selected: AIModel | null
  onSelect: (model: AIModel) => void
  initialTab?: ModelCategory
  isOpen: boolean
}

export default function ModelSelector({ selected, onSelect, initialTab = 'base', isOpen }: ModelSelectorProps) {
  const [tab, setTab] = useState<ModelCategory>(initialTab)
  const [agents, setAgents] = useState<any[]>(COMMUNITY_AGENTS)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data = await getAgents()
        if (Array.isArray(data)) {
          setAgents(data)
        } else if (data?.agents) {
          setAgents(data.agents)
        }
      } catch (error) {
        console.error('failed to fetch agents ', error)
      }
    }

    fetchAgents()
  }, [])

  const getAgents = async () => {
    try {
      const response = await APIService.getAgents()
      console.log("agents", response)
      return response
    } catch (error) {
      console.log('failed to fetch agents ', error)
    }
  }

  const models = tab === 'base' ? BASE_MODELS : agents

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models
    const q = searchQuery.toLowerCase()
    return models.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.creator?.toLowerCase().includes(q)
    )
  }, [models, searchQuery])

  return (
    <div
      className={`flex-shrink-0 transition-all duration-300 ${
        isOpen ? 'w-72 p-2 pl-2' : 'w-0 p-0 overflow-hidden'
      }`}
    >
      <div
        className={`h-full flex flex-col rounded-2xl
          bg-white/70 dark:bg-[#1e1e1e]/70
          backdrop-blur-xl
          border border-black/[0.06] dark:border-white/[0.06]
          transition-all duration-300 overflow-hidden`}
        style={{
          boxShadow: isOpen
            ? '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)'
            : 'none',
        }}
      >
        {/* ─── Tabs ─── */}
        <div className="flex items-center px-2 pt-2 pb-0">
          <div className="flex items-center flex-1">
            <button
              onClick={() => { setTab('base'); setSearchQuery('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
                tab === 'base'
                  ? 'text-[#1a1a1a] dark:text-white border-content-secondary dark:border-content-dark-secondary'
                  : 'text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Base
            </button>
            <button
              onClick={() => { setTab('community'); setSearchQuery('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
                tab === 'community'
                  ? 'text-[#1a1a1a] dark:text-white border-accent-purple'
                  : 'text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Community
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-secondary dark:bg-surface-dark-tertiary border border-border dark:border-border-dark text-sm text-content dark:text-content-dark placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-content-secondary/30 dark:focus:border-content-dark-secondary/30 transition-colors"
            />
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filteredModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No models found</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredModels.map((model, idx) => {
                const isSelected = selected?.id === model.id && selected?.agentId === model.agentId
                const isCreator = model.destinationType === 'creator'

                return (
                  <button
                    key={model.id ? `${model.id}-${idx}` : `model-${idx}`}
                    onClick={() => onSelect(model)}
                    className={`model-card w-full text-left ${isSelected ? 'active' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${
                        isSelected ? 'text-[#1a1a1a] dark:text-white' : 'text-content-secondary dark:text-content-dark-secondary'
                      }`}>
                        {model.name}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isCreator
                          ? 'bg-accent-purple/10 text-accent-purple'
                          : 'bg-black/[0.05] dark:bg-white/[0.06] text-content-secondary dark:text-content-dark-secondary'
                      }`}>
                        {model.cost} ALGO
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed line-clamp-2">
                      {model.description}
                    </p>
                    {model.creator && (
                      <span className="text-[10px] text-accent-purple mt-1 inline-block">
                        {model.creator}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
