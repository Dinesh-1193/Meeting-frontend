"use client";

import { HelpCircle, Mail } from "lucide-react";
import { PageBody } from "./page-inset";
import { PageHeader } from "./page-header";

const FAQS = [
  {
    q: "How do I join a meeting?",
    a: "Open the join link or enter a meeting code from Home. Guests can join from the lobby with a display name — no account required.",
  },
  {
    q: "How do I schedule a meeting?",
    a: "Use Schedule from the top bar, add invite emails, and optionally a passcode or waiting room. Invites are emailed when Resend is configured.",
  },
  {
    q: "Where are recordings stored?",
    a: "Cloud recordings require Cloudflare R2 (R2_* env vars) and LiveKit egress. When ready, you'll see them under Recordings and get an in-app notification.",
  },
  {
    q: "Why isn't persistent chat working?",
    a: "Dashboard chat needs Centrifugo. Run `docker compose up -d` from the repo root and set CENTRIFUGO_* on the backend plus NEXT_PUBLIC_CENTRIFUGO_WS_URL on the frontend.",
  },
  {
    q: "How do I reset my password?",
    a: "Use Forgot password on the login page. Configure Supabase Auth email templates and APP_PUBLIC_URL so the reset link points at /reset-password.",
  },
];

export function HelpView() {
  return (
    <PageBody className="space-y-6">
      <PageHeader
        title="Help"
        description={
          <>
            Quick answers for MeetSpace. Still stuck? Email{" "}
            <a className="font-medium text-[var(--accent)] hover:underline" href="mailto:support@meetspace.app">
              support@meetspace.app
            </a>
            .
          </>
        }
      />

      <div
        className="ms-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--surface))",
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            <HelpCircle className="h-5 w-5" />
          </span>
          <div>
            <p className="ms-text-heading text-sm font-semibold">Need a hand?</p>
            <p className="ms-text-muted mt-0.5 text-xs leading-relaxed">
              Browse the FAQs below or reach out — we typically respond within one business day.
            </p>
          </div>
        </div>
        <a
          href="mailto:support@meetspace.app"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          <Mail className="h-4 w-4" />
          Contact support
        </a>
      </div>

      <div className="space-y-3">
        {FAQS.map((item, i) => (
          <section key={item.q} className="ms-panel p-5 transition hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]">
            <div className="flex gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="ms-text-heading text-sm font-semibold tracking-tight">{item.q}</h3>
                <p className="ms-text-muted mt-2 text-sm leading-relaxed">{item.a}</p>
              </div>
            </div>
          </section>
        ))}
      </div>
    </PageBody>
  );
}
