export class InputHandler {
    constructor(screenWidth, screenHeight, onShoot, onReset) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.onShoot = onShoot;
        this.onReset = onReset;

        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragCurrentX = 0;
        this.dragCurrentY = 0;

        this.power = 0.15;
        this.maxPull = 150;
        this.highFlyThreshold = 100;

        this._bindEvents();
    }

    _bindEvents() {
        wx.onTouchStart((e) => {
            const touch = e.touches[0];
            this.isDragging = true;
            this.dragStartX = touch.clientX;
            this.dragStartY = touch.clientY;
            this.dragCurrentX = touch.clientX;
            this.dragCurrentY = touch.clientY;
        });

        wx.onTouchMove((e) => {
            if (!this.isDragging) return;
            const touch = e.touches[0];
            this.dragCurrentX = touch.clientX;
            this.dragCurrentY = touch.clientY;
        });

        wx.onTouchEnd(() => {
            if (!this.isDragging) return;
            this.isDragging = false;

            const dx = this.dragStartX - this.dragCurrentX;
            const dy = this.dragStartY - this.dragCurrentY;
            const pullDist = Math.min(Math.hypot(dx, dy), this.maxPull);

            if (pullDist > 5) {
                const angle = Math.atan2(dy, dx);
                const speed = pullDist * this.power;
                const isHighFly = pullDist >= this.highFlyThreshold;
                this.onShoot(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    isHighFly ? speed * 0.8 : speed * 0.3
                );
            }
        });

        wx.onTouchCancel(() => {
            this.isDragging = false;
        });
    }

    drawGuideLine(ctx, ball, camera) {
        if (!this.isDragging) return;

        const dx = this.dragStartX - this.dragCurrentX;
        const dy = this.dragStartY - this.dragCurrentY;
        const pullDist = Math.min(Math.hypot(dx, dy), this.maxPull);
        if (pullDist < 5) return;

        const angle = Math.atan2(dy, dx);
        const lineLen = pullDist * 1.2;
        const endX = ball.x + Math.cos(angle) * lineLen;
        const endY = ball.y + Math.sin(angle) * lineLen;

        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();

        const dragWorldX = this.dragCurrentX + camera.x;
        const dragWorldY = this.dragCurrentY + camera.y;
        ctx.beginPath();
        ctx.arc(dragWorldX, dragWorldY, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
