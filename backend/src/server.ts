
import 'dotenv/config';
import express from 'express';
import { pool } from './db';
import { authRouter } from './routes/auth';
import { config } from './config';

const app = express();
const PORT = Number(process.env.PORT || 3001);

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use('/api/auth', authRouter);

// Проверка работы API
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'AutoGuide API'
  });
});

// Проверка подключения к PostgreSQL
app.get('/api/health/database', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT current_database() AS database, current_user AS db_user'
    );

    res.json({
      status: 'connected',
      ...result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка подключения к БД:', error);

    res.status(503).json({
      status: 'error',
      message: 'Не удалось подключиться к базе данных'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`АвтоГид API: http://localhost:${PORT}`);
  console.log(`SMS-провайдер: ${config.smsProvider}`);
});
