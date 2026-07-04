"use client";

import Link from "next/link";

type SiteHeaderProps = {
  activeNav?: "features" | "how-it-works" | "pricing" | "support";
  onGetStarted?: () => void;
};

const NAV_ITEMS = [
  { id: "features" as const, label: "Features", href: "#features" },
  { id: "how-it-works" as const, label: "How it Works", href: "#how-it-works" },
  { id: "pricing" as const, label: "Pricing", href: "#pricing" },
  { id: "support" as const, label: "Support", href: "#support" },
];

export function SiteHeader({
  activeNav = "features",
  onGetStarted,
}: SiteHeaderProps) {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant bg-surface">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-lg">
        <div className="flex items-center gap-xl">
          <Link href="/" className="text-headline-page text-primary">
            Resume Optimiser
          </Link>
          <nav className="hidden items-center gap-xl md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === activeNav;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={
                    isActive
                      ? "flex h-16 items-center border-b-2 border-primary text-label-md font-bold text-primary"
                      : "text-label-md text-on-surface-variant transition-colors hover:text-primary"
                  }
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <button
            type="button"
            className="hidden px-md py-sm text-label-md text-on-surface-variant transition-colors hover:text-primary sm:block"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="rounded bg-primary-container px-lg py-sm text-label-md text-white transition-transform hover:opacity-90 active:scale-95"
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
}
