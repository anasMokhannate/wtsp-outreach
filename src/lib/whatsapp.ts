import { settings as settingsStore } from "./store";

function getSettings() {
  const s = settingsStore.get();
  if (!s.whatsappApiToken || !s.businessAccountId) {
    throw new Error("WhatsApp API settings not configured");
  }
  return s;
}

const META_API_BASE = "https://graph.facebook.com/v21.0";

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
  bodyText: string;
  footerText?: string | null;
  buttons?: string | null;
}) {
  const settings = getSettings();

  const components: Record<string, unknown>[] = [];

  if (template.headerType && template.headerText) {
    components.push({
      type: "HEADER",
      format: template.headerType,
      text: template.headerText,
    });
  }

  components.push({
    type: "BODY",
    text: template.bodyText,
  });

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

  const res = await fetch(
    `${META_API_BASE}/${settings.businessAccountId}/message_templates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.whatsappApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: template.name,
        category: template.category,
        language: template.language,
        components,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to create template on Meta");
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
