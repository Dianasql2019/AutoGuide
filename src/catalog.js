import { renderHeader, initHeader } from './components/header.js';
import './style.css';
import { cities, instructors } from './data.js';


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

const state = {
  city: localStorage.getItem('ag-city') || 'Екатеринбург',
  category: '',
  gearbox: '',
  sort: 'recommended',
  maxPrice: '',
  query: ''
};

if (!cities.includes(state.city)) {
  state.city = 'Екатеринбург';
}

const urlParams = new URLSearchParams(window.location.search);

const requestedCity = urlParams.get('city');
const requestedCategory = urlParams.get('category');
const requestedGearbox = urlParams.get('gearbox');

if (requestedCity && cities.includes(requestedCity)) {
  state.city = requestedCity;
}

if (['A', 'B'].includes(requestedCategory)) {
  state.category = requestedCategory;
}

if (['МКПП', 'АКПП'].includes(requestedGearbox)) {
  state.gearbox = requestedGearbox;
}

app.innerHTML = `
  <div class="demo">
    Демонстрационная версия — данные инструкторов вымышленные
  </div>

  <header class="site-header">
${renderHeader('catalog')}
  </header>

  <main class="section">
    <div class="container">

      <div class="section-heading">
        <div>
          <span class="section-kicker">АВТОГИД</span>
          <h1>Каталог автоинструкторов</h1>
          <p>Найдите специалиста для обучения вождению</p>
        </div>
      </div>

      <div class="catalog-layout">

        <aside class="filters">
          <div class="filter-header">
            <strong>Фильтры поиска</strong>
            <button id="reset" class="link-btn">Сбросить</button>
          </div>

          <label class="filter-group">
            <span>Город</span>
            <select id="city"></select>
          </label>

          <label class="filter-group">
            <span>Имя инструктора</span>
            <input id="search" type="search"
                   placeholder="Поиск по имени">
          </label>

          <label class="filter-group">
            <span>Категория</span>
            <select id="category">
              <option value="">Все категории</option>
              <option value="A">Категория A</option>
              <option value="B">Категория B</option>
            </select>
          </label>

          <label class="filter-group">
            <span>Коробка передач</span>
            <select id="gearbox">
              <option value="">Любая КПП</option>
              <option value="МКПП">Механика</option>
              <option value="АКПП">Автомат</option>
            </select>
          </label>

          <label class="filter-group">
            <span>Стоимость занятия</span>
            <select id="price">
              <option value="">Любая цена</option>
              <option value="1500">До 1 500 ₽</option>
              <option value="1800">До 1 800 ₽</option>
              <option value="2000">До 2 000 ₽</option>
            </select>
          </label>

        </aside>

        <section class="catalog-main">
          <div class="results-toolbar">
            <strong id="count"></strong>

            <label class="sort-select">
              Сортировка:
              <select id="sort">
                <option value="recommended">По умолчанию</option>
                <option value="rating">По рейтингу</option>
                <option value="price">Сначала дешевле</option>
                <option value="experience">По стажу</option>
              </select>
            </label>
          </div>

          <div id="cards" class="cards"></div>
        </section>

      </div>
    </div>
  </main>

  <dialog id="catalog-profile" class="dialog">
    <div id="catalog-profile-content"></div>
  </dialog>
`;

const $ = (selector) => document.querySelector(selector);
initHeader();

$('#city').innerHTML = cities
  .map(city => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`)
  .join('');

$('#city').value = state.city;
$('#category').value = state.category;
$('#gearbox').value = state.gearbox;
function getFiltered() {
  const result = instructors.filter((p) =>
    p.city === state.city &&
    (!state.category || p.category === state.category) &&
    (!state.gearbox || p.gearbox === state.gearbox) &&
    (!state.maxPrice || p.price <= Number(state.maxPrice)) &&
    (!state.query || p.name.toLowerCase().includes(state.query.toLowerCase()))
  );

  if (state.sort === 'rating') {
    result.sort((a, b) => b.rating - a.rating);
  }

  if (state.sort === 'price') {
    result.sort((a, b) => a.price - b.price);
  }

  if (state.sort === 'experience') {
    result.sort((a, b) => b.experience - a.experience);
  }

  return result;
}

function renderCards() {
  const result = getFiltered();

  $('#count').textContent = `Найдено: ${result.length}`;

  if (!result.length) {
    $('#cards').innerHTML = `
      <div class="empty-state">
        <h3>Инструкторы не найдены</h3>
        <p>Попробуйте изменить параметры поиска.</p>
      </div>
    `;
    return;
  }

  $('#cards').innerHTML = result.map(p => `
    <article class="instructor-card">

      <div class="card-top">
        <div class="avatar" style="--avatar-bg:${p.color}">
          ${escapeHTML(p.initials)}
        </div>

        <div class="card-name">
          <h3>${escapeHTML(p.name)}</h3>
          <p>${escapeHTML(p.city)}, ${escapeHTML(p.district)}</p>

          <div class="card-rating">
            ⭐ <b>${p.rating.toFixed(1)}</b>
            <span>· ${p.reviews} отзывов</span>
          </div>
        </div>
      </div>

      <div class="card-tags">
        <span>Категория ${escapeHTML(p.category)}</span>
        <span>${escapeHTML(p.gearbox)}</span>
        <span>Стаж ${p.experience} лет</span>
      </div>

      <div class="card-footer">
        <div>
          <small>Стоимость занятия</small>
          <strong>от ${money(p.price)} ₽</strong>
        </div>

        <button class="card-detail" data-id="${p.id}">
          Подробнее →
        </button>
      </div>

    </article>
  `).join('');
}

function openProfile(id) {
  const p = instructors.find(item => item.id === id);
  if (!p) return;

  $('#catalog-profile-content').innerHTML = `
    <div class="dialog-inner">
      <button class="dialog-close" id="catalog-close"
              aria-label="Закрыть">✕</button>

      <span class="section-kicker">Демо-профиль</span>
      <h2>${escapeHTML(p.name)}</h2>

      <p>${escapeHTML(p.city)}, ${escapeHTML(p.district)}</p>

      <div class="modal-facts">
        <div><small>Категория</small><strong>${escapeHTML(p.category)}</strong></div>
        <div><small>КПП</small><strong>${escapeHTML(p.gearbox)}</strong></div>
        <div><small>Стаж</small><strong>${p.experience} лет</strong></div>
        <div><small>Цена</small><strong>${money(p.price)} ₽</strong></div>
      </div>

      <p>${escapeHTML(p.bio)}</p>
      <p class="modal-muted">
        Анкета демонстрационная. Отдельную страницу профиля
        добавим следующим этапом.
      </p>
    </div>
  `;

  $('#catalog-close').onclick = () => $('#catalog-profile').close();
  $('#catalog-profile').showModal();
}

$('#cards').addEventListener('click', (event) => {
  const button = event.target.closest('[data-id]');
  if (button) {
  const id = Number(button.dataset.id);
  window.location.href = `./instructor.html?id=${id}`;
}
});

$('#catalog-profile').addEventListener('click', (event) => {
  if (event.target === $('#catalog-profile')) {
    $('#catalog-profile').close();
  }
});

$('#city').onchange = (event) => {
  state.city = event.target.value;
  localStorage.setItem('ag-city', state.city);
  renderCards();
};

$('#category').onchange = (event) => {
  state.category = event.target.value;
  renderCards();
};

$('#gearbox').onchange = (event) => {
  state.gearbox = event.target.value;
  renderCards();
};

$('#price').onchange = (event) => {
  state.maxPrice = event.target.value;
  renderCards();
};

$('#search').oninput = (event) => {
  state.query = event.target.value.trim();
  renderCards();
};

$('#sort').onchange = (event) => {
  state.sort = event.target.value;
  renderCards();
};

$('#reset').onclick = () => {
  state.category = '';
  state.gearbox = '';
  state.maxPrice = '';
  state.query = '';
  state.sort = 'recommended';

  $('#category').value = '';
  $('#gearbox').value = '';
  $('#price').value = '';
  $('#search').value = '';
  $('#sort').value = 'recommended';

  renderCards();
};

renderCards();
