export class Wave {
    constructor() {
        this.phase = 0;
        this.amplitude = 18;
        this.frequency = 0.025;
        this.speed = 0.08;
        this.baseWidth = 50;
    }

    update() {
        this.phase += this.speed;
    }

    draw(ctx, screenWidth, screenHeight) {
        ctx.save();

        const points = [];
        const step = 4;
        for (let y = -step; y <= screenHeight + step; y += step) {
            const waveOffset = Math.sin(y * this.frequency + this.phase) * this.amplitude;
            const x = screenWidth - this.baseWidth + waveOffset;
            points.push({ x, y });
        }

        // 透明蓝色填充
        ctx.beginPath();
        ctx.moveTo(screenWidth, -step);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(screenWidth, screenHeight + step);
        ctx.closePath();
        ctx.fillStyle = 'rgba(30, 144, 255, 0.35)';
        ctx.fill();

        // 最左侧白色浪花线（10px）
        if (points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }

        ctx.restore();
    }
}
