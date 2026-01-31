(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  const CONFETTI_COUNT = 150;
  const COLORS = [
    '#d96b3f', // accent
    '#1f4f5f', // accent-2
    '#75b381', // green
    '#ffc648', // yellow
    '#ff6b9d', // pink
    '#4ecdc4', // teal
  ];

  class ConfettiPiece {
    constructor(canvas) {
      this.canvas = canvas;
      this.reset();
      // Start from random position across top
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height - canvas.height;
    }

    reset() {
      this.x = Math.random() * this.canvas.width;
      this.y = -20;
      this.size = Math.random() * 8 + 4;
      this.speedY = Math.random() * 3 + 2;
      this.speedX = Math.random() * 2 - 1;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = Math.random() * 10 - 5;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.opacity = 1;
      this.shape = Math.random() > 0.5 ? 'square' : 'circle';
    }

    update(deltaTime) {
      this.y += this.speedY * deltaTime;
      this.x += this.speedX * deltaTime;
      this.rotation += this.rotationSpeed * deltaTime;
      this.speedY += 0.1 * deltaTime; // gravity

      // Fade out near bottom
      if (this.y > this.canvas.height - 100) {
        this.opacity = Math.max(0, 1 - (this.y - (this.canvas.height - 100)) / 100);
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);

      if (this.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      } else {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      }

      ctx.restore();
    }

    isDead() {
      return this.y > this.canvas.height + 20;
    }
  }

  Puzzle.createConfetti = function createConfetti() {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const pieces = [];

    for (let i = 0; i < CONFETTI_COUNT; i++) {
      pieces.push(new ConfettiPiece(canvas));
    }

    let lastTime = Date.now();
    let animationId = null;

    function animate() {
      const now = Date.now();
      const deltaTime = Math.min((now - lastTime) / 16, 2); // Cap at 2 for slow frames
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allDead = true;
      pieces.forEach((piece) => {
        piece.update(deltaTime);
        piece.draw(ctx);
        if (!piece.isDead()) {
          allDead = false;
        }
      });

      if (allDead) {
        cancelAnimationFrame(animationId);
        canvas.remove();
      } else {
        animationId = requestAnimationFrame(animate);
      }
    }

    animationId = requestAnimationFrame(animate);

    // Cleanup on window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Remove listener when animation ends
    const cleanup = () => {
      window.removeEventListener('resize', handleResize);
    };

    setTimeout(cleanup, 5000); // Cleanup after 5 seconds max
  };

  Puzzle.celebrate = function celebrate() {
    Puzzle.createConfetti();
  };
})();
