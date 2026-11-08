
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { pool } from '../db';
import { checkEmailCode } from '../services/emailVerification';

async function main() {
  const email = process.env.TEST_EMAIL;

  if (!email) {
    throw new Error('TEST_EMAIL не указан в backend/.env');
  }

  const rl = createInterface({
    input: stdin,
    output: stdout
  });

  try {
    console.log('Проверяем код для:', email);

    const code = await rl.question(
      'Введи шестизначный код из письма: '
    );

    const valid = await checkEmailCode(
      email,
      code.trim()
    );

    if (valid) {
      console.log('✅ Email успешно подтверждён!');
    } else {
      console.log('❌ Код неверный, просрочен или уже использован.');
    }
  } finally {
    rl.close();
    await pool.end();
  }
}

main().catch(error => {
  console.error('Ошибка проверки:', error.message);
  process.exitCode = 1;
});
