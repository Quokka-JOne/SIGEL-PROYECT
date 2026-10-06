import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'tu_correo@gmail.com',
    pass: process.env.SMTP_PASS || 'tu_app_password',
  },
});

export const sendConfirmationEmail = async (to: string, code: string) => {
  const mailOptions = {
    from: `"JINStock App" <${process.env.SMTP_USER || 'no-reply@jinstock.ni'}>`,
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
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`✉️ Correo de confirmación enviado a ${to}`);
    } else {
      console.log(`⚠️ SMTP no configurado. Código de confirmación para ${to} es: ${code}`);
    }
  } catch (error) {
    console.error('Error enviando correo:', error);
  }
};
