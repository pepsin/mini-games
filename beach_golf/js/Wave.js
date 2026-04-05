export class Wave {
    constructor() {
        this.phase = 0;
        this.amplitude = 18;
        this.frequency = 0.025;
        this.speed = 0.08;
        this.baseWidth = 50;
        
        // 程序生成波浪高度变化
        this.variationPhase = 0;
        this.variationSpeed = 0.03;
        this.variationFrequency = 0.015;
        this.minMultiplier = 1;
        this.maxMultiplier = 3;
    }

    update() {
        this.phase += this.speed;
        this.variationPhase += this.variationSpeed;
    }

    // 1D Perlin-like noise function
    noise(x) {
        const n = Math.sin(x) * 43758.5453;
        return n - Math.floor(n);
    }
    
    // Smooth interpolation
    smoothNoise(x) {
        const i = Math.floor(x);
        const f = x - i;
        const y0 = this.noise(i);
        const y1 = this.noise(i + 1);
        // Smoothstep interpolation
        const t = f * f * (3 - 2 * f);
        return y0 + (y1 - y0) * t;
    }
    
    // Get wave multiplier for a specific y position (1-3 range)
    getWaveMultiplier(y) {
        // Combine multiple octaves of noise for more natural variation
        const n1 = this.smoothNoise(y * this.variationFrequency + this.variationPhase);
        const n2 = this.smoothNoise(y * this.variationFrequency * 2.5 + this.variationPhase * 0.7);
        const n3 = this.smoothNoise(y * this.variationFrequency * 0.5 + this.variationPhase * 1.3);
        
        // Blend noises
        const combinedNoise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
        
        // Map to 1-3 range
        return this.minMultiplier + combinedNoise * (this.maxMultiplier - this.minMultiplier);
    }

    draw(ctx, screenWidth, screenHeight) {
        ctx.save();

        const points = [];
        const step = 4;
        for (let y = -step; y <= screenHeight + step; y += step) {
            const baseWave = Math.sin(y * this.frequency + this.phase);
            const multiplier = this.getWaveMultiplier(y);
            const waveOffset = baseWave * this.amplitude * multiplier;
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
