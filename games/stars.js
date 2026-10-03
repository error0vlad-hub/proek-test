(() => {
function renderStarsGame(root) {
        root.innerHTML = `
          <h2>Лови звёзды</h2>
          <p>Лови звёзды в двухминутном забеге: каждые десять звёзд ускоряют игру и приносят новый уровень.</p>
          <div class="mini-status" id="starsStatus" role="status">Уровень 1 · Счёт: 0 · Время: 120</div>
          <div class="target-field" id="targetField">
            <button class="target-button" id="starTarget" type="button" aria-label="Поймать звезду" hidden>⭐</button>
          </div>
          <button class="mini-action" id="starsStart" type="button">Начать игру</button>`;
        const status = root.querySelector("#starsStatus");
        const field = root.querySelector("#targetField");
        const target = root.querySelector("#starTarget");
        const start = root.querySelector("#starsStart");
        let score = 0;
        let seconds = 120;
        let interval = 0;
        let targetTimer = 0;

        function moveTarget() {
          const maxX = Math.max(30, field.clientWidth - 35);
          const maxY = Math.max(40, field.clientHeight - 35);
          target.style.left = `${25 + Math.random() * (maxX - 25)}px`;
          target.style.top = `${25 + Math.random() * (maxY - 25)}px`;
        }

        function setTargetPace() {
          clearInterval(targetTimer);
          const level = Math.floor(score / 10);
          if (level > 0) targetTimer = window.setInterval(moveTarget, Math.max(650, 1800 - (level - 1) * 180));
        }

        target.addEventListener("click", () => {
          if (seconds <= 0) return;
          score++;
          status.textContent = `Уровень ${1 + Math.floor(score / 10)} · Счёт: ${score} · Время: ${seconds}`;
          moveTarget();
          setTargetPace();
        });
        start.addEventListener("click", () => {
          clearInterval(interval);
          score = 0;
          seconds = 120;
          status.textContent = "Уровень 1 · Счёт: 0 · Время: 120";
          target.hidden = false;
          start.disabled = true;
          moveTarget();
          setTargetPace();
          interval = window.setInterval(() => {
            seconds--;
            if (seconds <= 0) {
              clearInterval(interval);
              clearInterval(targetTimer);
              target.hidden = true;
              start.disabled = false;
              start.textContent = "Играть ещё";
              status.textContent = `Время вышло! Ты поймал звёзд: ${score}.`;
              return;
            }
            status.textContent = `Уровень ${1 + Math.floor(score / 10)} · Счёт: ${score} · Время: ${seconds}`;
          }, 1000);
        });
        return () => {
          clearInterval(interval);
          clearInterval(targetTimer);
        };
      }
  const root = document.getElementById("gameRoot");
  const cleanup = renderStarsGame(root);
  window.addEventListener("pagehide", cleanup, { once: true });
})();
