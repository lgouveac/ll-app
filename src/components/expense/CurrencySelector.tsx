import { useEffect, useRef, useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { CURRENCIES } from "@/types/expense";
import { convertAmount } from "@/services/currencyService";
import { Loader2 } from "lucide-react";

interface CurrencySelectorProps {
  value: string;
  onChange: (code: string) => void;
  amount: number;
  baseCurrency: string;
  onConvertedChange?: (converted: number, rate: number) => void;
}

export default function CurrencySelector({
  value,
  onChange,
  amount,
  baseCurrency,
  onConvertedChange,
}: CurrencySelectorProps) {
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const needsConversion = value !== baseCurrency && amount > 0;

  useEffect(() => {
    if (!needsConversion) {
      setConverted(null);
      setRate(null);
      return;
    }

    setConverting(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await convertAmount(amount, value, baseCurrency);
        setConverted(result.converted);
        setRate(result.rate);
        onConvertedChange?.(result.converted, result.rate);
      } catch {
        setConverted(null);
        setRate(null);
      } finally {
        setConverting(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, value, baseCurrency, needsConversion]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        Moeda
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-xl border border-border bg-card px-4 py-3",
          "text-sm text-foreground outline-none transition-colors",
          "focus:border-primary",
          "appearance-none",
        )}
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} - {c.name} ({c.symbol})
          </option>
        ))}
      </select>

      {/* Conversion preview */}
      {needsConversion && (
        <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
          {converting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Convertendo...
              </span>
            </>
          ) : converted !== null && rate !== null ? (
            <span className="text-sm text-muted-foreground">
              ≈{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(converted, baseCurrency)}
              </span>
              <span className="ml-2 text-xs opacity-60">
                (1 {value} = {rate.toFixed(4)} {baseCurrency})
              </span>
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
