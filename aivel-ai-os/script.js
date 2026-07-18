const scenarios = {
  radar: {
    tabId: "scenario-tab-radar",
    label: "Сценарий 01 · CEO / команда",
    title: "От сигнала во внешнем мире — к изменению решения",
    description:
      "SignalOS находит только значимые изменения, сверяет их с контекстом Wiki, а Mitra или Совет подключаются лишь когда появился следующий шаг.",
    steps: [
      ["Сканирует", "SignalOS", "YouTube, подкасты, статьи, официальные источники"],
      ["Сверяет", "Wiki", "Компания, роль, фокус и активные решения"],
      ["Объясняет", "AI Desk", "Что изменилось, почему важно и что опровергнет сигнал"],
      ["Продолжает", "Mitra / Совет", "Задача после approval или отдельное решение"],
    ],
    result: "Персональный brief без информационного шума и с понятным следующим решением.",
  },
  finance: {
    tabId: "scenario-tab-finance",
    label: "Сценарий 02 · финансы / Совет",
    title: "От первичного учёта — к проверяемой управленческой картине",
    description:
      "1С, Wiki и PostgreSQL не смешиваются в один источник: каждый отвечает за свой этап, а отчётные агенты и Совет работают с одной трассируемой версией фактов.",
    steps: [
      ["Собирает", "1С-контур", "Первичный учёт, actuals, закрытие периода и исключения"],
      ["Фиксирует", "Wiki", "Финансовые события, источники, конфликты и свежесть"],
      ["Хранит", "PostgreSQL", "Структурированные данные, подготовленные Wiki"],
      ["Проверяет", "Управленка / Совет", "Увязки, изменения, риски и board memo"],
    ],
    result: "Одна доказательная управленка вместо нескольких расходящихся таблиц и пересказов.",
  },
  ma: {
    tabId: "scenario-tab-ma",
    label: "Сценарий 03 · M&A",
    title: "От карты компаний — к сделке с полной трассировкой",
    description:
      "Осинтер отвечает за широкий поиск и readiness, CRM — за pipeline, Wiki — за контекст сделки, а Legal DD подключается только на подходящем этапе.",
    steps: [
      ["Ищет", "Осинтер", "Карты, каталоги, география и ICP"],
      ["Проверяет", "Evidence gate", "Дубли, юрлицо, профиль, разрешённые контакты"],
      ["Передаёт", "CRM", "Только готовые записи после preview и approval"],
      ["Углубляет", "Wiki / Legal DD", "Deal context, документы, title gaps и sign-off"],
    ],
    result: "Сквозной M&A-конвейер, где статус «готово» вычисляется правилами, а не уверенностью модели.",
  },
};

const roles = {
  ceo: {
    tabId: "role-tab-ceo",
    kicker: "Линза CEO",
    title: "Где изменился риск, капитал или стратегическая развилка?",
    description:
      "Система поднимает только сигналы, которые меняют board-вопрос, cash, M&A, оргструктуру или ключевой приоритет.",
    context: "Wiki: CEO dashboard, финансы, сделки, решения Совета",
    sources: "Рынок AI, 1С, M&A, regulation, конкуренты",
    output: "3–7 decision-changing сигналов + вопросы к Совету",
    access: "Широкое чтение; любые внешние записи — только после подтверждения",
  },
  product: {
    tabId: "role-tab-product",
    kicker: "Линза продукта",
    title: "Какая новая возможность меняет ценность, приоритет или продуктовую ставку?",
    description:
      "Те же агенты связывают интервью, продуктовые решения, рынок и фактическое использование — без копии корпоративной памяти.",
    context: "Wiki: продукт, сегменты, Core Jobs, roadmap, open questions",
    sources: "Product discovery, AI UX, accounting automation, клиенты",
    output: "Изменения гипотез + evidence gaps + вопросы для исследования",
    access: "Продуктовый контекст и telemetry; без доступа к закрытым finance/deal данным по умолчанию",
  },
  commercial: {
    tabId: "role-tab-commercial",
    kicker: "Линза коммерции",
    title: "Где появился новый триггер покупки, риск в pipeline или возможность для сделки?",
    description:
      "SignalOS следит за рынком и клиентскими сигналами, Mitra держит follow-up, а Осинтер и CRM образуют отдельный M&A/sales route.",
    context: "Wiki: ICP, offer, pipeline context, клиенты, objections",
    sources: "Конкуренты, отраслевые новости, тендеры, M&A и buyer signals",
    output: "Account opportunity, call brief, follow-up или target candidate",
    access: "CRM по роли; запись и outreach — только через review/approval",
  },
  cto: {
    tabId: "role-tab-cto",
    kicker: "Линза CPO / CTO",
    title: "Что меняет продуктовую ставку, архитектурный риск или скорость выпуска?",
    description:
      "Продуктовые и технические агенты сохраняют свои инструменты, но публикуют состояние фич, решений и рисков в общий каталог и контекст.",
    context: "Продуктовые ставки, архитектурные решения, backlog, incidents, releases",
    sources: "Discovery, telemetry, AI engineering, security, vendor roadmaps",
    output: "Feature state, architecture delta, risk, release control",
    access: "Код и observability по проектам; production writes — отдельный gate",
  },
  marketing: {
    tabId: "role-tab-marketing",
    kicker: "Линза SEO / маркетинга",
    title: "Какая тема, формулировка или изменение спроса заслуживает действия сейчас?",
    description:
      "Источники и формат меняются, но память о продукте, клиентах и позиционировании остаётся общей и проверяемой.",
    context: "Wiki: positioning, offer, cases, product truth, content decisions",
    sources: "Search demand, конкуренты, отраслевые медиа, social, эксперты",
    output: "Content opportunity, change in narrative, brief, measurement question",
    access: "Маркетинговый контекст; публикация остаётся customer-visible approval",
  },
};

function setupTabs(selector, datasetKey, items, render) {
  const tabs = [...document.querySelectorAll(selector)];
  if (!tabs.length) return;

  const activate = (tab, focus = false) => {
    const key = tab.dataset[datasetKey];
    if (!key || !items[key]) return;

    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });

    render(items[key]);
    if (focus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      activate(tabs[nextIndex], true);
    });
  });
}

function renderScenario(scenario) {
  const panel = document.querySelector("#scenario-content");
  panel?.setAttribute("aria-labelledby", scenario.tabId);
  document.querySelector("[data-scenario-label]").textContent = scenario.label;
  document.querySelector("[data-scenario-title]").textContent = scenario.title;
  document.querySelector("[data-scenario-description]").textContent = scenario.description;
  document.querySelector("[data-scenario-result]").textContent = scenario.result;

  const chain = document.querySelector("[data-scenario-chain]");
  chain.replaceChildren(
    ...scenario.steps.map((step, index) => {
      const article = document.createElement("article");
      const number = document.createElement("span");
      const label = document.createElement("small");
      const title = document.createElement("strong");
      const description = document.createElement("p");
      number.textContent = String(index + 1).padStart(2, "0");
      label.textContent = step[0];
      title.textContent = step[1];
      description.textContent = step[2];
      article.append(number, label, title, description);
      return article;
    }),
  );
}

function renderRole(role) {
  const panel = document.querySelector("#role-content");
  panel?.setAttribute("aria-labelledby", role.tabId);
  document.querySelector("[data-role-kicker]").textContent = role.kicker;
  document.querySelector("[data-role-title]").textContent = role.title;
  document.querySelector("[data-role-description]").textContent = role.description;
  document.querySelector("[data-role-context]").textContent = role.context;
  document.querySelector("[data-role-sources]").textContent = role.sources;
  document.querySelector("[data-role-output]").textContent = role.output;
  document.querySelector("[data-role-access]").textContent = role.access;
}

setupTabs("[data-scenario]", "scenario", scenarios, renderScenario);
setupTabs("[data-role]", "role", roles, renderRole);

const header = document.querySelector("[data-header]");
const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 12);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const navigationLinks = [...document.querySelectorAll(".main-nav a")];
const sections = navigationLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window && sections.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navigationLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${visible.target.id}`;
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-20% 0px -65%", threshold: [0.05, 0.2, 0.5] },
  );
  sections.forEach((section) => observer.observe(section));
}
