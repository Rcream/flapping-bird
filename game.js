const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 400, H = 600;

const GRAVITY = 0.45;
const FLAP_VELOCITY = -7.5;
const PIPE_WIDTH = 50;
const PIPE_SPEED = 3.5;
const PIPE_GAP = 120;
const PIPE_SPAWN_INTERVAL = 1500;
const GROUND_HEIGHT = 50;
const BIRD_SIZE = 30;

const STATE_READY = 0;
const STATE_PLAYING = 1;
const STATE_OVER = 2;

const readyOverlay = document.getElementById('readyOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const scoreDisplay = document.getElementById('scoreDisplay');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('finalScore');
const highScoreEl = document.getElementById('highScore');
const readyHighScoreEl = document.getElementById('readyHighScore');
const restartBtn = document.getElementById('restartBtn');

class Bird {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 80;
    this.y = H / 2;
    this.vel = 0;
    this.rotation = 0;
    this.size = BIRD_SIZE;
  }

  flap() {
    this.vel = FLAP_VELOCITY;
  }

  update() {
    this.vel += GRAVITY;
    this.y += this.vel;

    if (this.vel < -2) {
      this.rotation = -25;
    } else if (this.vel > 2) {
      this.rotation = Math.min(90, this.rotation + 4);
    } else {
      this.rotation *= 0.9;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    ctx.rotate((this.rotation * Math.PI) / 180);

    ctx.fillStyle = '#f5c842';
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 2;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(5, -5, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(7, -5, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e85d04';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(25, -2);
    ctx.lineTo(25, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.size, h: this.size };
  }
}

class Pipe {
  constructor(x) {
    this.x = x;
    this.width = PIPE_WIDTH;
    this.gapY = 100 + Math.random() * (H - GROUND_HEIGHT - 240);
    this.gapHeight = PIPE_GAP;
    this.passed = false;
  }

  update() {
    this.x -= PIPE_SPEED;
  }

  draw() {
    const pipeColor = '#73bf2e';
    const pipeBorder = '#4a7d1c';
    const pipeHighlight = '#8ed13c';

    ctx.fillStyle = pipeColor;
    ctx.strokeStyle = pipeBorder;
    ctx.lineWidth = 3;
    this.drawRoundedRect(this.x, 0, this.width, this.gapY);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pipeHighlight;
    ctx.strokeStyle = pipeBorder;
    ctx.fillRect(this.x - 4, this.gapY - 20, this.width + 8, 20);
    ctx.strokeRect(this.x - 4, this.gapY - 20, this.width + 8, 20);

    const bottomY = this.gapY + this.gapHeight;
    ctx.fillStyle = pipeColor;
    ctx.strokeStyle = pipeBorder;
    this.drawRoundedRect(this.x, bottomY, this.width, H - bottomY - GROUND_HEIGHT);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pipeHighlight;
    ctx.strokeStyle = pipeBorder;
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
    this.bird = new Bird();
    this.pipes = [];
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
    this.frameCount = 0;
    this.lastPipeSpawn = 0;
    this.hoverAngle = 0;
    this.hoverBaseY = this.bird.y;
    this.updateOverlays();
  }

  updateOverlays() {
    readyOverlay.style.display = 'none';
    gameOverOverlay.style.display = 'none';
    scoreDisplay.style.display = 'none';

    if (this.state === STATE_READY) {
      readyOverlay.style.display = 'flex';
      readyHighScoreEl.textContent = this.highScore;
    } else if (this.state === STATE_PLAYING) {
      scoreDisplay.style.display = 'block';
      scoreEl.textContent = this.score;
    } else if (this.state === STATE_OVER) {
      gameOverOverlay.style.display = 'flex';
      finalScoreEl.textContent = this.score;
      highScoreEl.textContent = this.highScore;
      const line = document.querySelector('.best-score-line');
      if (this.score > 0 && this.score >= this.highScore) {
        line.classList.add('new-record');
      } else {
        line.classList.remove('new-record');
      }
    }
  }

  reset() {
    this.bird.reset();
    this.pipes = [];
    this.score = 0;
    this.frameCount = 0;
    this.lastPipeSpawn = 0;
    this.state = STATE_READY;
    this.updateOverlays();
  }

  startGame() {
    this.bird.reset();
    this.pipes = [];
    this.score = 0;
    this.frameCount = 0;
    this.lastPipeSpawn = Date.now();
    this.state = STATE_PLAYING;
    this.updateOverlays();
  }

  flap() {
    if (this.state === STATE_READY) {
      this.startGame();
    } else if (this.state === STATE_PLAYING) {
      this.bird.flap();
    } else if (this.state === STATE_OVER) {
      this.reset();
    }
  }

  spawnPipe() {
    const lastPipe = this.pipes[this.pipes.length - 1];
    const minSpacing = 200;
    if (lastPipe && lastPipe.x > W - minSpacing) return;
    this.pipes.push(new Pipe(W));
  }

  update() {
    if (this.state === STATE_READY) {
      this.hoverAngle += 0.03;
      this.bird.y = this.hoverBaseY + Math.sin(this.hoverAngle) * 8;
      return;
    }

    if (this.state === STATE_PLAYING) {
      this.frameCount++;
      this.bird.update();

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

    if (b.y + b.h > H - GROUND_HEIGHT) {
      return true;
    }

    if (b.y < 0) {
      return true;
    }

    for (const pipe of this.pipes) {
      const top = pipe.getBoundsTop();
      const bottom = pipe.getBoundsBottom();
      if (this.rectCollide(b, top) || this.rectCollide(b, bottom)) {
        return true;
      }
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

    this.bird.draw();
  }

  drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_HEIGHT);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H - GROUND_HEIGHT);
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

const game = new Game();

function gameLoop() {
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

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
    e.preventDefault();
    game.flap();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
    e.preventDefault();
  }
}, { passive: false });

gameLoop();
