"use client"

import { useEffect, useRef, useState } from "react"
import { Terminal } from "lucide-react"

type Severity = "CRIT" | "MAJ" | "MIN" | "OK"

interface LogRow {
  id: number
  time: string
  node: string
  severity: Severity
  msg: string
}

const NODES = ["ETMAM05", "BLRNW12", "DELSE03", "MUMWE08", "KOLEA01", "HYDSO07", "ETMAM02", "DELSE19"]
const MESSAGES: Record<Severity, string[]> = {
  CRIT: ["Link down on port GE0/3", "PSU failure detected", "Temp threshold exceeded 78C", "Cell sector offline"],
  MAJ: ["Packet loss 4.2% sustained", "BBU sync drift detected", "Optical Rx low -22dBm", "VSWR alarm raised"],
  MIN: ["CPU load 71% nominal", "Backhaul jitter 12ms", "Config drift detected", "Battery on standby"],
  OK: ["Self-heal routine complete", "Handover restored", "Node re-synced OK", "Alarm cleared by automation"],
}

const SEV_COLOR: Record<Severity, string> = {
  CRIT: "#ff4b4b",
  MAJ: "#ffa500",
  MIN: "#eab308",
  OK: "#22c55e",
}

function ts() {
  const d = new Date()
  return d.toTimeString().slice(0, 8)
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

let counter = 0
function makeRow(): LogRow {
  const severities: Severity[] = ["CRIT", "MAJ", "MIN", "MIN", "OK", "MAJ"]
  const severity = pick(severities)
  return {
    id: counter++,
    time: ts(),
    node: pick(NODES),
    severity,
    msg: pick(MESSAGES[severity]),
  }
}

export function HardwareLogs() {
  const [rows, setRows] = useState<LogRow[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRows(Array.from({ length: 14 }, makeRow))
    const interval = setInterval(() => {
      setRows((prev) => [...prev.slice(-40), makeRow()])
    }, 1600)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [rows])

  return (
    <div className="card-white flex h-full flex-col overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#ff4b4b]" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Live Hardware Logs</h2>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Streaming
        </span>
      </div>
      <div ref={scrollRef} className="thin-scroll flex-1 overflow-y-auto font-mono text-xs" style={{ maxHeight: 332 }}>
        {rows.map((row, i) => (
          <div
            key={row.id}
            className="flex items-center gap-3 px-5 py-2"
            style={{ background: i % 2 === 0 ? "#f8f9fa" : "#ffffff" }}
          >
            <span className="shrink-0 text-muted-foreground">{row.time}</span>
            <span className="shrink-0 font-semibold text-foreground">{row.node}</span>
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ color: SEV_COLOR[row.severity], background: `${SEV_COLOR[row.severity]}1a` }}
            >
              {row.severity}
            </span>
            <span className="truncate text-muted-foreground">{row.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
