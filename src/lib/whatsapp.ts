import { settings as settingsStore } from "./store";

function getSettings() {
  const s = settingsStore.get();
  if (!s.whatsappApiToken || !s.businessAccountId) {
    throw new Error("WhatsApp API settings not configured");
  }
  return s;
}

const META_API_BASE = "https://graph.facebook.com/v21.0";

function countVars(text: string | null | undefined): number {
  if (!text) return 0;
  const nums = new Set<number>();
  for (const m of text.matchAll(/\{\{(\d+)\}\}/g)) {
    nums.add(parseInt(m[1], 10));
  }
  return nums.size;
}

function padSamples(samples: string[] | null | undefined, count: number): string[] {
  const out = (samples || []).slice(0, count).map((s) => s || "sample");
  while (out.length < count) out.push("sample");
  return out;
}

export async function fetchMetaTemplates() {
  const settings = getSettings();

  const allTemplates: Record<string, unknown>[] = [];
  let url: string | null =
    `${META_API_BASE}/${settings.businessAccountId}/message_templates?limit=100`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${settings.whatsappApiToken}` },
    });
    const data: { data?: Record<string, unknown>[]; paging?: { next?: string }; error?: { message?: string } } = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "Failed to fetch templates from Meta");
    }
    allTemplates.push(...(data.data || []));
    url = data.paging?.next || null;
  }

  return allTemplates;
}

export async function createMetaTemplate(template: {
  name: string;
  category: string;
  language: string;
  headerType?: string | null;
  headerText?: string | null;
  headerSamples?: string[] | null;
  bodyText: string;
  bodySamples?: string[] | null;
  footerText?: string | null;
  buttons?: string | null;
}) {
  const settings = getSettings();

  const components: Record<string, unknown>[] = [];

  const headerVarCount = countVars(template.headerText);
  const bodyVarCount = countVars(template.bodyText);

  if (template.headerType && template.headerText) {
    const headerComp: Record<string, unknown> = {
      type: "HEADER",
      format: template.headerType,
      text: template.headerText,
    };
    if (headerVarCount > 0) {
      const samples = padSamples(template.headerSamples, headerVarCount);
      headerComp.example = { header_text: samples };
    }
    components.push(headerComp);
  }

  const bodyComp: Record<string, unknown> = {
    type: "BODY",
    text: template.bodyText,
  };
  if (bodyVarCount > 0) {
    const samples = padSamples(template.bodySamples, bodyVarCount);
    bodyComp.example = { body_text: [samples] };
  }
  components.push(bodyComp);

  if (template.footerText) {
    components.push({
      type: "FOOTER",
      text: template.footerText,
    });
  }

  if (template.buttons) {
    const btns = JSON.parse(template.buttons);
    if (btns.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: btns,
      });
    }
  }

  const requestBody = {
    name: template.name,
    category: template.category,
    language: template.language,
    components,
  };

  const res = await fetch(
    `${META_API_BASE}/${settings.businessAccountId}/message_templates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.whatsappApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    const err = data.error || {};
    console.error("[Meta template create] request:", JSON.stringify(requestBody, null, 2));
    console.error("[Meta template create] response:", JSON.stringify(data, null, 2));
    const parts: string[] = [];
    if (err.code) parts.push(`#${err.code}`);
    if (err.error_subcode) parts.push(`sub:${err.error_subcode}`);
    const msg =
      err.error_user_msg ||
      err.error_user_title ||
      err.message ||
      "Failed to create template on Meta";
    const prefix = parts.length ? `[${parts.join(" ")}] ` : "";
    throw new Error(`${prefix}${msg}`);
  }
  return data;
}

export async function deleteMetaTemplate(templateName: string) {
  const settings = getSettings();

  const res = await fetch(
    `${META_API_BASE}/${settings.businessAccountId}/message_templates?name=${templateName}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${settings.whatsappApiToken}`,
      },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to delete template on Meta");
  }
  return data;
}

export async function sendTextMessage(
  phoneNumber: string,
  text: string
) {
  const settings = getSettings();

  const res = await fetch(
    `${META_API_BASE}/${settings.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.whatsappApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: { body: text },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to send message");
  }
  return data;
}

export async function sendTemplateMessage(
  phoneNumber: string,
  templateName: string,
  language: string,
  opts?: { headerParams?: string[]; bodyParams?: string[] }
) {
  const settings = getSettings();

  const components: Record<string, unknown>[] = [];

  if (opts?.headerParams && opts.headerParams.length > 0) {
    components.push({
      type: "header",
      parameters: opts.headerParams.map((text) => ({ type: "text", text })),
    });
  }

  if (opts?.bodyParams && opts.bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: opts.bodyParams.map((text) => ({ type: "text", text })),
    });
  }

  const templatePayload: Record<string, unknown> = {
    name: templateName,
    language: { code: language },
  };
  if (components.length > 0) {
    templatePayload.components = components;
  }

  const res = await fetch(
    `${META_API_BASE}/${settings.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.whatsappApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: templatePayload,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to send message");
  }
  return data;
}
