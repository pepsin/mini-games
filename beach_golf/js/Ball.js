export class Ball {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        this.radius = 15;
    }

    reset(canvasWidth, canvasHeight) {
        this.x = canvasWidth / 2;
        this.y = canvasHeight * 0.8;
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
    }

    stop() {
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
    }

    draw(ctx, animatingHoleIn) {
        if (animatingHoleIn) return;

        if (this.z <= 0) {
            // Ground shadow
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + 5, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fill();
        } else {
            // Air shadow
            const shadowScale = Math.max(0.3, 1 - this.z / 200);
            const shadowAlpha = Math.max(0.05, 0.3 - this.z / 500);
            const shadowOffset = this.z * 0.3;
            ctx.beginPath();
            ctx.ellipse(
                this.x + shadowOffset,
                this.y + shadowOffset,
                this.radius * 0.8 * shadowScale,
                this.radius * 0.3 * shadowScale,
                0, 0, Math.PI * 2
            );
            ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
            ctx.fill();
        }

        const visualScale = 1 + this.z / 300;
        const visualY = this.y - this.z;

        ctx.beginPath();
        ctx.arc(this.x, visualY, this.radius * visualScale, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(
            this.x - 4 * visualScale, visualY - 4 * visualScale, 0,
            this.x, visualY, this.radius * visualScale
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#d0d0d0');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Dimples
        ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 4; j++) {
                const dotX = this.x - 8 * visualScale + i * 3 * visualScale;
                const dotY = visualY - 6 * visualScale + j * 3 * visualScale;
                const dist = Math.hypot(dotX - this.x, dotY - visualY);
                if (dist < this.radius * visualScale - 3) {
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, 0.8 * visualScale, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
}
