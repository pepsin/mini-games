import { Ball } from './js/Ball.js';
import { Hole } from './js/Hole.js';
import { HoleInAnimation } from './js/HoleInAnimation.js';
import { Physics } from './js/Physics.js';
import { InputHandler } from './js/InputHandler.js';
import { Camera } from './js/Camera.js';
import { Wave } from './js/Wave.js';

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
const camera = new Camera();
const wave = new Wave();

let stopped = true;
let levelY = 0;
let holeNumber = 1;
let trialCount = 0;
let ballLastPosition = { x: 0, y: 0, z: 0 };
let ballWasHit = false;
let holeInCompleted = false;

function saveBallPosition() {
    ballLastPosition = { x: ball.x, y: ball.y, z: ball.z };
}

function resetBall() {
    ball.reset(screenWidth, screenHeight, levelY);
    stopped = true;
    ballWasHit = false;
}

function resetHole() {
    hole.placeRandomly(screenWidth, screenHeight, ball.y);
}

function advanceLevel() {
    levelY -= screenHeight * 0.8;
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
        levelY = 0;
        camera.reset();
        resetBall();
        resetHole();
    }
);

function gameLoop() {
    ctx.fillStyle = '#f5e6c8';
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    wave.update();
    wave.draw(ctx, screenWidth, screenHeight);

    if (!stopped && !animation.active) {
        stopped = physics.update(ball, screenWidth);
    }

    camera.update(ball, screenWidth, screenHeight);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    if (!animation.active) {
        if (!stopped && hole.isInside(ball.x, ball.y, ball.z)) {
            animation.start(hole.x, hole.y, ball.x, ball.y, () => {
                ball.stop();
                stopped = true;
                advanceLevel();
                resetBall();
                resetHole();
            });
        }

        hole.draw(ctx);
        ball.draw(ctx, false);
        input.drawGuideLine(ctx, ball, camera);
    } else {
        animation.update();
        animation.draw(ctx, ball.radius, hole);
    }

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

resetBall();
resetHole();
gameLoop();
