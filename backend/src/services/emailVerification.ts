
import 'dotenv/config';
import { pool } from '../db';
import {
  generateCode,
  hashCode,
  verifyCode,
  MAX_CODE_ATTEMPTS
} from './verification';

// Приводим адрес к единому формату
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Проверка формата email
export function isValidEmail(email: string): boolean {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

// Получаем секретный ключ
function getSecret(): string {
  const secret = process.env.SMS_CODE_SECRET;

  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error('SMS_CODE_SECRET не настроен');
  }

  return secret;
}

// Создаём код и сохраняем его хеш в PostgreSQL
export async function createEmailCode(
  email: string
): Promise<string | null> {
  const normalized = normalizeEmail(email);

  if (!isValidEmail(normalized)) {
    throw new Error('Некорректный email');
  }

  const secret = getSecret();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Защита от одновременных запросов на один email
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['email:' + normalized]
    );

    // Один новый код не чаще раза в 60 секунд
    const recent = await client.query(
      `SELECT id
       FROM public.email_verifications
       WHERE email = $1
         AND created_at > NOW() - INTERVAL '60 seconds'
       LIMIT 1`,
      [normalized]
    );

    if (recent.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }

    const code = generateCode();

    // Отдельный контекст хеширования для email
    const codeHash = hashCode(
      'email:' + normalized,
      code,
      secret
    );

    await client.query(
      `INSERT INTO public.email_verifications
         (email, code_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
      [normalized, codeHash]
    );

    await client.query('COMMIT');

    // Код нужен для отправки письма, а не для хранения
    return code;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Проверяем код, который пользователь получил по почте
export async function checkEmailCode(
  email: string,
  code: string
): Promise<boolean> {
  const normalized = normalizeEmail(email);

  if (!isValidEmail(normalized) || !/^\d{6}$/.test(code)) {
    return false;
  }

  const secret = getSecret();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id, code_hash, expires_at,
              attempts, consumed_at
       FROM public.email_verifications
       WHERE email = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1
       FOR UPDATE`,
      [normalized]
    );

    const record = result.rows[0];

    if (
      !record ||
      record.consumed_at !== null ||
      new Date(record.expires_at).getTime() <= Date.now() ||
      record.attempts >= MAX_CODE_ATTEMPTS
    ) {
      await client.query('ROLLBACK');
      return false;
    }

    const valid = verifyCode(
      'email:' + normalized,
      code,
      record.code_hash,
      secret
    );

    if (!valid) {
      await client.query(
        `UPDATE public.email_verifications
         SET attempts = attempts + 1
         WHERE id = $1`,
        [record.id]
      );

      await client.query('COMMIT');
      return false;
    }

    await client.query(
      `UPDATE public.email_verifications
       SET consumed_at = NOW()
       WHERE id = $1`,
      [record.id]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
