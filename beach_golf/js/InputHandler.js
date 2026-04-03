export class InputHandler {
    constructor(canvas, onShoot, onReset) {
        this.canvas = canvas;
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

    _getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        if (e.touches) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    _onDown(e) {
        e.preventDefault();
        const pos = this._getPos(e);
        this.isDragging = true;
        this.dragStartX = pos.x;
        this.dragStartY = pos.y;
        this.dragCurrentX = pos.x;
        this.dragCurrentY = pos.y;
    }

    _onMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        const pos = this._getPos(e);
        this.dragCurrentX = pos.x;
        this.dragCurrentY = pos.y;
    }

    _onUp(e) {
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
    }

    _bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this._onDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMove(e));
        this.canvas.addEventListener('mouseup', (e) => this._onUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this._onUp(e));

        this.canvas.addEventListener('touchstart', (e) => this._onDown(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this._onMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this._onUp(e));

        this.canvas.addEventListener('dblclick', () => this.onReset());
    }

    drawGuideLine(ctx, ball) {
        if (!this.isDragging) return;

        const dx = this.dragStartX - this.dragCurrentX;
        const dy = this.dragStartY - this.dragCurrentY;
        const pullDist = Math.min(Math.hypot(dx, dy), this.maxPull);
        if (pullDist < 5) return;

        const angle = Math.atan2(dy, dx);
        const lineLen = pullDist * 1.2;
        const endX = ball.x + Math.cos(angle) * lineLen;
        const endY = ball.y + Math.sin(angle) * lineLen;

        // Dashed guide line
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();

        // Power indicator dot at drag point
        ctx.beginPath();
        ctx.arc(this.dragCurrentX, this.dragCurrentY, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
