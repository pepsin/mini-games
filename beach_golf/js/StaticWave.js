const { windowWidth, windowHeight, pixelRatio } = wx.getSystemInfoSync();

export class StaticWave {
    constructor(wave, color) {
        // Freeze the wave's visual state
        this.time = wave.time;
        this.x = wave.minX;
        this.y = wave.y;
        this.color = color;

        // Copy wave shape parameters so the outline matches exactly
        this.frequency = wave.frequency;
        this.baseAmplitude = wave.baseAmplitude;
        this.ampFrequency = wave.ampFrequency;
        this.ampModulation = wave.ampModulation;

        // Fade state
        this.opacity = 1.0;
        this.fadeSpeed = 0.005;
    }

    update() {
        this.opacity -= this.fadeSpeed;
        return this.opacity > 0;
    }

    // Convert stored hex color to rgba with current opacity
    colorWithOpacity(opacity) {
        const hex = this.color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Same noise as Wave so the shape is identical
    hash(n) {
        const x = Math.sin(n * 122.1 + 311.7) * 43758.5453123;
        return x - Math.floor(x);
    }

    noise(t) {
        const i = Math.floor(t);
        const f = t - i;
        const n0 = this.hash(i);
        const n1 = this.hash(i + 1);
        const u = f * f * (3 - 2 * f);
        return n0 + (n1 - n0) * u;
    }

    draw(ctx, screenWidth, screenHeight) {
        ctx.save();

        const step = 2;
        const points = [];

        for (let y = this.y; y <= screenHeight; y += step) {
            const amp = this.baseAmplitude + this.noise(y) * this.ampModulation;
            const x = this.x + Math.sin(y * this.frequency + this.time) * amp;
            points.push({ x, y });
        }

        if (points.length === 0) {
            ctx.restore();
            return;
        }

        // Fill the area to the right of the frozen wave line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(screenWidth, points[points.length - 1].y);
        ctx.lineTo(screenWidth, points[0].y);
        ctx.closePath();
        ctx.fillStyle = this.colorWithOpacity(this.opacity);
        ctx.fill();

        // Stroke the wave edge with fading white
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.restore();
    }
}
