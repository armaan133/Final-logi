import Link from "next/link";

const DEMOS: Array<{ href: string; label: string }> = [
  { href: "/system", label: "Command center" },
  { href: "/vendor", label: "Owner console" },
  { href: "/agent", label: "Agent app" },
  { href: "/customer", label: "Customer store" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background px-4 py-20 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1280px]">
        <div className="max-w-[780px]">
          <p className="text-balance text-xl font-medium tracking-tight text-foreground sm:text-2xl">
          LogiTrack is a working demo. Every page below is the same simulation, viewed from a different seat.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {DEMOS.map((d) => (
              <li key={d.href}>
                <Link
                  href={d.href}
                  className="inline-flex items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {d.label} →
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-12 text-xs text-muted-foreground">
            © {new Date().getFullYear()} LogiTrack — built as a portfolio simulation. No production data, no external services.
          </p>
        </div>
      </div>
    </footer>
  );
}
