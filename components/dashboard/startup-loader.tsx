"use client"

import { useEffect, useState } from "react"

export function StartupLoader() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDone(true), 2100)
    return () => clearTimeout(t)
  }, [])

  if (done) return null

  return (
    <div
      className="loader-overlay fixed inset-0 z-50 flex items-center justify-center bg-background"
      aria-hidden="true"
    >
      <div className="loader-circles relative h-16 w-28">
        {/* Red circle */}
        <span
          className="absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full"
          style={{ background: "#ff4b4b", mixBlendMode: "multiply" }}
        />
        {/* Yellow circle, interlocking */}
        <span
          className="absolute right-0 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full"
          style={{ background: "#ffa500", mixBlendMode: "multiply" }}
        />
      </div>
    </div>
  )
}
