import nodemailer from 'nodemailer';

let _transporter: any = null;

function getTransporter() {
  if (!_transporter) {
    const user = process.env.SMTP_USER?.trim();
    const rawPass = process.env.SMTP_PASS?.trim();

    if (!user || !rawPass) {
      return null;
    }

    // Limpiar espacios de contraseñas de aplicación de Google (e.g. "lrkk tnco evcy zjna" -> "lrkktncoevcyzjna")
    const pass = rawPass.replace(/\s+/g, '');

    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
    });
  }
  return _transporter;
}

export const sendConfirmationEmail = async (
  to: string,
  code: string
): Promise<{ success: boolean; error?: string }> => {
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || smtpUser;

  if (!smtpUser || !smtpPass) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Mailer DEV] SMTP no configurado. Código generado para ${to}: ${code}`);
    }
    return { success: false, error: 'SMTP no configurado.' };
  }

  const mailOptions = {
    from: `"JINStock App" <${fromEmail}>`,
    to,
    subject: 'Código de Confirmación - JINStock',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4A148C; margin: 0;">JINStock - Librería y Papelería</h2>
          <p style="color: #6b7280; font-size: 14px;">Verificación de cuenta con Neon Auth</p>
        </div>
        <p>Hola,</p>
        <p>Gracias por registrarte en JINStock. Tu código de verificación es:</p>
        <div style="background-color: #f3e8ff; border: 2px dashed #9333ea; padding: 18px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; color: #581c87; margin: 24px 0;">
          ${code}
        </div>
        <p style="font-size: 13px; color: #4b5563;">Ingresa este código en la aplicación para activar tu cuenta. Válido por 15 minutos.</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 12px;">Si no solicitaste este registro, ignora este mensaje.</p>
        <p style="font-size: 13px; color: #374151; font-weight: bold;">Equipo JINStock Nicaragua</p>
      </div>
    `,
  };

  try {
    const transporter = getTransporter();
    if (!transporter) return { success: false, error: 'Transporter SMTP no disponible.' };
    await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Correo de verificación enviado exitosamente a ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Mailer] Error enviando correo a ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};
