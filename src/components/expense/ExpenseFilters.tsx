import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Member } from "@/types/group";
import { CATEGORIES } from "@/types/expense";
import { t } from "@/i18n";

interface Filters {
  paidBy?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ExpenseFiltersProps {
  onFilter: (filters: Filters) => void;
  members: Member[];
}

type ActiveFilter =
  | { type: "all" }
  | { type: "member"; id: string }
  | { type: "category"; value: string };

export default function ExpenseFilters({
  onFilter,
  members,
}: ExpenseFiltersProps) {
  const [active, setActive] = useState<ActiveFilter>({ type: "all" });

  function select(filter: ActiveFilter) {
    setActive(filter);

    if (filter.type === "all") {
      onFilter({});
    } else if (filter.type === "member") {
      onFilter({ paidBy: filter.id });
    } else {
      onFilter({ category: filter.value });
    }
  }

  const isActive = (filter: ActiveFilter) => {
    if (filter.type !== active.type) return false;
    if (filter.type === "all") return true;
    if (filter.type === "member" && active.type === "member")
      return filter.id === active.id;
    if (filter.type === "category" && active.type === "category")
      return filter.value === active.value;
    return false;
  };

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
      <Chip
        label={t("filter.all")}
        active={isActive({ type: "all" })}
        onClick={() => select({ type: "all" })}
      />

      {members
        .filter((m) => m.is_active)
        .map((member) => (
          <Chip
            key={member.id}
            label={member.name}
            active={isActive({ type: "member", id: member.id })}
            onClick={() => select({ type: "member", id: member.id })}
          />
        ))}

      {CATEGORIES.map((cat) => (
        <Chip
          key={cat.value}
          label={cat.label}
          active={isActive({ type: "category", value: cat.value })}
          onClick={() => select({ type: "category", value: cat.value })}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
        active
          ? "gradient-romantic text-white shadow-md"
          : "bg-muted text-muted-foreground hover:brightness-125",
      )}
    >
      {label}
    </button>
  );
}
