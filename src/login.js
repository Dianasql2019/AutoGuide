const API_BASE =
  window.location.hostname === 'dianasql2019.github.io'
    ? 'https://autoguide-api.onrender.com'
    : '';
const emailForm = document.querySelector('#email-form');
const codeForm = document.querySelector('#code-form');
const emailInput = document.querySelector('#email');
const codeInput = document.querySelector('#code');
const emailHint = document.querySelector('#email-hint');
const message = document.querySelector('#message');
const backButton = document.querySelector('#back');
const resendButton = document.querySelector('#resend-code');

let currentEmail = '';
let nextRequestAt = 0;
let cooldownTimer = null;

function showMessage(text, error = false) {
  message.textContent = text;
  message.className = `message ${error ? 'error' : 'success'}`;
}

async function apiRequest(path, data) {
const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Ошибка сервера');
  }

  return result;
}

function updateResendButton() {
  const remaining = Math.ceil(
    (nextRequestAt - Date.now()) / 1000
  );

  if (remaining > 0) {
    resendButton.disabled = true;
    resendButton.textContent =
      `Отправить повторно через ${remaining} сек.`;
  } else {
    resendButton.disabled = false;
    resendButton.textContent = 'Отправить код повторно';

    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
}

function startCooldown() {
  nextRequestAt = Date.now() + 60000;

  clearInterval(cooldownTimer);
  updateResendButton();

  cooldownTimer = setInterval(
    updateResendButton,
    1000
  );
}

async function requestCode() {
  await apiRequest('/api/auth/request-login-code', {
    email: currentEmail
  });

  emailForm.hidden = true;
  codeForm.hidden = false;

  emailHint.textContent =
    `Отправили код на ${currentEmail}. ` +
    'Он действует 5 минут.';

  codeInput.value = '';
  codeInput.focus();

  startCooldown();
  showMessage('Проверьте входящие и папку «Спам».');
}

emailForm.addEventListener('submit', async event => {
  event.preventDefault();

  currentEmail = emailInput.value.trim().toLowerCase();

  const button = emailForm.querySelector('button');
  button.disabled = true;

  try {
    await requestCode();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
});

codeForm.addEventListener('submit', async event => {
  event.preventDefault();

  const code = codeInput.value.trim();

  if (!/^\d{6}$/.test(code)) {
    showMessage('Введите шестизначный код.', true);
    return;
  }

  const button = codeForm.querySelector(
    'button[type="submit"]'
  );

  button.disabled = true;

  try {
    await apiRequest('/api/auth/login', {
      email: currentEmail,
      code
    });

    // Позже здесь будет страница личного кабинета
    showMessage('Вход выполнен успешно!');
    codeForm.hidden = true;
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
});

resendButton.addEventListener('click', async () => {
  resendButton.disabled = true;

  try {
    await requestCode();
  } catch (error) {
    showMessage(error.message, true);
    updateResendButton();
  }
});

backButton.addEventListener('click', () => {
  codeForm.hidden = true;
  emailForm.hidden = false;
  codeInput.value = '';
  showMessage('');
});
