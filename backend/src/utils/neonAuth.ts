import { sendConfirmationEmail } from './mailer';

export interface SendOtpResult {
  success: boolean;
  message: string;
  provider: 'neon-auth' | 'smtp' | 'dev-mock';
  code?: string;
}

/**
 * Servicio de verificación Neon Auth.
 * Proporciona despacho de códigos OTP mediante la infraestructura de Neon Auth
 * o fallback automático a SMTP / base de datos Neon.
 */
export async function sendVerificationOtp(email: string, code: string): Promise<SendOtpResult> {
  const cleanEmail = email.trim().toLowerCase();
  const neonAuthUrl = process.env.NEON_AUTH_URL;

  // 1. Si Neon Auth está configurado en las variables de entorno, despachar mediante Neon Auth
  if (neonAuthUrl) {
    try {
      console.log(`[Neon Auth] Solicitando envío de OTP a ${cleanEmail} vía ${neonAuthUrl}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${neonAuthUrl.replace(/\/$/, '')}/email-otp/send-verification-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NEON_AUTH_API_KEY ? { Authorization: `Bearer ${process.env.NEON_AUTH_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          email: cleanEmail,
          type: 'email-verification',
          otp: code,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        console.log(`[Neon Auth] Código OTP despachado exitosamente por Neon Auth a ${cleanEmail}`);
        return {
          success: true,
          message: 'Código de verificación enviado mediante Neon Auth a su correo electrónico.',
          provider: 'neon-auth',
        };
      } else {
        const errorText = await res.text().catch(() => '');
        console.warn(`[Neon Auth] Advertencia del endpoint Neon Auth (${res.status}): ${errorText}. Continuando con fallback SMTP.`);
      }
    } catch (err: any) {
      console.warn(`[Neon Auth] Excepción al contactar Neon Auth: ${err.message}. Continuando con fallback SMTP.`);
    }
  }

  // 2. Fallback a SMTP (Nodemailer configurado)
  const mailResult = await sendConfirmationEmail(cleanEmail, code);
  if (mailResult.success) {
    return {
      success: true,
      message: 'Código de verificación enviado a su correo electrónico.',
      provider: 'smtp',
    };
  }

  // 3. Si SMTP falló o no está configurado, en entorno dev/pruebas asegurar que no se bloquee el usuario
  const isDevOrTest = process.env.NODE_ENV !== 'production';
  if (isDevOrTest) {
    console.log(`[Neon Auth / Dev Fallback] Código generado para ${cleanEmail}: ${code}`);
    return {
      success: true,
      message: `Código de verificación generado para pruebas: ${code}`,
      provider: 'dev-mock',
      code,
    };
  }

  return {
    success: false,
    message: mailResult.error || 'No fue posible enviar el correo de confirmación. Verifique la configuración de correo.',
    provider: 'smtp',
  };
}

