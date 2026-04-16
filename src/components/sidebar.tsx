"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  MessageSquareText,
  Megaphone,
  Users,
  Settings,
  Inbox,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: MessageSquareText },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/replies/conversations")
      .then((r) => r.json())
      .then((convs: { unreadCount: number }[]) => {
        const total = convs.reduce((sum: number, c: { unreadCount: number }) => sum + c.unreadCount, 0);
        setUnreadCount(total);
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-sidebar-bg flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
          <MessageSquareText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">WA Outreach</h1>
          <p className="text-xs text-muted">Campaign Manager</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-accent-light text-accent-hover"
                  : "text-muted hover:bg-gray-100 hover:text-foreground"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="flex-1">{label}</span>
              {label === "Inbox" && unreadCount > 0 && (
                <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <p className="text-xs text-muted text-center">Powered by Meta WhatsApp API</p>
      </div>
    </aside>
  );
}
