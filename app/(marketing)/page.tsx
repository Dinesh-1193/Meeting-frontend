import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const features = [
  {
    index: "01",
    name: "Crystal video",
    text: "Adaptive streams keep every face clear—whether you’re two people or a full room.",
  },
  {
    index: "02",
    name: "Screen share",
    text: "Present decks, demos, and designs full-screen without leaving the conversation.",
  },
  {
    index: "03",
    name: "In-call chat",
    text: "Drop links and notes in a side panel that stays out of the way until you need it.",
  },
  {
    index: "04",
    name: "Lobby preview",
    text: "Check camera, mic, and lighting before you join—no awkward first seconds.",
  },
];

const steps = [
  {
    num: "01",
    title: "Create a room",
    text: "Spin up a meeting in one click and share the link with your team.",
  },
  {
    num: "02",
    title: "Join from anywhere",
    text: "Guests open the lobby in the browser—no downloads, no friction.",
  },
  {
    num: "03",
    title: "Meet well",
    text: "Talk, share, and decide together with controls that stay out of your way.",
  },
];

export default function MarketingPage() {
  return (
    <>
      <section className="lp-hero" aria-label="MeetSpace">
        <div className="lp-hero-stage" aria-hidden>
          <div className="lp-hero-bg lp-hero-visual-drift" />
          <div className="lp-hero-grid">
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
        </div>

        <header className="lp-nav">
          <span className="lp-nav-brand">MeetSpace</span>
          <nav className="lp-nav-links" aria-label="Account">
            <ThemeToggle className="lp-theme-toggle" />
            <Link href="/login" className="lp-nav-link">
              Sign in
            </Link>
            <Link href="/signup" className="lp-nav-link lp-nav-cta">
              Sign up
            </Link>
          </nav>
        </header>

        <div className="lp-hero-content">
          <h1 className="lp-brand lp-anim-rise">MeetSpace</h1>
          <p className="lp-headline lp-anim-rise lp-anim-rise-delay-1">
            Meetings that feel present, not pixelated.
          </p>
          <p className="lp-lede lp-anim-rise lp-anim-rise-delay-2">
            Create a room, invite anyone, and collaborate with video, audio, and
            screen share—right in the browser.
          </p>
          <div className="lp-ctas lp-anim-rise lp-anim-rise-delay-3">
            <Link href="/signup" className="lp-btn lp-btn-primary">
              Start for free
            </Link>
            <Link href="/login" className="lp-btn lp-btn-ghost">
              Join a meeting
            </Link>
          </div>
        </div>
      </section>

      <section className="lp-section lp-features" aria-labelledby="features-title">
        <div className="lp-section-inner">
          <h2 id="features-title" className="lp-section-title">
            Built for clear, focused collaboration
          </h2>
          <p className="lp-section-copy">
            Everything you need in a modern video room—streamlined so the
            conversation stays center stage.
          </p>
          <div className="lp-feature-list">
            {features.map((f) => (
              <div key={f.index} className="lp-feature-row">
                <span className="lp-feature-index" aria-hidden>
                  {f.index}
                </span>
                <h3 className="lp-feature-name">{f.name}</h3>
                <p className="lp-feature-text">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-flow" aria-labelledby="flow-title">
        <div className="lp-section-inner">
          <h2 id="flow-title" className="lp-section-title">
            From invite to in-call in minutes
          </h2>
          <p className="lp-section-copy">
            No plugins. No friction. Three steps to a better meeting habit.
          </p>
          <div className="lp-steps">
            {steps.map((s) => (
              <div key={s.num}>
                <div className="lp-step-num" aria-hidden>
                  {s.num}
                </div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-text">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-closing" aria-labelledby="closing-title">
        <div className="lp-closing-inner">
          <h2 id="closing-title" className="lp-closing-title">
            Your next meeting deserves a better room.
          </h2>
          <p className="lp-closing-copy">
            Open a free MeetSpace account and host your first call in under a
            minute.
          </p>
          <div className="lp-closing-ctas">
            <Link href="/signup" className="lp-btn lp-btn-primary">
              Create free account
            </Link>
            <Link href="/login" className="lp-btn lp-btn-ghost">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <span className="lp-footer-brand">MeetSpace</span>
        <div className="lp-footer-links">
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Sign up</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
        <p>© {new Date().getFullYear()} MeetSpace</p>
      </footer>
    </>
  );
}
