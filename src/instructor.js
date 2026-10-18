import { renderHeader, initHeader } from './components/header.js';
import './style.css';
import { instructors } from './data.js';

const app = document.querySelector('#app');

const escapeHTML = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

const money = (value) =>
  new Intl.NumberFormat('ru-RU').format(value);

const params = new URLSearchParams(window.location.search);
const id = Number(params.get('id'));

const instructor = instructors.find((item) => item.id === id);

function renderNotFound() {
  app.innerHTML = `
    <div class="container profile-not-found">
      <h1>Инструктор не найден</h1>
      <p>Возможно, ссылка неверная или анкета недоступна.</p>
      <a class="btn btn-primary" href="./catalog.html">
        Вернуться в каталог
      </a>
    </div>
  `;
}

function renderProfile(p) {
  document.title = `${p.name} — автоинструктор | АвтоГид`;

  const name = escapeHTML(p.name);
  const city = escapeHTML(p.city);
  const district = escapeHTML(p.district);
  const bio = escapeHTML(p.bio);

  app.innerHTML = `
    <div class="demo">
      Демонстрационная версия — данные инструктора вымышленные
    </div>

    <header class="site-header">
${renderHeader('instructor')}
    </header>

    <main class="container profile-page">

      <div class="profile-breadcrumbs">
        <a href="./index.html">Главная</a>
        <span> / </span>
        <a href="./catalog.html">Инструкторы</a>
        <span> / ${name}</span>
      </div>

      <div class="profile-layout">

        <div class="profile-content">

          <section class="profile-block profile-intro">
            <div class="profile-avatar"
                 style="--avatar-bg:${p.color}">
              ${escapeHTML(p.initials)}
            </div>

            <div>
              <span class="section-kicker">
                ПРОФИЛЬ АВТОИНСТРУКТОРА
              </span>

              <h1>${name}</h1>

              <p class="profile-location">
                ${city} · ${district}
              </p>

              <div class="profile-rating">
                ★ ${p.rating.toFixed(1)}
                <span>· ${p.reviews} демонстрационных отзывов</span>
              </div>

              <p class="profile-status">
                Статус проверки документов — демонстрационный
              </p>
            </div>
          </section>

          <section class="profile-block">
            <h2>Об инструкторе</h2>
            <p>${bio}</p>
          </section>

          <section class="profile-block">
            <h2>Условия обучения</h2>

            <div class="profile-details">
              <div>
                <span>Категория</span>
                <strong>${escapeHTML(p.category)}</strong>
              </div>

              <div>
                <span>Коробка передач</span>
                <strong>${escapeHTML(p.gearbox)}</strong>
              </div>

              <div>
                <span>Стаж инструктора</span>
                <strong>${p.experience} лет</strong>
              </div>

              <div>
                <span>Стоимость</span>
                <strong>от ${money(p.price)} ₽</strong>
              </div>
            </div>
          </section>

          <section class="profile-block">
            <h2>Районы обучения</h2>
            <p>${district}</p>
          </section>

          <section class="profile-block">
            <h2>Учебный автомобиль</h2>
            <p>
              Информация об автомобиле появится после
              заполнения анкеты инструктором.
            </p>
          </section>

          <section class="profile-block">
            <h2>Расписание занятий</h2>
            <p>
              После подключения базы данных здесь будет
              календарь со свободными часами инструктора.
            </p>
            <div class="profile-placeholder">
              Расписание пока недоступно
            </div>
          </section>

          <section class="profile-block">
            <h2>Отзывы курсантов</h2>
            <p>
              Настоящие отзывы появятся после запуска
              регистрации и системы модерации.
            </p>
            <div class="profile-placeholder">
              Подтверждённых отзывов пока нет
            </div>
          </section>

        </div>

        <aside class="profile-sidebar">
          <div class="profile-booking">
            <span>Стоимость занятия</span>

            <div class="profile-price">
              от ${money(p.price)} ₽
            </div>

            <p>
              Категория ${escapeHTML(p.category)} ·
              ${escapeHTML(p.gearbox)}
            </p>

            <button id="contact-instructor"
                    class="btn btn-primary profile-contact">
              Связаться с инструктором
            </button>

            <small>
              Связь станет доступна после подключения
              настоящих профилей.
            </small>
          </div>
        </aside>

      </div>
    </main>

    <footer>
      <div class="container footer-main">
        <a href="./index.html" class="logo">
          <span class="logo-icon">А</span>
          <span>Авто<span class="logo-highlight">Гид</span></span>
        </a>
        <p>Сервис поиска автоинструкторов по России</p>
      </div>
    </footer>

    <dialog id="contact-dialog" class="dialog small-dialog">
      <div class="dialog-inner">
        <button class="dialog-close"
                id="close-contact"
                aria-label="Закрыть">✕</button>

        <h2>Функция в разработке</h2>

        <p>
          Сейчас это демонстрационный профиль.
          Контакт с реальным инструктором появится
          после регистрации и проверки анкет.
        </p>

        <button class="btn btn-primary" id="confirm-contact">
          Понятно
        </button>
      </div>
    </dialog>
  `;

  const dialog = document.querySelector('#contact-dialog');

  document.querySelector('#contact-instructor').onclick =
    () => dialog.showModal();

  document.querySelector('#close-contact').onclick =
    () => dialog.close();

  document.querySelector('#confirm-contact').onclick =
    () => dialog.close();

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

if (instructor) {
  renderProfile(instructor);
} else {
  renderNotFound();
}
