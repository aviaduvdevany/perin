import Link from "next/link";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function LegalPageLayout({
  title,
  lastUpdated = new Date().toLocaleDateString(),
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-[var(--background-secondary)] rounded-lg border border-[var(--card-border)] p-8">
          <h1 className="text-3xl font-bold text-[var(--foreground-primary)] mb-2">
            {title}
          </h1>
          <p className="text-[var(--foreground-muted)] mb-8">
            Last updated: {lastUpdated}
          </p>

          <div className="prose prose-invert max-w-none">{children}</div>

          <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
            <Link
              href="/"
              className="inline-flex items-center text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 transition-colors"
            >
              ← Back to Perin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
