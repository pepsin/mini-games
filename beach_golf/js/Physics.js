class Physics {
    constructor() {
        this.friction = 0.96;
        this.frictionAir = 0.98;
        this.gravity = 0.5;
        this.bounceDamping = 0.6;
        this.stopThreshold = 0.05;
    }

    update(ball, canvasWidth) {
        const onGround = ball.z <= 0 && ball.vz <= 0;

        if (!onGround) {
            // In air
            ball.z += ball.vz;
            ball.vz -= this.gravity;

            if (ball.z <= 0) {
                ball.z = 0;
                if (Math.abs(ball.vz) > 1) {
                    ball.vz = -ball.vz * this.bounceDamping;
                    ball.vx *= 0.9;
                    ball.vy *= 0.9;
                } else {
                    ball.vz = 0;
                }
            }

            ball.x += ball.vx;
            ball.y += ball.vy;
            ball.vx *= this.frictionAir;
            ball.vy *= this.frictionAir;
        } else {
            // On ground
            ball.x += ball.vx;
            ball.y += ball.vy;
            ball.vx *= this.friction;
            ball.vy *= this.friction;
        }

        // Wall collisions (x axis only)
        if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.vx *= -0.7;
        }
        if (ball.x + ball.radius > canvasWidth) {
            ball.x = canvasWidth - ball.radius;
            ball.vx *= -0.7;
        }

        // Check if stopped
        const stopped =
            Math.abs(ball.vx) < this.stopThreshold &&
            Math.abs(ball.vy) < this.stopThreshold &&
            ball.z <= 0;

        if (stopped) {
            ball.vx = 0;
            ball.vy = 0;
            ball.vz = 0;
        }

        return stopped;
    }
}

module.exports = { Physics };
