
import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { pool } from '../db';
import {
  generateCode,
  saveVerificationCode,
  checkVerificationCode
} from '../services/verification';

async function main() {
  const phone = '+7999' +
    randomInt(0, 10000000).toString().padStart(7, '0');

  const code = generateCode();
  const wrongCode = code === '999999' ? '888888' : '999999';

  try {
    await saveVerificationCode(phone, code);

    // Пять неправильных попыток
    for (let i = 1; i <= 5; i++) {
      const result = await checkVerificationCode(phone, wrongCode);
      console.log(`Попытка ${i}:`, result);
    }

    const afterLimit = await checkVerificationCode(phone, code);
    console.log('Правильный код после 5 ошибок:', afterLimit);

    // Новый код, который искусственно делаем просроченным
    const expiredCode = generateCode();
    await saveVerificationCode(phone, expiredCode);

    await pool.query(
      `UPDATE public.phone_verifications
       SET expires_at = NOW() - INTERVAL '1 minute'
       WHERE id = (
         SELECT id
         FROM public.phone_verifications
         WHERE phone = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 1
       )`,
      [phone]
    );

    const expired = await checkVerificationCode(phone, expiredCode);
    console.log('Просроченный код:', expired);

    if (afterLimit !== false || expired !== false) {
      throw new Error('Проверка ограничений не пройдена');
    }

    console.log('Все ограничения работают!');
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error('Ошибка теста:', error);
  process.exitCode = 1;
});
