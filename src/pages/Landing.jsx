import { useNavigate } from "react-router-dom";
import { TrendingUp, Shield, Zap, BarChart3, Target, Bell } from "lucide-react";
import "./Landing.css";

const FEATURES = [
  { icon: Zap, title: "Smart Categorization", desc: "AI automatically categorizes every expense the moment you add it." },
  { icon: BarChart3, title: "Deep Analytics", desc: "Daily, weekly, monthly breakdowns with beautiful charts and heatmaps." },
  { icon: Target, title: "Savings Goals", desc: "Set goals and track your progress with real-time updates." },
  { icon: TrendingUp, title: "Spending Predictions", desc: "AI predicts your month-end spend before the month ends." },
  { icon: Bell, title: "Budget Alerts", desc: "Get notified when approaching your category limits." },
  { icon: Shield, title: "Multi-Currency", desc: "Track expenses in any currency — USD, EUR, GBP, INR and more." },
];

const STATS = [
  { num: "19", label: "Smart Features" },
  { num: "12", label: "Categories" },
  { num: "8", label: "Currencies" },
  { num: "100%", label: "Free" },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* NAV */}
      <nav className="ln-nav">
        <div className="ln-logo">
          <div className="ln-logo-mark">C</div>
          <span className="ln-logo-text">Claro</span>
        </div>
        <div className="ln-nav-actions">
          <button className="ln-btn-ghost" onClick={() => navigate("/login")}>Sign in</button>
          <button className="ln-btn-primary" onClick={() => navigate("/signup")}>Get started</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="ln-hero">
        <div className="ln-hero-inner">
          <div className="ln-badge">Financial clarity, finally.</div>
          <h1 className="ln-title">
            Know exactly where<br />
            your money goes.
          </h1>
          <p className="ln-desc">
            Claro tracks every expense, categorizes it automatically,
            and gives you the clarity to spend smarter — with AI-powered
            insights, beautiful charts, and goals that actually work.
          </p>
          <div className="ln-actions">
            <button className="ln-btn-hero" onClick={() => navigate("/signup")}>
              Start for free
            </button>
            <button className="ln-btn-outline" onClick={() => navigate("/login")}>
              Sign in
            </button>
          </div>

          {/* Mock dashboard preview */}
          <div className="ln-preview">
            <div className="lp-card">
              <div className="lp-card-label">Total this month</div>
              <div className="lp-card-amount">$1,284.50</div>
              <div className="lp-card-sub">↓ 12% from last month</div>
            </div>
            <div className="lp-card">
              <div className="lp-card-label">Biggest category</div>
              <div className="lp-card-amount" style={{ color: "#f97316" }}>Food & Dining</div>
              <div className="lp-card-sub">$342.00 · 27% of total</div>
            </div>
            <div className="lp-card">
              <div className="lp-card-label">Savings goal</div>
              <div className="lp-card-amount" style={{ color: "#8b5cf6" }}>68%</div>
              <div className="lp-card-sub">$680 of $1,000 saved</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="ln-stats">
        {STATS.map((s, i) => (
          <div key={i} className="ln-stat">
            <div className="ln-stat-num">{s.num}</div>
            <div className="ln-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section className="ln-features">
        <div className="ln-features-inner">
          <div className="ln-section-label">Everything you need</div>
          <h2 className="ln-section-title">Built for people who want clarity,<br />not complexity.</h2>
          <div className="ln-features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="ln-feature-card">
                <div className="ln-feature-icon">
                  <f.icon size={22} strokeWidth={1.5} />
                </div>
                <div className="ln-feature-title">{f.title}</div>
                <div className="ln-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ln-cta">
        <div className="ln-cta-inner">
          <h2 className="ln-cta-title">Start tracking today.</h2>
          <p className="ln-cta-sub">Free forever. No credit card required.</p>
          <button className="ln-btn-hero" onClick={() => navigate("/signup")}>
            Create your account
          </button>
        </div>
      </section>

      <footer className="ln-footer">
        <span className="ln-footer-brand">Claro</span>
        <span>Built by Shashank Mugali</span>
      </footer>
    </div>
  );
}
