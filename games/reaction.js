(() => {
function renderReactionGame(root) {
        root.innerHTML = `
          <h2>Быстрая реакция</h2>
          <p>Тренируйся сколько угодно: продержись как можно дольше, не нажимая раньше сигнала.</p>
          <div class="mini-status" id="reactionStatus" role="status">Раунд 0 · Ошибки: 0/3 · Лучшее: 0</div>
          <button class="reaction-pad" id="reactionPad" type="button">Начать</button>`;
        const button = root.querySelector("#reactionPad");
        const status = root.querySelector("#reactionStatus");
        let phase = "idle";
        let timer = 0;
        let readyAt = 0;
        let rounds = 0;
        let falseStarts = 0;
        let best = 0;

        function beginRound() {
          phase = "waiting";
          button.classList.remove("is-ready");
          button.classList.add("is-waiting");
          button.textContent = "Жди зелёный!";
          status.textContent = `Раунд ${rounds + 1} · Ошибки: ${falseStarts}/3 · Лучшее: ${best}`;
          timer = window.setTimeout(() => {
            phase = "ready";
            readyAt = performance.now();
            button.classList.remove("is-waiting");
            button.classList.add("is-ready");
            button.textContent = "ЖМИ!";
            status.textContent = `Раунд ${rounds + 1} · Сейчас! Ошибки: ${falseStarts}/3`;
          }, 1200 + Math.random() * 2600);
        }

        button.addEventListener("click", () => {
          if (phase === "over") {
            rounds = 0;
            falseStarts = 0;
            beginRound();
          } else if (phase === "idle") {
            beginRound();
          } else if (phase === "waiting") {
            clearTimeout(timer);
            button.classList.remove("is-waiting");
            falseStarts++;
            if (falseStarts >= 3) {
              phase = "over";
              button.textContent = "Новая попытка";
              status.textContent = `Тренировка окончена: ${rounds} раундов. Лучшее: ${best}.`;
            } else {
              phase = "idle";
              button.textContent = "Продолжить";
              status.textContent = `Слишком рано! Ошибки: ${falseStarts}/3 · Раундов пройдено: ${rounds}.`;
            }
          } else {
            const reaction = Math.round(performance.now() - readyAt);
            rounds++;
            if (!best || reaction < best) best = reaction;
            phase = "idle";
            button.classList.remove("is-ready");
            button.textContent = "Следующий раунд";
            status.textContent = `Раунд ${rounds}: ${reaction} мс · Ошибки: ${falseStarts}/3 · Лучшее: ${best} мс`;
          }
        });
        return () => clearTimeout(timer);
      }
  const root = document.getElementById("gameRoot");
  const cleanup = renderReactionGame(root);
  window.addEventListener("pagehide", cleanup, { once: true });
})();
