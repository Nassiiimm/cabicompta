const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "CabiCompta <noreply@cabicompta.ca>";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!RESEND_API_KEY || RESEND_API_KEY === "your_resend_api_key") {
    console.log("[EMAIL] Resend non configuré. Email supprimé :", payload.subject, "→", payload.to);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });
    return res.ok;
  } catch {
    console.error("[EMAIL] Erreur envoi :", payload.subject);
    return false;
  }
}

// Templates

export async function sendWelcomeEmail(to: string, name: string, tempPassword: string) {
  return sendEmail({
    to,
    subject: "Bienvenue sur CabiCompta — Votre accès client",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">Bonjour ${name},</h2>
        <p style="color: #525252; line-height: 1.6;">
          Votre comptable vous a créé un accès sur <strong>CabiCompta</strong>.
          Vous pouvez maintenant déposer vos documents et suivre votre dossier en ligne.
        </p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #737373;">Mot de passe temporaire :</p>
          <p style="margin: 0; font-family: monospace; font-size: 16px; font-weight: bold;">${tempPassword}</p>
        </div>
        <p style="color: #525252; line-height: 1.6;">
          Connectez-vous et changez votre mot de passe dès que possible.
        </p>
        <p style="color: #a3a3a3; font-size: 12px; margin-top: 32px;">
          — L'équipe CabiCompta
        </p>
      </div>
    `,
  });
}

export async function sendDocumentRequestEmail(to: string, name: string, companyName: string) {
  return sendEmail({
    to,
    subject: `CabiCompta — Documents requis pour ${companyName}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">Bonjour ${name},</h2>
        <p style="color: #525252; line-height: 1.6;">
          Votre comptable a besoin de documents supplémentaires pour compléter le dossier de <strong>${companyName}</strong>.
        </p>
        <p style="color: #525252; line-height: 1.6;">
          Connectez-vous à votre portail pour déposer les documents manquants.
        </p>
        <p style="color: #a3a3a3; font-size: 12px; margin-top: 32px;">
          — L'équipe CabiCompta
        </p>
      </div>
    `,
  });
}

export async function sendDeadlineReminderEmail(to: string, name: string, deadlineLabel: string, daysLeft: number) {
  const urgency = daysLeft <= 1 ? "URGENT" : daysLeft <= 7 ? "Rappel" : "Information";
  return sendEmail({
    to,
    subject: `${urgency} — ${deadlineLabel}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">Bonjour ${name},</h2>
        <p style="color: #525252; line-height: 1.6;">
          L'échéance <strong>${deadlineLabel}</strong> arrive dans <strong>${daysLeft} jour${daysLeft > 1 ? "s" : ""}</strong>.
        </p>
        <p style="color: #525252; line-height: 1.6;">
          Assurez-vous que tous les documents nécessaires sont déposés sur votre portail.
        </p>
        <p style="color: #a3a3a3; font-size: 12px; margin-top: 32px;">
          — L'équipe CabiCompta
        </p>
      </div>
    `,
  });
}

export async function sendInvoiceOverdueEmail(to: string, name: string, invoiceNumber: string, total: string, daysLate: number) {
  const urgency = daysLate >= 30 ? "URGENT" : "Rappel";
  return sendEmail({
    to,
    subject: `${urgency} — Facture ${invoiceNumber} en retard`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">Bonjour ${name},</h2>
        <p style="color: #525252; line-height: 1.6;">
          La facture <strong>${invoiceNumber}</strong> d'un montant de <strong>${total}</strong>
          est en retard de <strong>${daysLate} jour${daysLate > 1 ? "s" : ""}</strong>.
        </p>
        <p style="color: #525252; line-height: 1.6;">
          Veuillez procéder au paiement dans les plus brefs délais ou contactez votre comptable
          si vous avez des questions.
        </p>
        <p style="color: #a3a3a3; font-size: 12px; margin-top: 32px;">
          — L'équipe CabiCompta
        </p>
      </div>
    `,
  });
}

export async function sendInvoiceEmail(to: string, name: string, invoiceNumber: string, total: string) {
  return sendEmail({
    to,
    subject: `CabiCompta — Facture ${invoiceNumber}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">Bonjour ${name},</h2>
        <p style="color: #525252; line-height: 1.6;">
          Une nouvelle facture a été émise pour votre dossier.
        </p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 4px; font-size: 13px; color: #737373;">Facture ${invoiceNumber}</p>
          <p style="margin: 0; font-size: 20px; font-weight: bold;">${total}</p>
        </div>
        <p style="color: #525252; line-height: 1.6;">
          Consultez votre portail pour plus de détails.
        </p>
        <p style="color: #a3a3a3; font-size: 12px; margin-top: 32px;">
          — L'équipe CabiCompta
        </p>
      </div>
    `,
  });
}
