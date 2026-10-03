(() => {
function renderRacingGame(root) {
        const width = 480;
        const height = 640;
        const road = { left: 58, right: 422 };
        const player = { x: width / 2, y: height - 112, width: 46, height: 76, speed: 0 };
        const traffic = [];
        const keys = new Set();
        let score = 0;
        let lives = 3;
        let spawnTimer = .8;
        let roadOffset = 0;
        let invulnerable = 0;
        let phase = "ready";
        let lastTime = 0;
        let frame = 0;

        root.innerHTML = `
          <div class="racing-game">
            <h2>Гонки 2D</h2>
            <p>Уворачивайся от машин и набирай очки.</p>
            <div class="mini-status" id="racingStatus" role="status">Счёт: 0 · Машинки: 3</div>
            <canvas class="racing-canvas" id="racingCanvas" width="${width}" height="${height}" aria-label="Дорога сверху, двигай машинку влево и вправо"></canvas>
            <div class="racing-controls" aria-label="Управление машинкой">
              <button type="button" data-steer="left" aria-label="Повернуть влево">←</button>
              <button type="button" data-steer="right" aria-label="Повернуть вправо">→</button>
            </div>
            <p class="racing-hint">Компьютер: ← → или A/D · Телефон: удерживай стрелку</p>
            <button class="mini-action" id="racingStart" type="button">Старт</button>
          </div>`;

        const racingCanvas = root.querySelector("#racingCanvas");
        const racingContext = racingCanvas.getContext("2d");
        const status = root.querySelector("#racingStatus");
        const startButton = root.querySelector("#racingStart");

        function roundedPath(x, y, w, h, radius) {
          racingContext.beginPath();
          racingContext.roundRect(x, y, w, h, radius);
        }

        function drawCar(x, y, carWidth, carHeight, body, windshield) {
          const carCtx = racingContext;
          carCtx.fillStyle = "rgba(23, 34, 28, .28)";
          roundedPath(x - carWidth / 2 + 3, y - carHeight / 2 + 4, carWidth, carHeight, 11);
          carCtx.fill();
          carCtx.fillStyle = body;
          roundedPath(x - carWidth / 2, y - carHeight / 2, carWidth, carHeight, 11);
          carCtx.fill();
          carCtx.fillStyle = windshield;
          roundedPath(x - carWidth * .32, y - carHeight * .23, carWidth * .64, carHeight * .27, 7);
          carCtx.fill();
          roundedPath(x - carWidth * .32, y + carHeight * .15, carWidth * .64, carHeight * .2, 6);
          carCtx.fill();
          carCtx.fillStyle = "#242b29";
          carCtx.fillRect(x - carWidth / 2 - 3, y - carHeight * .31, 5, 15);
          carCtx.fillRect(x + carWidth / 2 - 2, y - carHeight * .31, 5, 15);
          carCtx.fillRect(x - carWidth / 2 - 3, y + carHeight * .22, 5, 15);
          carCtx.fillRect(x + carWidth / 2 - 2, y + carHeight * .22, 5, 15);
          carCtx.fillStyle = "#fff1b5";
          carCtx.fillRect(x - carWidth * .34, y - carHeight / 2 + 3, 9, 4);
          carCtx.fillRect(x + carWidth * .14, y - carHeight / 2 + 3, 9, 4);
        }

        function drawRoad() {
          const gameCtx = racingContext;
          gameCtx.fillStyle = "#173344";
          gameCtx.fillRect(0, 0, width, height);
          gameCtx.fillStyle = "#202c3b";
          gameCtx.fillRect(road.left, 0, road.right - road.left, height);
          gameCtx.fillStyle = "#56bce8";
          gameCtx.fillRect(road.left - 5, 0, 5, height);
          gameCtx.fillRect(road.right, 0, 5, height);
          gameCtx.fillStyle = "#d5f4ff";
          for (let y = -90 + roadOffset; y < height; y += 130) {
            gameCtx.fillRect(width / 2 - 4, y, 8, 68);
          }
          gameCtx.fillStyle = "rgba(92, 190, 225, .18)";
          for (let y = -50 + (roadOffset * .65) % 105; y < height; y += 105) {
            gameCtx.beginPath();
            gameCtx.arc(24, y, 10, 0, Math.PI * 2);
            gameCtx.arc(width - 24, y + 34, 12, 0, Math.PI * 2);
            gameCtx.fill();
          }
        }

        function draw() {
          racingContext.clearRect(0, 0, width, height);
          drawRoad();
          traffic.forEach((car) => drawCar(car.x, car.y, car.width, car.height, car.color, car.glass));
          if (invulnerable <= 0 || Math.floor(performance.now() / 90) % 2 === 0) {
            drawCar(player.x, player.y, player.width, player.height, "#e7bd55", "#c3e0d1");
          }
        }

        function updateStatus() {
          status.textContent = `Счёт: ${Math.floor(score)} · Машинки: ${lives}`;
        }

        function reset() {
          cancelAnimationFrame(frame);
          traffic.length = 0;
          keys.clear();
          score = 0;
          lives = 3;
          spawnTimer = .8;
          roadOffset = 0;
          invulnerable = 0;
          player.x = width / 2;
          player.speed = 0;
          phase = "playing";
          startButton.hidden = true;
          updateStatus();
          lastTime = performance.now();
          frame = requestAnimationFrame(update);
        }

        function update(time) {
          if (phase !== "playing") return;
          const dt = Math.min((time - lastTime) / 1000, .035);
          lastTime = time;
          score += dt * 10;
          const roadSpeed = 210 + Math.min(score * 1.3, 280);
          roadOffset = (roadOffset + roadSpeed * dt) % 130;
          invulnerable = Math.max(0, invulnerable - dt);

          const steer = Number(keys.has("right")) - Number(keys.has("left"));
          player.speed += steer * 1600 * dt;
          if (!steer) player.speed *= Math.pow(.04, dt);
          player.speed = Math.max(-290, Math.min(290, player.speed));
          player.x += player.speed * dt;
          player.x = Math.max(road.left + player.width / 2 + 8, Math.min(road.right - player.width / 2 - 8, player.x));

          spawnTimer -= dt;
          if (spawnTimer <= 0) {
            const lanes = [road.left + 67, width / 2, road.right - 67];
            const available = lanes.filter((laneX) =>
              Math.abs(player.x - laneX) > 58 &&
              traffic.every((car) => Math.abs(car.x - laneX) > 54 || car.y > 180)
            );
            if (available.length) {
              const lane = available[Math.floor(Math.random() * available.length)];
              traffic.push({
                x: lane,
                y: -65,
                width: 43,
                height: 70,
                speed: roadSpeed * (.72 + Math.random() * .42),
                color: ["#db775e", "#7891ba", "#f2eee2", "#8a75aa"][Math.floor(Math.random() * 4)],
                glass: "#b9d8cb"
              });
              spawnTimer = Math.max(.48, 1.05 - score / 650) + Math.random() * .48;
            } else {
              spawnTimer = .25;
            }
          }

          for (let i = traffic.length - 1; i >= 0; i--) {
            const car = traffic[i];
            car.y += car.speed * dt;
            if (car.y - car.height / 2 > height) {
              traffic.splice(i, 1);
              score += 5;
              continue;
            }
            const overlapsX = Math.abs(player.x - car.x) < (player.width + car.width) * .42;
            const overlapsY = Math.abs(player.y - car.y) < (player.height + car.height) * .42;
            if (!invulnerable && overlapsX && overlapsY) {
              lives--;
              invulnerable = 1.2;
              player.x = width / 2;
              player.speed = 0;
              traffic.splice(i, 1);
              if (lives <= 0) {
                phase = "over";
                startButton.hidden = false;
                startButton.textContent = "Играть ещё";
                status.textContent = `Финиш! Счёт: ${Math.floor(score)}. Попробуешь ещё?`;
                draw();
                return;
              }
              updateStatus();
            }
          }

          updateStatus();
          draw();
          frame = requestAnimationFrame(update);
        }

        function setSteering(event, direction) {
          event.preventDefault();
          keys.add(direction);
        }

        function releaseSteering(direction) {
          keys.delete(direction);
        }

        function onKeyDown(event) {
          if (["ArrowLeft", "KeyA"].includes(event.code)) {
            event.preventDefault();
            keys.add("left");
          } else if (["ArrowRight", "KeyD"].includes(event.code)) {
            event.preventDefault();
            keys.add("right");
          }
        }

        function onKeyUp(event) {
          if (["ArrowLeft", "KeyA"].includes(event.code)) keys.delete("left");
          if (["ArrowRight", "KeyD"].includes(event.code)) keys.delete("right");
        }

        function onWindowBlur() {
          keys.clear();
        }

        const steeringButtons = [...root.querySelectorAll("[data-steer]")];
        steeringButtons.forEach((button) => {
          const direction = button.dataset.steer;
          button.addEventListener("pointerdown", (event) => setSteering(event, direction));
          button.addEventListener("pointerup", () => releaseSteering(direction));
          button.addEventListener("pointercancel", () => releaseSteering(direction));
          button.addEventListener("lostpointercapture", () => releaseSteering(direction));
          button.addEventListener("contextmenu", (event) => event.preventDefault());
        });
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", onWindowBlur);
        startButton.addEventListener("click", reset);
        draw();
        return () => {
          phase = "over";
          cancelAnimationFrame(frame);
          document.removeEventListener("keydown", onKeyDown);
          document.removeEventListener("keyup", onKeyUp);
          window.removeEventListener("blur", onWindowBlur);
          keys.clear();
        };
      }
  const root = document.getElementById("gameRoot");
  const cleanup = renderRacingGame(root);
  window.addEventListener("pagehide", cleanup, { once: true });
})();
