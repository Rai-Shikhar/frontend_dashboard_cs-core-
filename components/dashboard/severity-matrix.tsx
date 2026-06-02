"use client"

import {
  Bar,
  CartesianGrid,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const data = [
  { site: "ETMAM", critical: 18, major: 26, minor: 14 },
  { site: "BLRNW", critical: 9, major: 21, minor: 19 },
  { site: "DELSE", critical: 22, major: 17, minor: 11 },
  { site: "MUMWE", critical: 6, major: 13, minor: 24 },
  { site: "KOLEA", critical: 14, major: 19, minor: 9 },
  { site: "HYDSO", critical: 11, major: 8, minor: 16 },
]

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-white rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="mb-1.5 font-semibold text-foreground">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function SeverityMatrix() {
  return (
    <div className="card-white flex h-full flex-col rounded-xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Network Severity Matrix</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Active alarms by severity across sites</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "#ff4b4b" }} /> Critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "#ffa500" }} /> Major
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: "#22c55e" }} /> Minor
          </span>
        </div>
      </div>

      <div className="mt-5 flex-1" style={{ minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={4} barCategoryGap="26%">
            <CartesianGrid vertical={false} stroke="#eef0f2" />
            <XAxis
              dataKey="site"
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            <Tooltip cursor={{ fill: "rgba(17,24,39,0.04)" }} content={<ChartTooltip />} />
            <Bar name="Critical" dataKey="critical" fill="#ff4b4b" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar name="Major" dataKey="major" fill="#ffa500" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar name="Minor" dataKey="minor" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
