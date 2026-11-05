import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  if (!transporter) {
    const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('SMTP_PORT debe ser un puerto válido.');
    }
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
}

export const sendConfirmationEmail = async (to: string, code: string): Promise<boolean> => {
  const smtpUser = process.env.SMTP_USER?.trim();
  if (!smtpUser || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[Mailer DEV] SMTP no configurado; no se envió correo de confirmación.');
    }
    return false;
  }

  try {
    const smtp = getTransporter();
    if (!smtp) return false;
    await smtp.sendMail({
      from: process.env.SMTP_FROM?.trim() || `"JINStock App" <${smtpUser}>`,
      to,
      subject: 'Código de Confirmación - JINStock',
      text: `Tu código de verificación de JINStock es: ${code}\n\nSi no solicitaste este registro, ignora este correo.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4A148C;">Verifica tu correo electrónico</h2>
          <p>Gracias por registrarte en JINStock. Tu código de verificación es:</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0;">${code}</div>
          <p>Ingresa este código en la aplicación para activar tu cuenta.</p>
          <p>Si no solicitaste este registro, ignora este correo.</p>
          <p>Saludos,<br/>Equipo JINStock</p>
        </div>
      `,
    });
    return true;
  } catch (error: unknown) {
    const smtpError = error as { code?: string; responseCode?: number; command?: string };
    // No registrar el correo, el código de confirmación, la contraseña ni la respuesta SMTP completa.
    console.error('[Mailer] Falló el envío de correo de confirmación.', {
      code: smtpError.code,
      responseCode: smtpError.responseCode,
      command: smtpError.command,
    });
    return false;
  }
};
