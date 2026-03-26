export type SplitType = "equal" | "custom" | "full";

export interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  currency: string;
  converted_amount: number | null;
  base_currency: string | null;
  exchange_rate: number | null;
  paid_by: string;
  date: string;
  photo_url: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
  splits?: ExpenseSplit[];
  payer?: { id: string; name: string; avatar_color: string };
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  member_id: string;
  amount: number;
  percentage: number;
  member?: { id: string; name: string; avatar_color: string };
}

export interface ExchangeRate {
  base_currency: string;
  target_currency: string;
  rate: number;
  fetched_at: string;
}

export const CURRENCIES = [
  { code: "BRL", name: "Real Brasileiro", symbol: "R$" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "\u20AC" },
  { code: "GBP", name: "British Pound", symbol: "\u00A3" },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00A5" },
  { code: "ARS", name: "Peso Argentino", symbol: "$" },
  { code: "CLP", name: "Peso Chileno", symbol: "$" },
  { code: "COP", name: "Peso Colombiano", symbol: "$" },
  { code: "MXN", name: "Peso Mexicano", symbol: "$" },
  { code: "PEN", name: "Sol Peruano", symbol: "S/" },
] as const;

export const CATEGORIES = [
  { value: "food", label: "Alimentacao", icon: "UtensilsCrossed" },
  { value: "transport", label: "Transporte", icon: "Car" },
  { value: "home", label: "Casa", icon: "Home" },
  { value: "entertainment", label: "Lazer", icon: "Music" },
  { value: "health", label: "Saude", icon: "Heart" },
  { value: "shopping", label: "Compras", icon: "ShoppingBag" },
  { value: "travel", label: "Viagem", icon: "Plane" },
  { value: "other", label: "Outros", icon: "MoreHorizontal" },
] as const;
