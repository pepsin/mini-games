export class Wave {
    constructor() {
        this.time = 0;
        this.speed = 0.05;

        // Base wave parameters
        this.frequency = 0.1;
        this.baseAmplitude = 0;

        // Amplitude variation parameters
        this.ampFrequency = 0.00001;
        this.ampModulation = 20;
    }

    // Simple 1D hash: outputs a pseudo-random value in [0, 1) for integer n
    hash(n) {
        const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
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

    update() {
        this.time += this.speed;
    }

    draw(ctx, screenWidth, screenHeight) {
        ctx.save();
        ctx.beginPath();

        const centerX = screenWidth * (2 / 3);
        const step = 2;

        for (let y = 0; y <= screenHeight; y += step) {
            // Amplitude varies along y using a slower sine wave
            const amp = this.baseAmplitude + this.noise(y) * this.ampModulation;

            // Main sine wave, continuous in time, vertical orientation
            const x = centerX + Math.sin(y * this.frequency + this.time) * amp;

            if (y === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.strokeStyle = 'rgba(30, 144, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
    }
}
