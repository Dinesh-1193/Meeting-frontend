import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./landing.css";

/** Local fonts only — avoids next/font/google network failures that can 500 the app. */
const landingBody = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-landing-body",
  weight: "100 900",
});

const landingDisplay = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-landing-display",
  weight: "100 900",
});

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${landingBody.variable} ${landingDisplay.variable} landing-root`}
    >
      {children}
    </div>
  );
}
