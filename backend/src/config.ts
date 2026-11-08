
import 'dotenv/config';

export const config = {
  isDevelopment: process.env.NODE_ENV === 'development',
  smsProvider: process.env.SMS_PROVIDER ?? 'disabled'
};

if (config.smsProvider !== 'disabled') {
  throw new Error(
    'SMS-провайдер ещё не настроен. Используйте SMS_PROVIDER=disabled'
  );
}
