import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const points = [
  "No downloads — join from any browser in seconds",
  "HD video and screen share for up to 1,000 people",
  "Cloud recording, polls, and breakout rooms built in",
];

interface AuthSplitLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Shared split-screen shell for the signup and login pages. */
export function AuthSplitLayout({ title, subtitle, children }: AuthSplitLayoutProps) {
  return (
    <div className="lp-auth-shell">
      <div className="lp-auth-visual" aria-hidden>
        <div className="lp-auth-visual-bg lp-hero-visual-drift" />
        <div className="lp-auth-visual-inner">
          <span className="lp-auth-visual-brand">MeetSpace</span>

          <div className="lp-auth-visual-grid">
            <div className="lp-participant lp-tile lp-tile-active lp-tile-1">
              <div className="lp-participant-face lp-face-a" />
              <span className="lp-participant-label">Ava Chen</span>
            </div>
            <div className="lp-participant lp-tile lp-tile-2">
              <div className="lp-participant-face lp-face-b" />
              <span className="lp-participant-label">Jordan Lee</span>
            </div>
            <div className="lp-participant lp-tile lp-tile-3">
              <div className="lp-participant-face lp-face-c" />
              <span className="lp-participant-label">Sam Rivera</span>
            </div>
            <div className="lp-participant lp-tile lp-tile-4">
              <div className="lp-participant-face lp-face-d" />
              <span className="lp-participant-label">Morgan Wu</span>
            </div>
          </div>

          <div className="lp-auth-copy lp-anim-rise">
            <h2 className="lp-auth-headline">
              Meetings that feel present, not pixelated.
            </h2>
            <p className="lp-auth-lede">
              Create a room, invite anyone, and collaborate with video, audio, and
              screen share — right in the browser.
            </p>
            <ul className="lp-auth-points">
              {points.map((point) => (
                <li key={point} className="lp-auth-point">
                  <Check className="h-4 w-4" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="lp-auth-form-side">
        <div className="lp-auth-form-top">
          <Link href="/" className="lp-auth-back inline-flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <ThemeToggle />
        </div>
        <div className="lp-auth-form-wrap">
          <div className="w-full max-w-sm">
            <div className="mb-8 text-center">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <span className="ms-brand-mark">M</span>
                <span className="ms-text-heading text-lg font-semibold tracking-tight">
                  MeetSpace
                </span>
              </Link>
              <h1 className="ms-text-heading mt-5 text-2xl font-semibold tracking-tight">
                {title}
              </h1>
              <p className="ms-text-muted mt-1.5 text-sm leading-relaxed">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
