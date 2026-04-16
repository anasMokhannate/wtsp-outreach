"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Modal } from "@/components/modal";
import { EmptyState } from "@/components/empty-state";
import { Megaphone, Plus, Trash2, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Template {
  id: string;
  name: string;
  category: string;
  bodyText: string;
  metaStatus: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  totalSent: number;
  totalFailed: number;
  createdAt: string;
  launchedAt: string | null;
  templates: Template[];
  templateIds: string[];
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", templateIds: [] as string[] });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/campaigns").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ])
      .then(([c, t]) => {
        setCampaigns(c);
        setTemplates(t);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleTemplate = (id: string) => {
    setForm((prev) => ({
      ...prev,
      templateIds: prev.templateIds.includes(id)
        ? prev.templateIds.filter((t) => t !== id)
        : [...prev.templateIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowCreate(false);
    setForm({ name: "", description: "", templateIds: [] });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Create and manage outreach campaigns"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="w-7 h-7" />}
          title="No campaigns yet"
          description="Create a campaign to start sending WhatsApp messages to your prospects."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Campaign
            </button>
          }
        />
      ) : (
        <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted uppercase tracking-wider">
                <th className="px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Templates</th>
                <th className="px-5 py-3">Sent / Failed</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="text-sm font-medium hover:text-accent"
                    >
                      {c.name}
                    </Link>
                    {c.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">
                        {c.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {c.templates.map((t) => (
                        <span
                          key={t.id}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md"
                        >
                          {t.name}
                        </span>
                      ))}
                      {c.templates.length === 0 && (
                        <span className="text-xs text-muted">No templates</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm">
                    <span className="text-green-600 font-medium">{c.totalSent}</span>
                    {c.totalFailed > 0 && (
                      <span className="text-red-500"> / {c.totalFailed}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
                      >
                        Open <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Campaign Modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setForm({ name: "", description: "", templateIds: [] });
        }}
        title="New Campaign"
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Q2 Product Launch"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional campaign description"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-2">
              Select Templates
            </label>
            {templates.length === 0 ? (
              <p className="text-sm text-muted">
                No templates available.{" "}
                <Link href="/templates" className="text-accent hover:text-accent-hover">
                  Create one first
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {templates.map((t) => {
                  const selected = form.templateIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTemplate(t.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                        selected
                          ? "border-accent bg-accent-light"
                          : "border-border hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                          selected ? "bg-accent text-white" : "border border-border"
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-muted ml-2">({t.category})</span>
                        <p className="text-xs text-muted truncate">{t.bodyText}</p>
                      </div>
                      <StatusBadge status={t.metaStatus} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setForm({ name: "", description: "", templateIds: [] });
              }}
              className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
