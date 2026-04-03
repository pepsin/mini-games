export class Hole {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.radius = 22;
    }

    placeRandomly(canvasWidth, canvasHeight) {
        const margin = 100;
        this.x = margin + Math.random() * (canvasWidth - margin * 2);
        this.y = margin + Math.random() * (canvasHeight - margin * 2);
    }

    draw(ctx, overrideX, overrideY, overrideScale) {
        const scale = overrideScale !== undefined ? overrideScale : 1;
        const x = overrideX !== undefined ? overrideX : this.x;
        const y = overrideY !== undefined ? overrideY : this.y;
        const radius = this.radius * scale;

        ctx.beginPath();
        ctx.arc(x, y, radius + 2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#3d3225';
        ctx.fill();

        const innerRadius = radius - 5 * scale;
        if (innerRadius > 0) {
            ctx.beginPath();
            ctx.arc(x - 3 * scale, y - 3 * scale, innerRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#2a2218';
            ctx.fill();
        }
    }

    isInside(ballX, ballY, ballZ) {
        if (ballZ > 10) return false;
        const dist = Math.hypot(ballX - this.x, ballY - this.y);
        return dist < this.radius && ballZ < 15;
    }
}
