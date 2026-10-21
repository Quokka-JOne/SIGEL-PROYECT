import nodemailer from 'nodemailer';

// Create the transporter lazily so environment variables are guaranteed to be loaded
let _transporter: any = null;

function getTransporter() {
  if (!_transporter) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    console.log(`📧 Inicializando SMTP transporter. SMTP_USER configurado: ${!!user}, SMTP_PASS configurado: ${!!pass}`);

    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: user || '', pass: pass || '' },
    });
  }
  return _transporter;
}

export const sendConfirmationEmail = async (to: string, code: string) => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn(`⚠️ SMTP no configurado (SMTP_USER=${!!smtpUser}, SMTP_PASS=${!!smtpPass}). Código para ${to}: ${code}`);
    return;
  }

  const mailOptions = {
    from: `"JINStock App" <${smtpUser}>`,
    to,
    subject: 'Código de Confirmación - JINStock',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4A148C;">Verifica tu correo electrónico</h2>
        <p>Hola,</p>
        <p>Gracias por registrarte en JINStock. Tu código de verificación es:</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0;">
          ${code}
        </div>
        <p>Ingresa este código en la aplicación para activar tu cuenta.</p>
        <p>Si no solicitaste este registro, ignora este correo.</p>
        <p>Saludos,<br/>Equipo JINStock</p>
      </div>
    `,
  };

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Correo de confirmación enviado a ${to}. MessageId: ${info.messageId}`);
  } catch (error: any) {
    console.error(`❌ Error enviando correo a ${to}:`, error.message || error);
    console.error('Detalles completos del error SMTP:', JSON.stringify(error, null, 2));
  }
};
