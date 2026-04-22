import { Ball } from './js/Ball.js';
import { Hole } from './js/Hole.js';
import { HoleInAnimation } from './js/HoleInAnimation.js';
import { Physics } from './js/Physics.js';
import { InputHandler } from './js/InputHandler.js';
import { Camera } from './js/Camera.js';
import { Beach } from './js/Beach.js';
import { Wave } from './js/Wave.js';
import { StaticWave } from './js/StaticWave.js';

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
const beach = new Beach();
const startFactor = Date.now()
const firstX = screenWidth * (2 / 3) - 50;
const firstWave = new Wave(startFactor, '#8baab5', 0.005, firstX, 0);
const secondWave = new Wave(Date.now() + Math.random() * 10000, 'rgba(59, 192, 187, 0.2)', 0.005, firstX + 50, 0);
const thirdWave = new Wave(Date.now() + Math.random() * 10000, 'rgba(115, 185, 255, 0.2)', 0.005, firstX + 100, 0);
const staticWaves = [];

let stopped = true;
let levelY = 0;
let holeNumber = 1;
let ballPositionBeforeHit = null;
let hitCount = 0;

function resetBall(x, y) {
    if (x !== undefined && y !== undefined) {
        ball.x = x;
        ball.y = y;
        ball.z = 0;
        ball.vx = 0;
        ball.vy = 0;
        ball.vz = 0;
    } else {
        ball.reset(screenWidth, screenHeight, levelY);
    }
    stopped = true;
    ballPositionBeforeHit = null;
}

function isBallOutOfScreen() {
    // Check if ball is completely outside the visible screen area
    const screenTop = camera.y;
    const screenBottom = camera.y + screenHeight;
    const screenLeft = 0;
    const screenRight = screenWidth;
    
    return ball.y + ball.radius < screenTop || 
           ball.y - ball.radius > screenBottom || 
           ball.x + ball.radius < screenLeft || 
           ball.x - ball.radius > screenRight;
}

function respawnBallAtPreviousPosition() {
    if (ballPositionBeforeHit) {
        ball.x = ballPositionBeforeHit.x;
        ball.y = ballPositionBeforeHit.y;
        ball.z = 0;
        ball.vx = 0;
        ball.vy = 0;
        ball.vz = 0;
        stopped = true;
    }
}

// 基于累计进洞数使用正弦函数计算新洞位置
function resetHole(_useSineCalculation = false, currentHoleY = 0) {
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
    
    // 如果是第一关（currentHoleY === 0），将洞放在球的上方
    // 否则，将洞放在当前洞的上方
    if (currentHoleY === 0 && holeNumber === 1) {
        hole.y = ball.y - screenHeight * 0.4 - yOffset * 0.3;
    } else {
        hole.y = currentHoleY - screenHeight * 0.8 + yOffset * 0.4;
    }
}

const input = new InputHandler(
    screenWidth,
    screenHeight,
    (vx, vy, vz) => {
        if (animation.active) return;
        // Save position before hit and increment counter
        ballPositionBeforeHit = { x: ball.x, y: ball.y };
        hitCount++;
        ball.vx = vx;
        ball.vy = vy;
        ball.vz = vz;
        stopped = false;
    },
    () => {
        if (animation.active) return;
        levelY = 0;
        hitCount = 0;
        holeNumber = 1;
        camera.reset();
        resetBall();
        resetHole();
    }
);

function gameLoop() {
    const now = Date.now();

    beach.draw(ctx, screenWidth, screenHeight);
    const spawned = firstWave.update(now);
    secondWave.update(now);
    thirdWave.update(now);

    // Spawn a new static wet mark when firstWave hits minX
    if (spawned) {
        staticWaves.push(new StaticWave(firstWave, '#c8b48c'));
    }

    // Update static waves and remove dead ones
    for (let i = staticWaves.length - 1; i >= 0; i--) {
        if (!staticWaves[i].update()) {
            staticWaves.splice(i, 1);
        }
    }

    // Draw static waves behind the moving ones
    staticWaves.forEach(sw => sw.draw(ctx, screenWidth, screenHeight));

    firstWave.draw(ctx, screenWidth, screenHeight);
    secondWave.draw(ctx, screenWidth, screenHeight);
    thirdWave.draw(ctx, screenWidth, screenHeight);

    if (!stopped && !animation.active) {
        stopped = physics.update(ball);
        
        // Check if ball is out of screen and respawn
        if (!stopped && isBallOutOfScreen()) {
            respawnBallAtPreviousPosition();
        }
    }

    // Update camera (handles animation after hole-in only)
    camera.update();

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    if (!animation.active) {
        if (!stopped && hole.isInside(ball.x, ball.y, ball.z)) {
            const currentHoleX = hole.x;
            const currentHoleY = hole.y;
            
            animation.start(hole.x, hole.y, ball.x, ball.y, () => {
                ball.stop();
                stopped = true;
                
                // 重置球到前一洞位置
                resetBall(currentHoleX, currentHoleY);
                
                // 进洞数加 1，然后基于新的洞号设置新洞位置
                holeNumber++;
                
                // 基于正弦函数设置新洞位置（使用更新后的holeNumber）
                resetHole(true, currentHoleY);
                
                // 移动镜头使球距离镜头底部20px
                camera.animateTo(ball.y - screenHeight + 20);
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

    // Draw hit counter in top left corner
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${hitCount}/${holeNumber}`, 20, 20);
    ctx.restore();

    requestAnimationFrame(gameLoop);
}

resetBall();
resetHole();
gameLoop();
