export class WebGLWave {
    constructor(screenWidth, screenHeight, pixelRatio) {
        this.logicalWidth = screenWidth;
        this.logicalHeight = screenHeight;
        this.pixelRatio = pixelRatio || 1;

        this.canvasWidth = Math.max(1, Math.floor(screenWidth * this.pixelRatio));
        this.canvasHeight = Math.max(1, Math.floor(screenHeight * this.pixelRatio));

        this.canvas = wx.createOffscreenCanvas({
            type: 'webgl',
            width: this.canvasWidth,
            height: this.canvasHeight
        });

        const gl = this.canvas.getContext('webgl');
        if (!gl) {
            console.error('WebGL not supported, falling back to solid fill');
            this.fallback = true;
            return;
        }

        this.gl = gl;

        // Replicate original Wave.js state exactly
        this.phase = 0;
        this.frequency = 0.025;
        this.speed = 0.08;
        this.baseWidth = 50;

        this.scrollY = 0;
        this.scrollSpeed = 0.5;

        this.ampPhase = 0;
        this.ampSpeed = 0.0005;
        this.ampFrequency = 0.04;
        this.minAmplitude = 10;
        this.maxAmplitude = 60;

        this.cycleTime = 0;
        this.cyclePeriod = 3000;
        this.maxMoveLeft = 80;
        this.moveOffsetX = 0;

        this.startTime = Date.now();

        this.initShaders();
        this.initBuffers();
    }

    update() {
        this.phase += this.speed;
        this.ampPhase += this.ampSpeed;
        this.scrollY += this.scrollSpeed;
        this.cycleTime += 16;

        const cycleProgress = (this.cycleTime % this.cyclePeriod) / this.cyclePeriod;
        this.moveOffsetX = Math.sin(cycleProgress * Math.PI) * this.maxMoveLeft;
    }

    initShaders() {
        const gl = this.gl;

        const vsSource = `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        const fsSource = `
            precision highp float;

            uniform float u_time;
            uniform vec2 u_resolution;
            uniform float u_pixelRatio;
            uniform float u_phase;
            uniform float u_scrollY;
            uniform float u_ampPhase;
            uniform float u_moveOffsetX;
            uniform float u_baseWidth;
            uniform float u_frequency;

            #define DISTORT_WATER 1
            #define FAST_CIRCLES 1

            #define WATER_COL vec3(0.0, 0.4453, 0.7305)
            #define WATER2_COL vec3(0.0, 0.4180, 0.6758)
            #define FOAM_COL vec3(0.8125, 0.9609, 0.9648)
            #define SAND_COL vec3(0.9608, 0.9020, 0.7843)

            #define M_2PI 6.283185307
            #define M_6PI 18.84955592

            float noise1d(float x) {
                return fract(sin(x) * 43758.5453);
            }

            float smoothNoise1d(float x) {
                float i = floor(x);
                float f = fract(x);
                float t = f * f * (3.0 - 2.0 * f);
                return mix(noise1d(i), noise1d(i + 1.0), t);
            }

            float getAmplitude(float y) {
                float scrolledY = y + u_scrollY;
                float n1 = smoothNoise1d(scrolledY * 0.04 + u_ampPhase);
                float n2 = smoothNoise1d(scrolledY * 0.08 + u_ampPhase * 0.5);
                float n3 = smoothNoise1d(scrolledY * 0.02 + u_ampPhase * 1.5);
                float combinedNoise = n1 * 0.5 + n2 * 0.35 + n3 * 0.15;
                return 10.0 + combinedNoise * 50.0;
            }

            float circ(vec2 pos, vec2 c, float s) {
                c = abs(pos - c);
                c = min(c, 1.0 - c);
                #if FAST_CIRCLES
                return dot(c, c) < s ? -1.0 : 0.0;
                #else
                return smoothstep(0.0, 0.002, sqrt(s) - sqrt(dot(c, c))) * -1.0;
                #endif
            }

            float waterlayer(vec2 uv) {
                uv = mod(uv, 1.0);
                float ret = 1.0;
                ret += circ(uv, vec2(0.37378, 0.277169), 0.0268181);
                ret += circ(uv, vec2(0.0317477, 0.540372), 0.0193742);
                ret += circ(uv, vec2(0.430044, 0.882218), 0.0232337);
                ret += circ(uv, vec2(0.641033, 0.695106), 0.0117864);
                ret += circ(uv, vec2(0.0146398, 0.0791346), 0.0299458);
                ret += circ(uv, vec2(0.43871, 0.394445), 0.0289087);
                ret += circ(uv, vec2(0.909446, 0.878141), 0.028466);
                ret += circ(uv, vec2(0.310149, 0.686637), 0.0128496);
                ret += circ(uv, vec2(0.928617, 0.195986), 0.0152041);
                ret += circ(uv, vec2(0.0438506, 0.868153), 0.0268601);
                ret += circ(uv, vec2(0.308619, 0.194937), 0.00806102);
                ret += circ(uv, vec2(0.349922, 0.449714), 0.00928667);
                ret += circ(uv, vec2(0.0449556, 0.953415), 0.023126);
                ret += circ(uv, vec2(0.117761, 0.503309), 0.0151272);
                ret += circ(uv, vec2(0.563517, 0.244991), 0.0292322);
                ret += circ(uv, vec2(0.566936, 0.954457), 0.00981141);
                ret += circ(uv, vec2(0.0489944, 0.200931), 0.0178746);
                ret += circ(uv, vec2(0.569297, 0.624893), 0.0132408);
                ret += circ(uv, vec2(0.298347, 0.710972), 0.0114426);
                ret += circ(uv, vec2(0.878141, 0.771279), 0.00322719);
                ret += circ(uv, vec2(0.150995, 0.376221), 0.00216157);
                ret += circ(uv, vec2(0.119673, 0.541984), 0.0124621);
                ret += circ(uv, vec2(0.629598, 0.295629), 0.0198736);
                ret += circ(uv, vec2(0.334357, 0.266278), 0.0187145);
                ret += circ(uv, vec2(0.918044, 0.968163), 0.0182928);
                ret += circ(uv, vec2(0.965445, 0.505026), 0.006348);
                ret += circ(uv, vec2(0.514847, 0.865444), 0.00623523);
                ret += circ(uv, vec2(0.710575, 0.0415131), 0.00322689);
                ret += circ(uv, vec2(0.71403, 0.576945), 0.0215641);
                ret += circ(uv, vec2(0.748873, 0.413325), 0.0110795);
                ret += circ(uv, vec2(0.0623365, 0.896713), 0.0236203);
                ret += circ(uv, vec2(0.980482, 0.473849), 0.00573439);
                ret += circ(uv, vec2(0.647463, 0.654349), 0.0188713);
                ret += circ(uv, vec2(0.651406, 0.981297), 0.00710875);
                ret += circ(uv, vec2(0.428928, 0.382426), 0.0298806);
                ret += circ(uv, vec2(0.811545, 0.62568), 0.00265539);
                ret += circ(uv, vec2(0.400787, 0.74162), 0.00486609);
                ret += circ(uv, vec2(0.331283, 0.418536), 0.00598028);
                ret += circ(uv, vec2(0.894762, 0.0657997), 0.00760375);
                ret += circ(uv, vec2(0.525104, 0.572233), 0.0141796);
                ret += circ(uv, vec2(0.431526, 0.911372), 0.0213234);
                ret += circ(uv, vec2(0.658212, 0.910553), 0.000741023);
                ret += circ(uv, vec2(0.514523, 0.243263), 0.0270685);
                ret += circ(uv, vec2(0.0249494, 0.252872), 0.00876653);
                ret += circ(uv, vec2(0.502214, 0.47269), 0.0234534);
                ret += circ(uv, vec2(0.693271, 0.431469), 0.0246533);
                ret += circ(uv, vec2(0.415, 0.884418), 0.0271696);
                ret += circ(uv, vec2(0.149073, 0.41204), 0.00497198);
                ret += circ(uv, vec2(0.533816, 0.897634), 0.00650833);
                ret += circ(uv, vec2(0.0409132, 0.83406), 0.0191398);
                ret += circ(uv, vec2(0.638585, 0.646019), 0.0206129);
                ret += circ(uv, vec2(0.660342, 0.966541), 0.0053511);
                ret += circ(uv, vec2(0.513783, 0.142233), 0.00471653);
                ret += circ(uv, vec2(0.124305, 0.644263), 0.00116724);
                ret += circ(uv, vec2(0.99871, 0.583864), 0.0107329);
                ret += circ(uv, vec2(0.894879, 0.233289), 0.00667092);
                ret += circ(uv, vec2(0.246286, 0.682766), 0.00411623);
                ret += circ(uv, vec2(0.0761895, 0.16327), 0.0145935);
                ret += circ(uv, vec2(0.949386, 0.802936), 0.0100873);
                ret += circ(uv, vec2(0.480122, 0.196554), 0.0110185);
                ret += circ(uv, vec2(0.896854, 0.803707), 0.013969);
                ret += circ(uv, vec2(0.292865, 0.762973), 0.00566413);
                ret += circ(uv, vec2(0.0995585, 0.117457), 0.00869407);
                ret += circ(uv, vec2(0.377713, 0.00335442), 0.0063147);
                ret += circ(uv, vec2(0.506365, 0.531118), 0.0144016);
                ret += circ(uv, vec2(0.408806, 0.894771), 0.0243923);
                ret += circ(uv, vec2(0.143579, 0.85138), 0.00418529);
                ret += circ(uv, vec2(0.0902811, 0.181775), 0.0108896);
                ret += circ(uv, vec2(0.780695, 0.394644), 0.00475475);
                ret += circ(uv, vec2(0.298036, 0.625531), 0.00325285);
                ret += circ(uv, vec2(0.218423, 0.714537), 0.00157212);
                ret += circ(uv, vec2(0.658836, 0.159556), 0.00225897);
                ret += circ(uv, vec2(0.987324, 0.146545), 0.0288391);
                ret += circ(uv, vec2(0.222646, 0.251694), 0.00092276);
                ret += circ(uv, vec2(0.159826, 0.528063), 0.00605293);
                return max(ret, 0.0);
            }

            vec3 water(vec2 uv, float time) {
                uv *= vec2(0.25);
                #if DISTORT_WATER
                float d1 = mod(uv.x + uv.y, M_2PI);
                float d2 = mod((uv.x + uv.y + 0.25) * 1.3, M_6PI);
                d1 = time * 0.07 + d1;
                d2 = time * 0.5 + d2;
                vec2 dist = vec2(
                    sin(d1) * 0.15 + sin(d2) * 0.05,
                    cos(d1) * 0.15 + cos(d2) * 0.05
                );
                #else
                vec2 dist = vec2(0.0);
                #endif
                vec3 ret = mix(WATER_COL, WATER2_COL, waterlayer(uv + dist.xy));
                ret = mix(ret, FOAM_COL, waterlayer(vec2(1.0) - uv - dist.yx));
                return ret;
            }

            void main() {
                vec2 coord = gl_FragCoord.xy / u_pixelRatio;
                float y = coord.y;

                float scrolledY = y + u_scrollY;
                float amplitude = getAmplitude(y);
                float waveOffset = sin(scrolledY * u_frequency + u_phase) * amplitude;
                float edgeX = u_resolution.x - u_baseWidth - u_moveOffsetX + waveOffset;

                if (coord.x > edgeX) {
                    // Distance from wave edge into the water
                    float edgeDist = coord.x - edgeX;

                    // Wind Waker water texture — drifts horizontally to the left, independent of wave motion
                    vec2 waterUV = vec2(coord.x * 0.012 - u_time * 0.08, coord.y * 0.012 + u_time * 0.01);
                    vec3 col = water(waterUV, u_time);

                    // Thick white foam bands at the front of the wave
                    // UV stretched along the wave edge so circles form bands
                    vec2 foamUV = vec2(scrolledY * 0.018 + u_time * 0.15, edgeDist * 0.05);
                    float foamPattern = 1.0 - waterlayer(foamUV);

                    // Mask foam to the front region
                    float edgeMask = smoothstep(28.0, 0.0, edgeDist);
                    float foamIntensity = foamPattern * edgeMask;

                    // Add a constant thick white base band right at the edge
                    float baseBand = smoothstep(14.0, 0.0, edgeDist) * 1.0;
                    foamIntensity = max(foamIntensity, baseBand);

                    // Secondary thinner bright highlight
                    float highlight = smoothstep(6.0, 0.0, edgeDist) * 0.5;
                    foamIntensity = max(foamIntensity, highlight);

                    col = mix(col, FOAM_COL, clamp(foamIntensity, 0.0, 1.0));

                    gl_FragColor = vec4(col, 1.0);
                } else {
                    gl_FragColor = vec4(SAND_COL, 1.0);
                }
            }
        `;

        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Unable to initialize shader program:', gl.getProgramInfoLog(this.program));
        }

        this.attribLocations = {
            position: gl.getAttribLocation(this.program, 'a_position')
        };
        this.uniformLocations = {
            time: gl.getUniformLocation(this.program, 'u_time'),
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            pixelRatio: gl.getUniformLocation(this.program, 'u_pixelRatio'),
            phase: gl.getUniformLocation(this.program, 'u_phase'),
            scrollY: gl.getUniformLocation(this.program, 'u_scrollY'),
            ampPhase: gl.getUniformLocation(this.program, 'u_ampPhase'),
            moveOffsetX: gl.getUniformLocation(this.program, 'u_moveOffsetX'),
            baseWidth: gl.getUniformLocation(this.program, 'u_baseWidth'),
            frequency: gl.getUniformLocation(this.program, 'u_frequency')
        };
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    initBuffers() {
        const gl = this.gl;
        const positions = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
            -1.0,  1.0,
             1.0, -1.0,
             1.0,  1.0
        ]);

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }

    draw(ctx, screenWidth, screenHeight) {
        if (this.fallback) {
            ctx.fillStyle = '#f5e6c8';
            ctx.fillRect(0, 0, screenWidth, screenHeight);
            return;
        }

        const gl = this.gl;

        gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(this.attribLocations.position, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.attribLocations.position);

        const now = (Date.now() - this.startTime) * 0.001;
        gl.uniform1f(this.uniformLocations.time, now);
        gl.uniform2f(this.uniformLocations.resolution, this.logicalWidth, this.logicalHeight);
        gl.uniform1f(this.uniformLocations.pixelRatio, this.pixelRatio);
        gl.uniform1f(this.uniformLocations.phase, this.phase);
        gl.uniform1f(this.uniformLocations.scrollY, this.scrollY);
        gl.uniform1f(this.uniformLocations.ampPhase, this.ampPhase);
        gl.uniform1f(this.uniformLocations.moveOffsetX, this.moveOffsetX);
        gl.uniform1f(this.uniformLocations.baseWidth, this.baseWidth);
        gl.uniform1f(this.uniformLocations.frequency, this.frequency);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.flush();

        ctx.drawImage(this.canvas, 0, 0, screenWidth, screenHeight);
    }
}
