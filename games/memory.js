(() => {
function renderMemoryGame(root) {
        const symbols = ["🦖", "🌵", "⭐", "🛸", "🍰", "🐄", "💎", "🚀", "🌙", "🐉", "⚡", "🗝️"];
        let cards = [];
        const opened = [];
        const matched = new Set();
        let turns = 0;
        let locked = false;
        let mismatchTimer = 0;
        let stage = 1;
        root.innerHTML = `
          <h2>Найди пару</h2>
          <p>Проходи всё более длинные этапы: пар становится больше, символы каждый раз перемешиваются.</p>
          <div class="mini-status" id="memoryStatus">Этап 1 · Ходы: 0 · Пары: 0 из 6</div>
          <div class="memory-grid" aria-label="Карточки для игры на память"></div>
          <button class="mini-action" id="memoryNext" type="button" hidden>Следующий этап →</button>
          <button class="mini-action" id="memoryRestart" type="button">Начать заново</button>`;
        const grid = root.querySelector(".memory-grid");
        const status = root.querySelector("#memoryStatus");
        const restart = root.querySelector("#memoryRestart");
        const next = root.querySelector("#memoryNext");
        let pairCount = 6;

        function buildCards() {
          pairCount = Math.min(6 + Math.floor((stage - 1) / 2), symbols.length);
          cards = [...symbols.slice(0, pairCount), ...symbols.slice(0, pairCount)];
          for (let index = cards.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
          }
          grid.replaceChildren();
          cards.forEach((symbol, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "memory-card";
            button.textContent = "?";
            button.setAttribute("aria-label", `Карточка ${index + 1}, закрыта`);
            button.addEventListener("click", () => {
              if (locked || matched.has(index) || opened.includes(index)) return;
              opened.push(index);
              button.textContent = symbol;
              button.classList.add("is-open");
              button.setAttribute("aria-label", `Карточка ${index + 1}: ${symbol}`);
              if (opened.length === 2) {
                turns++;
                locked = true;
                const [first, second] = opened;
                if (cards[first] === cards[second]) {
                  matched.add(first);
                  matched.add(second);
                  grid.children[first].classList.add("is-matched");
                  grid.children[second].classList.add("is-matched");
                  opened.length = 0;
                  locked = false;
                  status.textContent = matched.size === cards.length
                    ? `Этап ${stage} пройден! Все ${pairCount} пар за ${turns} ходов.`
                    : `Этап ${stage} · Ходы: ${turns} · Пары: ${matched.size / 2} из ${pairCount}`;
                  if (matched.size === cards.length) next.hidden = false;
                  return;
                }
                status.textContent = `Этап ${stage} · Ходы: ${turns} · Пары: ${matched.size / 2} из ${pairCount}`;
                mismatchTimer = window.setTimeout(() => {
                  for (const cardIndex of opened) {
                    const card = grid.children[cardIndex];
                    card.textContent = "?";
                    card.classList.remove("is-open");
                    card.setAttribute("aria-label", `Карточка ${cardIndex + 1}, закрыта`);
                  }
                  opened.length = 0;
                  locked = false;
                }, 700);
              }
            });
            grid.append(button);
          });
        }

        buildCards();
        next.addEventListener("click", () => {
          stage++;
          turns = 0;
          matched.clear();
          opened.length = 0;
          next.hidden = true;
          status.textContent = `Этап ${stage} · Ходы: 0 · Пары: 0`;
          buildCards();
        });
        restart.addEventListener("click", () => {
          clearTimeout(mismatchTimer);
          stage = 1;
          opened.length = 0;
          matched.clear();
          turns = 0;
          locked = false;
          next.hidden = true;
          status.textContent = "Этап 1 · Ходы: 0 · Пары: 0 из 6";
          buildCards();
        });
        return () => clearTimeout(mismatchTimer);
      }
  const root = document.getElementById("gameRoot");
  const cleanup = renderMemoryGame(root);
  window.addEventListener("pagehide", cleanup, { once: true });
})();
