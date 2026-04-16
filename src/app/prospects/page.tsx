"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { EmptyState } from "@/components/empty-state";
import { Users, Plus, Trash2, Edit3, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Prospect {
  id: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  tags: string | null;
  createdAt: string;
  _count: { messages: number };
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ phoneNumber: "", name: "", email: "", tags: "" });
  const [bulkText, setBulkText] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProspects = useCallback(() => {
    fetch("/api/prospects")
      .then((r) => r.json())
      .then(setProspects)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const url = editingId ? `/api/prospects/${editingId}` : "/api/prospects";
    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    setShowCreate(false);
    setEditingId(null);
    setForm({ phoneNumber: "", name: "", email: "", tags: "" });
    fetchProspects();
  };

  const handleBulkImport = async () => {
    setSaving(true);
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const data = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return {
        phoneNumber: parts[0],
        name: parts[1] || undefined,
        email: parts[2] || undefined,
        tags: parts[3] || undefined,
      };
    });

    await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setSaving(false);
    setShowBulk(false);
    setBulkText("");
    fetchProspects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prospect?")) return;
    await fetch(`/api/prospects/${id}`, { method: "DELETE" });
    fetchProspects();
  };

  const openEdit = (p: Prospect) => {
    setEditingId(p.id);
    setForm({
      phoneNumber: p.phoneNumber,
      name: p.name || "",
      email: p.email || "",
      tags: p.tags || "",
    });
    setShowCreate(true);
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
        title="Prospects"
        description="Manage your contact list for outreach"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulk(true)}
              className="flex items-center gap-2 border border-border hover:bg-gray-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setForm({ phoneNumber: "", name: "", email: "", tags: "" });
                setShowCreate(true);
              }}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Prospect
            </button>
          </div>
        }
      />

      {prospects.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title="No prospects yet"
          description="Add prospects to your contact list to start sending campaigns."
          action={
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulk(true)}
                className="flex items-center gap-2 border border-border hover:bg-gray-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" /> Bulk Import
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Prospect
              </button>
            </div>
          }
        />
      ) : (
        <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted uppercase tracking-wider">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Tags</th>
                <th className="px-5 py-3">Messages</th>
                <th className="px-5 py-3">Added</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {prospects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium">
                    {p.name || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-mono text-muted">
                    {p.phoneNumber}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted">
                    {p.email || "-"}
                  </td>
                  <td className="px-5 py-3.5">
                    {p.tags ? (
                      <div className="flex flex-wrap gap-1">
                        {p.tags.split(",").map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm">{p._count.messages}</td>
                  <td className="px-5 py-3.5 text-xs text-muted">
                    {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-muted hover:text-foreground transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
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

      {/* Create / Edit Modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setEditingId(null);
          setForm({ phoneNumber: "", name: "", email: "", tags: "" });
        }}
        title={editingId ? "Edit Prospect" : "Add Prospect"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Phone Number *
            </label>
            <input
              type="text"
              required
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              placeholder="e.g. 14155551234"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            <p className="text-xs text-muted mt-1">
              Include country code, no + or spaces
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contact name"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contact@example.com"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Tags
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g. lead, enterprise"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            <p className="text-xs text-muted mt-1">Separate tags with commas</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditingId(null);
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
              {saving ? "Saving..." : editingId ? "Update" : "Add Prospect"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        open={showBulk}
        onClose={() => {
          setShowBulk(false);
          setBulkText("");
        }}
        title="Bulk Import Prospects"
        wide
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Paste CSV data
            </label>
            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`14155551234, John Doe, john@example.com, lead\n442071234567, Jane Smith, jane@example.com, enterprise`}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
            />
            <p className="text-xs text-muted mt-1">
              Format: phone, name (optional), email (optional), tags (optional) — one per
              line
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowBulk(false);
                setBulkText("");
              }}
              className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkImport}
              disabled={saving || !bulkText.trim()}
              className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
