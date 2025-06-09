const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('resetBtn');

// Ball properties
const radius = 18;
let x = canvas.width / 2;
let y = radius;
let vy = 0;
let vx = 0;
const gravity = 0.5; // px/frame^2
const bounce = 0.7; // energy loss on bounce

let isAiming = false;
let aimStart = { x: 0, y: 0 };
let aimEnd = { x: 0, y: 0 };
let isDragging = false;
let offsetY = 0;
let offsetX = 0;
let lastX = x, lastY = y;
let dragStart = { x: 0, y: 0, time: 0 };
let tail = [];
let bounces = [];

// Ragdoll target properties
let ragdolls = [
  { x: 320, y: 500, w: 40, h: 80, hit: false },
  { x: 80, y: 400, w: 40, h: 80, hit: false }
];
let score = 0;
let level = 1;
let gameOver = false;

function randomRagdolls(count) {
  const ragdollList = [];
  for (let i = 0; i < count; i++) {
    let w = 20 + Math.random() * 20;
    let h = 20 + Math.random() * 20;
    let x = Math.random() * (canvas.width - w);
    let y = Math.random() * (canvas.height - h - 100) + 80;
    ragdollList.push({ x, y, w, h, hit: false });
  }
  return ragdollList;
}

function respawnRagdolls() {
  setTimeout(() => {
    level++;
    let count = Math.min(Math.pow(2, level), 80); // double each level, cap at 80
    ragdolls = randomRagdolls(count);
    if (ragdolls.length * 40 * 40 > canvas.width * canvas.height * 0.7) {
      gameOver = true;
    }
  }, 1000);
}

function drawBall() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw tail
  ctx.beginPath();
  for (let i = 0; i < tail.length - 1; i++) {
    ctx.moveTo(tail[i].x, tail[i].y);
    ctx.lineTo(tail[i + 1].x, tail[i + 1].y);
  }
  ctx.strokeStyle = 'rgba(79,140,255,0.3)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.closePath();

  // Draw bounces
  bounces.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 99, 71, 0.7)';
    ctx.fill();
    ctx.closePath();
  });

  // Draw ragdolls
  ragdolls.forEach(r => {
    if (!r.hit) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#ffb347';
      ctx.shadowColor = '#ff6347';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.closePath();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  });

  // Draw aiming line
  if (isAiming) {
    ctx.beginPath();
    ctx.moveTo(aimStart.x, aimStart.y);
    ctx.lineTo(aimEnd.x, aimEnd.y);
    ctx.strokeStyle = '#ff6347';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.closePath();
  }

  // Draw ball
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#4f8cff';
  ctx.shadowColor = '#2563eb';
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.closePath();
  ctx.shadowBlur = 0;

  // Draw coordinates
  ctx.font = '16px Segoe UI';
  ctx.fillStyle = '#2d3a4b';
  ctx.fillText(`x: ${x.toFixed(1)}, y: ${y.toFixed(1)}`, 10, 24);
  // Draw score
  ctx.font = 'bold 20px Segoe UI';
  ctx.fillStyle = '#ff6347';
  ctx.fillText(`Score: ${score}`, canvas.width - 120, 32);
  if (gameOver) {
    ctx.font = 'bold 36px Segoe UI';
    ctx.fillStyle = '#d90429';
    ctx.fillText('GAME OVER', canvas.width / 2 - 110, canvas.height / 2);
  }
}

function checkRagdollCollision() {
  ragdolls.forEach((r, i) => {
    if (!r.hit) {
      let closestX = Math.max(r.x, Math.min(x, r.x + r.w));
      let closestY = Math.max(r.y, Math.min(y, r.y + r.h));
      let dist = Math.hypot(x - closestX, y - closestY);
      if (dist < radius) {
        r.hit = true;
        score += 1;
        // Respond: push other ragdolls away
        ragdolls.forEach((other, j) => {
          if (i !== j && !other.hit) {
            // Simple push: move away horizontally
            let dx = other.x + other.w / 2 - (r.x + r.w / 2);
            let dy = other.y + other.h / 2 - (r.y + r.h / 2);
            let mag = Math.max(1, Math.hypot(dx, dy));
            other.x += (dx / mag) * 40;
            other.y += (dy / mag) * 20;
            // Clamp inside canvas
            other.x = Math.max(0, Math.min(canvas.width - other.w, other.x));
            other.y = Math.max(0, Math.min(canvas.height - other.h, other.y));
          }
        });
      }
    }
  });
}

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  if (Math.hypot(mouseX - x, mouseY - y) < radius) {
    isAiming = true;
    aimStart = { x: x, y: y };
    aimEnd = { x: mouseX, y: mouseY };
    vx = 0; vy = 0;
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (isAiming) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    aimEnd = { x: mouseX, y: mouseY };
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (isAiming) {
    isAiming = false;
    // Calculate launch velocity (slingshot effect)
    vx = (aimStart.x - aimEnd.x) * 0.15;
    vy = (aimStart.y - aimEnd.y) * 0.15;
  }
});

canvas.addEventListener('mouseleave', () => {
  isAiming = false;
});

function respawnRagdolls() {
  setTimeout(() => {
    level++;
    let count = Math.min(Math.pow(2, level), 80); // double each level, cap at 80
    ragdolls = randomRagdolls(count);
    if (ragdolls.length * 40 * 40 > canvas.width * canvas.height * 0.7) {
      gameOver = true;
    }
  }, 1000);
}

function update() {
  if (gameOver) {
    drawBall();
    return;
  }
  if (!isAiming) {
    vy += gravity;
    x += vx;
    y += vy;
    // Bounce on all walls
    let bounced = false;
    if (x - radius < 0) {
      x = radius;
      vx *= -bounce;
      bounced = true;
    } else if (x + radius > canvas.width) {
      x = canvas.width - radius;
      vx *= -bounce;
      bounced = true;
    }
    if (y - radius < 0) {
      y = radius;
      vy *= -bounce;
      bounced = true;
    } else if (y + radius > canvas.height) {
      y = canvas.height - radius;
      vy *= -bounce;
      bounced = true;
    }
    if (bounced) {
      bounces.push({ x, y });
      if (bounces.length > 10) bounces.shift();
    }
    // Friction for realism
    vx *= 0.995;
    vy *= 0.995;
    // Check ragdoll collision
    checkRagdollCollision();
    // Respawn ragdolls if all are hit
    if (ragdolls.every(r => r.hit) && !gameOver && ragdolls.length > 0) {
      respawnRagdolls();
    }
  }
  // Tail tracing
  if (!isAiming) {
    tail.push({ x, y });
    if (tail.length > 100) tail.shift();
  } else {
    tail = [{ x, y }];
  }
  drawBall();
  requestAnimationFrame(update);
}

resetBtn.addEventListener('click', () => {
  x = canvas.width / 2;
  y = radius;
  vx = 0;
  vy = 0;
  tail = [{ x, y }];
  bounces = [];
  score = 0;
  level = 1;
  gameOver = false;
  ragdolls = randomRagdolls(2);
});

// Initialize first ragdolls
ragdolls = randomRagdolls(2);

// Start animation
update();
