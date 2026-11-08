
import { pool } from '../db';
import {
  randomInt,
  createHmac,
  timingSafeEqual
} from 'node:crypto';


// Код действует 5 минут
export const CODE_LIFETIME_MINUTES = 5;

// Максимум 5 попыток ввода
export const MAX_CODE_ATTEMPTS = 5;

// Генерация случайного шестизначного кода
export function generateCode(): string {
  return randomInt(0, 1000000)
    .toString()
    .padStart(6, '0');
}

// Создание защищённого хеша кода
export function hashCode(
  phone: string,
  code: string,
  secret: string
): string {
  return createHmac('sha256', secret)
    .update(`${phone}:${code}`)
    .digest('hex');
}

// Проверка введённого пользователем кода
export function verifyCode(
  phone: string,
  code: string,
  storedHash: string,
  secret: string
): boolean {
  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  if (!/^[a-f0-9]{64}$/i.test(storedHash)) {
    return false;
  }

  const actualHash = Buffer.from(
    hashCode(phone, code, secret),
    'hex'
  );

  const expectedHash = Buffer.from(
    storedHash,
    'hex'
  );

  return timingSafeEqual(actualHash, expectedHash);
}


export async function saveVerificationCode(
  phone: string,
  code: string
): Promise<boolean> {
  const secret = process.env.SMS_CODE_SECRET;

  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error('SMS_CODE_SECRET не настроен');
  }

  if (!/^\+7\d{10}$/.test(phone) || !/^\d{6}$/.test(code)) {
    throw new Error('Некорректный телефон или код');
  }

  const codeHash = hashCode(phone, code, secret);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Не допускаем одновременную выдачу кодов на один номер
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      [phone]
    );

    const recent = await client.query(
      `SELECT id
       FROM public.phone_verifications
       WHERE phone = $1
         AND created_at > NOW() - INTERVAL '60 seconds'
       LIMIT 1`,
      [phone]
    );

    if (recent.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query(
      `INSERT INTO public.phone_verifications
         (phone, code_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
      [phone, codeHash]
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

export async function checkVerificationCode(
  phone: string,
  code: string
): Promise<boolean> {
  const secret = process.env.SMS_CODE_SECRET;

  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error('SMS_CODE_SECRET не настроен');
  }

  if (!/^\+7\d{10}$/.test(phone) || !/^\d{6}$/.test(code)) {
    return false;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT id, code_hash, expires_at, attempts, consumed_at
       FROM public.phone_verifications
       WHERE phone = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1
       FOR UPDATE`,
      [phone]
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

    const isValid = verifyCode(
      phone,
      code,
      record.code_hash,
      secret
    );

    if (!isValid) {
      await client.query(
        `UPDATE public.phone_verifications
         SET attempts = attempts + 1
         WHERE id = $1`,
        [record.id]
      );

      await client.query('COMMIT');
      return false;
    }

    await client.query(
      `UPDATE public.phone_verifications
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
