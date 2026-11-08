
import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { pool } from '../db';
import {
  generateCode,
  saveVerificationCode
} from '../services/verification';

async function main() {
  const phone = '+7999' +
    randomInt(0, 10000000).toString().padStart(7, '0');

  try {
    const first = await saveVerificationCode(
      phone,
      generateCode()
    );

    const second = await saveVerificationCode(
      phone,
      generateCode()
    );

    console.log('Первый запрос:', first);
    console.log('Повторный запрос:', second);

    if (first !== true || second !== false) {
      throw new Error('Ограничение 60 секунд не работает');
    }

    console.log('Ограничение 60 секунд работает!');
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error('Ошибка теста:', error);
  process.exitCode = 1;
});
