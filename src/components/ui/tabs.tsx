import { cn } from '@/lib/utils'

type Tab = { id: string; label: string; count?: number }

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          disabled={tab.count === 0}
          className={cn(
            'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors disabled:opacity-40',
            active === tab.id
              ? 'border-sea-500 text-sea-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'ml-2 px-2 py-0.5 rounded-full text-xs',
              active === tab.id ? 'bg-sea-100 text-sea-700' : 'bg-gray-100 text-gray-500'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
