import { LocaleSwitcher } from "@/components/shared/locale-switcher";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal header for customer pages */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
              T
            </div>
            <span className="font-heading font-semibold text-sm">
              Table<span className="text-primary">Flow</span>
            </span>
          </div>
          <LocaleSwitcher />
        </div>
      </header>

      {/* Page content — optimized for mobile */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
