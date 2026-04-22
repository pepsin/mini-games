const { windowWidth, windowHeight, pixelRatio } = wx.getSystemInfoSync();

export class Wave {
    constructor(time, color, speed, x, y) {
        this.color = color;
        this.y = y;
        this.time = time;

        // X animation range
        this.minX = x;
        this.maxX = x + windowWidth / 3;

        // Animation state: progress 0 ~ 1
        this.progress = 0;
        this.speed = speed;
        this.direction = 1; // 1 = forward (0 -> 1), -1 = backward (1 -> 0)

        // Wave parameters
        this.frequency = 0.05;
        this.baseAmplitude = 0;
        this.ampFrequency = 0.00001;
        this.ampModulation = 10;

        // Current computed position
        this.x = this.minX;
    }

    // --- Easing curves ---
    easeLinear(t) { return t; }
    easeQuadIn(t) { return t * t; }
    easeQuadOut(t) { return 1 - (1 - t) * (1 - t); }
    easeQuadInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    easeCubicInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    // Default easing — swap this for any curve above
    ease(t) {
        return this.easeQuadInOut(t);
    }

    update(_time) {
        const wasAtStart = this.progress <= 0;

        // Advance progress
        this.progress += this.speed * this.direction;

        let spawned = false;

        // Ping-pong at boundaries
        if (this.progress >= 1) {
            this.progress = 1;
            this.direction = -1;
        } else if (this.progress <= 0) {
            this.progress = 0;
            this.direction = 1;
            if (!wasAtStart) {
                spawned = true;
            }
        }

        // Map eased progress to x range
        const eased = this.ease(this.progress);
        this.x = this.minX + (this.maxX - this.minX) * eased;

        return spawned;
    }

    // Simple 1D hash: outputs a pseudo-random value in [0, 1) for integer n
    hash(n) {
        const x = Math.sin(n * 122.1 + 311.7) * 43758.5453123;
        return x - Math.floor(x);
    }

    // Smooth 1D noise based on time t, output in [0, 1]
    noise(t) {
        const i = Math.floor(t);
        const f = t - i;
        const n0 = this.hash(i);
        const n1 = this.hash(i + 1);
        // Smoothstep interpolation
        const u = f * f * (3 - 2 * f);
        return n0 + (n1 - n0) * u;
    }

    draw(ctx, screenWidth, screenHeight) {
        ctx.save();

        const step = 2;
        const points = [];

        for (let y = this.y; y <= screenHeight; y += step) {
            // Amplitude varies along y using a slower sine wave
            const amp = this.baseAmplitude + this.noise(y) * this.ampModulation;

            // Main sine wave, continuous in time, vertical orientation
            const x = this.x + Math.sin(y * this.frequency + this.time) * amp;
            points.push({ x, y });
        }

        if (points.length === 0) {
            ctx.restore();
            return;
        }

        // Fill the area to the right of the wave line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(screenWidth, points[points.length - 1].y);
        ctx.lineTo(screenWidth, points[0].y);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();

        // Stroke the wave line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.restore();
    }
}
