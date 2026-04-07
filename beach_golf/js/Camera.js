export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetY = 0;
        this.isAnimating = false;
        this.animationStartTime = 0;
        this.animationStartY = 0;
        this.animationTargetY = 0;
        this.animationDuration = 1000; // 1 second
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.targetY = 0;
        this.isAnimating = false;
    }

    update() {
        // Only move camera when animating (after hole-in)
        if (this.isAnimating) {
            const elapsed = Date.now() - this.animationStartTime;
            const progress = Math.min(elapsed / this.animationDuration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            this.y = this.animationStartY + (this.animationTargetY - this.animationStartY) * easeOut;
            
            if (progress >= 1) {
                this.isAnimating = false;
                this.targetY = this.y;
            }
        }
    }

    // 进洞后设置镜头位置，使球和新洞都可见
    setPositionToShowBallAndHole(ballY, holeY, screenHeight) {
        // 计算球和洞的中间位置，使两者都在视野内
        const middleY = (ballY + holeY) / 2;
        this.targetY = middleY - screenHeight * 0.5;
    }

    // 启动相机动画到目标位置
    animateTo(targetY) {
        this.isAnimating = true;
        this.animationStartTime = Date.now();
        this.animationStartY = this.y;
        this.animationTargetY = targetY;
    }
}
