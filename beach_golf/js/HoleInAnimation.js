export class HoleInAnimation {
    constructor() {
        this.active = false;
        this.ballScale = 1;
        this.holeScale = 1;
        this.newBallOpacity = 0;
        this.capturedHoleX = 0;
        this.capturedHoleY = 0;
        this.progress = 0;
        this.onComplete = null;
    }

    start(holeX, holeY, ballX, ballY, onComplete) {
        this.active = true;
        this.ballScale = 1;
        this.holeScale = 1;
        this.newBallOpacity = 0;
        this.capturedHoleX = holeX;
        this.capturedHoleY = holeY;
        this.capturedBallX = ballX;
        this.capturedBallY = ballY;
        this.progress = 0;
        this.onComplete = onComplete;
    }

    update() {
        if (!this.active) return;

        this.progress += 0.025;

        // Ball shrinks (0–60%)
        if (this.progress < 0.6) {
            this.ballScale = 1 - (this.progress / 0.6) * 0.9;
        } else {
            this.ballScale = 0.1;
        }

        // Hole shrinks (20–80%)
        if (this.progress < 0.2) {
            this.holeScale = 1;
        } else if (this.progress < 0.8) {
            this.holeScale = 1 - ((this.progress - 0.2) / 0.6) * 0.95;
        } else {
            this.holeScale = 0.05;
        }

        // New ball fades in (60–100%)
        if (this.progress < 0.6) {
            this.newBallOpacity = 0;
        } else {
            this.newBallOpacity = Math.min(1, (this.progress - 0.6) / 0.4);
        }

        if (this.progress >= 1) {
            this.active = false;
            if (this.onComplete) this.onComplete();
        }
    }

    draw(ctx, ballRadius, hole) {
        if (!this.active) return;

        // Draw shrinking hole
        hole.draw(ctx, this.capturedHoleX, this.capturedHoleY, this.holeScale);

        // Draw shrinking ball going into hole
        if (this.ballScale > 0.1) {
            const x = this.capturedHoleX;
            const y = this.capturedHoleY;
            ctx.beginPath();
            ctx.arc(x, y, ballRadius * this.ballScale, 0, Math.PI * 2);
            const g = ctx.createRadialGradient(
                x - 4 * this.ballScale, y - 4 * this.ballScale, 0,
                x, y, ballRadius * this.ballScale
            );
            g.addColorStop(0, '#ffffff');
            g.addColorStop(1, '#e8e8e8');
            ctx.fillStyle = g;
            ctx.fill();
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw fading-in new ball at the ball's original position (not the hole)
        if (this.newBallOpacity > 0) {
            const op = this.newBallOpacity;
            const x = this.capturedBallX;
            const y = this.capturedBallY;
            ctx.beginPath();
            ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
            const g = ctx.createRadialGradient(x - 4, y - 4, 0, x, y, ballRadius);
            g.addColorStop(0, `rgba(255,255,255,${op})`);
            g.addColorStop(1, `rgba(232,232,232,${op})`);
            ctx.fillStyle = g;
            ctx.fill();
            ctx.strokeStyle = `rgba(221,221,221,${op})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}
