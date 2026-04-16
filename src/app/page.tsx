"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  MessageSquareText,
  Megaphone,
  Users,
  Send,
  Inbox,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  templates: number;
  campaigns: number;
  prospects: number;
  messages: {
    total: number;
    byStatus: Record<string, number>;
  };
  replies: {
    total: number;
    unread: number;
  };
  recentCampaigns: {
    id: string;
    name: string;
    status: string;
    totalSent: number;
    totalFailed: number;
    createdAt: string;
    templates: { name: string }[];
    _count: { messages: number };
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    {
      label: "Templates",
      value: stats?.templates ?? 0,
      icon: MessageSquareText,
      color: "bg-emerald-50 text-emerald-600",
      href: "/templates",
    },
    {
      label: "Campaigns",
      value: stats?.campaigns ?? 0,
      icon: Megaphone,
      color: "bg-blue-50 text-blue-600",
      href: "/campaigns",
    },
    {
      label: "Prospects",
      value: stats?.prospects ?? 0,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
      href: "/prospects",
    },
    {
      label: "Messages Sent",
      value: stats?.messages.total ?? 0,
      icon: Send,
      color: "bg-orange-50 text-orange-600",
      href: "/campaigns",
    },
    {
      label: "Replies",
      value: stats?.replies?.total ?? 0,
      icon: Inbox,
      color: "bg-amber-50 text-amber-600",
      href: "/inbox",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your WhatsApp outreach campaigns"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-card-bg border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}
              >
                <card.icon className="w-5 h-5" />
              </div>
              <TrendingUp className="w-4 h-4 text-muted" />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-muted mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Recent Campaigns</h2>
          <Link
            href="/campaigns"
            className="text-sm text-accent hover:text-accent-hover font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {stats?.recentCampaigns.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted">
            No campaigns yet. Create your first campaign to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted uppercase tracking-wider">
                <th className="px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Templates</th>
                <th className="px-5 py-3">Messages</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats?.recentCampaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="text-sm font-medium hover:text-accent"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted">
                    {c.templates.map((t) => t.name).join(", ") || "None"}
                  </td>
                  <td className="px-5 py-3.5 text-sm">
                    <span className="text-green-600 font-medium">{c.totalSent}</span>
                    {c.totalFailed > 0 && (
                      <span className="text-red-500 ml-2">/ {c.totalFailed} failed</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
