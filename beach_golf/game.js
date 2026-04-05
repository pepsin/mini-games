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

// 基于累计进洞数使用正弦函数计算新洞位置
function resetHole(useSineCalculation = false, currentHoleY = null) {
    if (useSineCalculation && currentHoleY !== null) {
        // 使用正弦函数基于进洞数计算偏移值 (0 到 1 之间)
        const sineValue = (Math.sin(holeNumber * 1.5) + 1) / 2;
        
        // 一屏范围
        const margin = 80;
        
        // x 位置：在屏幕宽度范围内基于正弦值偏移
        const xOffset = sineValue * (screenWidth - margin * 2);
        hole.x = margin + xOffset;
        
        // y 位置：在离当前洞一屏的位置，基于正弦值在向上一屏范围内设置
        // 新洞在当前洞上方一屏距离的基础上，根据正弦值在 0 到一屏范围内偏移
        const yOffset = sineValue * screenHeight * 0.8;
        hole.y = currentHoleY - screenHeight * 0.8 + yOffset * 0.4;
    } else {
        hole.placeRandomly(screenWidth, screenHeight, ball.y);
    }
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

    // 球是否在移动（有速度或正在飞行）
    const isBallMoving = !stopped || ball.z > 0;
    camera.update(ball, screenWidth, screenHeight, isBallMoving);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    if (!animation.active) {
        if (!stopped && hole.isInside(ball.x, ball.y, ball.z)) {
            const currentHoleX = hole.x;
            const currentHoleY = hole.y;
            
            animation.start(hole.x, hole.y, ball.x, ball.y, () => {
                ball.stop();
                stopped = true;
                advanceLevel();
                
                // 基于正弦函数设置新洞位置
                resetHole(true, currentHoleY);
                
                // 重置球到新位置
                resetBall();
                
                // 进洞数加 1
                holeNumber++;
                
                // 设置镜头位置使球和新洞都可见
                camera.setPositionToShowBallAndHole(ball.y, hole.y, screenHeight);
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
