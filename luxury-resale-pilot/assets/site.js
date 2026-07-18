(function () {
  "use strict";

  const bySelector = (selector, root = document) => root.querySelector(selector);
  const allBySelector = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function setGuideMode(mode) {
    const page = document.body;
    if (!page.classList.contains("guide-page")) return;

    const nextMode = mode === "research" ? "research" : "simple";
    page.dataset.guideMode = nextMode;
    allBySelector("[data-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.mode === nextMode));
    });

    try {
      sessionStorage.setItem("private-closet-guide-mode", nextMode);
    } catch (_error) {
      // The switch still works when session storage is unavailable.
    }

    if (nextMode === "simple") {
      const activeResearch = bySelector('[data-layer="research"]:target');
      if (activeResearch) {
        const firstSection = bySelector("[data-guide-section]");
        if (firstSection) firstSection.scrollIntoView({ block: "start" });
      }
    }
  }

  function initGuideMode() {
    if (!document.body.classList.contains("guide-page")) return;

    let initialMode = "simple";
    try {
      initialMode = sessionStorage.getItem("private-closet-guide-mode") || "simple";
    } catch (_error) {
      initialMode = "simple";
    }

    setGuideMode(initialMode);
    allBySelector("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => setGuideMode(button.dataset.mode));
    });

    allBySelector('[href="#russia"], [href="#world"]', document).forEach((link) => {
      link.addEventListener("click", () => setGuideMode("research"));
    });
  }

  function initGuideNavigation() {
    const sections = allBySelector("[data-guide-section]");
    if (!sections.length) return;

    const links = allBySelector("[data-section-link]");
    const mobileTitle = bySelector("[data-mobile-section-title]");
    const mobileProgress = bySelector("[data-mobile-section-progress]");

    const visibleSections = () => sections.filter((section) => {
      if (section.dataset.layer !== "research") return true;
      return document.body.dataset.guideMode === "research";
    });

    function activate(id) {
      const currentSections = visibleSections();
      const currentIndex = Math.max(0, currentSections.findIndex((section) => section.id === id));
      const currentSection = currentSections[currentIndex] || currentSections[0];
      if (!currentSection) return;

      links.forEach((link) => {
        const isCurrent = link.getAttribute("href") === `#${currentSection.id}`;
        if (isCurrent) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });

      if (mobileTitle) {
        mobileTitle.textContent = currentSection.dataset.sectionTitle || currentSection.querySelector("h2, h1")?.textContent || "План";
      }
      if (mobileProgress) {
        mobileProgress.textContent = `${currentIndex + 1} / ${currentSections.length}`;
      }
    }

    const observer = new IntersectionObserver((entries) => {
      const intersecting = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (intersecting[0]) activate(intersecting[0].target.id);
    }, {
      rootMargin: "-18% 0px -62% 0px",
      threshold: [0.02, 0.12, 0.35]
    });

    sections.forEach((section) => observer.observe(section));
    activate(sections[0].id);

    allBySelector("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => window.setTimeout(() => activate(visibleSections()[0]?.id), 0));
    });
  }

  function setFieldError(field, message) {
    const error = bySelector(`[data-error-for="${field.id}"]`) || bySelector(`#${field.id}-error`);
    if (error) error.textContent = message || "";
    field.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validateField(field) {
    if (field.disabled || field.type === "hidden") return true;

    let message = "";
    if (field.validity.valueMissing) message = "Заполните это поле.";
    else if (field.validity.typeMismatch) message = "Проверьте формат значения.";
    else if (field.validity.tooShort) message = `Нужно минимум ${field.minLength} символа.`;
    else if (!field.checkValidity()) message = field.validationMessage || "Проверьте значение.";

    setFieldError(field, message);
    return !message;
  }

  function initPilotForm() {
    const form = bySelector("#pilot-form");
    if (!form) return;

    const steps = allBySelector("[data-form-step]", form);
    const status = bySelector("[data-form-status]", form);
    const copyButton = bySelector("[data-copy-request]", form);
    const progressLabel = bySelector("[data-progress-label]", form);
    let preparedRequest = "";

    function showStep(stepNumber) {
      const number = String(stepNumber);
      form.dataset.currentStep = number;
      steps.forEach((step) => {
        const active = step.dataset.formStep === number;
        step.hidden = !active;
      });
      if (progressLabel) progressLabel.textContent = `Шаг ${number} из 2`;
      const heading = bySelector(`[data-form-step="${number}"] h3`, form);
      if (heading) heading.focus?.({ preventScroll: true });
    }

    function validateStep(stepNumber) {
      const step = bySelector(`[data-form-step="${stepNumber}"]`, form);
      if (!step) return true;
      const fields = allBySelector("input, select, textarea", step).filter((field) => !field.disabled);
      const results = fields.map(validateField);
      const firstInvalid = fields.find((field) => field.getAttribute("aria-invalid") === "true");
      if (firstInvalid) firstInvalid.focus();
      return results.every(Boolean);
    }

    allBySelector("input, select, textarea", form).forEach((field) => {
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") validateField(field);
      });
      field.addEventListener("blur", () => validateField(field));
    });

    bySelector("[data-form-next]", form)?.addEventListener("click", () => {
      if (validateStep(1)) showStep(2);
    });

    bySelector("[data-form-back]", form)?.addEventListener("click", () => showStep(1));

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!validateStep(2)) return;

      const data = new FormData(form);
      const name = String(data.get("owner-name") || "").trim();
      const contact = String(data.get("owner-contact") || "").trim();
      const batch = String(data.get("owner-batch") || "").trim();
      const categories = String(data.get("owner-categories") || "").trim();
      const blocker = String(data.get("owner-blocker") || "").trim();

      const lines = [
        "Заявка в исследовательский пилот Private Closet",
        "",
        `Имя: ${name}`,
        `Контакт для ответа: ${contact}`,
        `Количество вещей: ${batch}`,
        `Категории: ${categories}`,
        `Что мешало продать самостоятельно: ${blocker}`,
        "",
        "Понимаю, что заявка не является приёмом вещи, офертой или обещанием продажи."
      ];

      preparedRequest = lines.join("\n");
      const subject = "Заявка — Private Closet, московский пилот";
      const mailto = `mailto:info@aivel.ru?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(preparedRequest)}`;

      if (status) {
        status.dataset.state = "success";
        status.textContent = "Заявка подготовлена. Сейчас откроется ваша почта — отправка произойдёт только после вашего подтверждения.";
      }
      if (copyButton) copyButton.hidden = false;

      window.setTimeout(() => {
        window.location.href = mailto;
      }, 80);
    });

    copyButton?.addEventListener("click", async () => {
      if (!preparedRequest) return;
      try {
        await navigator.clipboard.writeText(preparedRequest);
        if (status) {
          status.dataset.state = "success";
          status.textContent = "Текст заявки скопирован. Его можно отправить взрослому куратору в любом удобном канале.";
        }
      } catch (_error) {
        const textarea = document.createElement("textarea");
        textarea.value = preparedRequest;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (status) {
          status.dataset.state = copied ? "success" : "error";
          status.textContent = copied ? "Текст заявки скопирован." : "Не удалось скопировать автоматически. Выделите текст заявки вручную в почтовом окне.";
        }
      }
    });

    showStep(1);
  }

  initGuideMode();
  initGuideNavigation();
  initPilotForm();
})();
