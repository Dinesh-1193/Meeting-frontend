"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Film,
  HelpCircle,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useSidebarStore } from "@/lib/store/sidebar-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { listChatConversations } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@/types";

const navPrimary = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/dashboard/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/dashboard/personal-room", label: "Personal Room", icon: Video },
  { href: "/dashboard/recordings", label: "Recordings", icon: Film },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
] as const;

const navSecondary = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/help", label: "Help", icon: HelpCircle },
] as const;

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const collapsed = useSidebarStore((s) => s.collapsed);
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  const chatUnreadQuery = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: listChatConversations,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const chatUnread = (chatUnreadQuery.data ?? [])
    .filter((c) => !c.muted)
    .reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navItem = (
    href: string,
    label: string,
    Icon: typeof Home,
    exact?: boolean,
    badge?: number,
  ) => {
    const active = isActive(href, exact);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "ms-nav-item",
          active && "ms-nav-item-active",
          collapsed && "justify-center px-2",
        )}
        title={collapsed ? label : undefined}
        aria-current={active ? "page" : undefined}
      >
        <span className="relative">
          <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />
          {badge && badge > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white shadow-sm">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </span>
        {!collapsed ? <span className="truncate">{label}</span> : null}
      </Link>
    );
  };

  const aside = (
    <aside
      className={cn(
        "flex h-full flex-col border-r backdrop-blur-xl ms-divider",
        collapsed ? "w-[72px]" : "w-60",
      )}
      style={{
        background: "var(--sidebar)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className={cn(
          "relative flex h-14 items-center border-b px-3",
          collapsed ? "justify-center" : "justify-between gap-2",
        )}
        style={{ borderColor: "var(--border)" }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 overflow-hidden"
          onClick={() => setMobileOpen(false)}
        >
          <span className="ms-brand-mark">M</span>
          {!collapsed ? (
            <span className="ms-text-heading truncate text-[15px] font-semibold tracking-tight">
              MeetSpace
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "hidden rounded-lg p-1.5 ms-text-muted transition hover:bg-[var(--hover)] hover:text-[var(--foreground)] lg:inline-flex",
            collapsed && "absolute left-[52px] top-3.5 z-10",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2.5" aria-label="Main">
        {!collapsed ? (
          <p className="ms-section-label mb-1.5 px-2.5 pt-1">Workspace</p>
        ) : null}
        {navPrimary.map((item) =>
          navItem(
            item.href,
            item.label,
            item.icon,
            "exact" in item ? item.exact : false,
            item.href === "/dashboard/chat" ? chatUnread : undefined,
          ),
        )}
      </nav>

      <div
        className="space-y-1 border-t p-2.5"
        style={{ borderColor: "var(--border)" }}
      >
        {!collapsed ? (
          <p className="ms-section-label mb-1.5 px-2.5">Account</p>
        ) : null}
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "justify-between px-1",
          )}
        >
          {!collapsed ? (
            <span className="ms-text-muted px-2 text-xs font-medium">Theme</span>
          ) : null}
          <ThemeToggle />
        </div>
        {navSecondary.map((item) => navItem(item.href, item.label, item.icon))}
        <button
          type="button"
          onClick={onLogout}
          className={cn(
            "ms-nav-item w-full hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed ? <span>Log out</span> : null}
        </button>

        <div
          className={cn(
            "mt-1.5 flex items-center gap-3 rounded-xl border px-2.5 py-2.5",
            collapsed && "justify-center px-2",
          )}
          style={{
            borderColor: "var(--border)",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--surface-2)), var(--surface-2))",
          }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700 ring-2 ring-white/80 dark:bg-sky-500/20 dark:text-sky-300 dark:ring-slate-900/40">
            {user.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="ms-text-heading truncate text-sm font-semibold tracking-tight">
                {user.name}
              </p>
              <p className="ms-text-muted truncate text-[11px]">{user.email}</p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="relative hidden h-full shrink-0 lg:block">{aside}</div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] dark:bg-black/60"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-60 shadow-2xl">{aside}</div>
        </div>
      ) : null}
    </>
  );
}
