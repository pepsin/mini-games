import { Ball } from './js/Ball.js';
import { Hole } from './js/Hole.js';
import { HoleInAnimation } from './js/HoleInAnimation.js';
import { Physics } from './js/Physics.js';
import { InputHandler } from './js/InputHandler.js';

const { windowWidth, windowHeight, pixelRatio } = wx.getSystemInfoSync();

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

canvas.width = windowWidth * pixelRatio;
canvas.height = windowHeight * pixelRatio;
ctx.scale(pixelRatio, pixelRatio);

const screenWidth = windowWidth;
const screenHeight = windowHeight;

const ball = new Ball();
const hole = new Hole();
const animation = new HoleInAnimation();
const physics = new Physics();

let stopped = true;

function resetBall() {
    ball.reset(screenWidth, screenHeight);
    stopped = true;
}

function resetHole() {
    hole.placeRandomly(screenWidth, screenHeight);
}

const input = new InputHandler(
    screenWidth,
    screenHeight,
    (vx, vy, vz) => {
        if (animation.active) return;
        ball.vx = vx;
        ball.vy = vy;
        ball.vz = vz;
        stopped = false;
    },
    () => {
        if (animation.active) return;
        resetBall();
        resetHole();
    }
);

function gameLoop() {
    ctx.fillStyle = '#f5e6c8';
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    if (!stopped && !animation.active) {
        stopped = physics.update(ball, screenWidth, screenHeight);
    }

    if (!animation.active) {
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

resetBall();
resetHole();
gameLoop();
