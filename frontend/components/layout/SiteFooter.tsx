type SiteFooterProps = {
  variant?: "landing" | "loading";
};

export function SiteFooter({ variant = "landing" }: SiteFooterProps) {
  const links = [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Security", href: "#" },
    { label: "Contact", href: "#" },
  ];

  return (
    <footer
      className={
        variant === "landing"
          ? "w-full border-t border-outline-variant bg-surface py-xl"
          : "mx-auto mt-xxxl w-full max-w-[1280px] border-t border-outline-variant px-lg py-xl"
      }
    >
      <div
        className={
          variant === "landing"
            ? "mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-lg px-lg md:flex-row"
            : "flex flex-col items-center justify-between md:flex-row"
        }
      >
        <div
          className={
            variant === "landing"
              ? "flex flex-col items-center gap-xs md:items-start"
              : "mb-lg flex flex-col gap-xs md:mb-0"
          }
        >
          <span className="text-label-caps uppercase tracking-widest text-on-surface-variant">
            Resume Optimiser
          </span>
          <p className="text-body-sm text-on-surface-variant opacity-80">
            {variant === "landing"
              ? "Session-only · No account required · Your data stays in this browser tab"
              : "© 2026 Resume Optimiser. Privacy-first AI processing."}
          </p>
        </div>
        <div className="flex gap-xl">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-body-sm text-on-surface-variant underline transition-all hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>
        {variant === "landing" && (
          <div className="text-body-sm text-on-surface-variant">
            © 2026 Resume Optimiser.
          </div>
        )}
      </div>
    </footer>
  );
}
