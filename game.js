const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 400, H = 600;

const GRAVITY = 0.45;
const FLAP_VELOCITY = -7.5;
const PIPE_WIDTH = 50;
const BASE_PIPE_SPEED = 3.5;
const PIPE_GAP = 120;
const PIPE_SPAWN_INTERVAL = 1500;
const GROUND_HEIGHT = 50;
const BIRD_SIZE = 30;

const BIRD_COLORS = {
  '#f5c842': { body: '#f5c842', stroke: '#d4a017' },
  '#e74c3c': { body: '#e74c3c', stroke: '#b03a2e' },
  '#3498db': { body: '#3498db', stroke: '#2471a3' },
  '#2ecc71': { body: '#2ecc71', stroke: '#1e8449' },
};

const STATE_READY = 0;
const STATE_PLAYING = 1;
const STATE_PAUSED = 2;
const STATE_OVER = 3;

const readyOverlay = document.getElementById('readyOverlay');
const pausedOverlay = document.getElementById('pausedOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const scoreDisplay = document.getElementById('scoreDisplay');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('finalScore');
const highScoreEl = document.getElementById('highScore');
const readyHighScoreEl = document.getElementById('readyHighScore');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const soundBtn = document.getElementById('soundBtn');
const colorCircles = document.querySelectorAll('.color-circle');

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

class Particle {
  constructor(x, y, colorKey) {
    this.x = x;
    this.y = y;
    this.vx = -2.5 + Math.random() * 1.5;
    this.vy = -2.5 + Math.random() * 3;
    this.life = 1;
    this.decay = 0.025 + Math.random() * 0.035;
    this.radius = 2 + Math.random() * 3;
    this.color = BIRD_COLORS[colorKey].body;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.06;
    this.vx -= 0.02;
    this.life -= this.decay;
  }

  draw() {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  get alive() {
    return this.life > 0;
  }
}

class Bird {
  constructor(colorKey) {
    this.colorKey = colorKey;
    this.wingAngle = 0;
    this.wingAngularVel = 0;
    this.reset();
  }

  reset() {
    this.x = 80;
    this.y = H / 2;
    this.vel = 0;
    this.rotation = 0;
    this.size = BIRD_SIZE;
    this.wingAngle = 0;
    this.wingAngularVel = 0;
  }

  setColor(colorKey) {
    this.colorKey = colorKey;
  }

  flap() {
    this.vel = FLAP_VELOCITY;
    this.wingAngularVel = -14;
  }

  update(gameState) {
    this.vel += GRAVITY;
    this.y += this.vel;

    if (this.vel < -2) {
      this.rotation = -30;
    } else if (this.vel > 2) {
      this.rotation = Math.min(90, this.rotation + 4);
    } else {
      this.rotation *= 0.9;
    }

    if (gameState === STATE_READY) {
      this.wingAngle = Math.sin(performance.now() * 0.004) * 16;
    } else if (gameState === STATE_PLAYING) {
      let target = 0;
      if (this.vel < -1) {
        target = -44;
      } else if (this.vel > 2.5) {
        target = 28;
      }
      this.wingAngularVel += (target - this.wingAngle) * 0.12;
      this.wingAngularVel *= 0.88;
      this.wingAngle += this.wingAngularVel;
    }
  }

  drawWings() {
    const { body, stroke } = BIRD_COLORS[this.colorKey];

    ctx.save();
    ctx.translate(-this.size / 2 - 1, 0);
    ctx.rotate((this.wingAngle * Math.PI) / 180);
    ctx.fillStyle = body;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -9, 5, 14, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(this.size / 2 + 1, 0);
    ctx.rotate((this.wingAngle * Math.PI) / 180);
    ctx.fillStyle = body;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -9, 5, 14, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  draw() {
    const { body, stroke } = BIRD_COLORS[this.colorKey];

    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    ctx.rotate((this.rotation * Math.PI) / 180);

    this.drawWings();

    ctx.fillStyle = body;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-this.size / 2, -this.size / 2, this.size, this.size, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(5, -5, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(8, -5, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e85d04';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(26, -2);
    ctx.lineTo(26, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.size, h: this.size };
  }
}

class Pipe {
  constructor(x, speed) {
    this.x = x;
    this.width = PIPE_WIDTH;
    this.speed = speed;
    this.gapY = 100 + Math.random() * (H - GROUND_HEIGHT - 240);
    this.gapHeight = PIPE_GAP;
    this.passed = false;
  }

  update() {
    this.x -= this.speed;
  }

  draw() {
    ctx.fillStyle = '#73bf2e';
    ctx.strokeStyle = '#4a7d1c';
    ctx.lineWidth = 3;
    this.drawRoundedRect(this.x, 0, this.width, this.gapY);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8ed13c';
    ctx.strokeStyle = '#4a7d1c';
    ctx.fillRect(this.x - 4, this.gapY - 20, this.width + 8, 20);
    ctx.strokeRect(this.x - 4, this.gapY - 20, this.width + 8, 20);

    const bottomY = this.gapY + this.gapHeight;
    ctx.fillStyle = '#73bf2e';
    ctx.strokeStyle = '#4a7d1c';
    this.drawRoundedRect(this.x, bottomY, this.width, H - bottomY - GROUND_HEIGHT);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8ed13c';
    ctx.strokeStyle = '#4a7d1c';
    ctx.fillRect(this.x - 4, this.gapY + this.gapHeight, this.width + 8, 20);
    ctx.strokeRect(this.x - 4, this.gapY + this.gapHeight, this.width + 8, 20);
  }

  drawRoundedRect(x, y, w, h) {
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  getBoundsTop() {
    return { x: this.x, y: 0, w: this.width, h: this.gapY };
  }

  getBoundsBottom() {
    const bottomY = this.gapY + this.gapHeight;
    return { x: this.x, y: bottomY, w: this.width, h: H - bottomY - GROUND_HEIGHT };
  }
}

class Game {
  constructor() {
    this.state = STATE_READY;
    this.birdColorKey = '#f5c842';
    this.bird = new Bird(this.birdColorKey);
    this.pipes = [];
    this.particles = [];
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
    this.lastPipeSpawn = 0;
    this.hoverAngle = 0;
    this.hoverBaseY = this.bird.y;
    this.soundEnabled = true;
    this.audioCtx = null;
    this.pauseStartTime = 0;
    this.updateOverlays();
  }

  initAudio() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.soundEnabled = false;
    }
  }

  playTone(freq, duration, type, volume) {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume || 0.25, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  playFlap() {
    this.playTone(440, 0.07, 'sine', 0.2);
    this.playTone(520, 0.05, 'sine', 0.12);
  }

  playPoint() {
    this.playTone(523, 0.06, 'sine', 0.18);
    setTimeout(() => this.playTone(659, 0.08, 'sine', 0.15), 60);
    setTimeout(() => this.playTone(784, 0.1, 'sine', 0.12), 120);
  }

  playHit() {
    this.playTone(200, 0.12, 'sawtooth', 0.25);
    setTimeout(() => this.playTone(150, 0.15, 'sawtooth', 0.2), 80);
  }

  showOverlay(el) {
    el.classList.add('visible');
  }

  hideOverlay(el) {
    el.classList.remove('visible');
  }

  showScore() {
    scoreDisplay.classList.add('visible');
    scoreEl.textContent = this.score;
  }

  hideScore() {
    scoreDisplay.classList.remove('visible');
  }

  updateOverlays() {
    this.hideOverlay(readyOverlay);
    this.hideOverlay(pausedOverlay);
    this.hideOverlay(gameOverOverlay);
    this.hideScore();

    switch (this.state) {
      case STATE_READY:
        this.showOverlay(readyOverlay);
        readyHighScoreEl.textContent = this.highScore;
        break;
      case STATE_PLAYING:
        this.showScore();
        break;
      case STATE_PAUSED:
        this.showOverlay(pausedOverlay);
        this.showScore();
        break;
      case STATE_OVER:
        this.showOverlay(gameOverOverlay);
        finalScoreEl.textContent = this.score;
        highScoreEl.textContent = this.highScore;
        const line = document.querySelector('.best-score-line');
        if (this.score > 0 && this.score >= this.highScore) {
          line.classList.add('new-record');
        } else {
          line.classList.remove('new-record');
        }
        break;
    }
  }

  setBirdColor(colorKey) {
    this.birdColorKey = colorKey;
    this.bird.setColor(colorKey);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    soundBtn.textContent = this.soundEnabled ? '\u{1F50A}' : '\u{1F507}';
    soundBtn.title = this.soundEnabled ? 'Mute Sound' : 'Enable Sound';
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  togglePause() {
    if (this.state === STATE_PLAYING) {
      this.state = STATE_PAUSED;
      this.pauseStartTime = Date.now();
      this.updateOverlays();
      pauseBtn.textContent = '\u25B6';
      pauseBtn.title = 'Resume (P)';
    } else if (this.state === STATE_PAUSED) {
      this.state = STATE_PLAYING;
      const pausedDuration = Date.now() - this.pauseStartTime;
      this.lastPipeSpawn += pausedDuration;
      this.updateOverlays();
      pauseBtn.textContent = '\u23F8';
      pauseBtn.title = 'Pause (P)';
    }
  }

  reset() {
    this.bird.reset();
    this.pipes = [];
    this.particles = [];
    this.score = 0;
    this.lastPipeSpawn = 0;
    this.state = STATE_READY;
    this.updateOverlays();
    pauseBtn.textContent = '\u23F8';
    pauseBtn.title = 'Pause (P)';
  }

  startGame() {
    this.bird.reset();
    this.pipes = [];
    this.particles = [];
    this.score = 0;
    this.lastPipeSpawn = Date.now();
    this.state = STATE_PLAYING;
    this.updateOverlays();
    pauseBtn.textContent = '\u23F8';
    pauseBtn.title = 'Pause (P)';
  }

  flap() {
    this.initAudio();

    switch (this.state) {
      case STATE_READY:
        this.startGame();
        this.playFlap();
        break;
      case STATE_PLAYING:
        this.bird.flap();
        this.spawnParticles();
        this.playFlap();
        break;
      case STATE_OVER:
        this.reset();
        break;
    }
  }

  spawnParticles() {
    const cx = this.bird.x + this.bird.size / 2;
    const cy = this.bird.y + this.bird.size / 2;
    for (let i = 0; i < 6; i++) {
      this.particles.push(new Particle(cx, cy, this.birdColorKey));
    }
  }

  spawnPipe() {
    const lastPipe = this.pipes[this.pipes.length - 1];
    const minSpacing = 200;
    if (lastPipe && lastPipe.x > W - minSpacing) return;
    const speedMult = 1 + 0.1 * Math.floor(this.score / 10);
    this.pipes.push(new Pipe(W, BASE_PIPE_SPEED * speedMult));
  }

  update() {
    if (this.state === STATE_READY) {
      this.hoverAngle += 0.03;
      this.bird.y = this.hoverBaseY + Math.sin(this.hoverAngle) * 8;
      this.bird.update(STATE_READY);
      return;
    }

    if (this.state === STATE_PLAYING) {
      this.bird.update(STATE_PLAYING);

      for (const p of this.particles) {
        p.update();
      }
      this.particles = this.particles.filter(p => p.alive);

      const now = Date.now();
      if (now - this.lastPipeSpawn > PIPE_SPAWN_INTERVAL) {
        this.lastPipeSpawn = now;
        this.spawnPipe();
      }

      for (let i = this.pipes.length - 1; i >= 0; i--) {
        const pipe = this.pipes[i];
        pipe.update();

        if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
          pipe.passed = true;
          this.score++;
          scoreEl.textContent = this.score;
          this.playPoint();
        }

        if (pipe.x + pipe.width < 0) {
          this.pipes.splice(i, 1);
        }
      }

      if (this.checkCollision()) {
        this.gameOver();
      }
    }
  }

  checkCollision() {
    const b = this.bird.getBounds();

    if (b.y + b.h > H - GROUND_HEIGHT) return true;
    if (b.y < 0) return true;

    for (const pipe of this.pipes) {
      const top = pipe.getBoundsTop();
      const bottom = pipe.getBoundsBottom();
      if (this.rectCollide(b, top) || this.rectCollide(b, bottom)) return true;
    }

    return false;
  }

  rectCollide(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  gameOver() {
    this.state = STATE_OVER;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('flappyHighScore', this.highScore);
    }
    this.playHit();
    this.updateOverlays();
  }

  draw() {
    this.drawBackground();
    this.drawGround();

    if (this.state === STATE_PLAYING || this.state === STATE_OVER) {
      for (const pipe of this.pipes) {
        pipe.draw();
      }
    }

    if (this.state === STATE_PLAYING) {
      for (const p of this.particles) {
        p.draw();
      }
    }

    this.bird.draw();
  }

  drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);

    for (let i = 0; i < 5; i++) {
      const cloudX = (i * 120 + this.frameCount * 0.1) % (W + 100) - 50;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(cloudX, 60 + i * 25, 40, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloudX + 25, 55 + i * 25, 30, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGround() {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);

    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, H - GROUND_HEIGHT, W, 8);

    ctx.fillStyle = '#388E3C';
    for (let i = 0; i < W; i += 20) {
      ctx.fillRect(i, H - GROUND_HEIGHT - 4, 3, 12);
    }
  }
}

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    return this;
  };
}

const game = new Game();
let frameCount = 0;

function gameLoop() {
  game.frameCount = frameCount++;
  game.update();
  game.draw();
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', () => game.flap());
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  game.flap();
});

restartBtn.addEventListener('click', () => game.flap());

colorCircles.forEach(circle => {
  circle.addEventListener('click', () => {
    colorCircles.forEach(c => c.classList.remove('active'));
    circle.classList.add('active');
    game.setBirdColor(circle.dataset.color);
  });
});

pauseBtn.addEventListener('click', () => game.togglePause());
fullscreenBtn.addEventListener('click', () => game.toggleFullscreen());
soundBtn.addEventListener('click', () => game.toggleSound());

document.addEventListener('keydown', (e) => {
  const key = e.key;
  if (key === ' ' || key === 'Space' || key === 'ArrowUp') {
    e.preventDefault();
    game.flap();
  } else if (key === 'p' || key === 'P') {
    e.preventDefault();
    game.togglePause();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Space' || e.key === 'ArrowUp' || e.key === 'p' || e.key === 'P') {
    e.preventDefault();
  }
}, { passive: false });

gameLoop();
