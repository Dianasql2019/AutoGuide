import { renderHeader, initHeader } from './components/header.js';
import './style.css';
import {cities,instructors} from './data.js';

const icon = (name,size=20) => {
 const paths={
  steering:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M3.5 9h17M10.7 14l-2 6M13.3 14l2 6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
  pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  star:'<path d="m12 2 3.2 6.5 7.2 1-5.2 5 1.2 7.1-6.4-3.4-6.4 3.4 1.2-7.1-5.2-5 7.2-1L12 2Z"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.3 1.1-1.1a5.5 5.5 0 0 0-.1-8Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  x:'<path d="M5 5l14 14M19 5 5 19"/>',
  sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="white"/><circle cx="16" cy="17" r="2" fill="white"/>',
  book:'<path d="M4 5c3-1 5-1 8 1v15c-3-2-5-2-8-1V5Zm8 1c3-2 5-2 8-1v15c-3-1-5-1-8 1"/>',
  car:'<path d="M5 11 7 5h10l2 6M4 11h16v7H4zM7 18v2m10-2v2"/><circle cx="7.5" cy="14.5" r="1"/><circle cx="16.5" cy="14.5" r="1"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-7 8-7s8 2 8 7"/>'
 };
 return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
};
const money = n => new Intl.NumberFormat('ru-RU').format(n);
const escapeHTML = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storedCity = localStorage.getItem('ag-city');
const state={city:cities.includes(storedCity)?storedCity:'Екатеринбург', category:'',gearbox:'',maxPrice:'',query:'',onlyVerified:false, sort:'recommended',showAll:false};
let favorites = new Set(JSON.parse(localStorage.getItem('ag-favorites')||'[]'));

const app=document.querySelector('#app');
app.innerHTML=`
 <div class="demo"><span class="demo-dot"></span> Демонстрационная версия — анкеты и отзывы ниже вымышленные</div>
 <header class="site-header">${renderHeader('home')}</header>
 <main id="top">
  <section class="hero"><div class="container hero-grid"><div class="hero-content">
   <div class="eyebrow"><span class="eyebrow-mark"></span> Ваш путь к уверенному вождению</div>
   <h1>Найдите автоинструктора, <span>которому доверяете</span></h1>
   <p class="hero-lead">Сравнивайте преподавателей по опыту, цене и условиям обучения. Выбирайте подходящего инструктора в своём городе.</p>
   <form id="search-form" class="search-panel"><div class="search-label">Подберите инструктора</div><div class="search-controls"><label class="field city-field"><span>Город</span><div class="input-with-icon">${icon('pin',19)}<select id="city-select" aria-label="Город"></select></div></label><label class="field"><span>Категория</span><select id="category-select"><option value="">Любая категория</option><option value="B">Категория B</option><option value="A">Категория A</option></select></label><label class="field"><span>Коробка передач</span><select id="gearbox-select"><option value="">Любая КПП</option><option value="МКПП">Механика</option><option value="АКПП">Автомат</option></select></label><button class="btn btn-primary search-button" type="submit">${icon('search',19)} Найти</button></div></form>
   <div class="hero-assurance"><span>${icon('shield',19)} Подтверждение документов*</span><span>${icon('star',19)} Отзывы курсантов*</span><span>${icon('check',19)} Удобное сравнение</span></div>
  </div><div class="hero-art"><div class="art-circle"></div><div class="art-road"><span class="lane lane-1"></span><span class="lane lane-2"></span><span class="lane lane-3"></span></div><div class="vehicle">${icon('car',110)}</div><div class="floating-note top-note">${icon('shield',23)}<span><strong>Проверка профилей</strong><small>Предусмотрена проектом</small></span></div><div class="floating-note bottom-note">${icon('star',22)}<span><strong>Выбор по рейтингу</strong><small>и опыту инструктора</small></span></div></div>
 </div></section>
 <section class="catalog section" id="catalog"><div class="container">
  <div class="section-heading"><div><span class="section-kicker">Каталог специалистов</span><h2>Подберите своего инструктора</h2><p>Удобный поиск по основным параметрам обучения</p></div><div class="catalog-city">${icon('pin',17)} <span id="catalog-city-text"></span></div></div>
  <div class="catalog-layout"><aside class="filters" id="filters"><div class="filter-header"><strong>${icon('sliders',18)} Фильтры</strong><button id="reset-filters" class="link-btn">Сбросить</button></div><label class="filter-group"><span>Поиск по имени</span><input id="name-filter" type="search" placeholder="Имя инструктора" /></label><label class="filter-group"><span>Стоимость занятия</span><select id="price-filter"><option value="">Любая цена</option><option value="1500">До 1 500 ₽</option><option value="1800">До 1 800 ₽</option><option value="2000">До 2 000 ₽</option></select></label><label class="filter-group"><span>Коробка передач</span><select id="side-gearbox"><option value="">Любая</option><option value="МКПП">Механика</option><option value="АКПП">Автомат</option></select></label><label class="check-row"><input id="verified-filter" type="checkbox"/><span>С подтверждёнными документами</span></label><small class="filter-disclaimer">Статусы в карточках — демонстрационные.</small></aside>
  <div class="catalog-main"><div class="results-toolbar"><div><strong id="results-count"></strong><span class="muted"> в каталоге</span></div><label class="sort-select">Сортировка: <select id="sort-select"><option value="recommended">По рекомендации</option><option value="rating">По рейтингу</option><option value="price">Сначала дешевле</option><option value="experience">По стажу</option></select></label></div><div class="cards" id="cards"></div><div class="catalog-bottom"><button id="more-btn" class="btn btn-outline more-btn">Показать больше ${icon('arrow',17)}</button></div></div></div>
 </div></section>
 <section class="steps section" id="how"><div class="container"><div class="section-heading centered"><span class="section-kicker">Просто и понятно</span><h2>Как работает АвтоГид</h2><p>Три шага к занятиям по вождению</p></div><div class="steps-grid"><div class="step"><div class="step-icon">${icon('search',28)}</div><span>01</span><h3>Найдите инструктора</h3><p>Укажите город и выберите подходящие условия обучения.</p></div><div class="step"><div class="step-icon">${icon('book',28)}</div><span>02</span><h3>Сравните профили</h3><p>Изучите опыт, стоимость занятий и отзывы курсантов.</p></div><div class="step"><div class="step-icon">${icon('car',28)}</div><span>03</span><h3>Начните обучение</h3><p>Свяжитесь с выбранным специалистом и договоритесь о занятии.</p></div></div></div></section>
 <section class="instructor-cta" id="benefits"><div class="container cta-layout"><div class="cta-symbol">${icon('steering',48)}</div><div><span class="section-kicker">Для автоинструкторов</span><h2>Помогайте ученикам находить вас</h2><p>Создайте профиль, расскажите о своём опыте и условиях обучения. После проверки анкета сможет появиться в каталоге.</p></div><button class="btn btn-white" id="become-instructor">Стать инструктором ${icon('arrow',18)}</button></div></section>
 </main><footer><div class="container footer-main"><a class="logo" href="#top"><span class="logo-icon">${icon('steering',22)}</span><span>Авто<span class="logo-highlight">Гид</span></span></a><p>Сервис поиска автоинструкторов по России</p><span>© ${new Date().getFullYear()} АвтоГид · Прототип</span></div></footer>
 <dialog id="profile-dialog" class="dialog"><div id="dialog-content"></div></dialog>
 <dialog id="info-dialog" class="dialog small-dialog"><div class="dialog-inner"><button class="dialog-close" id="info-close" aria-label="Закрыть">${icon('x')}</button><h2 id="info-title"></h2><p id="info-message"></p><button class="btn btn-primary" id="info-confirm">Понятно</button></div></dialog>
`;
const $=s=>document.querySelector(s);
initHeader();
const citySelect=$('#city-select');
citySelect.innerHTML=cities.map(c=>`<option value="${c}">${c}</option>`).join('');
citySelect.value=state.city;
function setCity(city){state.city=city;localStorage.setItem('ag-city',city);citySelect.value=city;$('#header-city').textContent=city;$('#catalog-city-text').textContent=city;state.showAll=false;renderCards();}
function getFiltered(){let result=instructors.filter(p=>p.city===state.city&&(!state.category||p.category===state.category)&&(!state.gearbox||p.gearbox===state.gearbox)&&(!state.maxPrice||p.price<=Number(state.maxPrice))&&(!state.query||p.name.toLowerCase().includes(state.query.toLowerCase()))&&(!state.onlyVerified||p.verified));if(state.sort==='rating')result.sort((a,b)=>b.rating-a.rating);if(state.sort==='price')result.sort((a,b)=>a.price-b.price);if(state.sort==='experience')result.sort((a,b)=>b.experience-a.experience);return result;}
function card(p){const saved=favorites.has(p.id);return `<article class="instructor-card"><div class="card-top"><div class="avatar" style="--avatar-bg:${p.color}"><span>${p.initials}</span></div><div class="card-name"><h3>${escapeHTML(p.name)}</h3><p>${icon('pin',14)} ${escapeHTML(p.district)}</p><div class="card-rating">${icon('star',15)} <b>${p.rating.toFixed(1)}</b><span>· ${p.reviews} отзывов</span></div></div><button class="favorite ${saved?'saved':''}" data-favorite="${p.id}" aria-label="${saved?'Убрать из избранного':'Добавить в избранное'}" aria-pressed="${saved}">${icon('heart',20)}</button></div><div class="card-tags"><span>${icon('car',15)} Категория ${p.category}</span><span>${p.gearbox}</span><span>Стаж ${p.experience} лет</span></div>${p.verified?`<div class="verified">${icon('shield',15)} Документы подтверждены*</div>`:'<div class="unverified">Проверка документов не подтверждена*</div>'}<div class="card-footer"><div><small>Стоимость занятия</small><strong>от ${money(p.price)} ₽</strong></div><button class="card-detail" data-profile="${p.id}">Профиль ${icon('arrow',17)}</button></div></article>`;}
function renderCards(){const data=getFiltered();$('#results-count').textContent=`${data.length} ${data.length===1?'инструктор':data.length>=2&&data.length<=4?'инструктора':'инструкторов'}`;$('#cards').innerHTML=data.length?data.slice(0,state.showAll?data.length:4).map(card).join(''):`<div class="empty-state">${icon('search',32)}<h3>Инструкторы не найдены</h3><p>Попробуйте выбрать другой город или изменить фильтры.</p><button class="btn btn-outline" id="empty-reset">Сбросить фильтры</button></div>`;$('#more-btn').hidden=data.length<=4||state.showAll;$('#empty-reset')?.addEventListener('click',resetFilters);document.querySelectorAll('[data-favorite]').forEach(el=>el.addEventListener('click',()=>{const id=Number(el.dataset.favorite);favorites.has(id)?favorites.delete(id):favorites.add(id);localStorage.setItem('ag-favorites',JSON.stringify([...favorites]));renderCards();}));document.querySelectorAll('[data-profile]').forEach(el=>el.addEventListener('click',()=>openProfile(Number(el.dataset.profile))));}
function resetFilters(){state.category='';state.gearbox='';state.maxPrice='';state.query='';state.onlyVerified=false;state.sort='recommended';state.showAll=false;$('#category-select').value='';$('#gearbox-select').value='';$('#side-gearbox').value='';$('#price-filter').value='';$('#name-filter').value='';$('#verified-filter').checked=false;$('#sort-select').value='recommended';renderCards();}
function openProfile(id){const p=instructors.find(x=>x.id===id);$('#dialog-content').innerHTML=`<div class="dialog-inner"><button class="dialog-close" id="profile-close" aria-label="Закрыть">${icon('x')}</button><div class="modal-avatar" style="--avatar-bg:${p.color}">${p.initials}</div><span class="section-kicker">Профиль инструктора · Демо</span><h2>${escapeHTML(p.name)}</h2><p class="modal-muted">${icon('pin',16)} ${escapeHTML(p.city)}, ${escapeHTML(p.district)}</p><div class="modal-facts"><div><small>Категория</small><strong>${p.category}</strong></div><div><small>КПП</small><strong>${p.gearbox}</strong></div><div><small>Стаж</small><strong>${p.experience} лет</strong></div><div><small>Цена</small><strong>${money(p.price)} ₽</strong></div></div><p>${escapeHTML(p.bio)}</p><p class="modal-muted">Рейтинг и сведения в этой карточке вымышленные. Функция связи с инструктором появится после подключения реальных профилей и сервера.</p><button class="btn btn-primary" id="profile-action">Как связаться?</button></div>`;$('#profile-close').onclick=()=>$('#profile-dialog').close();$('#profile-action').onclick=()=>showInfo('Функция в разработке','В рабочей версии здесь будет защищённая связь с инструктором. Демонстрационный профиль не содержит настоящих контактов.');$('#profile-dialog').showModal();}
function showInfo(title,message){$('#info-title').textContent=title;$('#info-message').textContent=message;$('#info-dialog').showModal();}
$('#info-close').onclick=$('#info-confirm').onclick=()=>$('#info-dialog').close();
$('#search-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const params = new URLSearchParams({
    city: $('#city-select').value,
    category: $('#category-select').value,
    gearbox: $('#gearbox-select').value
  });

  window.location.href = `./catalog.html?${params.toString()}`;
});
$('#header-city').onclick=()=>{citySelect.focus();document.querySelector('#top').scrollIntoView({behavior:'smooth'});};
$('#price-filter').onchange=e=>{state.maxPrice=e.target.value;state.showAll=false;renderCards();};
$('#side-gearbox').onchange=e=>{state.gearbox=e.target.value;$('#gearbox-select').value=state.gearbox;state.showAll=false;renderCards();};
$('#name-filter').oninput=e=>{state.query=e.target.value.trim();renderCards();};
$('#verified-filter').onchange=e=>{state.onlyVerified=e.target.checked;renderCards();};
$('#sort-select').onchange=e=>{state.sort=e.target.value;renderCards();};
$('#reset-filters').onclick=resetFilters;
$('#more-btn').onclick=()=>{state.showAll=true;renderCards();};
$('#login-btn').onclick=()=>showInfo('Личный кабинет','Следующим этапом подключим регистрацию по номеру телефона с SMS-подтверждением и разделение ролей: курсант и инструктор.');

$('#become-instructor').onclick=()=>showInfo('Регистрация инструктора','На следующем этапе добавим регистрацию, заполнение анкеты и отправку профиля на модерацию.');

for (const dlg of document.querySelectorAll('dialog')) {
  dlg.addEventListener('click',e=>{
    if(e.target===dlg)dlg.close();
  });
}

setCity(state.city);
