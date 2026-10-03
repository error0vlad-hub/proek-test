(() => {
function renderAttentionGame(root) {
        const totalLevels = 200;
        const symbols = [
          { label: "Луна", icon: "🌙", group: "sky" },
          { label: "Солнце", icon: "☀️", group: "sky" },
          { label: "Звезда", icon: "⭐", group: "sky" },
          { label: "Облако", icon: "☁️", group: "sky" },
          { label: "Молния", icon: "⚡", group: "sky" },
          { label: "Лист", icon: "🍃", group: "nature" },
          { label: "Цветок", icon: "🌼", group: "nature" },
          { label: "Гриб", icon: "🍄", group: "nature" },
          { label: "Кактус", icon: "🌵", group: "nature" },
          { label: "Росток", icon: "🪴", group: "nature" },
          { label: "Кристалл", icon: "💎", group: "object" },
          { label: "Чашка", icon: "☕", group: "object" },
          { label: "Ключ", icon: "🔑", group: "object" },
          { label: "Книга", icon: "📚", group: "object" },
          { label: "Часы", icon: "⌚", group: "object" },
          { label: "Ракета", icon: "🚀", group: "travel" },
          { label: "Поезд", icon: "🚆", group: "travel" },
          { label: "Парус", icon: "⛵", group: "travel" },
          { label: "Самолёт", icon: "✈️", group: "travel" },
          { label: "Вертолёт", icon: "🚁", group: "travel" }
        ];
        let level = 1;
        let locked = false;
        let sequenceTimer = 0;
        let currentPuzzle = null;
        let roundOrder = [];
        let previousRoundType = null;

        root.innerHTML = `
          <section class="attention-game" aria-labelledby="attentionTitle">
            <header class="attention-head">
              <p class="attention-eyebrow">Мини-игра на внимательность</p>
              <h2 id="attentionTitle">Докажи, что ты человек</h2>
              <p class="attention-subtitle">Выбери уровень сложности и пройди 200 испытаний. Ошибка сбрасывает прогресс.</p>
            </header>
            <label class="attention-difficulty" for="attentionDifficulty">Сложность
              <select id="attentionDifficulty">
                <option value="easy">Лёгкая</option>
                <option value="normal" selected>Обычная</option>
                <option value="hard">Сложная</option>
                <option value="extreme">Экстремальная</option>
              </select>
            </label>
            <div class="attention-progress">
              <div class="attention-progress-copy"><span id="attentionLevel">Испытание 1 из ${totalLevels}</span><strong id="attentionPercent">0%</strong></div>
              <div class="attention-track" id="attentionTrack" role="progressbar" aria-label="Прогресс испытаний" aria-valuemin="0" aria-valuemax="${totalLevels}" aria-valuenow="0"><div class="attention-fill" id="attentionFill"></div></div>
            </div>
            <section class="attention-stage" id="attentionStage" aria-live="polite">
              <div class="attention-stage-top"><span id="attentionType">Найди группу</span><span class="attention-stage-number" id="attentionNumber">01 / ${totalLevels}</span></div>
              <h3 class="attention-question" id="attentionQuestion"></h3>
              <div id="attentionTask"></div>
              <p class="attention-feedback" id="attentionFeedback" role="status">Выбери ответ, который подходит лучше всего.</p>
            </section>
            <section class="attention-complete" id="attentionComplete" hidden>
              <div><div aria-hidden="true" style="font-size:48px">✦</div><h2>Тренировка пройдена!</h2><p>Все ${totalLevels} испытаний позади. Ты замечаешь детали, запоминаешь последовательности и умеешь держать внимание.</p><button class="attention-next" id="attentionRestart" type="button">Начать сначала</button></div>
            </section>
            <footer class="attention-footer"><p class="attention-hint">Пропусков нет. Любая ошибка возвращает к первому уровню.</p><button class="attention-next" id="attentionNext" type="button" hidden>Дальше →</button></footer>
          </section>
          <p class="attention-disclaimer">Оригинальная игра-тренировка, а не система защиты или проверки личности.</p>`;

        const levelText = root.querySelector("#attentionLevel");
        const percentText = root.querySelector("#attentionPercent");
        const progressTrack = root.querySelector("#attentionTrack");
        const progressFill = root.querySelector("#attentionFill");
        const stage = root.querySelector("#attentionStage");
        const stageType = root.querySelector("#attentionType");
        const stageNumber = root.querySelector("#attentionNumber");
        const question = root.querySelector("#attentionQuestion");
        const taskArea = root.querySelector("#attentionTask");
        const feedback = root.querySelector("#attentionFeedback");
        const nextButton = root.querySelector("#attentionNext");
        const complete = root.querySelector("#attentionComplete");
        const restartButton = root.querySelector("#attentionRestart");
        const difficultySelect = root.querySelector("#attentionDifficulty");
        const difficultySettings = {
          easy: { choiceStart: 3, choices: 4, memoryStart: 3, memoryGrowth: 55, memoryMax: 5, memoryTime: 8000, countStart: 5, countGrowth: 35, countMax: 10 },
          normal: { choiceStart: 3, choices: 8, memoryStart: 3, memoryGrowth: 30, memoryMax: 8, memoryTime: 5000, countStart: 6, countGrowth: 20, countMax: 15 },
          hard: { choiceStart: 6, choices: 12, memoryStart: 5, memoryGrowth: 25, memoryMax: 10, memoryTime: 3000, countStart: 10, countGrowth: 12, countMax: 22 },
          extreme: { choiceStart: 10, choices: 16, memoryStart: 7, memoryGrowth: 18, memoryMax: 14, memoryTime: 1800, countStart: 18, countGrowth: 8, countMax: 32 }
        };
        let difficulty = "normal";

        function randomForLevel(seed) {
          let state = (seed * 2246822519 + 3266489917) >>> 0;
          return () => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 4294967296;
          };
        }

        function shuffle(items, random) {
          const copy = [...items];
          for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
          }
          return copy;
        }

        function nextRoundType() {
          if ((level - 1) % 6 === 0) {
            roundOrder = shuffle([0, 1, 2, 3, 4, 5], Math.random);
            if (roundOrder[0] === previousRoundType) {
              [roundOrder[0], roundOrder[1]] = [roundOrder[1], roundOrder[0]];
            }
          }
          const type = roundOrder[(level - 1) % 6];
          previousRoundType = type;
          return type;
        }

        function updateProgress() {
          const completed = level - 1;
          const percent = Math.floor(completed / totalLevels * 100);
          levelText.textContent = completed === totalLevels ? "Все испытания пройдены" : `Испытание ${level} из ${totalLevels}`;
          percentText.textContent = `${percent}%`;
          progressTrack.setAttribute("aria-valuenow", String(completed));
          progressFill.style.width = `${percent}%`;
        }

        function makeChoice(symbol, onChoose) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "attention-choice";
          button.setAttribute("aria-label", symbol.label);
          button.setAttribute("aria-pressed", "false");
          button.dataset.correct = String(Boolean(symbol.correct));
          const icon = document.createElement("span");
          icon.className = "attention-icon";
          icon.setAttribute("aria-hidden", "true");
          icon.textContent = symbol.icon;
          const label = document.createElement("span");
          label.className = "attention-label";
          label.textContent = symbol.label;
          button.append(icon, label);
          button.addEventListener("click", () => onChoose(button));
          return button;
        }

        function showError(message) {
          const failedLevel = level;
          clearTimeout(sequenceTimer);
          level = 1;
          roundOrder = [];
          previousRoundType = null;
          renderPuzzle();
          feedback.textContent = failedLevel === 1 ? message : `${message} Прогресс сброшен до первого испытания.`;
          feedback.dataset.kind = "bad";
        }

        function completePuzzle() {
          locked = true;
          feedback.textContent = "Верно! Внимание на высоте.";
          feedback.dataset.kind = "good";
          taskArea.querySelectorAll("button").forEach((button) => { button.disabled = true; });
          nextButton.hidden = false;
        }

        function renderChoicePuzzle(random, mode) {
          const settings = difficultySettings[difficulty];
          const count = Math.min(settings.choiceStart + Math.floor((level - 1) / 35), settings.choices);
          let choices;
          let prompt;
          if (mode === 0) {
            const groups = ["sky", "nature", "object", "travel"];
            const group = groups[Math.floor(random() * groups.length)];
            const matching = symbols.filter((symbol) => symbol.group === group);
            const other = symbols.filter((symbol) => symbol.group !== group);
            const matchingCount = Math.min(matching.length, 1 + Math.floor(random() * Math.min(3, count - 1)));
            choices = shuffle([
              ...shuffle(matching, random).slice(0, matchingCount).map((symbol) => ({ ...symbol, correct: true })),
              ...shuffle(other, random).slice(0, count - matchingCount).map((symbol) => ({ ...symbol, correct: false }))
            ], random);
            const groupNames = { sky: "небо", nature: "природа", object: "предметы", travel: "путешествия" };
            prompt = `Найди все символы из группы «${groupNames[group]}».`;
          } else if (mode === 1) {
            const reference = symbols[Math.floor(random() * symbols.length)];
            const correct = shuffle(symbols.filter((symbol) => symbol.group === reference.group && symbol.label !== reference.label), random)[0];
            const other = shuffle(symbols.filter((symbol) => symbol.group !== reference.group), random).slice(0, count - 1);
            choices = shuffle([{ ...correct, correct: true }, ...other.map((symbol) => ({ ...symbol, correct: false }))], random);
            prompt = `Что относится к той же группе, что и ${reference.icon} ${reference.label}?`;
          } else {
            const target = symbols[Math.floor(random() * symbols.length)];
            choices = shuffle([
              { ...target, correct: true },
              ...shuffle(symbols.filter((symbol) => symbol.label !== target.label), random)
                .slice(0, count - 1).map((symbol) => ({ ...symbol, correct: false }))
            ], random);
            prompt = `Выбери единственный символ «${target.label}».`;
          }

          question.textContent = prompt;
          taskArea.className = "attention-grid";
          const selected = new Set();
          choices.forEach((choice) => {
            const button = makeChoice(choice, (clicked) => {
              if (locked) return;
              if (mode === 0) {
                if (!choice.correct) {
                  showError("Неверный выбор!");
                  return;
                }
                if (selected.has(button)) {
                  selected.delete(button);
                  button.classList.remove("is-selected");
                  button.setAttribute("aria-pressed", "false");
                } else {
                  selected.add(button);
                  button.classList.add("is-selected");
                  button.setAttribute("aria-pressed", "true");
                }
                return;
              }
              if (!choice.correct) {
                showError("Неверный выбор!");
                return;
              }
              clicked.classList.add("is-correct");
              completePuzzle();
            });
            taskArea.append(button);
          });
          if (mode === 0) {
            const submit = document.createElement("button");
            submit.type = "button";
            submit.className = "attention-submit";
            submit.textContent = "Проверить выбранное";
            submit.addEventListener("click", () => {
              if (locked) return;
              const selectedCorrectly = choices.every((choice, index) =>
                selected.has(taskArea.querySelectorAll(".attention-choice")[index]) === choice.correct
              );
              if (!selectedCorrectly) {
                showError("Не все подходящие символы выбраны.");
                return;
              }
              completePuzzle();
            });
            taskArea.append(submit);
          }
          currentPuzzle = { type: "choice", choices };
        }

        function renderSequencePuzzle(random) {
          const settings = difficultySettings[difficulty];
          const size = Math.min(settings.memoryStart + Math.floor((level - 1) / settings.memoryGrowth), settings.memoryMax);
          const sequence = Array.from({ length: size }, () => symbols[Math.floor(random() * symbols.length)].icon);
          const variants = new Set([sequence.join("")]);
          while (variants.size < 3) {
            const other = [...sequence];
            const index = Math.floor(random() * other.length);
            let replacement = symbols[Math.floor(random() * symbols.length)].icon;
            if (replacement === other[index]) replacement = symbols[(symbols.findIndex((symbol) => symbol.icon === replacement) + 1) % symbols.length].icon;
            other[index] = replacement;
            variants.add(other.join(""));
          }
          const options = shuffle([...variants], random);
          const correct = sequence.join("");
          question.textContent = "Запомни последовательность символов.";
          taskArea.className = "";
          const display = document.createElement("div");
          display.className = "attention-sequence";
          display.textContent = sequence.join("  ");
          taskArea.append(display);
          const answers = document.createElement("div");
          answers.className = "attention-answers";
          options.forEach((option) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "attention-answer";
            button.textContent = option;
            button.dataset.correct = String(option === correct);
            button.setAttribute("aria-label", `Последовательность из ${size} символов`);
            button.addEventListener("click", () => {
              if (locked) return;
              if (option !== correct) {
                showError("Последовательность не совпала!");
                return;
              }
              button.classList.add("is-correct");
              completePuzzle();
            });
            answers.append(button);
          });
          taskArea.append(answers);
          currentPuzzle = { type: "sequence", sequence, options };
          sequenceTimer = window.setTimeout(() => {
            if (level <= totalLevels && currentPuzzle?.type === "sequence" && display.isConnected) {
              display.textContent = "••••••••";
              question.textContent = "Какая последовательность была показана?";
            }
          }, settings.memoryTime);
        }

        function renderCountPuzzle(random) {
          const settings = difficultySettings[difficulty];
          const rowLength = Math.min(settings.countStart + Math.floor((level - 1) / settings.countGrowth), settings.countMax);
          const target = symbols[Math.floor(random() * symbols.length)];
          const amount = 1 + Math.floor(random() * Math.min(rowLength - 2, 7));
          const row = Array.from({ length: amount }, () => target.icon);
          while (row.length < rowLength) {
            const other = symbols[Math.floor(random() * symbols.length)];
            row.push(other.icon === target.icon ? symbols[(symbols.indexOf(other) + 1) % symbols.length].icon : other.icon);
          }
          question.textContent = `Сколько раз встречается символ ${target.icon}? Считай внимательно.`;
          taskArea.className = "";
          const display = document.createElement("div");
          display.className = "attention-sequence";
          display.setAttribute("aria-label", `${rowLength} символов для подсчёта`);
          display.textContent = shuffle(row, random).join(" ");
          taskArea.append(display);
          const possible = new Set([amount]);
          while (possible.size < 3) {
            const offset = 1 + Math.floor(random() * 3);
            const answer = amount + (random() < .5 ? -offset : offset);
            if (answer > 0 && answer <= rowLength) possible.add(answer);
          }
          const answers = document.createElement("div");
          answers.className = "attention-answers";
          shuffle([...possible], random).forEach((answer) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "attention-answer";
            button.textContent = String(answer);
            button.dataset.correct = String(answer === amount);
            button.addEventListener("click", () => {
              if (locked) return;
              if (answer !== amount) {
                showError("Неверный ответ!");
                return;
              }
              button.classList.add("is-correct");
              completePuzzle();
            });
            answers.append(button);
          });
          taskArea.append(answers);
          currentPuzzle = { type: "count", amount };
        }

        function renderOddOnePuzzle(random) {
          const groups = ["sky", "nature", "object", "travel"];
          const group = groups[Math.floor(random() * groups.length)];
          const sameGroup = shuffle(symbols.filter((symbol) => symbol.group === group), random);
          const sameCount = Math.min(sameGroup.length, 3 + Math.floor((level - 1) / 70));
          const differentGroups = symbols.filter((symbol) => symbol.group !== group);
          const oddOne = differentGroups[Math.floor(random() * differentGroups.length)];
          const answers = shuffle([
            ...sameGroup.slice(0, sameCount).map((symbol) => ({ ...symbol, correct: false })),
            { ...oddOne, correct: true }
          ], random);
          question.textContent = "Все символы связаны между собой, кроме одного. Найди лишний.";
          taskArea.className = "attention-grid";
          answers.forEach((answer) => {
            const button = makeChoice(answer, () => {
              if (locked) return;
              if (!answer.correct) {
                showError("Неверный выбор!");
                return;
              }
              button.classList.add("is-correct");
              completePuzzle();
            });
            taskArea.append(button);
          });
          currentPuzzle = { type: "odd-one", answers };
        }

        function renderPuzzle() {
          clearTimeout(sequenceTimer);
          locked = false;
          currentPuzzle = null;
          taskArea.replaceChildren();
          feedback.textContent = "Выбери ответ, который подходит лучше всего.";
          feedback.dataset.kind = "";
          nextButton.hidden = true;
          updateProgress();
          const random = randomForLevel(level);
          const type = nextRoundType();
          stageNumber.textContent = `${String(level).padStart(2, "0")} / ${totalLevels}`;
          if (type === 3) {
            stageType.textContent = "Память";
            renderSequencePuzzle(random);
          } else if (type === 4) {
            stageType.textContent = "Точный счёт";
            renderCountPuzzle(random);
          } else if (type === 5) {
            stageType.textContent = "Найди отличие";
            renderOddOnePuzzle(random);
          } else {
            stageType.textContent = ["Найди группу", "Связь символов", "Точная деталь"][type];
            renderChoicePuzzle(random, type);
          }
        }

        function advance() {
          if (level >= totalLevels) {
            level = totalLevels + 1;
            stage.hidden = true;
            complete.hidden = false;
            nextButton.hidden = true;
            updateProgress();
            return;
          }
          level++;
          renderPuzzle();
        }

        nextButton.addEventListener("click", advance);
        restartButton.addEventListener("click", () => {
          level = 1;
          roundOrder = [];
          previousRoundType = null;
          complete.hidden = true;
          stage.hidden = false;
          renderPuzzle();
        });
        difficultySelect.addEventListener("change", () => {
          difficulty = difficultySelect.value;
          level = 1;
          roundOrder = [];
          previousRoundType = null;
          complete.hidden = true;
          stage.hidden = false;
          renderPuzzle();
        });
        renderPuzzle();
        return () => {
          clearTimeout(sequenceTimer);
          currentPuzzle = null;
        };
      }
  const root = document.getElementById("gameRoot");
  const cleanup = renderAttentionGame(root);
  window.addEventListener("pagehide", cleanup, { once: true });
})();
