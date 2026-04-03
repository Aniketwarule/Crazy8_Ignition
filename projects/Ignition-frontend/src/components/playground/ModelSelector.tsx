import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, Users, ChevronRight, Zap, Key } from 'lucide-react'
import type { AIModel, ModelCategory } from '../../types/models'
import { BASE_MODELS, COMMUNITY_AGENTS } from '../../types/models'
import APIService from '../../utils/APIService'

interface ModelSelectorProps {
  selected: AIModel | null
  onSelect: (model: AIModel) => void
}

export default function ModelSelector({ selected, onSelect }: ModelSelectorProps) {
  const [tab, setTab] = useState<ModelCategory>('base')
  const [agents, setAgents] = useState<any[]>(COMMUNITY_AGENTS);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data = await getAgents();
        if (Array.isArray(data)) {
          setAgents(data);
        } else if (data?.agents) { 
          setAgents(data.agents);
        }
      } catch (error) {
        console.error('failed to fetch agents ', error);
      }
    };

    fetchAgents();
  }, []);

  const getAgents = async () => {
    try{
      const response = await APIService.getAgents();
      console.log("agents", response);
      return response;
    } catch(error) {
      console.log('failed to fetch agents ', error);
    }
  }

  const models = tab === 'base' ? BASE_MODELS : agents;

  return (
    <div className="flex-shrink-0 border-b border-gray-700/50 bg-[#0d0d0d]">
      {/* ─── Tab Row ─── */}
      <div className="flex items-center border-b border-gray-700/30">
        <button
          onClick={() => setTab('base')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all duration-150 border-b-2 ${
            tab === 'base'
              ? 'text-terminal-green border-terminal-green bg-terminal-green/5'
              : 'text-gray-500 border-transparent hover:text-gray-400'
          }`}
        >
          <Cpu className="w-3 h-3" />
          Base Models
        </button>
        <button
          onClick={() => setTab('community')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all duration-150 border-b-2 ${
            tab === 'community'
              ? 'text-purple-400 border-purple-400 bg-purple-400/5'
              : 'text-gray-500 border-transparent hover:text-gray-400'
          }`}
        >
          <Users className="w-3 h-3" />
          Community Agents
        </button>

        <Link
          to="/api-key"
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all duration-150 border-b-2 text-gray-500 border-transparent hover:text-terminal-green"
        >
          <Key className="w-3 h-3" />
          API Keys
        </Link>

        {/* Selected model indicator */}
        {selected && (
          <div className="ml-auto pr-4 flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
            <Zap className="w-3 h-3 text-terminal-green" />
            <span className="text-terminal-green">{selected.name}</span>
            <span>|</span>
            <span className="text-terminal-yellow">{selected.cost} ALGO</span>
          </div>
        )}
      </div>

      {/* ─── Model Cards ─── */}
      <div className="flex items-stretch gap-2 p-3 overflow-x-auto">
        {models.map((model) => {
          const isSelected = selected?.id === model.id
          const isCreator = model.destinationType === 'creator'

          return (
            <button
              key={model.id}
              onClick={() => onSelect(model)}
              className={`flex-shrink-0 flex flex-col gap-1 px-3 py-2 min-w-[160px] border text-left transition-all duration-150 group ${
                isSelected
                  ? isCreator
                    ? 'border-purple-400/60 bg-purple-400/5'
                    : 'border-terminal-green/60 bg-terminal-green/5'
                  : 'border-gray-700/50 hover:border-gray-600 bg-transparent'
              }`}
            >
              {/* Name + arrow */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-mono font-medium ${
                    isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'
                  }`}
                >
                  {model.name}
                </span>
                <ChevronRight
                  className={`w-3 h-3 transition-transform ${
                    isSelected ? 'translate-x-0 opacity-100 text-terminal-green' : '-translate-x-1 opacity-0'
                  }`}
                />
              </div>

              {/* Description */}
              <span className="text-[10px] font-mono text-gray-500 leading-tight">
                {model.description}
              </span>

              {/* Cost + creator */}
              <div className="flex items-center justify-between mt-1">
                <span
                  className={`text-[11px] font-mono font-bold ${
                    isSelected
                      ? isCreator ? 'text-purple-400' : 'text-terminal-green'
                      : 'text-gray-500'
                  }`}
                >
                  {model.cost} ALGO
                </span>
                {model.creator && (
                  <span className="text-[9px] font-mono text-purple-400/60">
                    {model.creator}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
