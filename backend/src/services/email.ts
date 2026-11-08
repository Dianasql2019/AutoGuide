
import 'dotenv/config';
import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !user ||
    !password
  ) {
    throw new Error('SMTP не настроен в backend/.env');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass: password
    }
  });
}

export async function sendVerificationEmail(
  email: string,
  code: string
): Promise<void> {
  if (!/^\d{6}$/.test(code)) {
    throw new Error('Некорректный код подтверждения');
  }

  const sender = process.env.SMTP_USER;

  await getTransporter().sendMail({
    from: `"АвтоГид" <${sender}>`,
    to: email,
    subject: 'АвтоГид — код подтверждения',
    text:
      `Ваш код подтверждения: ${code}\n\n` +
      'Код действует 5 минут.\n' +
      'Если вы не запрашивали код, проигнорируйте письмо.'
  });
}
