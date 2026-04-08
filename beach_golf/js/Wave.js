export class Wave {
    constructor() {
        this.phase = 0;
        this.baseAmplitude = 12;
        this.frequency = 0.025;
        this.speed = 0.08;
        this.baseWidth = 50;
        
        // 程序生成波浪高度变化
        this.variationPhase = 0;
        this.variationSpeed = 0.03;
        this.variationFrequency = 0.015;
        
        // 每个位置不同的振幅范围
        this.minAmplitude = 10;
        this.maxAmplitude = 60;
        
        // 独立的振幅变化相位
        this.ampPhase = 0;
        this.ampSpeed = 0.0005;
        this.ampFrequency = 0.04;
        
        // 向上滚动的偏移量
        this.scrollY = 0;
        this.scrollSpeed = 0.5;
        
        // 左右周期性移动 (2-4秒周期)
        this.cycleTime = 0;
        this.cyclePeriod = 3000; // 3秒一个周期
        this.maxMoveLeft = 80; // 最大向左移动距离
        this.moveOffsetX = 0;
    }

    update() {
        this.phase += this.speed;
        this.variationPhase += this.variationSpeed;
        this.ampPhase += this.ampSpeed;
        
        // 向上滚动
        this.scrollY += this.scrollSpeed;
        
        // 更新周期时间
        this.cycleTime += 16; // 假设约60fps, 每帧约16ms
        
        // 计算左右移动 (使用正弦波，周期为 cyclePeriod)
        const cycleProgress = (this.cycleTime % this.cyclePeriod) / this.cyclePeriod;
        // 正弦波: 0 -> 1 -> 0, 波浪先向左移动再退回
        this.moveOffsetX = Math.sin(cycleProgress * Math.PI) * this.maxMoveLeft;
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
    
    // Get amplitude for a specific y position - each position has different amplitude
    getAmplitude(y) {
        // 考虑向上滚动的偏移
        const scrolledY = y + this.scrollY;
        
        // Combine multiple octaves of noise for amplitude variation
        const n1 = this.smoothNoise(scrolledY * this.ampFrequency + this.ampPhase);
        const n2 = this.smoothNoise(scrolledY * this.ampFrequency * 2 + this.ampPhase * 0.5);
        const n3 = this.smoothNoise(scrolledY * this.ampFrequency * 0.5 + this.ampPhase * 1.5);
        
        // Blend noises
        const combinedNoise = n1 * 0.5 + n2 * 0.35 + n3 * 0.15;
        
        // Map to min-max amplitude range - each y position gets its own unique amplitude
        return this.minAmplitude + combinedNoise * (this.maxAmplitude - this.minAmplitude);
    }

    draw(ctx, screenWidth, screenHeight) {
        ctx.save();

        const points = [];
        const step = 4;
        for (let y = -step; y <= screenHeight + step; y += step) {
            const scrolledY = y + this.scrollY;
            const baseWave = Math.sin(scrolledY * this.frequency + this.phase);
            // Each y position has its own unique amplitude
            const amplitude = this.getAmplitude(y);
            const waveOffset = baseWave * amplitude;
            // 基础位置 + 波浪偏移 + 周期性左右移动
            const x = screenWidth - this.baseWidth - this.moveOffsetX + waveOffset;
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
