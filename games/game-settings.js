(() => {
  const devicePreview = document.querySelector("#devicePreview");
  const themeToggle = document.querySelector("#themeToggle");
  const previewTargets = document.querySelectorAll(".game-lobby, .game");

  if (!devicePreview || !themeToggle) {
    throw new Error("Панель настроек игры не найдена на странице.");
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    themeToggle.textContent = isDark ? "☀" : "☾";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    const label = isDark ? "Включить светлую тему" : "Включить тёмную тему";
    themeToggle.setAttribute("aria-label", label);
    themeToggle.title = label;
    document.querySelector('meta[name="theme-color"]').content = isDark ? "#080e19" : "#eaf2f8";
  }

  let theme = "dark";
  try {
    const savedTheme = localStorage.getItem("miniGamesTheme");
    theme = savedTheme === "light" ? "light" : "dark";
  } catch (error) {
    console.warn("Не удалось прочитать тему из хранилища браузера.", error);
  }
  applyTheme(theme);

  themeToggle.addEventListener("click", () => {
    theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    try {
      localStorage.setItem("miniGamesTheme", theme);
    } catch (error) {
      console.warn("Не удалось сохранить тему в хранилище браузера.", error);
    }
  });

  document.querySelectorAll(".device-preview [data-preview-width]").forEach((button) => {
    button.addEventListener("click", () => {
      document.documentElement.style.setProperty("--preview-width", `${button.dataset.previewWidth}px`);
      devicePreview.dataset.preview = button.dataset.previewKind;
      previewTargets.forEach((target) => {
        target.dataset.preview = button.dataset.previewKind;
      });
      document.querySelectorAll(".device-preview [data-preview-width]").forEach((preset) => {
        preset.setAttribute("aria-pressed", String(preset === button));
      });
    });
  });

  const search = document.querySelector("#gameSearch");
  const cards = [...document.querySelectorAll(".game-card")];
  const categoryButtons = [...document.querySelectorAll(".category-filter")];
  const result = document.querySelector("#catalogResult");
  const emptyState = document.querySelector("#noGames");
  let activeCategory = "all";

  if (search && result && emptyState && cards.length) {
    function filterGames() {
      const query = search.value.trim().toLocaleLowerCase("ru");
      let visibleCount = 0;
      cards.forEach((card) => {
        const matchesQuery = card.textContent.toLocaleLowerCase("ru").includes(query);
        const matchesCategory = activeCategory === "all" || card.dataset.gameCategory === activeCategory;
        const visible = matchesQuery && matchesCategory;
        card.hidden = !visible;
        if (visible) visibleCount++;
      });
      const gameWord = visibleCount === 1
        ? "игра доступна"
        : visibleCount >= 2 && visibleCount <= 4
          ? "игры доступны"
          : "игр доступно";
      result.textContent = visibleCount ? `${visibleCount} ${gameWord} для запуска` : "Игры не найдены";
      emptyState.hidden = visibleCount !== 0;
    }

    search.addEventListener("input", filterGames);
    categoryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.category;
        categoryButtons.forEach((category) => {
          const selected = category === button;
          category.classList.toggle("is-active", selected);
          category.setAttribute("aria-pressed", String(selected));
        });
        filterGames();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select"))) return;
      event.preventDefault();
      search.focus();
    });
    filterGames();
  }

  const canvas = document.querySelector("#webCanvas");
  if (canvas) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Не удалось запустить анимированный фон каталога.");
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: 0, y: 0, active: false, radius: 115 };
    let nodes = [];
    let links = [];
    let width = 0;
    let height = 0;
    let animationFrame = null;

    function createWeb() {
      const spacingX = 145;
      const spacingY = 125;
      const columns = Math.ceil(width / spacingX) + 2;
      const rows = Math.ceil(height / spacingY) + 2;
      nodes = [];
      links = [];

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const x = column * spacingX + (row % 2) * spacingX / 2 - spacingX;
          const y = row * spacingY - spacingY;
          const node = { x, y, baseX: x, baseY: y };
          nodes.push(node);

          const index = row * columns + column;
          if (column + 1 < columns) links.push([index, index + 1]);
          if (row + 1 < rows) {
            links.push([index, index + columns]);
            const diagonalColumn = row % 2 === 0 ? column + 1 : column - 1;
            if (diagonalColumn >= 0 && diagonalColumn < columns) {
              links.push([index, (row + 1) * columns + diagonalColumn]);
            }
          }
        }
      }
    }

    function resizeCanvas() {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      createWeb();
      if (reducedMotion.matches) drawWeb();
    }

    function drawWeb() {
      context.clearRect(0, 0, width, height);
      nodes.forEach((node) => {
        if (pointer.active) {
          const dx = node.x - pointer.x;
          const dy = node.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < pointer.radius) {
            const force = (pointer.radius - distance) / pointer.radius;
            node.x += dx / distance * force * 1.7;
            node.y += dy / distance * force * 1.7;
          }
        }
        node.x += (node.baseX - node.x) * 0.035;
        node.y += (node.baseY - node.y) * 0.035;
      });

      links.forEach(([start, end]) => {
        const first = nodes[start];
        const second = nodes[end];
        const distance = Math.hypot(first.x - second.x, first.y - second.y);
        if (distance >= 190) return;
        context.beginPath();
        context.moveTo(first.x, first.y);
        context.lineTo(second.x, second.y);
        context.strokeStyle = `rgba(103, 209, 255, ${(1 - distance / 190) * 0.28})`;
        context.lineWidth = 1;
        context.stroke();
      });

      nodes.forEach((node) => {
        const highlighted = pointer.active && Math.hypot(pointer.x - node.x, pointer.y - node.y) < pointer.radius;
        context.beginPath();
        context.arc(node.x, node.y, highlighted ? 2.4 : 1.5, 0, Math.PI * 2);
        context.fillStyle = highlighted ? "rgba(255,255,255,.9)" : "rgba(103,209,255,.68)";
        context.fill();
      });
    }

    function animateWeb() {
      animationFrame = null;
      if (document.hidden) return;
      drawWeb();
      if (!reducedMotion.matches) animationFrame = window.requestAnimationFrame(animateWeb);
    }

    function startWebAnimation() {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(animateWeb);
    }

    window.addEventListener("resize", resizeCanvas, { passive: true });
    window.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      if (reducedMotion.matches) drawWeb();
    }, { passive: true });
    window.addEventListener("pointerleave", () => {
      pointer.active = false;
      if (reducedMotion.matches) drawWeb();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      } else if (!document.hidden && !reducedMotion.matches) {
        startWebAnimation();
      }
    });
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) {
        if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
        drawWeb();
      } else {
        startWebAnimation();
      }
    });

    resizeCanvas();
    if (reducedMotion.matches) drawWeb();
    else startWebAnimation();
  }
})();
