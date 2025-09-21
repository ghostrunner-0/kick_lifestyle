// lib/sendMail.js
// Template-only Brevo sender. No raw HTML fallback.
// If you're on Node < 18, install and import node-fetch.

const asRecipients = (list) => {
  if (!list) return undefined;
  const arr = Array.isArray(list) ? list : [list];
  return arr.map((x) => (typeof x === "string" ? { email: x } : x));
};

export async function sendBrevoTemplateEmail({
  to,
  templateId,
  params = {},
  subjectOverride,
  cc,
  bcc,
  replyTo,
  tags,
}) {
  if (!templateId || Number.isNaN(Number(templateId))) {
    console.error(
      "[Brevo TEMPLATE] Missing or invalid templateId:",
      templateId
    );
    return { success: false, message: "TEMPLATE_ID_MISSING" };
  }

  const payload = {
    sender: {
      email: process.env.BREVO_SENDER_EMAIL,
      name: process.env.BREVO_SENDER_NAME || "Kick Lifestyle",
    },
    to: asRecipients(to),
    templateId: Number(templateId),
    params,
  };

  if (subjectOverride) payload.subject = subjectOverride;
  if (cc && cc.length) payload.cc = asRecipients(cc);
  if (bcc && bcc.length) payload.bcc = asRecipients(bcc);
  if (replyTo) payload.replyTo = replyTo;
  if (tags && tags.length) payload.tags = tags;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errBody = null;
      try {
        errBody = await res.json();
      } catch {
        /* ignore */
      }
      console.error(
        "[Brevo TEMPLATE] API error:",
        res.status,
        res.statusText,
        errBody
      );
      return { success: false, message: errBody?.message || res.statusText };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (e) {
    console.error("[Brevo TEMPLATE] Fetch error:", e);
    return { success: false, message: e?.message || String(e) };
  }
}

/**
 * Backward-compatible wrapper with your old signature:
 * sendMail(subject, receiver, params, { templateId, ... } )
 * NOTE: Template-only. If templateId is missing/invalid, returns {success:false}.
 */
export async function sendMail(subject, receiver, params, options = {}) {
  return sendBrevoTemplateEmail({
    to: receiver,
    templateId: options.templateId,
    params: typeof params === "string" ? { body: params } : params || {},
    subjectOverride: subject,
    cc: options.cc,
    bcc: options.bcc,
    replyTo: options.replyTo,
    tags: options.tags,
  });
}
