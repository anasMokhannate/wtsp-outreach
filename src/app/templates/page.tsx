"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Modal } from "@/components/modal";
import { EmptyState } from "@/components/empty-state";
import { MessageSquareText, Plus, Trash2, Edit3, Eye, RefreshCw } from "lucide-react";

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  headerType: string | null;
  headerText: string | null;
  headerSamples: string[] | null;
  bodyText: string;
  bodySamples: string[] | null;
  footerText: string | null;
  buttons: string | null;
  metaStatus: string;
  metaId: string | null;
  createdAt: string;
}

function extractVarNumbers(text: string): number[] {
  const nums = new Set<number>();
  const re = /\{\{(\d+)\}\}/g;
  let m;
  while ((m = re.exec(text)) !== null) nums.add(parseInt(m[1], 10));
  return Array.from(nums).sort((a, b) => a - b);
}

const categories = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const languages = [
  { code: "en_US", label: "English (US)" },
  { code: "en_GB", label: "English (UK)" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "ar", label: "Arabic" },
  { code: "pt_BR", label: "Portuguese (BR)" },
];

const defaultForm = {
  name: "",
  category: "MARKETING",
  language: "en_US",
  headerType: "",
  headerText: "",
  headerSamples: [] as string[],
  bodyText: "",
  bodySamples: [] as string[],
  footerText: "",
  buttons: "",
  syncToMeta: true,
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState<Template | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTemplates = useCallback(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const url = editingId ? `/api/templates/${editingId}` : "/api/templates";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error || "Failed to save template");
      fetchTemplates();
      return;
    }

    setShowCreate(false);
    setEditingId(null);
    setForm(defaultForm);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  };

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      category: t.category,
      language: t.language,
      headerType: t.headerType || "",
      headerText: t.headerText || "",
      headerSamples: t.headerSamples || [],
      bodyText: t.bodyText,
      bodySamples: t.bodySamples || [],
      footerText: t.footerText || "",
      buttons: t.buttons || "",
      syncToMeta: false,
    });
    setShowCreate(true);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/templates/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Sync failed");
      } else {
        alert(`Synced: ${data.imported} imported, ${data.updated} updated (${data.total} total on Meta)`);
        fetchTemplates();
      }
    } catch {
      alert("Failed to connect to Meta API. Check your settings.");
    } finally {
      setSyncing(false);
    }
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
        title="Templates"
        description="Manage your WhatsApp message templates"
        action={
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 border border-border hover:bg-gray-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync from Meta"}
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setForm(defaultForm);
                setShowCreate(true);
              }}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText className="w-7 h-7" />}
          title="No templates yet"
          description="Create your first WhatsApp message template to start reaching out to prospects."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Template
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-card-bg border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{t.name}</h3>
                  <p className="text-xs text-muted mt-0.5">
                    {t.category} &middot;{" "}
                    {languages.find((l) => l.code === t.language)?.label || t.language}
                  </p>
                </div>
                <StatusBadge status={t.metaStatus} />
              </div>

              <p className="text-sm text-muted line-clamp-3 mb-4">{t.bodyText}</p>

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => setShowPreview(t)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button
                  onClick={() => openEdit(t)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setEditingId(null);
          setForm(defaultForm);
          setFormError(null);
        }}
        title={editingId ? "Edit Template" : "New Template"}
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <p className="font-medium mb-0.5">Error</p>
              <p>{formError}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Template Name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "_")
                      .replace(/[^a-z0-9_]/g, ""),
                  })
                }
                placeholder="e.g. welcome_message"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <p className="text-xs text-muted mt-1">
                Lowercase letters, numbers, and underscores only (auto-formatted)
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Language
            </label>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Header Text (optional)
            </label>
            <input
              type="text"
              value={form.headerText}
              onChange={(e) => {
                const v = e.target.value;
                const count = extractVarNumbers(v).length;
                const padded = form.headerSamples.slice(0, count);
                while (padded.length < count) padded.push("");
                setForm({
                  ...form,
                  headerText: v,
                  headerType: v ? "TEXT" : "",
                  headerSamples: padded,
                });
              }}
              placeholder="Optional header text"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Body Text *
            </label>
            <textarea
              required
              rows={4}
              value={form.bodyText}
              onChange={(e) => {
                const v = e.target.value;
                const count = extractVarNumbers(v).length;
                const padded = form.bodySamples.slice(0, count);
                while (padded.length < count) padded.push("");
                setForm({ ...form, bodyText: v, bodySamples: padded });
              }}
              placeholder="Hello {{1}}, we'd love to connect with you..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
            />
            <p className="text-xs text-muted mt-1">
              Use {"{{1}}"}, {"{{2}}"} etc. for variable placeholders
            </p>
          </div>

          {(form.headerSamples.length > 0 || form.bodySamples.length > 0) && (
            <div className="border border-border rounded-lg p-3 bg-gray-50 space-y-3">
              <div>
                <p className="text-xs font-semibold">Sample Values (for Meta review)</p>
                <p className="text-[11px] text-muted mt-0.5">
                  Meta requires an example value for each variable. These are only used during approval, not sent to recipients.
                </p>
              </div>

              {form.headerSamples.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Header</p>
                  {form.headerSamples.map((s, i) => (
                    <div key={`hs${i}`} className="flex items-center gap-2">
                      <code className="text-xs bg-gray-200 px-1.5 py-1 rounded shrink-0 font-mono">
                        {`{{${i + 1}}}`}
                      </code>
                      <input
                        type="text"
                        value={s}
                        onChange={(e) => {
                          const next = [...form.headerSamples];
                          next[i] = e.target.value;
                          setForm({ ...form, headerSamples: next });
                        }}
                        placeholder="Example value"
                        className="flex-1 text-xs border border-border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </div>
                  ))}
                </div>
              )}

              {form.bodySamples.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Body</p>
                  {form.bodySamples.map((s, i) => (
                    <div key={`bs${i}`} className="flex items-center gap-2">
                      <code className="text-xs bg-gray-200 px-1.5 py-1 rounded shrink-0 font-mono">
                        {`{{${i + 1}}}`}
                      </code>
                      <input
                        type="text"
                        value={s}
                        onChange={(e) => {
                          const next = [...form.bodySamples];
                          next[i] = e.target.value;
                          setForm({ ...form, bodySamples: next });
                        }}
                        placeholder="Example value"
                        className="flex-1 text-xs border border-border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Footer Text (optional)
            </label>
            <input
              type="text"
              value={form.footerText}
              onChange={(e) => setForm({ ...form, footerText: e.target.value })}
              placeholder="Optional footer text"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          {!editingId && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="syncToMeta"
                checked={form.syncToMeta}
                onChange={(e) => setForm({ ...form, syncToMeta: e.target.checked })}
                className="rounded accent-accent"
              />
              <label htmlFor="syncToMeta" className="text-sm text-muted">
                Submit to Meta for approval
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditingId(null);
                setForm(defaultForm);
                setFormError(null);
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
              {saving ? "Saving..." : editingId ? "Update Template" : "Create Template"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={!!showPreview}
        onClose={() => setShowPreview(null)}
        title="Template Preview"
      >
        {showPreview && (
          <div className="space-y-3">
            <div className="bg-[#e5ddd5] rounded-xl p-4">
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-[280px]">
                {showPreview.headerText && (
                  <p className="font-semibold text-sm mb-1">{showPreview.headerText}</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{showPreview.bodyText}</p>
                {showPreview.footerText && (
                  <p className="text-xs text-muted mt-2">{showPreview.footerText}</p>
                )}
              </div>
            </div>
            <div className="text-xs text-muted space-y-1">
              <p>
                <span className="font-medium">Name:</span> {showPreview.name}
              </p>
              <p>
                <span className="font-medium">Category:</span> {showPreview.category}
              </p>
              <p>
                <span className="font-medium">Language:</span> {showPreview.language}
              </p>
              <p>
                <span className="font-medium">Meta Status:</span>{" "}
                <StatusBadge status={showPreview.metaStatus} />
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
