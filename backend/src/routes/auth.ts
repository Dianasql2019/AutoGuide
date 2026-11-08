import { createHash, randomBytes } from 'node:crypto';
import { pool } from '../db';
import { verifyCode, MAX_CODE_ATTEMPTS } from '../services/verification';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  createEmailCode,
  isValidEmail,
  normalizeEmail
} from '../services/emailVerification';
import { sendVerificationEmail } from '../services/email';

export const authRouter = Router();

// Ограничение запросов с одного IP
const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Слишком много запросов. Попробуйте через 15 минут.'
  }
});

// Проверка российского номера телефона
function normalizePhone(value: string): string {
  return value.replace(/[\s()\-]/g, '');
}

// SMS пока отключены
authRouter.post('/request-code', requestLimiter, (req, res) => {
  const { phone } = req.body ?? {};

  if (typeof phone !== 'string') {
    res.status(400).json({
      error: 'Укажите номер телефона'
    });
    return;
  }

  const normalizedPhone = normalizePhone(phone);

  if (!/^\+7\d{10}$/.test(normalizedPhone)) {
    res.status(400).json({
      error: 'Введите российский номер в формате +79991234567'
    });
    return;
  }

  res.status(503).json({
    error: 'Отправка SMS пока не подключена'
  });
});

// Запрос кода подтверждения email
authRouter.post(
  '/request-email-code',
  requestLimiter,
  async (req, res) => {
    const { email } = req.body ?? {};

    if (typeof email !== 'string') {
      res.status(400).json({
        error: 'Укажите электронную почту'
      });
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      res.status(400).json({
        error: 'Некорректный адрес электронной почты'
      });
      return;
    }

    try {
      const code = await createEmailCode(normalizedEmail);

      if (code === null) {
        res.status(429).json({
          error: 'Повторный запрос возможен через 60 секунд'
        });
        return;
      }

      await sendVerificationEmail(normalizedEmail, code);

      res.json({
        success: true,
        message: 'Письмо с кодом подтверждения отправлено'
      });
    } catch (error) {
      console.error('Ошибка отправки email:', error);

      res.status(503).json({
        error: 'Не удалось отправить письмо. Попробуйте позже.'
      });
    }
  }
);


const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Слишком много попыток регистрации'
  }
});

authRouter.post(
  '/register-student',
  registerLimiter,
  async (req, res) => {
    const {
  email,
  code,
  firstName,
  lastName,
  middleName,
  birthDate
} = req.body ?? {};

    if (
      typeof email !== 'string' ||
      typeof code !== 'string'
    ) {
      res.status(400).json({
        error: 'Укажите email и код подтверждения'
      });
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    if (
      !isValidEmail(normalizedEmail) ||
      !/^\d{6}$/.test(code)
    ) {
      res.status(400).json({
        error: 'Некорректный email или код'
      });
      return;
    }


    // Проверяем данные ученика
    if (
      typeof firstName !== 'string' ||
      typeof lastName !== 'string' ||
      (middleName != null && typeof middleName !== 'string') ||
      (birthDate != null && typeof birthDate !== 'string')
    ) {
      res.status(400).json({
        error: 'Некорректные данные анкеты'
      });
      return;
    }

    const first = firstName.trim();
    const last = lastName.trim();
    const middle = middleName?.trim() || null;
    const birth = birthDate?.trim() || null;

    if (
      first.length < 2 || first.length > 100 ||
      last.length < 2 || last.length > 100 ||
      (middle !== null && middle.length > 100)
    ) {
      res.status(400).json({
        error: 'Проверьте имя, фамилию и отчество'
      });
      return;
    }

    if (birth !== null) {
      const date = new Date(birth);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== birth ||
        date.getTime() > Date.now()
      ) {
        res.status(400).json({
          error: 'Некорректная дата рождения'
        });
        return;
      }
    }

    const secret = process.env.SMS_CODE_SECRET;

    if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
      res.status(503).json({
        error: 'Сервис регистрации не настроен'
      });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Блокируем последний код на время проверки
      const result = await client.query(
        `SELECT id, code_hash, expires_at,
                attempts, consumed_at
         FROM public.email_verifications
         WHERE email = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 1
         FOR UPDATE`,
        [normalizedEmail]
      );

      const record = result.rows[0];

      if (
        !record ||
        record.consumed_at !== null ||
        new Date(record.expires_at).getTime() <= Date.now() ||
        record.attempts >= MAX_CODE_ATTEMPTS
      ) {
        await client.query('ROLLBACK');

        res.status(400).json({
          error: 'Код недействителен или просрочен'
        });
        return;
      }

      const valid = verifyCode(
        'email:' + normalizedEmail,
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

        res.status(400).json({
          error: 'Неверный код подтверждения'
        });
        return;
      }

      // Создаём ученика
      const created = await client.query(
        `INSERT INTO public.users
           (email, email_verified_at, role)
         VALUES ($1, NOW(), 'student')
         RETURNING id, email, role, created_at`,
        [normalizedEmail]
      );

      // Создаём анкету ученика
      await client.query(
        `INSERT INTO public.student_profiles
           (
             user_id,
             first_name,
             last_name,
             middle_name,
             birth_date
           )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          created.rows[0].id,
          first,
          last,
          middle,
          birth
        ]
      );

      // Помечаем код использованным
      await client.query(
        `UPDATE public.email_verifications
         SET consumed_at = NOW()
         WHERE id = $1`,
        [record.id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Аккаунт ученика создан',
        user: created.rows[0]
      });
    } catch (error: any) {
      await client.query('ROLLBACK');

      if (error.code === '23505') {
        res.status(409).json({
          error: 'Пользователь с таким email уже существует'
        });
        return;
      }

      console.error('Ошибка регистрации:', error);

      res.status(503).json({
        error: 'Не удалось завершить регистрацию'
      });
    } finally {
      client.release();
    }
  }
);

authRouter.post(
  '/request-login-code',
  requestLimiter,
  async (req, res) => {
    const { email } = req.body ?? {};

    if (typeof email !== 'string') {
      res.status(400).json({
        error: 'Укажите электронную почту'
      });
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      res.status(400).json({
        error: 'Некорректный email'
      });
      return;
    }

    try {
      const user = await pool.query(
        `SELECT id
         FROM public.users
         WHERE LOWER(email) = $1
           AND email_verified_at IS NOT NULL
           AND role = 'student'
         LIMIT 1`,
        [normalizedEmail]
      );

      if (user.rowCount) {
        const code = await createEmailCode(normalizedEmail);

        if (code !== null) {
          await sendVerificationEmail(normalizedEmail, code);
        }
      }

      res.json({
        success: true,
        message:
          'Если аккаунт существует, письмо с кодом отправлено'
      });
    } catch (error) {
      console.error('Ошибка отправки кода входа:', error);

      res.status(503).json({
        error: 'Не удалось обработать запрос'
      });
    }
  }
);


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Слишком много попыток входа. Попробуйте позже.'
  }
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, code } = req.body ?? {};

  if (typeof email !== 'string' || typeof code !== 'string') {
    res.status(400).json({
      error: 'Укажите email и код подтверждения'
    });
    return;
  }

  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail) || !/^\d{6}$/.test(code)) {
    res.status(400).json({
      error: 'Некорректный email или код'
    });
    return;
  }

  const secret = process.env.SMS_CODE_SECRET;

  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
    res.status(503).json({
      error: 'Сервис авторизации не настроен'
    });
    return;
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT id, email, role
       FROM public.users
       WHERE LOWER(email) = $1
         AND email_verified_at IS NOT NULL
       LIMIT 1`,
      [normalizedEmail]
    );

    const user = userResult.rows[0];

    if (!user) {
      await client.query('ROLLBACK');
      res.status(400).json({
        error: 'Неверный или просроченный код'
      });
      return;
    }

    const codeResult = await client.query(
      `SELECT id, code_hash, expires_at, attempts, consumed_at
       FROM public.email_verifications
       WHERE email = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    const record = codeResult.rows[0];

    if (
      !record ||
      record.consumed_at !== null ||
      new Date(record.expires_at).getTime() <= Date.now() ||
      record.attempts >= MAX_CODE_ATTEMPTS
    ) {
      await client.query('ROLLBACK');
      res.status(400).json({
        error: 'Неверный или просроченный код'
      });
      return;
    }

    const valid = verifyCode(
      'email:' + normalizedEmail,
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

      res.status(400).json({
        error: 'Неверный или просроченный код'
      });
      return;
    }

    const token = randomBytes(32).toString('hex');

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    await client.query(
      `INSERT INTO public.user_sessions
         (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, tokenHash]
    );

    await client.query(
      `UPDATE public.email_verifications
       SET consumed_at = NOW()
       WHERE id = $1`,
      [record.id]
    );

    await client.query('COMMIT');

    res.cookie('autoguide_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Ошибка отката входа:', rollbackError);
      }
    }

    console.error('Ошибка авторизации:', error);

    res.status(503).json({
      error: 'Не удалось выполнить вход'
    });
  } finally {
    client?.release();
  }
});
