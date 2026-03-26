import { cn, formatCurrency } from "@/lib/utils";
import type { Member } from "@/types/group";
import type { SplitType } from "@/types/expense";
import MemberAvatar from "@/components/members/MemberAvatar";
import { Check } from "lucide-react";

interface SplitSelectorProps {
  members: Member[];
  selectedMembers: string[];
  splitType: SplitType;
  customAmounts: Record<string, number>;
  totalAmount: number;
  onSplitTypeChange: (type: SplitType) => void;
  onSelectedMembersChange: (ids: string[]) => void;
  onCustomAmountsChange: (amounts: Record<string, number>) => void;
}

const SPLIT_OPTIONS: { value: SplitType; label: string }[] = [
  { value: "equal", label: "Igual" },
  { value: "custom", label: "Personalizado" },
  { value: "full", label: "Total" },
];

export default function SplitSelector({
  members,
  selectedMembers,
  splitType,
  customAmounts,
  totalAmount,
  onSplitTypeChange,
  onSelectedMembersChange,
  onCustomAmountsChange,
}: SplitSelectorProps) {
  const allSelected = members.length > 0 && selectedMembers.length === members.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectedMembersChange([]);
    } else {
      onSelectedMembersChange(members.map((m) => m.id));
    }
  };

  const toggleMember = (id: string) => {
    if (selectedMembers.includes(id)) {
      onSelectedMembersChange(selectedMembers.filter((mid) => mid !== id));
    } else {
      onSelectedMembersChange([...selectedMembers, id]);
    }
  };

  const selectedCount = selectedMembers.length;
  const equalShare =
    selectedCount > 0
      ? Math.round((totalAmount / selectedCount) * 100) / 100
      : 0;

  const customTotal = selectedMembers.reduce(
    (sum, id) => sum + (customAmounts[id] || 0),
    0,
  );
  const remaining =
    splitType === "custom"
      ? Math.round((totalAmount - customTotal) * 100) / 100
      : 0;

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-muted-foreground">
        Divisao
      </label>

      {/* Split type buttons */}
      <div className="grid grid-cols-3 gap-2">
        {SPLIT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSplitTypeChange(opt.value)}
            className={cn(
              "rounded-lg border py-2 text-sm font-medium transition-colors",
              splitType === opt.value
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/50",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Select all toggle */}
      <button
        type="button"
        onClick={toggleAll}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded border transition-colors",
            allSelected
              ? "border-primary bg-primary text-white"
              : "border-border bg-card",
          )}
        >
          {allSelected && <Check className="h-3 w-3" />}
        </div>
        Selecionar todos
      </button>

      {/* Member list */}
      <div className="space-y-2">
        {members.map((member) => {
          const isSelected = selectedMembers.includes(member.id);
          let displayAmount = 0;

          if (isSelected) {
            if (splitType === "equal") {
              displayAmount = equalShare;
            } else if (splitType === "custom") {
              displayAmount = customAmounts[member.id] || 0;
            } else if (splitType === "full") {
              displayAmount = totalAmount;
            }
          }

          return (
            <div
              key={member.id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                isSelected ? "bg-card" : "bg-transparent",
              )}
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => toggleMember(member.id)}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card",
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </button>

              {/* Avatar + name */}
              <button
                type="button"
                onClick={() => toggleMember(member.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <MemberAvatar
                  name={member.name}
                  color={member.avatar_color}
                  size="sm"
                />
                <span
                  className={cn(
                    "text-sm",
                    isSelected ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {member.name}
                </span>
              </button>

              {/* Amount display / input */}
              {isSelected && (
                <div className="shrink-0">
                  {splitType === "custom" ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={customAmounts[member.id] || ""}
                      onChange={(e) => {
                        onCustomAmountsChange({
                          ...customAmounts,
                          [member.id]: parseFloat(e.target.value) || 0,
                        });
                      }}
                      placeholder="0,00"
                      className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm text-foreground outline-none focus:border-primary"
                    />
                  ) : (
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(displayAmount)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Remaining indicator for custom split */}
      {splitType === "custom" && selectedCount > 0 && (
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-center text-sm font-medium",
            Math.abs(remaining) < 0.01
              ? "bg-green-500/10 text-green-400"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {Math.abs(remaining) < 0.01
            ? "Valor distribuido corretamente"
            : remaining > 0
              ? `Faltam ${formatCurrency(remaining)} para distribuir`
              : `Excedente de ${formatCurrency(Math.abs(remaining))}`}
        </div>
      )}
    </div>
  );
}
