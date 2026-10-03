(() => {
function renderPlatformerGame(root) {
        const width = 800;
        const height = 440;
        const player = { x: 0, y: 0, vx: 0, vy: 0, width: 28, height: 38, grounded: false, platform: null };
        const keys = new Set();
        const canvasId = "platformerCanvas";
        root.innerHTML = `
          <div class="challenge-game">
            <h2>Кристальный путь</h2>
            <p>Поднимайся по пещере всё выше, собирай кристаллы и добирайся до двери наверху. Каждый уровень длиннее, платформы двигаются, а каменные стены перекрывают путь.</p>
            <div class="mini-status" id="platformerStatus" role="status">Пещера 1 · Кристаллы: 0/3 · Всего: 0 · Сердца: 3</div>
            <canvas class="challenge-canvas" id="${canvasId}" width="${width}" height="${height}" aria-label="Платформер в пещере: собери кристаллы и доберись до выхода"></canvas>
            <div class="challenge-controls" aria-label="Управление персонажем">
              <button type="button" data-platform="left" aria-label="Двигаться влево">←</button>
              <button type="button" data-platform="right" aria-label="Двигаться вправо">→</button>
              <button class="jump-button" type="button" data-platform="jump" aria-label="Прыгнуть">ПРЫЖОК ↑</button>
            </div>
            <p class="challenge-help">Компьютер: A/D или ←/→ · прыжок: пробел/W/↑. Телефон: экранные кнопки.</p>
            <button class="mini-action" id="platformerStart" type="button">Начать приключение</button>
          </div>`;
        const canvas = root.querySelector(`#${canvasId}`);
        const ctx = canvas.getContext("2d");
        const status = root.querySelector("#platformerStatus");
        const start = root.querySelector("#platformerStart");
        let level = 0;
        let lives = 3;
        let totalGems = 0;
        let phase = "ready";
        let lastTime = 0;
        let frame = 0;
        let jumpQueued = false;
        let notice = "";
        let noticeUntil = 0;
        let caveHeight = 820;
        let floorY = 0;
        let cameraY = 0;
        let platforms = [];
        let movingWalls = [];
        let gems = [];
        const exit = { x: 0, y: 30, width: 48, height: 62 };

        function makeCave() {
          caveHeight = 820 + level * 105;
          floorY = caveHeight - 46;
          platforms = [];
          movingWalls = [];
          let previousX = 76;
          let row = 0;

          for (let y = floorY - 78; y >= 96; y -= 78) {
            const maxX = width - 150;
            const x = row === 0
              ? 72
              : Math.max(20, Math.min(maxX, previousX + Math.round((Math.random() - 0.5) * 220)));
            const moving = row > 0 && row % 3 === 2;
            const range = moving ? 40 + Math.min(level * 2, 24) : 0;
            platforms.push({
              x,
              y,
              width: 132,
              height: 14,
              moving,
              minX: Math.max(8, x - range),
              maxX: Math.min(width - 140, x + range),
              speed: 30 + Math.min(level * 2, 30),
              direction: Math.random() < 0.5 ? -1 : 1,
              deltaX: 0
            });
            if (row > 0 && row % 4 === 0) {
              movingWalls.push({
                x: 365,
                y: y + 38,
                width: 28,
                height: 42,
                minX: 112,
                maxX: width - 140,
                speed: 38 + Math.min(level * 2, 35),
                direction: Math.random() < 0.5 ? -1 : 1,
                deltaX: 0
              });
            }
            previousX = x;
            row += 1;
          }

          const finalPlatform = platforms[platforms.length - 1];
          exit.x = Math.max(12, Math.min(width - exit.width - 12, finalPlatform.x + (finalPlatform.width - exit.width) / 2));
          const gemCount = Math.min(9, Math.max(3, 3 + Math.floor(level / 2)), Math.ceil(platforms.length / 2));
          gems = [];
          for (let index = 0; index < gemCount; index += 1) {
            const platformIndex = Math.round(index * (platforms.length - 1) / Math.max(1, gemCount - 1));
            gems.push({ platform: platforms[platformIndex], collected: false });
          }
        }

        function resetPlayer() {
          player.x = 90;
          player.y = floorY - player.height;
          player.vx = 0;
          player.vy = 0;
          player.grounded = false;
          player.platform = null;
          cameraY = Math.max(0, caveHeight - height);
        }

        function updateStatus(message) {
          if (message) {
            notice = message;
            noticeUntil = performance.now() + 1500;
          }
          const found = gems.filter((gem) => gem.collected).length;
          status.textContent = notice && performance.now() < noticeUntil
            ? notice
            : `Пещера ${level + 1} · Кристаллы: ${found}/${gems.length} · Всего: ${totalGems} · Сердца: ${lives}`;
        }

        function draw() {
          const sky = ctx.createLinearGradient(0, 0, 0, height);
          sky.addColorStop(0, "#182b38");
          sky.addColorStop(1, "#456456");
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, width, height);
          ctx.save();
          ctx.translate(0, -cameraY);

          ctx.fillStyle = "rgba(202, 232, 199, .055)";
          for (let y = 45; y < caveHeight; y += 118) {
            const offset = Math.floor(y / 118);
            for (let side = 0; side < 2; side += 1) {
              const x = side ? width - 20 - (offset % 3) * 12 : 20 + (offset % 3) * 12;
              ctx.beginPath();
              ctx.arc(x, y, 13 + (offset % 3) * 5, Math.PI, Math.PI * 2);
              ctx.fill();
            }
          }

          ctx.fillStyle = "#263638";
          ctx.fillRect(0, floorY, width, caveHeight - floorY);
          ctx.fillStyle = "#73a474";
          ctx.fillRect(0, floorY, width, 7);
          platforms.forEach((platform) => {
            ctx.fillStyle = platform.moving ? "#38665d" : "#344b48";
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            ctx.fillStyle = platform.moving ? "#a7e8c3" : "#83b47b";
            ctx.fillRect(platform.x, platform.y, platform.width, 5);
            ctx.fillStyle = "rgba(209, 235, 180, .28)";
            for (let i = 0; i < platform.width - 10; i += 19) ctx.fillRect(platform.x + i + 5, platform.y + 9, 3, 2);
            if (platform.moving) {
              ctx.fillStyle = "rgba(181, 245, 218, .8)";
              ctx.fillRect(platform.x + platform.width / 2 - 13, platform.y + 2, 26, 2);
            }
          });
          movingWalls.forEach((wall) => {
            ctx.fillStyle = "#966a4b";
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            ctx.fillStyle = "#c99462";
            ctx.fillRect(wall.x + 4, wall.y + 5, wall.width - 8, 5);
            ctx.fillStyle = "rgba(27, 39, 42, .55)";
            ctx.fillRect(wall.x + 6, wall.y + 17, 4, 4);
            ctx.fillRect(wall.x + 18, wall.y + 29, 4, 4);
          });

          gems.forEach((gem, index) => {
            if (gem.collected) return;
            const x = gem.platform.x + gem.platform.width / 2;
            const y = gem.platform.y - 27 + Math.sin(performance.now() / 240 + index) * 3;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = "#b6f0ff";
            ctx.shadowColor = "#8ce6ff";
            ctx.shadowBlur = 14;
            ctx.fillRect(-9, -9, 18, 18);
            ctx.fillStyle = "#effcff";
            ctx.fillRect(-4, -6, 5, 8);
            ctx.restore();
          });

          const allGemsFound = gems.every((gem) => gem.collected);
          ctx.fillStyle = allGemsFound ? "#a8e594" : "#91a6a0";
          ctx.beginPath();
          ctx.roundRect(exit.x, exit.y, exit.width, exit.height, 8);
          ctx.fill();
          ctx.fillStyle = "#273632";
          ctx.beginPath();
          ctx.arc(exit.x + exit.width - 11, exit.y + exit.height / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#dff2dc";
          ctx.font = "bold 14px Arial";
          ctx.textAlign = "center";
          ctx.fillText(allGemsFound ? "ДВЕРЬ ОТКРЫТА" : "СОБЕРИ КРИСТАЛЛЫ", width / 2, cameraY + 25);

          ctx.fillStyle = "#bde2b4";
          ctx.beginPath();
          ctx.roundRect(player.x, player.y, player.width, player.height, 8);
          ctx.fill();
          ctx.fillStyle = "#28413b";
          ctx.fillRect(player.x + 17, player.y + 9, 4, 4);
          ctx.fillStyle = "#7fc78b";
          ctx.fillRect(player.x + 5, player.y + player.height - 5, 7, 5);
          ctx.fillRect(player.x + 18, player.y + player.height - 5, 7, 5);
          ctx.restore();

          ctx.fillStyle = "rgba(12, 24, 30, .55)";
          ctx.fillRect(12, 12, 150, 28);
          ctx.fillStyle = "#e4f4df";
          ctx.font = "bold 13px Arial";
          ctx.textAlign = "left";
          ctx.fillText(`ПЕЩЕРА ${level + 1} · ${Math.ceil(caveHeight / 100)} ЭТАЖЕЙ`, 22, 31);
          if (phase === "over") {
            ctx.fillStyle = "rgba(11, 20, 22, .72)";
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = "#f4f8ed";
            ctx.font = "bold 31px Arial";
            ctx.textAlign = "center";
            ctx.fillText("ПЕЩЕРУ НУЖНО ПОВТОРИТЬ", width / 2, 205);
          }
        }

        function loseLife(message) {
          lives--;
          keys.clear();
          jumpQueued = false;
          resetPlayer();
          if (lives <= 0) {
            phase = "over";
            start.hidden = false;
            start.textContent = "Повторить пещеру";
            updateStatus("Ловушка! Кристаллы в этой пещере нужно собрать снова.");
          } else {
            updateStatus(`${message} Осталось сердец: ${lives}.`);
          }
        }

        function overlaps(x, y, w, h, rx, ry, rw, rh) {
          return x < rx + rw && x + w > rx && y < ry + rh && y + h > ry;
        }

        function update(time) {
          if (phase !== "playing") return;
          const dt = Math.min((time - lastTime) / 1000, .035);
          lastTime = time;
          player.vx = (Number(keys.has("right")) - Number(keys.has("left"))) * 245;
          if (jumpQueued && player.grounded) {
            player.vy = -440;
            player.grounded = false;
            player.platform = null;
          }
          jumpQueued = false;

          platforms.forEach((platform) => {
            platform.deltaX = 0;
            if (!platform.moving) return;
            const previousX = platform.x;
            platform.x += platform.direction * platform.speed * dt;
            if (platform.x <= platform.minX || platform.x >= platform.maxX) {
              platform.x = Math.max(platform.minX, Math.min(platform.maxX, platform.x));
              platform.direction *= -1;
            }
            platform.deltaX = platform.x - previousX;
          });
          movingWalls.forEach((wall) => {
            wall.deltaX = 0;
            const previousX = wall.x;
            wall.x += wall.direction * wall.speed * dt;
            if (wall.x <= wall.minX || wall.x >= wall.maxX) {
              wall.x = Math.max(wall.minX, Math.min(wall.maxX, wall.x));
              wall.direction *= -1;
            }
            wall.deltaX = wall.x - previousX;
          });
          if (player.grounded && player.platform?.moving) player.x += player.platform.deltaX;

          const previousBottom = player.y + player.height;
          player.x += player.vx * dt;
          player.x = Math.max(0, Math.min(width - player.width, player.x));
          player.vy = Math.min(player.vy + 1050 * dt, 650);
          player.y += player.vy * dt;
          player.grounded = false;
          player.platform = null;
          if (player.vy >= 0) {
            let landing = null;
            platforms.forEach((platform) => {
              if (
                previousBottom <= platform.y + 4
                && player.y + player.height >= platform.y
                && player.x + player.width > platform.x
                && player.x < platform.x + platform.width
                && (!landing || platform.y < landing.y)
              ) landing = platform;
            });
            if (landing) {
              player.y = landing.y - player.height;
              player.vy = 0;
              player.grounded = true;
              player.platform = landing;
            } else if (previousBottom <= floorY && player.y + player.height >= floorY) {
              player.y = floorY - player.height;
              player.vy = 0;
              player.grounded = true;
            }
          }
          if (player.y > caveHeight + 100 && phase === "playing") loseLife("Ты сорвался в пропасть!");
          if (phase === "playing" && movingWalls.some((wall) => overlaps(
            player.x + 4,
            player.y + 3,
            player.width - 8,
            player.height - 6,
            wall.x,
            wall.y,
            wall.width,
            wall.height
          ))) loseLife("Берегись движущейся стены!");

          gems.forEach((gem) => {
            if (gem.collected) return;
            const x = gem.platform.x + gem.platform.width / 2;
            const y = gem.platform.y - 27;
            if (Math.hypot(player.x + player.width / 2 - x, player.y + player.height / 2 - y) < 28) {
              gem.collected = true;
              totalGems += 1;
              updateStatus("Кристалл найден!");
            }
          });
          if (overlaps(player.x, player.y, player.width, player.height, exit.x, exit.y, exit.width, exit.height)) {
            if (!gems.every((gem) => gem.collected)) updateStatus("Дверь закрыта — собери все кристаллы в пещере.");
            else {
              level += 1;
              lives = Math.min(5, lives + 1);
              keys.clear();
              jumpQueued = false;
              makeCave();
              resetPlayer();
              updateStatus(`Пещера ${level + 1} больше предыдущей! Сердце восстановлено.`);
            }
          }
          if (phase === "playing") {
            const targetCameraY = Math.max(0, Math.min(caveHeight - height, player.y + player.height / 2 - height * 0.56));
            cameraY += (targetCameraY - cameraY) * Math.min(1, dt * 5);
            updateStatus();
            draw();
            frame = requestAnimationFrame(update);
          }
        }

        function startGame() {
          cancelAnimationFrame(frame);
          level = 0;
          lives = 3;
          totalGems = 0;
          keys.clear();
          jumpQueued = false;
          notice = "";
          makeCave();
          resetPlayer();
          phase = "playing";
          start.hidden = true;
          updateStatus();
          draw();
          lastTime = performance.now();
          frame = requestAnimationFrame(update);
        }

        function continueCave() {
          cancelAnimationFrame(frame);
          lives = 3;
          gems.forEach((gem) => { gem.collected = false; });
          keys.clear();
          jumpQueued = false;
          notice = "";
          resetPlayer();
          phase = "playing";
          start.hidden = true;
          updateStatus(`Попробуй пещеру ${level + 1} ещё раз.`);
          draw();
          lastTime = performance.now();
          frame = requestAnimationFrame(update);
        }

        function onKeyDown(event) {
          const keyMap = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "jump", ArrowUp: "jump", KeyW: "jump" };
          const key = keyMap[event.code];
          if (!key) return;
          event.preventDefault();
          if (event.repeat) return;
          if (key === "jump") jumpQueued = true;
          else keys.add(key);
        }

        function onKeyUp(event) {
          const keyMap = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
          const key = keyMap[event.code];
          if (key) keys.delete(key);
        }

        function clearKeys() {
          keys.clear();
          jumpQueued = false;
        }

        root.querySelectorAll("[data-platform]").forEach((button) => {
          const key = button.dataset.platform;
          button.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            if (key === "jump") jumpQueued = true;
            else keys.add(key);
          });
          ["pointerup", "pointercancel", "pointerleave"].forEach((name) => button.addEventListener(name, () => keys.delete(key)));
        });
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", clearKeys);
        start.addEventListener("click", () => {
          if (phase === "over") continueCave();
          else startGame();
        });
        makeCave();
        resetPlayer();
        updateStatus();
        draw();
        return () => {
          phase = "over";
          cancelAnimationFrame(frame);
          document.removeEventListener("keydown", onKeyDown);
          document.removeEventListener("keyup", onKeyUp);
          window.removeEventListener("blur", clearKeys);
          keys.clear();
        };
      }
  const root = document.getElementById("gameRoot");
  const cleanup = renderPlatformerGame(root);
  window.addEventListener("pagehide", cleanup, { once: true });
})();
