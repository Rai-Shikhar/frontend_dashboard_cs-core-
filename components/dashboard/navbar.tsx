import { Search } from "lucide-react"

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-sm md:px-8">
      <div className="flex items-center gap-2">
        <span className="text-base font-bold tracking-tight text-foreground">Vi Network Automation</span>
        <span className="h-2 w-2 rounded-full" style={{ background: "#ff4b4b" }} aria-hidden="true" />
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative hidden items-center sm:flex">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes, sites, alarms…"
            aria-label="Search"
            className="h-9 w-48 rounded-lg border border-border bg-secondary/60 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-72"
          />
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
          style={{ background: "#ff4b4b" }}
          aria-label="User profile"
        >
          NA
        </div>
      </div>
    </header>
  )
}
