import { format, startOfDay, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from "date-fns";

export const CURRENCIES = {
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  CAD: { symbol: "CA$", name: "Canadian Dollar" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  SGD: { symbol: "S$", name: "Singapore Dollar" },
};

export const CATEGORIES = [
  { id: "food", name: "Food & Dining", icon: "UtensilsCrossed", color: "#f97316" },
  { id: "transport", name: "Transport", icon: "Car", color: "#3b82f6" },
  { id: "shopping", name: "Shopping", icon: "ShoppingBag", color: "#ec4899" },
  { id: "bills", name: "Bills & Utilities", icon: "Zap", color: "#f59e0b" },
  { id: "entertainment", name: "Entertainment", icon: "Tv", color: "#8b5cf6" },
  { id: "health", name: "Health & Fitness", icon: "Heart", color: "#10b981" },
  { id: "education", name: "Education", icon: "BookOpen", color: "#06b6d4" },
  { id: "travel", name: "Travel", icon: "Plane", color: "#6366f1" },
  { id: "groceries", name: "Groceries", icon: "ShoppingCart", color: "#84cc16" },
  { id: "rent", name: "Rent & Housing", icon: "Home", color: "#64748b" },
  { id: "savings", name: "Savings", icon: "PiggyBank", color: "#059669" },
  { id: "other", name: "Other", icon: "MoreHorizontal", color: "#94a3b8" },
];

export function getCategoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

export function formatCurrency(amount, currencyCode = "USD") {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return `${currency.symbol}${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getTodayExpenses(transactions) {
  const today = format(new Date(), "yyyy-MM-dd");
  return transactions.filter((t) => t.date === today && t.type === "expense");
}

export function getWeekExpenses(transactions) {
  const weekStart = startOfWeek(new Date());
  return transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate >= weekStart && t.type === "expense";
  });
}

export function getMonthExpenses(transactions) {
  const monthStart = startOfMonth(new Date());
  return transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate >= monthStart && t.type === "expense";
  });
}

export function getTotalAmount(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

export function getCategoryBreakdown(transactions) {
  const breakdown = {};
  transactions.forEach((t) => {
    if (!breakdown[t.category]) breakdown[t.category] = 0;
    breakdown[t.category] += t.amount;
  });
  return Object.entries(breakdown)
    .map(([id, amount]) => ({ ...getCategoryById(id), amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function getDailySpending(transactions, months = 1) {
  const start = subMonths(startOfMonth(new Date()), months - 1);
  const end = endOfMonth(new Date());
  const days = eachDayOfInterval({ start, end });

  return days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayTotal = transactions
      .filter((t) => t.date === dayStr && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      date: format(day, "MMM dd"),
      amount: dayTotal,
      fullDate: dayStr,
    };
  });
}

export function getMonthlyTrend(transactions) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const monthTotal = transactions
      .filter((t) => {
        const tDate = new Date(t.date);
        return tDate >= monthStart && tDate <= monthEnd && t.type === "expense";
      })
      .reduce((sum, t) => sum + t.amount, 0);
    months.push({
      month: format(date, "MMM"),
      amount: monthTotal,
    });
  }
  return months;
}

export function getSpendingByDayOfWeek(transactions) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totals = new Array(7).fill(0);
  const counts = new Array(7).fill(0);

  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const day = new Date(t.date).getDay();
      totals[day] += t.amount;
      counts[day]++;
    });

  return days.map((day, i) => ({
    day,
    amount: totals[i],
    avg: counts[i] > 0 ? totals[i] / counts[i] : 0,
  }));
}

export function detectSpendingPersonality(transactions) {
  if (transactions.length < 5) return null;

  const breakdown = getCategoryBreakdown(transactions.filter((t) => t.type === "expense"));
  const topCategory = breakdown[0];
  const weekendSpending = transactions
    .filter((t) => {
      const day = new Date(t.date).getDay();
      return (day === 0 || day === 6) && t.type === "expense";
    })
    .reduce((sum, t) => sum + t.amount, 0);
  const weekdaySpending = transactions
    .filter((t) => {
      const day = new Date(t.date).getDay();
      return day > 0 && day < 6 && t.type === "expense";
    })
    .reduce((sum, t) => sum + t.amount, 0);

  if (!topCategory) return null;

  if (topCategory.id === "food") return { type: "Food Lover", desc: "Most of your money goes to food & dining", emoji: "🍕" };
  if (topCategory.id === "shopping") return { type: "Shopaholic", desc: "Shopping is your biggest expense", emoji: "🛍️" };
  if (topCategory.id === "entertainment") return { type: "Entertainment Buff", desc: "You love spending on entertainment", emoji: "🎬" };
  if (topCategory.id === "travel") return { type: "Wanderer", desc: "Travel is your biggest passion", emoji: "✈️" };
  if (weekendSpending > weekdaySpending * 1.5) return { type: "Weekend Spender", desc: "You spend significantly more on weekends", emoji: "🎉" };
  return { type: "Balanced Spender", desc: "Your spending is well distributed", emoji: "⚖️" };
}

export function predictMonthlySpend(transactions) {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = endOfMonth(today).getDate();
  const monthSoFar = getMonthExpenses(transactions);
  const spentSoFar = getTotalAmount(monthSoFar);
  if (dayOfMonth === 0) return spentSoFar;
  const dailyAvg = spentSoFar / dayOfMonth;
  return dailyAvg * daysInMonth;
}

export function getHeatmapData(transactions) {
  const data = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      if (!data[t.date]) data[t.date] = 0;
      data[t.date] += t.amount;
    });
  return data;
}

export function smartCategorize(description) {
  const lower = description.toLowerCase();
  if (/zomato|swiggy|uber eats|doordash|restaurant|cafe|coffee|pizza|burger|food|lunch|dinner|breakfast/.test(lower)) return "food";
  if (/uber|ola|lyft|taxi|metro|bus|petrol|gas|parking|transport/.test(lower)) return "transport";
  if (/amazon|flipkart|myntra|shopping|clothes|shoes|mall/.test(lower)) return "shopping";
  if (/netflix|spotify|prime|youtube|movie|game|entertainment/.test(lower)) return "entertainment";
  if (/electricity|water|internet|wifi|phone|bill|utility/.test(lower)) return "bills";
  if (/gym|doctor|hospital|medicine|health|fitness/.test(lower)) return "health";
  if (/school|college|course|book|education|tuition/.test(lower)) return "education";
  if (/flight|hotel|airbnb|travel|trip|vacation/.test(lower)) return "travel";
  if (/grocery|supermarket|vegetables|fruits|milk/.test(lower)) return "groceries";
  if (/rent|housing|apartment|mortgage/.test(lower)) return "rent";
  return "other";
}
