import { Glass } from "@/components/ui/Glass";
import { AlertCircle, X } from "lucide-react";

export default function DelegationNotFound() {
  return (
    <div className="min-h-screen bg-[var(--background-primary)] flex items-center justify-center p-4">
      <Glass
        variant="default"
        border={true}
        glow={true}
        className="p-8 max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-[var(--error)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8 text-[var(--error)]" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--cta-text)] mb-2">
          Invalid or Expired Link
        </h1>
        <p className="text-[var(--foreground-muted)] mb-6">
          This delegation link is no longer valid or has expired.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--foreground-muted)]">
          <AlertCircle className="w-4 h-4" />
          <span>Please contact the person who shared this link with you.</span>
        </div>
      </Glass>
    </div>
  );
}
