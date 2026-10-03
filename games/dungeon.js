(() => {
function renderDungeonGame(root) {
        const columns = 21;
        const rows = 15;
        const tileSize = 26;
        const width = columns * tileSize;
        const height = rows * tileSize;
        const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        const keyNames = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowRight: [1, 0], KeyD: [1, 0], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0] };
        const player = { x: 1, y: 1, health: 5, keys: 0, treasure: 0, depth: 1 };
        let map = [];
        let enemies = [];
        let phase = "ready";
        let record = 0;
        let notice = "";
        let noticeUntil = 0;
        root.innerHTML = `
          <div class="dungeon-game">
            <h2>Бесконечное подземелье</h2>
            <p>Каждый этаж — новый лабиринт. Найди ключ, собирай сокровища и отбивайся от монстров, чтобы спуститься глубже.</p>
            <div class="mini-status" id="dungeonStatus" role="status">Этаж 1 · Сердца: 5 · Сокровища: 0 · Рекорд: 0</div>
            <canvas class="dungeon-canvas" id="dungeonCanvas" width="${width}" height="${height}" aria-label="Случайный лабиринт подземелья с монстрами и сокровищами"></canvas>
            <div class="dungeon-controls" aria-label="Управление исследователем">
              <div class="dungeon-pad" aria-label="Движение по лабиринту">
                <button type="button" data-step="up" aria-label="Двигаться вверх">↑</button>
                <button type="button" data-step="left" aria-label="Двигаться влево">←</button>
                <button type="button" data-step="down" aria-label="Двигаться вниз">↓</button>
                <button type="button" data-step="right" aria-label="Двигаться вправо">→</button>
              </div>
              <button class="dungeon-attack" id="dungeonAttack" type="button">Удар<br>⚔</button>
            </div>
            <p class="dungeon-hint">Компьютер: WASD или стрелки · удар: пробел/Enter. Телефон: стрелки и кнопка удара.</p>
            <button class="mini-action" id="dungeonStart" type="button">Начать спуск</button>
          </div>`;
        const canvas = root.querySelector("#dungeonCanvas");
        const ctx = canvas.getContext("2d");
        const status = root.querySelector("#dungeonStatus");
        const start = root.querySelector("#dungeonStart");
        const attackButton = root.querySelector("#dungeonAttack");

        function cell(x, y) {
          return y >= 0 && y < rows && x >= 0 && x < columns ? map[y][x] : 0;
        }

        function shuffle(list) {
          for (let i = list.length - 1; i > 0; i--) {
            const index = Math.floor(Math.random() * (i + 1));
            [list[i], list[index]] = [list[index], list[i]];
          }
          return list;
        }

        function generateFloor() {
          map = Array.from({ length: rows }, () => Array(columns).fill(0));
          const visited = new Set(["0,0"]);
          const stack = [[0, 0]];
          map[1][1] = 1;
          while (stack.length) {
            const [gx, gy] = stack[stack.length - 1];
            const choices = shuffle(directions.map(([dx, dy]) => [gx + dx, gy + dy, dx, dy])
              .filter(([nx, ny]) => nx >= 0 && nx < 10 && ny >= 0 && ny < 7 && !visited.has(`${nx},${ny}`)));
            if (!choices.length) {
              stack.pop();
              continue;
            }
            const [nx, ny, dx, dy] = choices[0];
            visited.add(`${nx},${ny}`);
            map[gy * 2 + 1 + dy][gx * 2 + 1 + dx] = 1;
            map[ny * 2 + 1][nx * 2 + 1] = 1;
            stack.push([nx, ny]);
          }
          map[13][19] = 3;
          const empty = [];
          for (let y = 1; y < rows - 1; y++) {
            for (let x = 1; x < columns - 1; x++) {
              if (map[y][x] !== 1 || (x === 1 && y === 1) || (x === 19 && y === 13)) continue;
              empty.push([x, y]);
            }
          }
          shuffle(empty);
          const key = empty.pop();
          map[key[1]][key[0]] = 2;
          for (let i = 0; i < 4; i++) {
            const item = empty.pop();
            map[item[1]][item[0]] = i === 3 ? 5 : 4;
          }
          enemies = [];
          const enemyCount = Math.min(2 + Math.floor(player.depth / 2), 10);
          for (let i = 0; i < enemyCount && empty.length; i++) {
            const [x, y] = empty.pop();
            enemies.push({ x, y, health: player.depth >= 6 && i % 3 === 0 ? 2 : 1 });
          }
          player.x = 1;
          player.y = 1;
          player.keys = 0;
        }

        function updateStatus(message) {
          if (message) {
            notice = message;
            noticeUntil = performance.now() + 1300;
          }
          status.textContent = notice && performance.now() < noticeUntil
            ? notice
            : `Этаж ${player.depth} · Сердца: ${player.health} · Ключ: ${player.keys ? "есть" : "нет"} · Сокровища: ${player.treasure} · Рекорд: ${record}`;
        }

        function draw() {
          ctx.fillStyle = "#101a19";
          ctx.fillRect(0, 0, width, height);
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < columns; x++) {
              const tile = map[y][x];
              const px = x * tileSize;
              const py = y * tileSize;
              if (tile === 0) {
                ctx.fillStyle = (x + y) % 2 ? "#263a37" : "#2c403b";
                ctx.fillRect(px, py, tileSize, tileSize);
                ctx.fillStyle = "rgba(177, 211, 174, .08)";
                ctx.fillRect(px + 3, py + 4, 7, 2);
                ctx.fillRect(px + 15, py + 17, 6, 2);
              } else {
                ctx.fillStyle = (x + y) % 2 ? "#b6a889" : "#ad9d7d";
                ctx.fillRect(px, py, tileSize, tileSize);
                ctx.fillStyle = "rgba(69, 58, 42, .12)";
                ctx.fillRect(px + 4, py + 5, 2, 2);
                ctx.fillRect(px + 18, py + 17, 3, 2);
              }
              if (tile === 2) {
                ctx.fillStyle = "#f2d16f";
                ctx.font = "bold 19px Arial";
                ctx.textAlign = "center";
                ctx.fillText("⚿", px + tileSize / 2, py + 20);
              } else if (tile === 3) {
                ctx.fillStyle = "#6c5844";
                ctx.fillRect(px + 5, py + 5, 16, 19);
                ctx.fillStyle = player.keys ? "#9de293" : "#e2a878";
                ctx.beginPath();
                ctx.arc(px + 13, py + 14, 4, 0, Math.PI * 2);
                ctx.fill();
              } else if (tile === 4) {
                ctx.fillStyle = "#72e4d3";
                ctx.shadowColor = "#53dccd";
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(px + 13, py + 4);
                ctx.lineTo(px + 21, py + 13);
                ctx.lineTo(px + 13, py + 22);
                ctx.lineTo(px + 5, py + 13);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;
              } else if (tile === 5) {
                ctx.fillStyle = "#ed8b9a";
                ctx.beginPath();
                ctx.roundRect(px + 8, py + 6, 10, 15, 4);
                ctx.fill();
                ctx.fillStyle = "#f9d6cf";
                ctx.fillRect(px + 11, py + 3, 4, 5);
              }
            }
          }
          enemies.forEach((enemy) => {
            ctx.fillStyle = enemy.health > 1 ? "#c56d77" : "#df826f";
            ctx.beginPath();
            ctx.arc((enemy.x + .5) * tileSize, (enemy.y + .5) * tileSize, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#3b2730";
            ctx.fillRect(enemy.x * tileSize + 9, enemy.y * tileSize + 9, 3, 3);
            ctx.fillRect(enemy.x * tileSize + 15, enemy.y * tileSize + 9, 3, 3);
            if (enemy.health > 1) {
              ctx.strokeStyle = "#ffd6a6";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc((enemy.x + .5) * tileSize, (enemy.y + .5) * tileSize, 11, 0, Math.PI * 2);
              ctx.stroke();
            }
          });
          const px = (player.x + .5) * tileSize;
          const py = (player.y + .5) * tileSize;
          ctx.fillStyle = "#d8f2b0";
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#334737";
          ctx.fillRect(px + 2, py - 3, 2, 2);
          ctx.fillRect(px + 5, py - 3, 2, 2);
          if (phase === "over") {
            ctx.fillStyle = "rgba(10, 15, 15, .77)";
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = "#f4f8ed";
            ctx.font = "bold 25px Arial";
            ctx.textAlign = "center";
            ctx.fillText("ТЫ УПАЛ В ПОДЗЕМЕЛЬЕ", width / 2, height / 2);
          }
        }

        function findNextStep(startX, startY, targetX, targetY) {
          const queue = [[startX, startY]];
          const previous = new Map([[`${startX},${startY}`, null]]);
          for (let i = 0; i < queue.length; i++) {
            const [x, y] = queue[i];
            if (x === targetX && y === targetY) break;
            for (const [dx, dy] of directions) {
              const nx = x + dx;
              const ny = y + dy;
              const id = `${nx},${ny}`;
              if (cell(nx, ny) === 0 || previous.has(id)) continue;
              previous.set(id, [x, y]);
              queue.push([nx, ny]);
            }
          }
          const targetId = `${targetX},${targetY}`;
          if (!previous.has(targetId)) return null;
          let current = [targetX, targetY];
          while (true) {
            const parent = previous.get(`${current[0]},${current[1]}`);
            if (!parent) return null;
            if (parent[0] === startX && parent[1] === startY) return current;
            current = parent;
          }
        }

        function finishFloor() {
          player.depth++;
          player.health = Math.min(5, player.health + 1);
          if (player.depth > record) {
            record = player.depth;
            try {
              localStorage.setItem("dungeonBestDepth", String(record));
            } catch (error) {
              console.warn("Не удалось сохранить рекорд подземелья.", error);
            }
          }
          generateFloor();
          updateStatus(`Лестница найдена! Добро пожаловать на этаж ${player.depth}.`);
        }

        function takeDamage() {
          player.health--;
          player.invulnerableTurns = 2;
          if (player.health <= 0) {
            phase = "over";
            start.hidden = false;
            start.textContent = "Спуститься снова";
            updateStatus(`Путь окончен на этаже ${player.depth}. Сокровищ найдено: ${player.treasure}.`);
          } else {
            updateStatus(`Монстр ударил! Осталось сердец: ${player.health}.`);
          }
        }

        function enemyTurn() {
          if (phase !== "playing") return;
          if (player.invulnerableTurns > 0) player.invulnerableTurns--;
          enemies.forEach((enemy) => {
            if (phase !== "playing") return;
            const next = findNextStep(enemy.x, enemy.y, player.x, player.y);
            if (!next) return;
            if (next[0] === player.x && next[1] === player.y) {
              if (!player.invulnerableTurns) takeDamage();
              return;
            }
            if (!enemies.some((other) => other !== enemy && other.x === next[0] && other.y === next[1])) {
              enemy.x = next[0];
              enemy.y = next[1];
            }
          });
        }

        function act(dx, dy) {
          if (phase !== "playing") return;
          const nx = player.x + dx;
          const ny = player.y + dy;
          if (cell(nx, ny) === 0) return;
          const enemy = enemies.find((item) => item.x === nx && item.y === ny);
          if (enemy) {
            enemy.health--;
            if (enemy.health <= 0) {
              enemies.splice(enemies.indexOf(enemy), 1);
              updateStatus("Монстр повержен!");
            } else {
              updateStatus("Монстр крепкий — ударь ещё раз!");
            }
          } else {
            player.x = nx;
            player.y = ny;
            if (cell(nx, ny) === 2) {
              player.keys = 1;
              map[ny][nx] = 1;
              updateStatus("Ключ найден! Ищи лестницу.");
            } else if (cell(nx, ny) === 3) {
              if (!player.keys) updateStatus("Лестница заперта — найди ключ.");
              else {
                finishFloor();
                draw();
                return;
              }
            } else if (cell(nx, ny) === 4) {
              player.treasure++;
              map[ny][nx] = 1;
              updateStatus("Кристалл добавлен в коллекцию!");
            } else if (cell(nx, ny) === 5) {
              player.health = Math.min(5, player.health + 1);
              map[ny][nx] = 1;
              updateStatus("Зелье исцелило одно сердце.");
            }
          }
          enemyTurn();
          updateStatus();
          draw();
        }

        function attack() {
          if (phase !== "playing") return;
          const adjacent = enemies.find((enemy) => Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y) === 1);
          if (adjacent) {
            adjacent.health--;
            if (adjacent.health <= 0) {
              enemies.splice(enemies.indexOf(adjacent), 1);
              updateStatus("Монстр повержен!");
            } else updateStatus("Монстр крепкий — ударь ещё раз!");
          } else updateStatus("Подойди вплотную к монстру, чтобы ударить.");
          enemyTurn();
          updateStatus();
          draw();
        }

        function startGame() {
          player.depth = 1;
          player.health = 5;
          player.treasure = 0;
          player.keys = 0;
          player.invulnerableTurns = 0;
          phase = "playing";
          start.hidden = true;
          generateFloor();
          updateStatus();
          draw();
        }

        function onKeyDown(event) {
          if (phase !== "playing") return;
          const direction = keyNames[event.code];
          if (direction) {
            event.preventDefault();
            if (!event.repeat) act(direction[0], direction[1]);
          } else if (event.code === "Space" || event.code === "Enter") {
            event.preventDefault();
            if (!event.repeat) attack();
          }
        }

        root.querySelectorAll("[data-step]").forEach((button) => {
          button.addEventListener("click", () => {
            const [dx, dy] = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[button.dataset.step];
            act(dx, dy);
          });
        });
        attackButton.addEventListener("click", attack);
        document.addEventListener("keydown", onKeyDown);
        start.addEventListener("click", startGame);
        try {
          record = Number(localStorage.getItem("dungeonBestDepth")) || 0;
        } catch (error) {
          console.warn("Не удалось прочитать рекорд подземелья.", error);
        }
        generateFloor();
        phase = "ready";
        draw();
        return () => {
          phase = "over";
          document.removeEventListener("keydown", onKeyDown);
        };
      }
  const root = document.getElementById("gameRoot");
  const cleanup = renderDungeonGame(root);
  window.addEventListener("pagehide", cleanup, { once: true });
})();
