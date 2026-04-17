"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Modal } from "@/components/modal";
import {
  ArrowLeft,
  Rocket,
  Users,
  MessageSquareText,
  Check,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Prospect {
  id: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  tags: string | null;
}

type VarSource = "static" | "prospect_name" | "prospect_email" | "prospect_phone";
interface VariableMapping {
  source: VarSource;
  value?: string;
}

interface CampaignMessage {
  id: string;
  prospectId: string;
  status: string;
  errorMessage: string | null;
  sentAt: string | null;
}

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  headerType: string | null;
  headerText: string | null;
  bodyText: string;
  language: string;
}

interface CampaignDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  totalSent: number;
  totalFailed: number;
  templateIds: string[];
  launchedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  templates: TemplateItem[];
  messages: CampaignMessage[];
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLaunch, setShowLaunch] = useState(false);
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ sent: number; failed: number } | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [headerVariables, setHeaderVariables] = useState<Record<number, VariableMapping>>({});
  const [bodyVariables, setBodyVariables] = useState<Record<number, VariableMapping>>({});

  const fetchCampaign = useCallback(() => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setCampaign)
      .catch(() => router.push("/campaigns"))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    fetchCampaign();
    fetch("/api/prospects")
      .then((r) => r.json())
      .then(setProspects);
  }, [fetchCampaign]);

  const toggleProspect = (pid: string) => {
    setSelectedProspects((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  const selectAll = () => {
    if (selectedProspects.length === prospects.length) {
      setSelectedProspects([]);
    } else {
      setSelectedProspects(prospects.map((p) => p.id));
    }
  };

  const firstTemplate = campaign?.templates[0];

  const extractVars = (text: string | null | undefined): number[] => {
    if (!text) return [];
    const nums = new Set<number>();
    const re = /\{\{(\d+)\}\}/g;
    let m;
    while ((m = re.exec(text)) !== null) nums.add(parseInt(m[1], 10));
    return Array.from(nums).sort((a, b) => a - b);
  };

  const headerVarNums = extractVars(firstTemplate?.headerText);
  const bodyVarNums = extractVars(firstTemplate?.bodyText);
  const hasVariables = headerVarNums.length + bodyVarNums.length > 0;

  const resolveMapping = (m: VariableMapping | undefined, p: Prospect): string => {
    if (!m) return "";
    switch (m.source) {
      case "prospect_name":
        return p.name || "";
      case "prospect_email":
        return p.email || "";
      case "prospect_phone":
        return p.phoneNumber;
      default:
        return m.value || "";
    }
  };

  const resolveText = (
    text: string | null | undefined,
    mappings: Record<number, VariableMapping>,
    p: Prospect
  ): string => {
    if (!text) return "";
    return text.replace(/\{\{(\d+)\}\}/g, (_, numStr) => {
      const n = parseInt(numStr, 10);
      return resolveMapping(mappings[n], p) || `{{${n}}}`;
    });
  };

  const setVarMapping = (
    which: "header" | "body",
    num: number,
    patch: Partial<VariableMapping>
  ) => {
    const setter = which === "header" ? setHeaderVariables : setBodyVariables;
    const current = which === "header" ? headerVariables : bodyVariables;
    const existing = current[num] || { source: "static", value: "" };
    setter({ ...current, [num]: { ...existing, ...patch } });
  };

  const allVariablesMapped = (() => {
    const hOk = headerVarNums.every((n) => {
      const m = headerVariables[n];
      if (!m) return false;
      return m.source !== "static" || (m.value ?? "").length > 0;
    });
    const bOk = bodyVarNums.every((n) => {
      const m = bodyVariables[n];
      if (!m) return false;
      return m.source !== "static" || (m.value ?? "").length > 0;
    });
    return hOk && bOk;
  })();

  const previewProspect = selectedProspects.length > 0
    ? prospects.find((p) => p.id === selectedProspects[0])
    : null;

  const handleLaunch = async () => {
    setLaunching(true);
    setLaunchResult(null);
    setLaunchError(null);

    const res = await fetch(`/api/campaigns/${id}/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prospectIds: selectedProspects,
        headerVariables: headerVarNums.length > 0 ? headerVariables : undefined,
        bodyVariables: bodyVarNums.length > 0 ? bodyVariables : undefined,
      }),
    });

    const data = await res.json();
    setLaunching(false);

    if (res.ok) {
      setLaunchResult({ sent: data.totalSent, failed: data.totalFailed });
      fetchCampaign();
    } else {
      setLaunchError(data.error || "Launch failed");
    }
  };

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to campaigns
      </Link>

      <PageHeader
        title={campaign.name}
        description={campaign.description || undefined}
        action={
          campaign.status === "DRAFT" && campaign.templates.length > 0 ? (
            <button
              onClick={() => {
                setShowLaunch(true);
                setSelectedProspects([]);
                setLaunchResult(null);
                setLaunchError(null);
                setHeaderVariables({});
                setBodyVariables({});
              }}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Rocket className="w-4 h-4" /> Launch Campaign
            </button>
          ) : undefined
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card-bg border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Status</p>
          <StatusBadge status={campaign.status} />
        </div>
        <div className="bg-card-bg border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Templates</p>
          <p className="text-lg font-bold">{campaign.templates.length}</p>
        </div>
        <div className="bg-card-bg border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Sent</p>
          <p className="text-lg font-bold text-green-600">{campaign.totalSent}</p>
        </div>
        <div className="bg-card-bg border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Failed</p>
          <p className="text-lg font-bold text-red-500">{campaign.totalFailed}</p>
        </div>
      </div>

      {/* Templates */}
      <div className="bg-card-bg border border-border rounded-xl mb-6">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-semibold">Templates</h2>
        </div>
        {campaign.templates.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">
            No templates assigned. Edit the campaign to add templates.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {campaign.templates.map((t, i) => (
              <div key={t.id} className="px-5 py-3.5 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-accent-light text-accent text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted mt-0.5 line-clamp-2">
                    {t.bodyText}
                  </p>
                </div>
                <StatusBadge status={t.category} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      {campaign.messages.length > 0 && (
        <div className="bg-card-bg border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Users className="w-4 h-4 text-muted" />
            <h2 className="text-sm font-semibold">
              Messages ({campaign.messages.length})
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted uppercase tracking-wider">
                <th className="px-5 py-3">Prospect</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Sent At</th>
                <th className="px-5 py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaign.messages.map((m) => {
                const p = prospects.find((pr) => pr.id === m.prospectId);
                return (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm">
                    {p?.name || "Unknown"}
                  </td>
                  <td className="px-5 py-3 text-sm text-muted font-mono">
                    {p?.phoneNumber || "-"}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-5 py-3 text-xs text-muted">
                    {m.sentAt ? format(new Date(m.sentAt), "MMM d, HH:mm") : "-"}
                  </td>
                  <td className="px-5 py-3 text-xs text-red-500">
                    {m.errorMessage || "-"}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Launch Modal */}
      <Modal
        open={showLaunch}
        onClose={() => setShowLaunch(false)}
        title="Launch Campaign"
        wide
      >
        {launchResult ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Campaign Launched!</h3>
            <p className="text-sm text-muted">
              <span className="text-green-600 font-medium">{launchResult.sent}</span> messages
              sent
              {launchResult.failed > 0 && (
                <>
                  , <span className="text-red-500 font-medium">{launchResult.failed}</span>{" "}
                  failed
                </>
              )}
            </p>
            <button
              onClick={() => {
                setShowLaunch(false);
                setLaunchResult(null);
              }}
              className="mt-4 bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-light text-sm">
              <AlertCircle className="w-4 h-4 text-accent shrink-0" />
              <p>
                This will send WhatsApp template messages to the selected prospects using the
                first template assigned to this campaign.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted">
                  Select Prospects ({selectedProspects.length} selected)
                </label>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-accent hover:text-accent-hover"
                >
                  {selectedProspects.length === prospects.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {prospects.length === 0 ? (
                <p className="text-sm text-muted py-4 text-center">
                  No prospects yet.{" "}
                  <Link href="/prospects" className="text-accent hover:text-accent-hover">
                    Add prospects first
                  </Link>
                  .
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {prospects.map((p) => {
                    const selected = selectedProspects.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProspect(p.id)}
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
                          <span className="font-medium">
                            {p.name || p.phoneNumber}
                          </span>
                          {p.name && (
                            <span className="text-muted ml-2 font-mono text-xs">
                              {p.phoneNumber}
                            </span>
                          )}
                        </div>
                        {p.tags && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                            {p.tags}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {hasVariables && (
              <div className="border border-border rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold">Template Variables</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Map each <code className="bg-gray-100 px-1 rounded">{"{{n}}"}</code> in the template to a data source.
                  </p>
                </div>

                {headerVarNums.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Header</p>
                    {headerVarNums.map((n) => {
                      const m = headerVariables[n];
                      return (
                        <div key={`h${n}`} className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 px-1.5 py-1 rounded shrink-0 font-mono">{`{{${n}}}`}</code>
                          <select
                            value={m?.source || "static"}
                            onChange={(e) =>
                              setVarMapping("header", n, { source: e.target.value as VarSource })
                            }
                            className="text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent/30"
                          >
                            <option value="static">Custom text</option>
                            <option value="prospect_name">Prospect name</option>
                            <option value="prospect_email">Prospect email</option>
                            <option value="prospect_phone">Prospect phone</option>
                          </select>
                          {(!m || m.source === "static") && (
                            <input
                              type="text"
                              value={m?.value || ""}
                              onChange={(e) =>
                                setVarMapping("header", n, { source: "static", value: e.target.value })
                              }
                              placeholder="Enter value"
                              className="flex-1 text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {bodyVarNums.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Body</p>
                    {bodyVarNums.map((n) => {
                      const m = bodyVariables[n];
                      return (
                        <div key={`b${n}`} className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 px-1.5 py-1 rounded shrink-0 font-mono">{`{{${n}}}`}</code>
                          <select
                            value={m?.source || "static"}
                            onChange={(e) =>
                              setVarMapping("body", n, { source: e.target.value as VarSource })
                            }
                            className="text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent/30"
                          >
                            <option value="static">Custom text</option>
                            <option value="prospect_name">Prospect name</option>
                            <option value="prospect_email">Prospect email</option>
                            <option value="prospect_phone">Prospect phone</option>
                          </select>
                          {(!m || m.source === "static") && (
                            <input
                              type="text"
                              value={m?.value || ""}
                              onChange={(e) =>
                                setVarMapping("body", n, { source: "static", value: e.target.value })
                              }
                              placeholder="Enter value"
                              className="flex-1 text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {previewProspect && firstTemplate && (
                  <div className="bg-accent-light/40 rounded-lg p-3 mt-2">
                    <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1.5">
                      Preview (for {previewProspect.name || previewProspect.phoneNumber})
                    </p>
                    {firstTemplate.headerText && (
                      <p className="text-xs font-semibold mb-1">
                        {resolveText(firstTemplate.headerText, headerVariables, previewProspect)}
                      </p>
                    )}
                    <p className="text-xs whitespace-pre-wrap">
                      {resolveText(firstTemplate.bodyText, bodyVariables, previewProspect)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {launchError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs">
                {launchError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLaunch(false)}
                className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunch}
                disabled={launching || selectedProspects.length === 0 || (hasVariables && !allVariablesMapped)}
                className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {launching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" /> Launch ({selectedProspects.length})
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
