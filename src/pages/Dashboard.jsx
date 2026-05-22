import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ReceiptScanner from "../components/ReceiptScanner";
import {
  LayoutDashboard, List, BarChart2, Target, User, LogOut,
  Plus, Trash2, TrendingUp, TrendingDown, AlertCircle, ScanLine,
  UtensilsCrossed, Car, ShoppingBag, Zap, Tv, Heart,
  BookOpen, Plane, ShoppingCart, Home, PiggyBank, MoreHorizontal,
  X, Check, Flame
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import {
  CATEGORIES, getCategoryById, formatCurrency,
  getTodayExpenses, getWeekExpenses, getMonthExpenses,
  getTotalAmount, getCategoryBreakdown, getDailySpending,
  getMonthlyTrend, getSpendingByDayOfWeek,
  detectSpendingPersonality, predictMonthlySpend,
  getHeatmapData, smartCategorize
} from "../utils/helpers";
import "./Dashboard.css";

const CATEGORY_ICONS = {
  UtensilsCrossed, Car, ShoppingBag, Zap, Tv, Heart,
  BookOpen, Plane, ShoppingCart, Home, PiggyBank, MoreHorizontal
};

function CategoryIcon({ name, size = 16 }) {
  const Icon = CATEGORY_ICONS[name] || MoreHorizontal;
  return <Icon size={size} strokeWidth={1.5} />;
}

function StatCard({ label, amount, currency, sub, subColor = "#10b981", icon: Icon, iconColor, raw }) {
  return (
    <div className="stat-card">
      <div className="sc-top">
        <span className="sc-label">{label}</span>
        {Icon && <div className="sc-icon" style={{ background: `${iconColor}18`, color: iconColor }}><Icon size={16} strokeWidth={1.5} /></div>}
      </div>
      <div className="sc-amount">{raw ? amount : formatCurrency(amount, currency)}</div>
      {sub && <div className="sc-sub" style={{ color: subColor }}>{sub}</div>}
    </div>
  );
}

function AddTransactionModal({ onClose, onAdd, currency }) {
  const [form, setForm] = useState({
    description: "", amount: "", category: "food",
    date: new Date().toISOString().split("T")[0], type: "expense", notes: ""
  });

  const handleDescChange = (e) => {
    const desc = e.target.value;
    const autoCategory = smartCategorize(desc);
    setForm(f => ({ ...f, description: desc, category: autoCategory }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    onAdd({ ...form, amount: parseFloat(form.amount) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add Transaction</span>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-type-toggle">
            {["expense", "income"].map(t => (
              <button key={t} type="button"
                className={`mtt-btn ${form.type === t ? "active" : ""}`}
                style={form.type === t ? { background: t === "expense" ? "#ef4444" : "#10b981", color: "white" } : {}}
                onClick={() => setForm(f => ({ ...f, type: t }))}>
                {t === "expense" ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="mf-field">
            <label>Description</label>
            <input type="text" placeholder="e.g. Starbucks coffee, Uber ride…"
              value={form.description} onChange={handleDescChange} required />
            <span className="mf-hint">AI will auto-categorize based on description</span>
          </div>

          <div className="mf-row">
            <div className="mf-field">
              <label>Amount ({currency})</label>
              <input type="number" step="0.01" min="0" placeholder="0.00"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div className="mf-field">
              <label>Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>

          <div className="mf-field">
            <label>Category</label>
            <div className="mf-categories">
              {CATEGORIES.map(cat => (
                <button key={cat.id} type="button"
                  className={`mf-cat-btn ${form.category === cat.id ? "active" : ""}`}
                  style={form.category === cat.id ? { background: cat.color, color: "white", borderColor: cat.color } : {}}
                  onClick={() => setForm(f => ({ ...f, category: cat.id }))}>
                  <CategoryIcon name={cat.icon} size={13} />
                  {cat.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="mf-field">
            <label>Notes (optional)</label>
            <input type="text" placeholder="Any extra details…"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <button type="submit" className="modal-submit"
            style={{ background: form.type === "expense" ? "#ef4444" : "#10b981" }}>
            Add {form.type}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [goals, setGoals] = useState([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", target: "", saved: "" });

  const currency = userProfile?.currency || "USD";

  useEffect(() => {
    if (user) { fetchTransactions(); fetchGoals(); }
  }, [user]);

  async function fetchTransactions() {
    setLoading(true);
    try {
      const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchGoals() {
    try {
      const q = query(collection(db, "goals"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  }

  async function addTransaction(data) {
    try {
      await addDoc(collection(db, "transactions"), { ...data, userId: user.uid, createdAt: new Date().toISOString() });
      setShowAdd(false);
      fetchTransactions();
    } catch (e) { console.error(e); }
  }

  async function deleteTransaction(id) {
    await deleteDoc(doc(db, "transactions", id));
    setTransactions(t => t.filter(tx => tx.id !== id));
  }

  async function addGoal(e) {
    e.preventDefault();
    if (!goalForm.name || !goalForm.target) return;
    await addDoc(collection(db, "goals"), {
      ...goalForm, target: parseFloat(goalForm.target),
      saved: parseFloat(goalForm.saved || 0),
      userId: user.uid, createdAt: new Date().toISOString()
    });
    setGoalForm({ name: "", target: "", saved: "" });
    setShowGoalForm(false);
    fetchGoals();
  }

  async function updateGoalSaved(id, amount) {
    await updateDoc(doc(db, "goals", id), { saved: amount });
    fetchGoals();
  }

  async function deleteGoal(id) {
    await deleteDoc(doc(db, "goals", id));
    setGoals(g => g.filter(goal => goal.id !== id));
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  // Computed stats
  const todayTotal = getTotalAmount(getTodayExpenses(transactions));
  const weekTotal = getTotalAmount(getWeekExpenses(transactions));
  const monthTotal = getTotalAmount(getMonthExpenses(transactions));
  const monthExpenses = getMonthExpenses(transactions);
  const categoryBreakdown = getCategoryBreakdown(monthExpenses);
  const dailyData = getDailySpending(transactions, 1);
  const monthlyTrend = getMonthlyTrend(transactions);
  const dayOfWeekData = getSpendingByDayOfWeek(transactions);
  const personality = detectSpendingPersonality(transactions);
  const predictedSpend = predictMonthlySpend(transactions);
  const heatmap = getHeatmapData(transactions);
  const allExpenses = transactions.filter(t => t.type === "expense");
  const noSpendDays = dailyData.filter(d => d.amount === 0).length;

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: List },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "goals", label: "Goals", icon: Target },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo">C</div>
          <span className="sb-logo-text">Claro</span>
        </div>
        <nav className="sb-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.id} className={`sb-nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}>
              <item.icon size={18} strokeWidth={1.5} />
              {item.label}
            </button>
          ))}
        </nav>
        <button className="sb-logout" onClick={handleLogout}>
          <LogOut size={16} strokeWidth={1.5} />
          Sign out
        </button>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {/* Header */}
        <div className="page-header">
          <div>
            <div className="page-title">
              {page === "dashboard" && `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user?.displayName?.split(" ")[0] || "there"} 👋`}
              {page === "transactions" && "Transactions"}
              {page === "analytics" && "Analytics"}
              {page === "goals" && "Savings Goals"}
              {page === "profile" && "Profile"}
            </div>
            <div className="page-sub">
              {page === "dashboard" && "Here's your financial overview"}
              {page === "transactions" && `${transactions.length} total transactions`}
              {page === "analytics" && "Deep dive into your spending patterns"}
              {page === "goals" && `${goals.length} active goals`}
              {page === "profile" && "Your account details"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="scan-receipt-btn" onClick={() => setShowScanner(true)}>
              <ScanLine size={18} strokeWidth={1.5} />
              Scan Receipt
            </button>
            <button className="add-btn" onClick={() => setShowAdd(true)}>
              <Plus size={18} />
              Add transaction
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading your finances…</p>
          </div>
        ) : (
          <>
            {/* ── DASHBOARD PAGE ── */}
            {page === "dashboard" && (
              <div className="dashboard-grid">
                {/* Stat cards */}
                <div className="stats-row">
                  <StatCard label="Today" amount={todayTotal} currency={currency} sub="Spent today" icon={TrendingDown} iconColor="#ef4444" />
                  <StatCard label="This Week" amount={weekTotal} currency={currency} sub="7-day total" icon={BarChart2} iconColor="#7c3aed" />
                  <StatCard label="This Month" amount={monthTotal} currency={currency} sub={`Predicted: ${formatCurrency(predictedSpend, currency)}`} subColor="#f59e0b" icon={TrendingUp} iconColor="#10b981" />
                  <StatCard label="No-Spend Days" amount={noSpendDays} currency={currency} sub="This month" icon={Flame} iconColor="#f97316" raw />
                </div>

                {/* Personality card */}
                {personality && (
                  <div className="personality-card">
                    <span className="pc-emoji">{personality.emoji}</span>
                    <div>
                      <div className="pc-type">{personality.type}</div>
                      <div className="pc-desc">{personality.desc}</div>
                    </div>
                  </div>
                )}

                {/* Spending trend chart */}
                <div className="chart-card full-width">
                  <div className="cc-title">Daily Spending — This Month</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={4} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #f1f0ff", borderRadius: 10, fontSize: 12 }} formatter={v => [formatCurrency(v, currency), "Spent"]} />
                      <Area type="monotone" dataKey="amount" stroke="#7c3aed" strokeWidth={2} fill="url(#spendGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Category breakdown */}
                <div className="chart-card">
                  <div className="cc-title">Category Breakdown</div>
                  {categoryBreakdown.length === 0 ? (
                    <div className="empty-chart">No expenses this month</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={categoryBreakdown} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                            {categoryBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={v => [formatCurrency(v, currency)]} contentStyle={{ background: "white", border: "1px solid #f1f0ff", borderRadius: 10, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="cat-legend">
                        {categoryBreakdown.slice(0, 4).map((cat, i) => (
                          <div key={i} className="cl-row">
                            <div className="cl-dot" style={{ background: cat.color }} />
                            <span className="cl-name">{cat.name}</span>
                            <span className="cl-amt">{formatCurrency(cat.amount, currency)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Recent transactions */}
                <div className="chart-card">
                  <div className="cc-title">Recent Transactions</div>
                  <div className="recent-list">
                    {transactions.slice(0, 6).map(t => {
                      const cat = getCategoryById(t.category);
                      return (
                        <div key={t.id} className="recent-item">
                          <div className="ri-icon" style={{ background: `${cat.color}18`, color: cat.color }}>
                            <CategoryIcon name={cat.icon} size={14} />
                          </div>
                          <div className="ri-info">
                            <div className="ri-desc">{t.description}</div>
                            <div className="ri-date">{t.date}</div>
                          </div>
                          <div className="ri-amount" style={{ color: t.type === "expense" ? "#ef4444" : "#10b981" }}>
                            {t.type === "expense" ? "-" : "+"}{formatCurrency(t.amount, currency)}
                          </div>
                        </div>
                      );
                    })}
                    {transactions.length === 0 && <div className="empty-state">No transactions yet. Add your first one!</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ── TRANSACTIONS PAGE ── */}
            {page === "transactions" && (
              <div className="transactions-page">
                <div className="tx-list">
                  {transactions.length === 0 ? (
                    <div className="empty-state-big">
                      <div className="esb-icon"><List size={32} strokeWidth={1} /></div>
                      <div className="esb-title">No transactions yet</div>
                      <div className="esb-sub">Add your first expense or income to get started</div>
                      <button className="esb-btn" onClick={() => setShowAdd(true)}>Add transaction</button>
                    </div>
                  ) : transactions.map(t => {
                    const cat = getCategoryById(t.category);
                    return (
                      <div key={t.id} className="tx-item">
                        <div className="tx-icon" style={{ background: `${cat.color}15`, color: cat.color }}>
                          <CategoryIcon name={cat.icon} size={16} />
                        </div>
                        <div className="tx-info">
                          <div className="tx-desc">{t.description}</div>
                          <div className="tx-meta">
                            <span className="tx-cat" style={{ background: `${cat.color}15`, color: cat.color }}>{cat.name}</span>
                            <span className="tx-date">{t.date}</span>
                            {t.notes && <span className="tx-notes">{t.notes}</span>}
                          </div>
                        </div>
                        <div className="tx-right">
                          <div className="tx-amount" style={{ color: t.type === "expense" ? "#ef4444" : "#10b981" }}>
                            {t.type === "expense" ? "-" : "+"}{formatCurrency(t.amount, currency)}
                          </div>
                          <button className="tx-delete" onClick={() => deleteTransaction(t.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── ANALYTICS PAGE ── */}
            {page === "analytics" && (
              <div className="analytics-page">
                {/* Monthly trend */}
                <div className="an-card full-width">
                  <div className="cc-title">6-Month Spending Trend</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyTrend}>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #f1f0ff", borderRadius: 10, fontSize: 12 }} formatter={v => [formatCurrency(v, currency), "Spent"]} />
                      <Bar dataKey="amount" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Day of week */}
                <div className="an-card">
                  <div className="cc-title">Spending by Day of Week</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dayOfWeekData}>
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #f1f0ff", borderRadius: 10, fontSize: 12 }} formatter={v => [formatCurrency(v, currency), "Total"]} />
                      <Bar dataKey="amount" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category breakdown full */}
                <div className="an-card">
                  <div className="cc-title">Category Breakdown — This Month</div>
                  <div className="full-cat-list">
                    {categoryBreakdown.length === 0 ? (
                      <div className="empty-chart">No expenses this month</div>
                    ) : categoryBreakdown.map((cat, i) => (
                      <div key={i} className="fc-row">
                        <div className="fc-icon" style={{ background: `${cat.color}15`, color: cat.color }}>
                          <CategoryIcon name={cat.icon} size={14} />
                        </div>
                        <span className="fc-name">{cat.name}</span>
                        <div className="fc-bar-track">
                          <div className="fc-bar-fill" style={{ width: `${(cat.amount / categoryBreakdown[0].amount) * 100}%`, background: cat.color }} />
                        </div>
                        <span className="fc-amt">{formatCurrency(cat.amount, currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Insights */}
                <div className="an-card full-width insights-card">
                  <div className="cc-title">AI Spending Insights</div>
                  <div className="insights-grid">
                    {personality && (
                      <div className="insight-item">
                        <div className="ii-icon purple"><TrendingUp size={16} /></div>
                        <div>
                          <div className="ii-title">Spending Personality</div>
                          <div className="ii-desc">{personality.emoji} {personality.type} — {personality.desc}</div>
                        </div>
                      </div>
                    )}
                    <div className="insight-item">
                      <div className="ii-icon orange"><AlertCircle size={16} /></div>
                      <div>
                        <div className="ii-title">Month-End Prediction</div>
                        <div className="ii-desc">Based on your current pace, you'll spend {formatCurrency(predictedSpend, currency)} this month.</div>
                      </div>
                    </div>
                    <div className="insight-item">
                      <div className="ii-icon green"><Flame size={16} /></div>
                      <div>
                        <div className="ii-title">No-Spend Days</div>
                        <div className="ii-desc">You had {noSpendDays} no-spend days this month. Keep it up!</div>
                      </div>
                    </div>
                    {categoryBreakdown[0] && (
                      <div className="insight-item">
                        <div className="ii-icon red"><TrendingDown size={16} /></div>
                        <div>
                          <div className="ii-title">Biggest Category</div>
                          <div className="ii-desc">{categoryBreakdown[0].name} takes up {Math.round((categoryBreakdown[0].amount / monthTotal) * 100)}% of your monthly spend.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── GOALS PAGE ── */}
            {page === "goals" && (
              <div className="goals-page">
                <button className="add-goal-btn" onClick={() => setShowGoalForm(true)}>
                  <Plus size={16} /> New Goal
                </button>

                {showGoalForm && (
                  <div className="goal-form-card">
                    <form onSubmit={addGoal} className="goal-form">
                      <input className="gf-input" placeholder="Goal name (e.g. Emergency Fund)"
                        value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} required />
                      <input className="gf-input" type="number" placeholder={`Target amount (${currency})`}
                        value={goalForm.target} onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))} required />
                      <input className="gf-input" type="number" placeholder="Already saved (optional)"
                        value={goalForm.saved} onChange={e => setGoalForm(f => ({ ...f, saved: e.target.value }))} />
                      <div className="gf-actions">
                        <button type="submit" className="gf-submit">Create Goal</button>
                        <button type="button" className="gf-cancel" onClick={() => setShowGoalForm(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="goals-grid">
                  {goals.length === 0 ? (
                    <div className="empty-state-big">
                      <div className="esb-icon"><Target size={32} strokeWidth={1} /></div>
                      <div className="esb-title">No goals yet</div>
                      <div className="esb-sub">Set a savings goal to start tracking your progress</div>
                      <button className="esb-btn" onClick={() => setShowGoalForm(true)}>Create first goal</button>
                    </div>
                  ) : goals.map(goal => {
                    const pct = Math.min((goal.saved / goal.target) * 100, 100);
                    const remaining = goal.target - goal.saved;
                    return (
                      <div key={goal.id} className="goal-card">
                        <div className="gc-header">
                          <div className="gc-name">{goal.name}</div>
                          <button className="gc-delete" onClick={() => deleteGoal(goal.id)}><Trash2 size={14} /></button>
                        </div>
                        <div className="gc-amounts">
                          <span className="gc-saved">{formatCurrency(goal.saved, currency)}</span>
                          <span className="gc-target">of {formatCurrency(goal.target, currency)}</span>
                        </div>
                        <div className="gc-bar-track">
                          <div className="gc-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="gc-meta">
                          <span className="gc-pct">{Math.round(pct)}% complete</span>
                          <span className="gc-remaining">{formatCurrency(remaining, currency)} to go</span>
                        </div>
                        <div className="gc-update">
                          <input type="number" placeholder="Update saved amount"
                            onBlur={e => { if (e.target.value) { updateGoalSaved(goal.id, parseFloat(e.target.value)); e.target.value = ""; } }}
                            className="gc-input" />
                        </div>
                        {pct >= 100 && (
                          <div className="gc-complete"><Check size={14} /> Goal achieved!</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── PROFILE PAGE ── */}
            {page === "profile" && (
              <div className="profile-page">
                <div className="profile-card">
                  <div className="pf-avatar">
                    {user?.displayName?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="pf-name">{user?.displayName}</div>
                  <div className="pf-email">{user?.email}</div>
                  <div className="pf-currency">Currency: <strong>{currency}</strong></div>
                </div>

                <div className="profile-stats">
                  <div className="ps-card">
                    <div className="ps-num">{transactions.length}</div>
                    <div className="ps-label">Total Transactions</div>
                  </div>
                  <div className="ps-card">
                    <div className="ps-num">{allExpenses.length}</div>
                    <div className="ps-label">Total Expenses</div>
                  </div>
                  <div className="ps-card">
                    <div className="ps-num">{goals.length}</div>
                    <div className="ps-label">Active Goals</div>
                  </div>
                  <div className="ps-card">
                    <div className="ps-num">{formatCurrency(monthTotal, currency)}</div>
                    <div className="ps-label">Spent This Month</div>
                  </div>
                </div>

                <div className="profile-info-card">
                  <div className="pic-title">Account Details</div>
                  <div className="pic-row"><span>Name</span><strong>{user?.displayName}</strong></div>
                  <div className="pic-row"><span>Email</span><strong>{user?.email}</strong></div>
                  <div className="pic-row"><span>Currency</span><strong>{currency}</strong></div>
                  <div className="pic-row"><span>Member since</span><strong>{userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : "—"}</strong></div>
                </div>

                <button className="profile-logout" onClick={handleLogout}>
                  <LogOut size={16} /> Sign out of Claro
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} onAdd={addTransaction} currency={currency} />}
      {showScanner && (
        <ReceiptScanner
          onClose={() => setShowScanner(false)}
          onResult={(data) => { addTransaction(data); }}
          currency={currency}
        />
      )}
    </div>
  );
}
