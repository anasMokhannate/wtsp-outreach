import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

function read<T>(name: string): T[] {
  ensureDir();
  const p = filePath(name);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function write<T>(name: string, data: T[]) {
  ensureDir();
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

export function cuid() {
  return crypto.randomBytes(12).toString("hex");
}

// --- Templates ---

export interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  headerType: string | null;
  headerText: string | null;
  bodyText: string;
  footerText: string | null;
  buttons: string | null;
  metaStatus: string;
  metaId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const templates = {
  getAll: (): Template[] => read<Template>("templates").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  getById: (id: string) => read<Template>("templates").find((t) => t.id === id) || null,
  create: (data: Omit<Template, "id" | "createdAt" | "updatedAt" | "metaStatus" | "metaId">): Template => {
    const all = read<Template>("templates");
    const t: Template = { ...data, id: cuid(), metaStatus: "PENDING", metaId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    all.push(t);
    write("templates", all);
    return t;
  },
  update: (id: string, data: Partial<Template>): Template | null => {
    const all = read<Template>("templates");
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
    write("templates", all);
    return all[idx];
  },
  delete: (id: string) => {
    const all = read<Template>("templates").filter((t) => t.id !== id);
    write("templates", all);
  },
};

// --- Prospects ---

export interface Prospect {
  id: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  tags: string | null;
  createdAt: string;
}

export const prospects = {
  getAll: (): Prospect[] => read<Prospect>("prospects").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  getById: (id: string) => read<Prospect>("prospects").find((p) => p.id === id) || null,
  create: (data: { phoneNumber: string; name?: string; email?: string; tags?: string }): Prospect => {
    const all = read<Prospect>("prospects");
    const p: Prospect = { id: cuid(), phoneNumber: data.phoneNumber, name: data.name || null, email: data.email || null, tags: data.tags || null, createdAt: new Date().toISOString() };
    all.push(p);
    write("prospects", all);
    return p;
  },
  update: (id: string, data: Partial<Prospect>): Prospect | null => {
    const all = read<Prospect>("prospects");
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data };
    write("prospects", all);
    return all[idx];
  },
  delete: (id: string) => {
    write("prospects", read<Prospect>("prospects").filter((p) => p.id !== id));
  },
};

// --- Campaigns ---

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  templateIds: string[];
  scheduledAt: string | null;
  launchedAt: string | null;
  completedAt: string | null;
  totalSent: number;
  totalFailed: number;
  createdAt: string;
}

export const campaigns = {
  getAll: (): Campaign[] => read<Campaign>("campaigns").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  getById: (id: string) => read<Campaign>("campaigns").find((c) => c.id === id) || null,
  create: (data: { name: string; description?: string; templateIds?: string[] }): Campaign => {
    const all = read<Campaign>("campaigns");
    const c: Campaign = {
      id: cuid(), name: data.name, description: data.description || null,
      status: "DRAFT", templateIds: data.templateIds || [],
      scheduledAt: null, launchedAt: null, completedAt: null,
      totalSent: 0, totalFailed: 0, createdAt: new Date().toISOString(),
    };
    all.push(c);
    write("campaigns", all);
    return c;
  },
  update: (id: string, data: Partial<Campaign>): Campaign | null => {
    const all = read<Campaign>("campaigns");
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data };
    write("campaigns", all);
    return all[idx];
  },
  delete: (id: string) => {
    write("campaigns", read<Campaign>("campaigns").filter((c) => c.id !== id));
    // Also remove related messages
    write("messages", read<Message>("messages").filter((m) => m.campaignId !== id));
  },
};

// --- Messages ---

export interface Message {
  id: string;
  campaignId: string;
  prospectId: string;
  templateId: string | null;
  status: string;
  metaMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export const messages = {
  getAll: (): Message[] => read<Message>("messages"),
  getByCampaign: (campaignId: string): Message[] => read<Message>("messages").filter((m) => m.campaignId === campaignId),
  create: (data: Omit<Message, "id" | "createdAt">): Message => {
    const all = read<Message>("messages");
    const m: Message = { ...data, id: cuid(), createdAt: new Date().toISOString() };
    all.push(m);
    write("messages", all);
    return m;
  },
};

// --- Settings ---

export interface Settings {
  whatsappApiToken: string;
  phoneNumberId: string;
  businessAccountId: string;
}

export const settings = {
  get: (): Settings => {
    const all = read<Settings>("settings");
    return all[0] || { whatsappApiToken: "", phoneNumberId: "", businessAccountId: "" };
  },
  save: (data: Settings) => {
    write("settings", [data]);
    return data;
  },
};
