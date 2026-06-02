import { TriangleAlert, Activity, Server, ArrowUpRight, TrendingDown } from "lucide-react"

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Card 1: Total Active Alarms */}
      <div className="card-soft relative overflow-hidden rounded-xl p-6">
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: "#ff4b4b" }}
          aria-hidden="true"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Active Alarms</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff4b4b]/10 text-[#ff4b4b]">
            <TriangleAlert className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-4 text-5xl font-bold leading-none tracking-tight text-foreground">162</div>
        <div className="mt-4 flex items-center gap-1.5 text-sm">
          <ArrowUpRight className="h-4 w-4 text-[#ff4b4b]" />
          <span className="font-semibold text-[#ff4b4b]">+12</span>
          <span className="text-muted-foreground">vs last 24h</span>
        </div>
      </div>

      {/* Card 2: Avg Alarms per Node */}
      <div className="card-soft relative overflow-hidden rounded-xl p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Avg Alarms per Node</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ffa500]/10 text-[#ffa500]">
            <Activity className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-4 text-5xl font-bold leading-none tracking-tight text-foreground">3.4</div>
        <div className="mt-4 flex items-center gap-1.5 text-sm">
          <TrendingDown className="h-4 w-4 text-[#ffa500]" />
          <span className="font-semibold text-[#ffa500]">-0.6</span>
          <span className="text-muted-foreground">trending down</span>
        </div>
      </div>

      {/* Card 3: Monitored Sites */}
      <div className="card-soft relative overflow-hidden rounded-xl p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Monitored Sites</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground">
            <Server className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-4 text-5xl font-bold leading-none tracking-tight text-foreground">6</div>
        <div className="mt-4 flex items-center gap-1.5 text-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">All sites reporting</span>
        </div>
      </div>
    </div>
  )
}
