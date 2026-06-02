import { ChevronRight } from "lucide-react"

interface DirRow {
  location: string
  code: string
  critical: number
  major: number
  minor: number
}

interface DirectoryTableProps {
  title: string
  subtitle: string
  rows: DirRow[]
}

function SevCell({ value, color }: { value: number; color: string }) {
  return (
    <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: value > 0 ? color : "#e5e7eb" }} />
        <span style={{ color: value > 0 ? "#111827" : "#9ca3af" }}>{String(value).padStart(2, "0")}</span>
      </span>
    </td>
  )
}

export function DirectoryTable({ title, subtitle, rows }: DirectoryTableProps) {
  return (
    <div className="card-white flex h-full flex-col overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="thin-scroll flex-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Location
              </th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#ff4b4b]">
                Critical
              </th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#ffa500]">
                Major
              </th>
              <th className="px-3 py-3 pr-6 text-right text-[11px] font-semibold uppercase tracking-wider text-[#eab308]">
                Minor
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className="border-b border-border/70 transition-colors last:border-0 hover:bg-secondary/40">
                <td className="px-6 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{row.location}</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {row.code}
                    </span>
                  </div>
                </td>
                <SevCell value={row.critical} color="#ff4b4b" />
                <SevCell value={row.major} color="#ffa500" />
                <td className="px-3 py-3 pr-6 text-right font-mono text-sm tabular-nums">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: row.minor > 0 ? "#eab308" : "#e5e7eb" }} />
                    <span style={{ color: row.minor > 0 ? "#111827" : "#9ca3af" }}>
                      {String(row.minor).padStart(2, "0")}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
