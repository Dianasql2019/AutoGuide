
import 'dotenv/config';
import { pool } from '../db';
import {
  createEmailCode,
  checkEmailCode
} from '../services/emailVerification';
import { sendVerificationEmail } from '../services/email';

async function main() {
  const email = process.env.TEST_EMAIL;

  if (!email) {
    throw new Error('TEST_EMAIL не указан в backend/.env');
  }

  try {
    const code = await createEmailCode(email);

    if (code === null) {
      console.log('Повторный запрос пока запрещён. Попробуй позже.');
      return;
    }

    await sendVerificationEmail(email, code);

    console.log('Письмо отправлено!');
    console.log('Хеш кода сохранён в PostgreSQL.');
    console.log('Получатель:', email);
    console.log('Код действует 5 минут.');

    // Пока не проверяем код автоматически:
    // его нужно будет ввести из полученного письма.
    void checkEmailCode;
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error('Ошибка:', error.message);
  process.exitCode = 1;
});
