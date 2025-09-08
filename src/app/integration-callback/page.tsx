"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function IntegrationCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = () => {
      // Get the status from URL parameters
      const status = searchParams.get("status");
      const type = searchParams.get("type");
      const message = searchParams.get("message");
      const error = searchParams.get("error");

      // Prepare the result data
      const result = {
        status,
        type,
        message: message ? decodeURIComponent(message) : null,
        error: error ? decodeURIComponent(error) : null,
        success: status === "success",
      };

      // Send message to parent window if this is a popup
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: "INTEGRATION_CALLBACK",
            result,
          },
          window.location.origin
        );
      }

      // Close the popup window
      window.close();

      // Fallback: if window.close() doesn't work, redirect to main page
      setTimeout(() => {
        if (!window.closed) {
          window.location.href = "/";
        }
      }, 1000);
    };

    // Small delay to ensure the page is fully loaded
    const timer = setTimeout(handleCallback, 500);

    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)]">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-4 glow-primary">
          <svg
            className="w-8 h-8 text-white animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[var(--cta-text)] mb-2">
          Completing Integration...
        </h2>
        <p className="text-sm text-[var(--foreground-muted)]">
          Please wait while we finish setting up your integration.
        </p>
      </div>
    </div>
  );
}

export default function IntegrationCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)]">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-4 glow-primary">
              <svg
                className="w-8 h-8 text-white animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[var(--cta-text)] mb-2">
              Loading...
            </h2>
            <p className="text-sm text-[var(--foreground-muted)]">
              Preparing integration callback.
            </p>
          </div>
        </div>
      }
    >
      <IntegrationCallbackContent />
    </Suspense>
  );
}
