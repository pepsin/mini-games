import { Ball } from './Ball.js';
import { Hole } from './Hole.js';
import { HoleInAnimation } from './HoleInAnimation.js';
import { Physics } from './Physics.js';
import { InputHandler } from './InputHandler.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Entities
const ball = new Ball();
const hole = new Hole();
const animation = new HoleInAnimation();
const physics = new Physics();

let stopped = true;

function resetBall() {
    ball.reset(canvas.width, canvas.height);
    stopped = true;
}

function resetHole() {
    hole.placeRandomly(canvas.width, canvas.height);
}

const input = new InputHandler(
    canvas,
    // onShoot
    (vx, vy, vz) => {
        if (animation.active) return;
        ball.vx = vx;
        ball.vy = vy;
        ball.vz = vz;
        stopped = false;
    },
    // onReset
    () => {
        if (animation.active) return;
        resetBall();
        resetHole();
    }
);

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!stopped && !animation.active) {
        stopped = physics.update(ball, canvas.width, canvas.height);
    }

    if (!animation.active) {
        // Check hole collision
        if (!stopped && hole.isInside(ball.x, ball.y, ball.z)) {
            animation.start(hole.x, hole.y, ball.x, ball.y, () => {
                ball.stop();
                stopped = true;
                resetHole();
            });
        }

        hole.draw(ctx);
        ball.draw(ctx, false);
        input.drawGuideLine(ctx, ball);
    } else {
        animation.update();
        animation.draw(ctx, ball.radius, hole);
    }

    requestAnimationFrame(gameLoop);
}

// Init
resetBall();
resetHole();
gameLoop();
