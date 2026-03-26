import { cn } from "@/lib/utils";
import type { Member } from "@/types/group";
import MemberAvatar from "@/components/members/MemberAvatar";

interface PayerSelectorProps {
  members: Member[];
  value: string;
  onChange: (id: string) => void;
}

export default function PayerSelector({
  members,
  value,
  onChange,
}: PayerSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        Quem pagou?
      </label>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {members.map((member) => {
          const isSelected = member.id === value;
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onChange(member.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl px-3 py-2 transition-all",
                "min-w-[72px] shrink-0",
                isSelected
                  ? "bg-primary/10 scale-105"
                  : "bg-transparent hover:bg-card",
              )}
            >
              <div
                className={cn(
                  "rounded-full transition-all",
                  isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                <MemberAvatar
                  name={member.name}
                  color={member.avatar_color}
                  size="lg"
                />
              </div>
              <span
                className={cn(
                  "max-w-[64px] truncate text-xs",
                  isSelected
                    ? "font-semibold text-primary"
                    : "text-muted-foreground",
                )}
              >
                {member.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
