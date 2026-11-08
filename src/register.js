
const registrationForm = document.querySelector('#registration-form');
const codeForm = document.querySelector('#code-form');
const heading = document.querySelector('#registration-heading');
const successScreen = document.querySelector('#success-screen');
const emailInfo = document.querySelector('#email-info');
const codeInput = document.querySelector('#code');
const backButton = document.querySelector('#back-button');
const result = document.querySelector('#result');
const emailNotice = document.querySelector('#email-notice');

let registrationData = null;

function showMessage(message, isError = false) {
  result.textContent = message;
  result.className = `message ${isError ? 'error' : 'success'}`;
}

async function apiRequest(path, data) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error || 'Ошибка сервера');
  }

  return body;
}

// Первый этап: сохраняем данные формы в памяти
// и отправляем код на электронную почту
registrationForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!registrationForm.reportValidity()) {
    return;
  }

  const button = registrationForm.querySelector(
    'button[type="submit"]'
  );

  const data = new FormData(registrationForm);

  registrationData = {
    lastName: String(data.get('lastName') || '').trim(),
    firstName: String(data.get('firstName') || '').trim(),
    middleName: String(data.get('middleName') || '').trim(),
    birthDate: String(data.get('birthDate') || '').trim(),
    email: String(data.get('email') || '').trim().toLowerCase()
  };

  button.disabled = true;
  showMessage('Отправляем письмо с кодом...');

  try {
    await apiRequest('/api/auth/request-email-code', {
      email: registrationData.email
    });

    registrationForm.hidden = true;
    codeForm.hidden = false;

    emailInfo.textContent =
      `Мы отправили код подтверждения на ${registrationData.email}. ` +
      'Откройте письмо и введите шестизначный код.';

    showMessage('Письмо отправлено! Код действует 5 минут.');
    codeInput.focus();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
});

// Второй этап: проверяем код и записываем
// пользователя с анкетой в PostgreSQL
codeForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!registrationData) {
    showMessage('Сначала заполните анкету.', true);
    return;
  }

  const code = codeInput.value.trim();

  if (!/^\d{6}$/.test(code)) {
    showMessage('Введите шестизначный код.', true);
    return;
  }

  const button = codeForm.querySelector(
    'button[type="submit"]'
  );

  button.disabled = true;
  showMessage('Создаём ваш аккаунт...');

  try {
    const response = await apiRequest(
      '/api/auth/register-student',
      {
        ...registrationData,
        code
      }
    );

    if (response.success) {
      registrationForm.hidden = true;
      codeForm.hidden = true;
      heading.hidden = true;
      emailNotice.hidden = true;
      successScreen.hidden = false;

      showMessage('');
    }
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
});

// Возвращаемся к анкете без потери данных
backButton.addEventListener('click', () => {
  codeForm.hidden = true;
  registrationForm.hidden = false;
  codeInput.value = '';
  showMessage('');
});

// Не разрешаем выбрать будущую дату рождения
const birthDateInput = document.querySelector('#birthDate');

const now = new Date();
const localToday = new Date(
  now.getTime() - now.getTimezoneOffset() * 60000
).toISOString().slice(0, 10);

birthDateInput.max = localToday;
