
import 'dotenv/config';
import { generateCode } from '../services/verification';
import { sendVerificationEmail } from '../services/email';

async function main() {
  const recipient = process.env.TEST_EMAIL;

  if (!recipient) {
    throw new Error('Укажи TEST_EMAIL в backend/.env');
  }

  const code = generateCode();

  await sendVerificationEmail(recipient, code);

  console.log('Письмо передано Mail.ru для доставки!');
  console.log('Получатель:', recipient);
}

main().catch((error) => {
  console.error('Ошибка отправки:', error.message);
  process.exitCode = 1;
});
