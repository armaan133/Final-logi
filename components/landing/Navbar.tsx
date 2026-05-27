import Link from "next/link";
import { Package } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-10 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="grid size-8 place-items-center rounded-lg border border-accent/20 bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
            <Package className="size-4" />
          </div>
          <span className="font-semibold text-xl tracking-tight text-foreground">LogiTrack</span>
        </Link>
      </div>
      
      <div className="hidden lg:flex items-center gap-1 rounded-full px-1.5 py-1.5 border border-border bg-secondary/50">
        <Link href="#product" className="px-4 py-1.5 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition-all">Platform</Link>
        <Link href="#agents" className="px-4 py-1.5 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition-all">Agents</Link>
      </div>
      
      <div className="flex items-center gap-3">
        <Link href="/system" className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Dev Demo
        </Link>
        <Link href="/vendor" className="inline-flex items-center justify-center rounded-lg border border-border bg-foreground px-4 py-2 text-sm font-semibold text-background transition-all hover:bg-foreground/90 shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Try Workspace
        </Link>
      </div>
    </nav>
  );
}
