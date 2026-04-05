export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetY = 0;
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.targetY = 0;
    }

    update(ball, screenWidth, screenHeight, isMoving) {
        // 球移动时镜头不跟随，只有球停止后才更新目标位置
        if (!isMoving) {
            this.targetY = ball.y - screenHeight * 0.95;
        }
        const dy = this.targetY - this.y;
        this.y += dy * 0.08;
        this.x = 0;
    }

    // 进洞后设置镜头位置，使球和新洞都可见
    setPositionToShowBallAndHole(ballY, holeY, screenHeight) {
        // 计算球和洞的中间位置，使两者都在视野内
        const middleY = (ballY + holeY) / 2;
        this.targetY = middleY - screenHeight * 0.5;
    }
}
