
const steeringIcon = `
  <svg aria-hidden="true" width="25" height="25"
       viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="1.8"
       stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="2"/>
    <path d="M3.5 9h17M10.7 14l-2 6M13.3 14l2 6"/>
  </svg>
`;

export function renderHeader(activePage = 'home') {
  const isHome = activePage === 'home';
  return `
    <header class="site-header">
      <div class="container nav">

        <a class="logo" href="./index.html" aria-label="АвтоГид — главная">
          <span class="logo-icon">${steeringIcon}</span>
          <span>Авто<span class="logo-highlight">Гид</span></span>
        </a>

        <nav id="navigation" class="navigation">
          <a href="./index.html"
             class="${activePage === 'home' ? 'nav-active' : ''}">
            Главная
          </a>

          <a href="./catalog.html"
             class="${activePage === 'catalog' ? 'nav-active' : ''}">
            Каталог инструкторов
          </a>

          <a href="./index.html#how">Как это работает</a>
          <a href="./index.html#benefits">О сервисе</a>
        </nav>
${isHome ? `
  <div class="header-actions">
    <button id="header-city" class="city-link" type="button">
      Выбрать город
    </button>
    <button id="login-btn" class="btn btn-outline" type="button">
      Личный кабинет
    </button>
  </div>
` : ''}
        <button class="mobile-menu" id="menu-btn"
                aria-label="Открыть меню"
                aria-expanded="false"
                type="button">
          <svg width="24" height="24" viewBox="0 0 24 24"
               fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round">
            <path d="M4 7h16M4 12h16M4 17h16"/>
          </svg>
        </button>

      </div>
    </header>
  `;
}

export function initHeader() {
  const button = document.querySelector('#menu-btn');
  const navigation = document.querySelector('#navigation');

  if (!button || !navigation) return;

  button.addEventListener('click', () => {
    const opened = navigation.classList.toggle('open');
    button.setAttribute('aria-expanded', String(opened));
  });

  navigation.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navigation.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    });
  });
}
