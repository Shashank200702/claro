import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, User, Mail, Lock, DollarSign } from "lucide-react";
import { CURRENCIES } from "../utils/helpers";
import "./Auth.css";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", currency: "USD" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError("All fields are required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");
    try {
      await signup(form.email, form.password, form.name, form.currency);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message.includes("email-already-in-use") ? "Email already in use." : "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand" onClick={() => navigate("/")}>
          <div className="auth-logo-mark">C</div>
          <span className="auth-logo-text">Claro</span>
        </div>
        <h1 className="auth-title">Start your financial<br />clarity journey.</h1>
        <p className="auth-sub">Track expenses, set goals, and understand your spending patterns with AI-powered insights.</p>
        <div className="auth-features">
          {["Smart AI categorization", "Beautiful spending charts", "Multi-currency support", "Savings goal tracker"].map((f, i) => (
            <div key={i} className="auth-feature-item">
              <div className="afi-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-title">Create your account</div>
          <div className="auth-card-sub">Already have one? <Link to="/login" className="auth-link">Sign in</Link></div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Full Name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input type="text" placeholder="Shashank Mugali"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>

            <div className="auth-field">
              <label>Email</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input type={showPass ? "text" : "password"} placeholder="Min 6 characters"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label>Currency</label>
              <div className="auth-input-wrap">
                <DollarSign size={16} className="auth-input-icon" />
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                  {Object.entries(CURRENCIES).map(([code, { name, symbol }]) => (
                    <option key={code} value={code}>{symbol} {code} — {name}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
