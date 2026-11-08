
import 'dotenv/config';
import { pool } from '../db';
import {
  generateCode,
  saveVerificationCode,
  checkVerificationCode
} from '../services/verification';

async function main() {
  // Уникальный тестовый номер для каждого запуска
  const phone = '+7999' +
    Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, '0');

  try {
    const code = generateCode();

    await saveVerificationCode(phone, code);

    const first = await checkVerificationCode(phone, code);
    const second = await checkVerificationCode(phone, code);

    console.log('Правильный код:', first);
    console.log('Повторное использование:', second);

    const anotherCode = generateCode();
    await saveVerificationCode(phone, anotherCode);

    const wrongCode =
      anotherCode === '999999' ? '888888' : '999999';

    const wrong = await checkVerificationCode(
      phone,
      wrongCode
    );

    console.log('Неправильный код:', wrong);

    const result = await pool.query(
      `SELECT attempts
       FROM public.phone_verifications
       WHERE phone = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [phone]
    );

    console.log(
      'Неудачных попыток:',
      result.rows[0]?.attempts
    );

    if (
      first !== true ||
      second !== false ||
      wrong !== false ||
      result.rows[0]?.attempts !== 1
    ) {
      throw new Error('Тест проверки кода не пройден');
    }

    console.log('Все проверки пройдены!');
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error('Ошибка теста:', error);
  process.exitCode = 1;
});
