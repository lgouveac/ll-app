import { Link, useLocation } from "react-router-dom";
import { Home, PlusCircle, Receipt, Settings2, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGroup } from "@/hooks/useGroup";
import { useI18n } from "@/hooks/useI18n";

export function BottomNav() {
  const { pathname } = useLocation();
  const { group } = useGroup();
  const { t } = useI18n();

  // If inside a group context, show group-specific nav
  const inGroup = pathname.startsWith("/group/") || pathname.startsWith("/add") || pathname.startsWith("/edit/") || pathname.startsWith("/expenses") || pathname.startsWith("/members") || pathname.startsWith("/settings");

  const navItems = inGroup && group
    ? [
        { to: `/group/${group.id}`, icon: Home, label: t("nav.group"), isCenter: false },
        { to: "/members", icon: Users, label: t("nav.members"), isCenter: false },
        { to: "/add", icon: PlusCircle, label: t("nav.add"), isCenter: true },
        { to: "/expenses", icon: Receipt, label: t("nav.history"), isCenter: false },
        { to: "/settings", icon: Settings2, label: t("nav.config"), isCenter: false },
      ]
    : [
        { to: "/", icon: Home, label: t("nav.home"), isCenter: false },
        { to: "/invitations", icon: Users, label: t("nav.invites"), isCenter: false },
        { to: "/account", icon: User, label: t("nav.account"), isCenter: false },
      ];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t border-border",
        "bg-background/80 backdrop-blur-lg",
        "pb-[env(safe-area-inset-bottom,0px)]",
      )}
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {navItems.map(({ to, icon: Icon, label, isCenter }) => {
          const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);

          if (isCenter) {
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "gradient-romantic -mt-5 flex h-14 w-14 flex-col items-center justify-center",
                  "rounded-full shadow-lg shadow-primary/30 transition-transform active:scale-95",
                )}
                aria-label={label}
              >
                <Icon className="h-7 w-7 text-white" strokeWidth={2} />
              </Link>
            );
          }

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={label}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
