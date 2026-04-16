"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Settings, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    whatsappApiToken: "",
    phoneNumberId: "",
    businessAccountId: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const fetchSettings = useCallback(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          whatsappApiToken: data.whatsappApiToken || "",
          phoneNumberId: data.phoneNumberId || "",
          businessAccountId: data.businessAccountId || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
        title="Settings"
        description="Configure your WhatsApp Business API credentials"
      />

      <div className="max-w-xl">
        <div className="bg-card-bg border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center">
              <Settings className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Meta WhatsApp API</h2>
              <p className="text-xs text-muted">
                Enter your credentials from Meta Business Suite
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Access Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={form.whatsappApiToken}
                  onChange={(e) =>
                    setForm({ ...form, whatsappApiToken: e.target.value })
                  }
                  placeholder="Your permanent access token"
                  className="w-full border border-border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Phone Number ID
              </label>
              <input
                type="text"
                value={form.phoneNumberId}
                onChange={(e) =>
                  setForm({ ...form, phoneNumberId: e.target.value })
                }
                placeholder="e.g. 123456789012345"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                WhatsApp Business Account ID
              </label>
              <input
                type="text"
                value={form.businessAccountId}
                onChange={(e) =>
                  setForm({ ...form, businessAccountId: e.target.value })
                }
                placeholder="e.g. 123456789012345"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Settings saved
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
          <p className="font-medium mb-1">How to get your credentials:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Go to Meta Business Suite &gt; WhatsApp Manager</li>
            <li>Navigate to API Setup under your WhatsApp business account</li>
            <li>Generate a permanent access token</li>
            <li>Copy the Phone Number ID and Business Account ID</li>
          </ol>
        </div>
      </div>
    </>
  );
}
