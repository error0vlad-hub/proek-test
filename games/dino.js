(() => {
  const root = document.getElementById("gameRoot");
  root.innerHTML = [
    "<h2>Дино-побег</h2>",
    "<p>Прыгай через кактусы, пригибайся от птиц и ставь рекорды.</p>",
    "<div class=\"scores\" aria-live=\"polite\" aria-atomic=\"true\"><span>СЧЁТ<strong id=\"score\">00000</strong></span><span>РЕКОРД<strong id=\"best\">00000</strong></span></div>",
    "<section class=\"arena\" aria-label=\"Игровое поле\">",
    "<canvas id=\"dinoCanvas\" width=\"900\" height=\"300\" aria-label=\"Динозавр бежит по пустыне. Перепрыгивайте кактусы и птиц.\"></canvas>",
    "<div class=\"overlay\" id=\"overlay\"><div class=\"overlay-content\"><h2 id=\"overlayTitle\">Готов к приключению?</h2><p id=\"overlayText\">Прыгай через кактусы и ставь рекорды!</p><button id=\"startButton\" type=\"button\">Начать игру</button></div></div>",
    "</section>",
    "<div class=\"game-controls\" aria-label=\"Управление игрой\"><button id=\"pauseButton\" type=\"button\" disabled>Пауза</button></div>",
    "<footer class=\"bottomline\"><span id=\"controlInstructions\"></span><span id=\"pauseInstructions\"><span class=\"key\">P</span> — пауза</span></footer>"
  ].join("");
  const canvas = root.querySelector("#dinoCanvas");
  const ctx = canvas.getContext("2d");
  const scoreElement = root.querySelector("#score");
  const bestElement = root.querySelector("#best");
  const overlay = root.querySelector("#overlay");
  const overlayTitle = root.querySelector("#overlayTitle");
  const overlayText = root.querySelector("#overlayText");
  const startButton = root.querySelector("#startButton");
  const pauseButton = root.querySelector("#pauseButton");
  const controlInstructions = root.querySelector("#controlInstructions");
  const pauseInstructions = root.querySelector("#pauseInstructions");
  const groundY = 238;
  const dino = { x: 105, y: groundY, vy: 0, width: 42, height: 48, legFrame: 0, ducking: false };
  const obstacles = [];
  const clouds = [{ x: 142, y: 63, size: 1 }, { x: 425, y: 100, size: .72 }, { x: 700, y: 54, size: .9 }];
  let state = "ready";
  let score = 0;
  let best = readBest();
  let speed = 340;
  let spawnTimer = 1.25;
  let previousTime = 0;
  let animationFrame = 0;
  let runDistance = 0;
  let touchHoldTimer = 0;
  let activeTouchPointer = null;
  let touchHoldTriggered = false;
  let testMode = false;
  let typedCode = "";
  let lastCodeInput = 0;
  let ufoFlyby = null;
  let abductionScene = null;
  let ufoMilestoneReached = false;
  let cowMilestoneReached = false;
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  const hasTouchInput = () => coarsePointer.matches;

  function updateControlInstructions() {
    if (hasTouchInput()) {
      controlInstructions.textContent = "Коснись поля — прыгнуть · удерживай — пригнуться";
      pauseInstructions.hidden = true;
    } else {
      controlInstructions.innerHTML = '<span class="key">ПРОБЕЛ</span> / <span class="key">↑</span> — прыжок · <span class="key">↓</span> — пригнуться';
      pauseInstructions.hidden = false;
    }
  }

  updateControlInstructions();
  coarsePointer.addEventListener("change", updateControlInstructions);
  function readBest() {
    try { return Number(localStorage.getItem("dinoEscapeBest")) || 0; }
    catch (error) { console.warn("Не удалось прочитать рекорд из хранилища браузера.", error); return 0; }
  }
  function saveBest(value) {
    try { localStorage.setItem("dinoEscapeBest", String(value)); }
    catch (error) { console.warn("Не удалось сохранить рекорд в хранилище браузера.", error); }
  }
  function formatScore(value) { return String(Math.floor(value)).padStart(5, "0"); }
      function startGame() {
        cancelAnimationFrame(animationFrame);
        clearTimeout(touchHoldTimer);
        activeTouchPointer = null;
        touchHoldTriggered = false;
        score = 0;
        speed = 340;
        spawnTimer = 1.1;
        dino.y = groundY;
        dino.vy = 0;
        dino.legFrame = 0;
        dino.ducking = false;
        runDistance = 0;
        ufoFlyby = null;
        abductionScene = null;
        ufoMilestoneReached = false;
        cowMilestoneReached = false;
        obstacles.length = 0;
        scoreElement.textContent = formatScore(score);
        state = "playing";
        pauseButton.disabled = false;
        pauseButton.textContent = "Пауза";
        overlay.hidden = true;
        previousTime = performance.now();
        animationFrame = requestAnimationFrame(update);
      }

      function jump() {
        if (state !== "playing" || dino.ducking) return;
        if (dino.y >= groundY - .5) dino.vy = -650;
      }

      function togglePause() {
        if (state === "playing") {
          state = "paused";
          cancelAnimationFrame(animationFrame);
          pauseButton.textContent = "Продолжить";
          overlayTitle.textContent = "Передышка";
          overlayText.textContent = "Забег на паузе. Готов продолжить?";
          startButton.textContent = "Продолжить";
          overlay.hidden = false;
        } else if (state === "paused") {
          state = "playing";
          pauseButton.textContent = "Пауза";
          overlay.hidden = true;
          previousTime = performance.now();
          animationFrame = requestAnimationFrame(update);
        }
      }

      function endGame() {
        state = "over";
        dino.ducking = false;
        pauseButton.disabled = true;
        pauseButton.textContent = "Пауза";
        overlayTitle.textContent = "Вот это забег!";
        overlayText.textContent = `Твой счёт — ${formatScore(score)}. Сможешь ещё дальше?`;
        startButton.textContent = "Играть ещё";
        overlay.hidden = false;
        if (dino.y < groundY) {
          dino.vy = Math.max(dino.vy, 0);
          previousTime = performance.now();
          animationFrame = requestAnimationFrame(finishCrash);
        }
      }

      function finishCrash(time) {
        if (state !== "over") return;
        const dt = Math.min((time - previousTime) / 1000, .035);
        previousTime = time;
        dino.vy += 1800 * dt;
        dino.y = Math.min(groundY, dino.y + dino.vy * dt);
        draw();
        if (dino.y < groundY) animationFrame = requestAnimationFrame(finishCrash);
      }

      function update(time) {
        const dt = Math.min((time - previousTime) / 1000, .035);
        previousTime = time;
        score += dt * 10;
        if (testMode) score += dt * 400;
        if (score >= 1000 && !ufoMilestoneReached) {
          ufoMilestoneReached = true;
          ufoFlyby = { elapsed: 0, duration: 2.1 };
        }
        if (score >= 2000 && !cowMilestoneReached) {
          cowMilestoneReached = true;
          abductionScene = { elapsed: 0 };
        }
        if (ufoFlyby) {
          ufoFlyby.elapsed += dt;
          if (ufoFlyby.elapsed >= ufoFlyby.duration) ufoFlyby = null;
        }
        if (abductionScene) {
          abductionScene.elapsed += dt;
          if (abductionScene.elapsed > 6.4) abductionScene = null;
        }
        speed = Math.min(340 + score * 2.1, 720);
        dino.vy += 1800 * dt;
        dino.y = Math.min(groundY, dino.y + dino.vy * dt);
        if (dino.y >= groundY) dino.vy = 0;
        dino.legFrame += dt * (speed / 35);

        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          obstacles.push(...makeObstacleSet());
          spawnTimer = Math.max(1.02, 1.55 + Math.random() * .85 - score / 1200);
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
          const obstacle = obstacles[i];
          obstacle.x -= speed * dt;
          if (obstacle.x + obstacle.width < 0) obstacles.splice(i, 1);
          if (!testMode && collides(obstacle)) {
            score = Math.floor(score);
            if (score > best) {
              best = score;
              bestElement.textContent = formatScore(best);
              saveBest(best);
            }
            scoreElement.textContent = formatScore(score);
            endGame();
            draw();
            return;
          }
        }

        for (const cloud of clouds) {
          cloud.x -= speed * dt * .12;
          if (cloud.x < -100) cloud.x = 960 + Math.random() * 120;
        }
        runDistance = (runDistance + speed * dt) % canvas.width;

        scoreElement.textContent = formatScore(score);
        draw();
        animationFrame = requestAnimationFrame(update);
      }

      function makeObstacleSet() {
        if (score > 65 && Math.random() < .3) {
          const birdY = Math.random() < .5 ? groundY - 4 : groundY - 38;
          return [{
            type: "bird",
            x: 930,
            y: birdY,
            width: 47,
            height: 25,
            wingFrame: 0
          }];
        }

        const groupSize = score < 500
          ? 2 + Math.floor(Math.random() * 2)
          : 4 + Math.floor(Math.random() * 2);
        const group = [];
        let x = 930;
        for (let i = 0; i < groupSize; i++) {
          const height = 34 + Math.random() * 18;
          const width = 20 + Math.random() * 9;
          group.push({ type: "cactus", x, y: groundY + dino.height - height, width, height });
          x += width + 14 + Math.random() * 12;
        }
        return group;
      }

      function collides(obstacle) {
        const isDucking = dino.ducking && dino.y >= groundY - .5;
        const playerTop = isDucking ? groundY + 28 : dino.y + 6;
        const playerBottom = isDucking ? groundY + dino.height : dino.y + dino.height;
        const playerLeft = dino.x + (isDucking ? 2 : 8);
        const playerRight = dino.x + (isDucking ? 48 : dino.width - 6);
        const padding = obstacle.type === "bird" ? 5 : 3;
        return playerRight > obstacle.x + padding &&
          playerLeft < obstacle.x + obstacle.width - padding &&
          playerBottom > obstacle.y + padding && playerTop < obstacle.y + obstacle.height - padding;
      }

      function draw() {
        const night = Math.floor(score / 180) % 2 === 1;
        const colors = night
          ? { sky: "#202c3a", hill: "#2b3944", ground: "#82958b", cloud: "rgba(154, 177, 181, .48)", detail: "#70847d", cactus: "#a6c879", dino: "#d2e6a0", bird: "#dfb974" }
          : { sky: "#f7faef", hill: "#e9f0df", ground: "#b9cba9", cloud: "rgba(208, 223, 193, .67)", detail: "#a8bf97", cactus: "#4c8c57", dino: "#285e44", bird: "#b8794c" };
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = colors.sky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (night) drawNightSky();
        drawUfoFlyby();
        clouds.forEach((cloud) => drawCloud(cloud, colors.cloud));
        drawHill(0, 225, 180, 32, colors.hill);
        drawHill(260, 232, 220, 22, colors.hill);
        drawHill(620, 226, 210, 29, colors.hill);

        ctx.strokeStyle = colors.ground;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY + dino.height);
        ctx.lineTo(canvas.width, groundY + dino.height);
        ctx.stroke();

        ctx.fillStyle = colors.detail;
        for (let i = 0; i < 24; i++) {
          const x = (i * 71 - runDistance) % canvas.width;
          const y = 249 + (i % 3) * 8;
          ctx.fillRect(x, y, 3 + (i % 2), 2);
        }

        drawAbductionScene();
        obstacles.forEach((obstacle) => {
          if (obstacle.type === "bird") drawBird(obstacle, colors.bird);
          else drawCactus(obstacle, colors.cactus);
        });
        drawDino(colors.dino);
        drawFallingCake();
        drawCakeExplosion();
      }

      function drawUfoFlyby() {
        if (!ufoFlyby) return;
        const progress = ufoFlyby.elapsed / ufoFlyby.duration;
        const x = canvas.width + 80 - progress * (canvas.width + 240);
        const y = 71 + Math.sin(ufoFlyby.elapsed * 2.4) * 10;
        drawUfo(x, y, 1, .72, false);
      }

      function drawAbductionScene() {
        if (!abductionScene) return;
        const time = abductionScene.elapsed;
        const approach = Math.min(time / 1.5, 1);
        const exit = Math.max(0, Math.min((time - 3.8) / 2.2, 1));
        const x = time < 1.5
          ? canvas.width + 70 - approach * 490
          : 510 - exit * 720;
        const y = 61 + Math.sin(time * 2) * 3;
        const beamVisible = time >= 1.5 && time < 3.8;
        drawUfo(x, y, 1, 1, beamVisible);

        if (beamVisible) {
          const lift = Math.min(Math.max((time - 1.7) / 1.55, 0), 1);
          const cowBottom = groundY + 40 - lift * 111;
          drawCow(x + 102, cowBottom, .72, 1 - Math.max(0, (time - 3.15) / .65));
        }
      }

      function drawUfo(x, y, scale, alpha, beam) {
        ctx.save();
        ctx.globalAlpha = alpha;
        if (beam) {
          const gradient = ctx.createLinearGradient(x + 59 * scale, y + 32 * scale, x + 98 * scale, groundY + 35);
          gradient.addColorStop(0, "rgba(173, 208, 123, .3)");
          gradient.addColorStop(1, "rgba(173, 208, 123, .02)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(x + 43 * scale, y + 29 * scale);
          ctx.lineTo(x + 76 * scale, y + 29 * scale);
          ctx.lineTo(x + 126 * scale, groundY + 36);
          ctx.lineTo(x - 4 * scale, groundY + 36);
          ctx.closePath();
          ctx.fill();
        }

        ctx.fillStyle = "#91a995";
        ctx.beginPath();
        ctx.ellipse(x + 59 * scale, y + 28 * scale, 60 * scale, 17 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#bfd4a1";
        ctx.beginPath();
        ctx.ellipse(x + 59 * scale, y + 24 * scale, 43 * scale, 11 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#b8d6c2";
        ctx.beginPath();
        ctx.ellipse(x + 59 * scale, y + 17 * scale, 25 * scale, 17 * scale, Math.PI, 0, true);
        ctx.fill();
        ctx.fillStyle = "#f7e6a1";
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc((x + (27 + i * 16) * scale), y + 29 * scale, 2.3 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      function drawCow(x, bottom, scale, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, bottom);
        ctx.scale(scale, scale);
        ctx.fillStyle = "#fffdf1";
        ctx.beginPath();
        ctx.ellipse(0, -17, 25, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#54715d";
        ctx.beginPath();
        ctx.ellipse(-8, -21, 8, 6, -.3, 0, Math.PI * 2);
        ctx.ellipse(9, -12, 7, 5, .4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fffdf1";
        ctx.beginPath();
        ctx.ellipse(22, -29, 12, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e6aaa0";
        ctx.beginPath();
        ctx.ellipse(26, -24, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fffdf1";
        ctx.beginPath();
        ctx.moveTo(16, -37);
        ctx.lineTo(13, -45);
        ctx.lineTo(22, -39);
        ctx.moveTo(27, -38);
        ctx.lineTo(32, -45);
        ctx.lineTo(33, -36);
        ctx.fill();
        ctx.fillStyle = "#344a3b";
        ctx.beginPath();
        ctx.arc(25, -31, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fffdf1";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-17, -6);
        ctx.lineTo(-18, 0);
        ctx.moveTo(-4, -5);
        ctx.lineTo(-4, 0);
        ctx.moveTo(13, -7);
        ctx.lineTo(14, 0);
        ctx.stroke();
        ctx.restore();
      }

      function drawFallingCake() {
        if (!abductionScene || abductionScene.elapsed < 4.15) return;
        const fallTime = abductionScene.elapsed - 4.15;
        if (fallTime >= 1.05) return;
        const progress = fallTime / 1.05;
        const x = dino.x + 11;
        const y = -28 + progress * (groundY + dino.height - 53);

        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = "#f8efce";
        ctx.fillRect(0, 7, 38, 20);
        ctx.fillStyle = "#d97d68";
        ctx.fillRect(0, 18, 38, 5);
        ctx.fillStyle = "#fff4dc";
        ctx.beginPath();
        ctx.moveTo(-3, 9);
        ctx.quadraticCurveTo(6, 14, 12, 8);
        ctx.quadraticCurveTo(19, 14, 27, 8);
        ctx.quadraticCurveTo(33, 13, 41, 8);
        ctx.lineTo(38, 15);
        ctx.lineTo(0, 15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#d96958";
        ctx.beginPath();
        ctx.arc(19, 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      function drawCakeExplosion() {
        if (!abductionScene) return;
        const elapsed = abductionScene.elapsed - 5.2;
        if (elapsed < 0 || elapsed > 1.15) return;
        const x = dino.x + 29;
        const y = groundY + 19;
        const progress = elapsed / 1.15;
        const radius = 11 + progress * 53;
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.fillStyle = "#ffd77d";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f18568";
        for (let i = 0; i < 9; i++) {
          const angle = (Math.PI * 2 * i) / 9;
          const distance = radius * .72;
          ctx.beginPath();
          ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 4 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      function drawNightSky() {
        ctx.fillStyle = "rgba(244, 239, 193, .9)";
        ctx.beginPath();
        ctx.arc(735, 57, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#202c3a";
        ctx.beginPath();
        ctx.arc(744, 49, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(244, 239, 193, .75)";
        for (let i = 0; i < 18; i++) {
          const x = (i * 137 + 31) % canvas.width;
          const y = 24 + (i * 47) % 138;
          ctx.fillRect(x, y, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2);
        }
      }

      function drawCloud(cloud, color) {
        const x = cloud.x;
        const y = cloud.y;
        const s = cloud.size;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y, 31 * s, 9 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 14 * s, y - 6 * s, 13 * s, 12 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 1 * s, y - 11 * s, 17 * s, 16 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 17 * s, y - 5 * s, 14 * s, 11 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      function drawHill(x, y, width, height, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x + width / 2, y + height, width / 2, height, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }

      function drawCactus(cactus, color) {
        const x = cactus.x;
        const top = cactus.y;
        const bottom = groundY + dino.height;
        ctx.fillStyle = color;
        roundedRect(x + cactus.width * .34, top, cactus.width * .34, bottom - top, 5);
        roundedRect(x, top + cactus.height * .42, cactus.width * .4, 7, 4);
        roundedRect(x, top + cactus.height * .27, 7, cactus.height * .2, 4);
        roundedRect(x + cactus.width * .6, top + cactus.height * .29, cactus.width * .4, 7, 4);
        roundedRect(x + cactus.width - 7, top + cactus.height * .12, 7, cactus.height * .22, 4);
      }

      function drawBird(bird, color) {
        const flap = Math.sin(performance.now() / 75) * 7;
        const midX = bird.x + bird.width / 2;
        const midY = bird.y + bird.height / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(midX, midY, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(midX - 4, midY - 2);
        ctx.quadraticCurveTo(midX - 11, midY - 13 - flap, midX - 20, midY - 7);
        ctx.quadraticCurveTo(midX - 11, midY - 4, midX - 4, midY + 3);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(midX + 3, midY - 2);
        ctx.quadraticCurveTo(midX + 10, midY - 13 - flap, midX + 19, midY - 7);
        ctx.quadraticCurveTo(midX + 11, midY - 4, midX + 3, midY + 3);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(midX + 12, midY - 2);
        ctx.lineTo(midX + 22, midY + 1);
        ctx.lineTo(midX + 12, midY + 3);
        ctx.fill();
      }

      function drawDino(color) {
        const x = dino.x;
        const y = dino.y;
        const grounded = y >= groundY - .5;
        const leg = grounded && state === "playing" ? Math.floor(dino.legFrame) % 2 : 0;
        ctx.fillStyle = color;
        if (dino.ducking && grounded) {
          roundedRect(x + 3, groundY + 32, 39, 15, 7);
          roundedRect(x + 32, groundY + 29, 18, 13, 6);
          ctx.fillRect(x + 44, groundY + 32, 5, 3);
          ctx.fillStyle = "#f6faed";
          ctx.fillRect(x + 42, groundY + 32, 3, 3);
          ctx.fillStyle = color;
          roundedRect(x + 12, groundY + 43, 8, 5, 2);
          roundedRect(x + 33, groundY + 43, 8, 5, 2);
          return;
        }
        ctx.beginPath();
        ctx.moveTo(x + 7, y + 31);
        ctx.lineTo(x - 4, y + 26);
        ctx.lineTo(x + 7, y + 24);
        ctx.closePath();
        ctx.fill();
        roundedRect(x + 5, y + 18, 23, 24, 7);
        roundedRect(x + 18, y + 4, 21, 20, 6);
        roundedRect(x + 31, y + 11, 17, 10, 4);
        ctx.fillStyle = color;
        ctx.fillRect(x + 23, y + 2, 5, 5);
        ctx.fillRect(x + 34, y + 2, 5, 5);
        ctx.fillStyle = "#f6faed";
        ctx.fillRect(x + 34, y + 9, 3, 3);
        ctx.fillStyle = "#244436";
        ctx.fillRect(x + 35, y + 10, 2, 2);
        ctx.fillStyle = "#86b56e";
        ctx.fillRect(x + 13, y + 25, 5, 5);
        roundedRect(x + 13, y + 39, 7, leg ? 9 : 7, 3);
        roundedRect(x + 25, y + 39, 7, leg ? 7 : 9, 3);
      }

      function roundedRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, Math.min(radius, width / 2, height / 2));
        ctx.fill();
      }

  bestElement.textContent = formatScore(best);
  draw();
  startButton.addEventListener("click", () => state === "paused" ? togglePause() : startGame());
  pauseButton.addEventListener("click", togglePause);
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (event.pointerType === "touch") {
      if (state === "ready" || state === "over") startGame();
      if (state !== "playing") return;
      activeTouchPointer = event.pointerId;
      touchHoldTriggered = false;
      canvas.setPointerCapture(event.pointerId);
      touchHoldTimer = window.setTimeout(() => {
        if (activeTouchPointer === event.pointerId && state === "playing") { touchHoldTriggered = true; dino.ducking = true; }
      }, 220);
      return;
    }
    if (state === "ready" || state === "over") { startGame(); return; }
    jump();
  });
  function finishTouch(event, allowTapJump) {
    if (event.pointerId !== activeTouchPointer) return;
    clearTimeout(touchHoldTimer);
    if (state === "playing") { if (touchHoldTriggered) dino.ducking = false; else if (allowTapJump) jump(); }
    activeTouchPointer = null;
    touchHoldTriggered = false;
  }
  canvas.addEventListener("pointerup", (event) => finishTouch(event, true));
  canvas.addEventListener("pointercancel", (event) => finishTouch(event, false));
  canvas.addEventListener("lostpointercapture", (event) => finishTouch(event, false));
  function onKeyDown(event) {
    if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
      const now = performance.now();
      typedCode = now - lastCodeInput > 1500 ? event.key.toLowerCase() : (typedCode + event.key.toLowerCase()).slice(-3);
      lastCodeInput = now;
      if (typedCode === "ufo" && !testMode) testMode = true;
    } else if (event.key.length === 1) typedCode = "";
    if (event.code === "KeyP" || event.code === "Escape") { event.preventDefault(); togglePause(); }
    else if (event.code === "ArrowDown" || event.code === "KeyS") {
      event.preventDefault();
      if (state === "playing" && dino.y >= groundY - .5) dino.ducking = true;
    } else if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      event.preventDefault();
      if (state === "ready" || state === "over") startGame(); else jump();
    }
  }
  function onKeyUp(event) { if (event.code === "ArrowDown" || event.code === "KeyS") dino.ducking = false; }
  function onVisibilityChange() { if (document.hidden && state === "playing") togglePause(); }
  function onWindowBlur() {
    clearTimeout(touchHoldTimer);
    activeTouchPointer = null;
    touchHoldTriggered = false;
    dino.ducking = false;
  }
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(animationFrame);
    clearTimeout(touchHoldTimer);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onWindowBlur);
    coarsePointer.removeEventListener("change", updateControlInstructions);
  }, { once: true });
})();
