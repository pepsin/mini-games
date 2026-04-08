export class Ball {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        this.radius = 15;
        
        // Rolling animation
        this.rotationAngle = 0;
        this.rollTrail = [];
        this.maxTrailLength = 5;
        
        // Create texture canvas using regular canvas
        this.textureWidth = 200;
        this.textureHeight = 40;
        this.textureCanvas = wx.createCanvas();
        this.textureCanvas.width = this.textureWidth;
        this.textureCanvas.height = this.textureHeight;
        this.initTexture();
    }

    initTexture() {
        const ctx = this.textureCanvas.getContext('2d');
        const w = this.textureWidth;
        const h = this.textureHeight;
        
        // Fill with white (ball surface)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        
        // Draw black triangle at center
        const centerX = w / 2;
        const centerY = h / 2;
        const size = 10;
        const offsetY = 5;
        
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size * 0.6 - offsetY);
        ctx.lineTo(centerX - size, centerY - offsetY);
        ctx.lineTo(centerX + size, centerY - offsetY);
        ctx.closePath();
        ctx.fill();
        
        // Add subtle shading for 3D effect on texture
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, 'rgba(0,0,0,0.1)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    reset(canvasWidth, canvasHeight, worldOffsetY = 0) {
        this.x = canvasWidth / 2;
        this.y = worldOffsetY + canvasHeight * 0.95;
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        this.rotationAngle = 0;
        this.rollTrail = [];
    }

    stop() {
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        this.rollTrail = [];
    }

    updateRotation() {
        const speed = Math.hypot(this.vx, this.vy);
        if (this.z <= 0 && speed > 0.1) {
            this.rotationAngle += speed / this.radius;
        }
        
        // Update motion blur trail
        if (speed > 2) {
            this.rollTrail.push({ x: this.x, y: this.y, z: this.z, alpha: 0.4 });
            if (this.rollTrail.length > this.maxTrailLength) {
                this.rollTrail.shift();
            }
        } else {
            this.rollTrail = [];
        }
        
        // Fade trail
        for (let i = 0; i < this.rollTrail.length; i++) {
            this.rollTrail[i].alpha *= 0.85;
        }
        this.rollTrail = this.rollTrail.filter(t => t.alpha > 0.05);
    }

    draw(ctx, animatingHoleIn) {
        if (animatingHoleIn) return;

        this.updateRotation();

        const visualScale = 1 + this.z / 300;
        const visualY = this.y - this.z;

        this.drawMotionBlur(ctx, visualScale);
        this.drawShadow(ctx, visualScale);
        this.drawTexturedBall(ctx, visualY, visualScale);
    }

    drawTexturedBall(ctx, visualY, visualScale) {
        const r = this.radius * visualScale;
        const diameter = r * 2;
        
        ctx.save();
        
        // Create circular clip for the ball
        ctx.beginPath();
        ctx.arc(this.x, visualY, r, 0, Math.PI * 2);
        ctx.clip();
        
        // Calculate texture scroll position based on rotation
        const textureScroll = (this.rotationAngle * this.radius) % this.textureWidth;
        const sourceX = textureScroll;
        
        // Draw the texture with wrapping
        const drawWidth = diameter * 1.5;
        const drawHeight = diameter;
        const drawX = this.x - drawWidth / 2;
        const drawY = visualY - r;
        
        const patternOffset = sourceX - this.textureWidth;
        
        // First copy
        ctx.drawImage(
            this.textureCanvas,
            0, 0, this.textureWidth, this.textureHeight,
            drawX + patternOffset * (drawWidth / this.textureWidth), drawY,
            drawWidth, drawHeight
        );
        
        // Second copy for seamless wrapping
        ctx.drawImage(
            this.textureCanvas,
            0, 0, this.textureWidth, this.textureHeight,
            drawX + (patternOffset + this.textureWidth) * (drawWidth / this.textureWidth), drawY,
            drawWidth, drawHeight
        );
        
        // Add spherical shading (3D effect)
        const gradient = ctx.createRadialGradient(
            this.x - r * 0.3, visualY - r * 0.3, 0,
            this.x, visualY, r
        );
        gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();
        
        // Ball outline
        ctx.beginPath();
        ctx.arc(this.x, visualY, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    drawMotionBlur(ctx, _visualScale) {
        if (this.rollTrail.length < 2) return;
        
        const speed = Math.hypot(this.vx, this.vy);
        if (speed < 3) return;

        for (let i = 0; i < this.rollTrail.length; i++) {
            const trail = this.rollTrail[i];
            const trailScale = 1 + trail.z / 300;
            const trailY = trail.y - trail.z;
            
            ctx.beginPath();
            ctx.arc(trail.x, trailY, this.radius * trailScale * 0.9, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(230, 230, 230, ${trail.alpha * 0.3})`;
            ctx.fill();
        }
    }

    drawShadow(ctx, _visualScale) {
        if (this.z <= 0) {
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + 5, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fill();
        } else {
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
    }
}
