import { theme } from '../theme'

interface Props {
  insights: string[]
}

export function KeyInsights({ insights }: Props) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: theme.glass, borderColor: theme.glassBorder }}
    >
      <h3 className="font-display text-sm font-semibold" style={{ color: theme.textPrimary }}>
        Key Insights
      </h3>
      {insights.length === 0 ? (
        <p className="text-xs" style={{ color: theme.muted }}>
          Not enough comparable data yet for this filter selection.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {insights.map((line) => (
            <li key={line} className="flex items-start gap-2 text-xs leading-relaxed">
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: theme.sequentialSoft, color: theme.sequential }}
              >
                ✓
              </span>
              <span style={{ color: theme.textSecondary }}>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
