import nodemailer from 'nodemailer';

let _transporter: any = null;
// Invalidar transporter si las variables de entorno cambian entre reinicios
let _transporterUser: string | undefined;

function getTransporter() {
  const user = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASS?.trim();

  if (!user || !rawPass) {
    console.warn('[Mailer] SMTP_USER o SMTP_PASS no están configurados en las variables de entorno.');
    return null;
  }

  // Limpiar espacios de contraseñas de aplicación de Google (e.g. "lrkk tnco evcy zjna" -> "lrkktncoevcyzjna")
  const pass = rawPass.replace(/\s+/g, '');

  if (pass.length < 8) {
    console.warn(`[Mailer] SMTP_PASS parece inválida (longitud: ${pass.length}). Verifique la App Password en Google Account.`);
    return null;
  }

  // Recrear el transporter si cambió el usuario (reinicio de servidor)
  if (!_transporter || _transporterUser !== user) {
    _transporterUser = user;
    _transporter = null; // forzar recreación

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    // Render bloquea el puerto saliente 587 (STARTTLS) en el plan gratuito para prevenir spam.
    // Usar el puerto 465 (SSL/TLS directo) es el estándar compatible en Render para Gmail.
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = port === 465;

    console.log(`[Mailer] Creando transporter SMTP: ${host}:${port} (secure=${secure}) user=${user} pass_len=${pass.length}`);

    // Render capa gratuita bloquea todos los puertos SMTP directos (25, 465, 587) por firewall.
    // Usar nodemailer con 'service: gmail' activa la configuración optimizada interna de Gmail
    // y maneja endpoints HTTP/TLS compatibles con proxies y entornos restringidos.
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    } as any);
  }
  return _transporter;
}

/**
 * Verifica la conexión SMTP y devuelve el resultado.
 * Útil para diagnóstico en producción.
 */
export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string; config: Record<string, string> }> {
  const user = process.env.SMTP_USER?.trim() || '';
  const rawPass = process.env.SMTP_PASS?.trim() || '';
  const pass = rawPass.replace(/\s+/g, '');
  const config = {
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: process.env.SMTP_PORT || '465',
    SMTP_USER: user ? `${user.slice(0, 4)}...${user.slice(-4)}` : 'NO CONFIGURADO',
    SMTP_PASS_LEN: String(pass.length),
    NODE_ENV: process.env.NODE_ENV || 'unknown',
  };
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: 'Transporter no disponible (credenciales faltantes)', config };
  try {
    await transporter.verify();
    return { ok: true, config };
  } catch (err: any) {
    return { ok: false, error: `${err.code || 'ERROR'}: ${err.message}`, config };
  }
}

export const sendConfirmationEmail = async (
  to: string,
  code: string
): Promise<{ success: boolean; error?: string }> => {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || smtpUser || 'soporte@jinstock.ni';

  // 1. Prioridad: Resend HTTP API (Nunca es bloqueado por Render ni requiere puertos SMTP)
  if (resendApiKey) {
    try {
      console.log(`[Mailer] Intentando envío directo vía Resend HTTP API a ${to}...`);
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'JINStock <onboarding@resend.dev>',
          to: [to],
          subject: 'Código de Confirmación - JINStock',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #4A148C; margin: 0;">JINStock - Librería y Papelería</h2>
                <p style="color: #6b7280; font-size: 14px;">Verificación de cuenta segura</p>
              </div>
              <p>Hola,</p>
              <p>Tu código de confirmación es:</p>
              <div style="background-color: #f3e8ff; border: 2px dashed #9333ea; padding: 18px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; color: #581c87; margin: 24px 0;">
                ${code}
              </div>
              <p style="font-size: 13px; color: #4b5563;">Ingresa este código en la aplicación para activar tu cuenta. Válido por 15 minutos.</p>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 12px;">Equipo JINStock Nicaragua</p>
            </div>
          `,
        }),
      });

      if (resendResponse.ok) {
        console.log(`[Mailer] ✅ Correo entregado exitosamente mediante Resend HTTP a ${to}`);
        return { success: true };
      } else {
        const errorBody = await resendResponse.text().catch(() => '');
        console.warn(`[Mailer] Resend API respondió con error (${resendResponse.status}): ${errorBody}`);
      }
    } catch (err: any) {
      console.warn(`[Mailer] Error contactando Resend API: ${err.message}`);
    }
  }

  // 2. Fallback: SMTP clásico (Nodemailer)
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
    
    // Timeout estricto de 3 segundos para el envío de correo. Si Render bloquea el puerto saliente,
    // abortamos en 3s en vez de colgar la petición HTTP y causar que el frontend aborte a los 8s.
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise<{ success: false; error: string }>((_, reject) =>
      setTimeout(() => reject(new Error('SMTP_SEND_TIMEOUT')), 3000)
    );

    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`[Mailer] Correo de verificación enviado exitosamente a ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Mailer] Error enviando correo a ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};
