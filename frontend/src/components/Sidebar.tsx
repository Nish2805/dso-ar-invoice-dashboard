import { theme } from '../theme'

const NAV_ITEMS = ['Invoice', 'Pending Amount', 'Business Glossary']

export function Sidebar() {
  return (
    <aside
      className="flex w-20 flex-col items-center gap-8 py-6"
      style={{ background: theme.navy }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl font-display text-xs font-bold text-white shadow-lg"
        style={{ background: theme.gradientPrimary, boxShadow: '0 0 20px rgba(42,120,214,0.5)' }}
      >
        AI
      </div>
      <nav className="flex flex-col items-center gap-5">
        {NAV_ITEMS.map((label, i) => (
          <div
            key={label}
            title={label}
            className="flex h-10 w-10 items-center justify-center rounded-xl border text-[10px] font-semibold leading-tight transition-colors"
            style={
              i === 0
                ? { background: theme.gradientPrimary, borderColor: 'transparent', color: '#fff' }
                : {
                    borderColor: 'rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.7)',
                    background: 'rgba(255,255,255,0.06)',
                  }
            }
          >
            {label
              .split(' ')
              .map((w) => w[0])
              .join('')}
          </div>
        ))}
      </nav>
    </aside>
  )
}
