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

    update(ball, screenWidth, screenHeight) {
        this.targetY = ball.y - screenHeight * 0.95;
        const dy = this.targetY - this.y;
        this.y += dy * 0.08;
        this.x = 0;
    }
}
