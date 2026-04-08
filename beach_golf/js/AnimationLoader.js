// Animation resource loader
// Supports loading PNG images from folders, parsing info.json config

const fs = wx.getFileSystemManager();

/**
 * Check if file exists
 * Note: fs.accessSync may not work on bundled assets in Android
 */
function fileExists(path) {
    try {
        fs.accessSync(path);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * AnimationLoader - Loads and manages animation resources
 * Supports sprite sheets, multi-frame animations, and static images
 */
export class AnimationLoader {
    constructor() {
        this.cache = new Map();
        this.basePath = 'assets/';
    }

    /**
     * Load a single resource folder
     * @param {string} folder - Resource folder name (e.g., 'waste', 'flower')
     * @param {string} partName - Optional, load specific part (e.g., 'inner', 'outer')
     * @returns {Promise<Object>} Resource object
     */
    async load(folder, partName = null) {
        const cacheKey = partName ? `${folder}_${partName}` : folder;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const configPath = `${this.basePath}${folder}/info.json`;
            const config = await this.loadJSON(configPath);

            const resource = {
                name: config.name,
                type: config.type,
                config: config,
                images: {},
                frames: []
            };

            if (config.type === 'animation') {
                await this.loadAnimation(resource, folder, config);
            } else if (config.type === 'static') {
                await this.loadStatic(resource, folder, config, partName);
            }

            this.cache.set(cacheKey, resource);
            return resource;
        } catch (e) {
            console.error(`Failed to load resource [${folder}]:`, e.message || e);
            return null;
        }
    }

    /**
     * Load animation resource
     */
    async loadAnimation(resource, folder, config) {
        if (config.spriteSheet) {
            await this.loadSpriteSheet(resource, folder, config);
        } else if (config.states) {
            resource.states = {};
            for (const [stateName, stateConfig] of Object.entries(config.states)) {
                resource.states[stateName] = await this.loadFrames(folder, stateConfig.frames);
            }
            resource.currentState = Object.keys(config.states)[0];
            resource.frames = resource.states[resource.currentState];
        } else {
            resource.frames = await this.loadFrames(folder, config.frames);
        }

        resource.currentFrame = 0;
        resource.fps = config.fps || 8;
        resource.frameDuration = 1000 / resource.fps;
        resource.loop = config.loop !== false;
        resource.lastFrameTime = 0;

        if (config.static && config.static.file) {
            try {
                const staticPath = `${this.basePath}${folder}/${config.static.file}`;
                resource.staticImage = await this.loadImage(staticPath);
            } catch (e) {
                console.error(`Failed to load static image: ${config.static.file}`, e);
            }
        }
    }

    /**
     * Load sprite sheet animation (single image with multiple frames)
     */
    async loadSpriteSheet(resource, folder, config) {
        const sheetConfig = config.spriteSheet;
        const path = `${this.basePath}${folder}/${sheetConfig.file}`;
        const img = await this.loadImage(path);

        const frameWidth = sheetConfig.frameWidth || config.size?.width || 64;
        const frameHeight = sheetConfig.frameHeight || config.size?.height || 64;
        const framesPerRow = Math.floor(img.width / frameWidth);
        const totalRows = Math.floor(img.height / frameHeight);
        const frameCount = framesPerRow * totalRows;

        resource.frames = [];
        for (let i = 0; i < frameCount; i++) {
            const row = Math.floor(i / framesPerRow);
            const col = i % framesPerRow;

            resource.frames.push({
                image: img,
                sx: col * frameWidth,
                sy: row * frameHeight,
                sw: frameWidth,
                sh: frameHeight,
                duration: sheetConfig.frameDuration || 125
            });
        }

        resource.isSpriteSheet = true;
    }

    /**
     * Load static resource
     */
    async loadStatic(resource, folder, config, partName = null) {
        if (partName && config.parts && Array.isArray(config.parts)) {
            const part = config.parts.find(p => p.id === partName);
            if (part) {
                try {
                    const path = `${this.basePath}${folder}/${part.file}`;
                    resource.image = await this.loadImage(path);
                    resource.partConfig = part;
                } catch (e) {
                    console.error(`Failed to load part: ${part.file}`, e);
                }
            }
            return;
        }

        if (config.parts && Array.isArray(config.parts)) {
            resource.parts = {};
            for (const partConfig of config.parts) {
                try {
                    const path = `${this.basePath}${folder}/${partConfig.file}`;
                    const img = await this.loadImage(path);
                    resource.parts[partConfig.id] = {
                        image: img,
                        config: partConfig
                    };
                } catch (e) {
                    console.error(`Failed to load part: ${partConfig.file}`, e);
                }
            }
            const firstPart = config.parts[0];
            if (firstPart && resource.parts[firstPart.id]) {
                resource.image = resource.parts[firstPart.id].image;
            }
            return;
        }

        if (config.variants) {
            resource.variants = {};
            for (const variant of config.variants) {
                try {
                    const path = `${this.basePath}${folder}/${variant.file}`;
                    const img = await this.loadImage(path);

                    if (variant.spriteSheet) {
                        const sheetConfig = variant.spriteSheet;
                        const frameWidth = Math.ceil(img.width / sheetConfig.cols);
                        const frameHeight = Math.ceil(img.height / sheetConfig.rows);
                        const frameCount = sheetConfig.cols * sheetConfig.rows;

                        const frames = [];
                        for (let i = 0; i < frameCount; i++) {
                            const row = Math.floor(i / sheetConfig.cols);
                            const col = i % sheetConfig.cols;

                            frames.push({
                                image: img,
                                sx: col * frameWidth,
                                sy: row * frameHeight,
                                sw: frameWidth,
                                sh: frameHeight,
                                isSpriteFrame: true
                            });
                        }

                        resource.variants[variant.id] = {
                            image: img,
                            frames: frames,
                            spriteSheet: true,
                            cols: sheetConfig.cols,
                            rows: sheetConfig.rows,
                            frameWidth: frameWidth,
                            frameHeight: frameHeight,
                            names: variant.names || []
                        };
                    } else {
                        resource.variants[variant.id] = {
                            image: img,
                            spriteSheet: false
                        };
                    }
                } catch (e) {
                    console.error(`Failed to load variant: ${variant.file}`, e);
                }
            }
            const variantIds = Object.keys(resource.variants);
            if (variantIds.length > 0) {
                resource.currentVariant = variantIds[0];
                resource.image = resource.variants[variantIds[0]].image;
            }
        } else if (config.spriteSheet) {
            try {
                const sheetConfig = config.spriteSheet;
                const path = `${this.basePath}${folder}/${sheetConfig.file}`;
                const img = await this.loadImage(path);

                const frameWidth = sheetConfig.frameWidth || config.size?.width || 64;
                const frameHeight = sheetConfig.frameHeight || config.size?.height || 64;
                const framesPerRow = Math.floor(img.width / frameWidth);
                const totalRows = Math.floor(img.height / frameHeight);
                const frameCount = framesPerRow * totalRows;

                resource.frames = [];
                for (let i = 0; i < frameCount; i++) {
                    const row = Math.floor(i / framesPerRow);
                    const col = i % framesPerRow;

                    resource.frames.push({
                        image: img,
                        sx: col * frameWidth,
                        sy: row * frameHeight,
                        sw: frameWidth,
                        sh: frameHeight,
                        isSpriteFrame: true
                    });
                }

                resource.image = img;
                resource.isSpriteSheet = true;
            } catch (e) {
                console.error(`Failed to load static sprite sheet: ${config.spriteSheet?.file}`, e);
            }
        } else {
            try {
                const path = `${this.basePath}${folder}/${config.file}`;
                resource.image = await this.loadImage(path);
            } catch (e) {
                console.error(`Failed to load static image: ${config.file}`, e);
            }
        }
    }

    /**
     * Load animation frames
     */
    async loadFrames(folder, frameConfigs) {
        const frames = [];
        for (const frameConfig of frameConfigs) {
            try {
                const path = `${this.basePath}${folder}/${frameConfig.file}`;
                const img = await this.loadImage(path);
                frames.push({
                    image: img,
                    duration: frameConfig.duration || 125
                });
            } catch (e) {
                console.error(`Failed to load frame: ${frameConfig.file}`, e);
            }
        }
        return frames;
    }

    /**
     * Load image
     */
    loadImage(originalPath) {
        return new Promise((resolve, reject) => {
            const imagePath = originalPath.replace(/^\.\//, '');
            const img = wx.createImage();

            img.onload = () => {
                resolve(img);
            };

            img.onerror = (e) => {
                console.error(`Failed to load image: ${imagePath}`, e);
                reject(new Error(`Failed to load image: ${imagePath}`));
            };

            img.src = imagePath;
        });
    }

    /**
     * Load JSON file
     */
    async loadJSON(originalPath) {
        const pathsToTry = [
            originalPath,
            originalPath.replace('./', ''),
            '/' + originalPath.replace('./', ''),
            wx.env.USER_DATA_PATH + '/' + originalPath.replace('./', '')
        ];

        for (const path of pathsToTry) {
            if (fileExists(path)) {
                try {
                    const data = fs.readFileSync(path, 'utf8');
                    return JSON.parse(data);
                } catch (e) {
                    // Continue to next path
                }
            }
        }

        return new Promise((resolve, reject) => {
            fs.readFile({
                filePath: originalPath,
                encoding: 'utf8',
                success: (res) => {
                    try {
                        const data = JSON.parse(res.data);
                        resolve(data);
                    } catch (e) {
                        reject(new Error(`JSON parse: ${e.message}`));
                    }
                },
                fail: (err) => {
                    reject(new Error(`File not found: ${originalPath}`));
                }
            });
        });
    }

    /**
     * Update animation frame
     * @param {Object} resource - Resource object
     * @param {number} deltaTime - Time since last frame (ms)
     */
    update(resource, deltaTime) {
        if (!resource || resource.type !== 'animation') return;

        resource.lastFrameTime += deltaTime;
        const currentFrameData = resource.frames[resource.currentFrame];

        if (resource.lastFrameTime >= currentFrameData.duration) {
            resource.lastFrameTime = 0;
            resource.currentFrame++;

            if (resource.currentFrame >= resource.frames.length) {
                if (resource.loop) {
                    resource.currentFrame = 0;
                } else {
                    resource.currentFrame = resource.frames.length - 1;
                }
            }
        }
    }

    /**
     * Get current frame image
     */
    getCurrentFrame(resource) {
        if (!resource) return null;

        if (resource.type === 'animation') {
            if (!resource.frames || resource.frames.length === 0) {
                return null;
            }
            const frame = resource.frames[resource.currentFrame];
            if (!frame || !frame.image) {
                return null;
            }
            if (resource.isSpriteSheet) {
                return {
                    image: frame.image,
                    sx: frame.sx,
                    sy: frame.sy,
                    sw: frame.sw,
                    sh: frame.sh,
                    isSpriteFrame: true
                };
            }
            return frame.image;
        }
        return resource.image || null;
    }

    /**
     * Switch animation state
     */
    setState(resource, stateName) {
        if (!resource || !resource.states || !resource.states[stateName]) return;

        resource.currentState = stateName;
        resource.frames = resource.states[stateName];
        resource.currentFrame = 0;
        resource.lastFrameTime = 0;
    }

    /**
     * Switch static image variant
     */
    setVariant(resource, variantId) {
        if (!resource || !resource.variants || !resource.variants[variantId]) return;

        resource.currentVariant = variantId;
        resource.image = resource.variants[variantId].image;
    }

    /**
     * Get resource size
     */
    getSize(resource) {
        if (!resource || !resource.config) return { width: 0, height: 0 };
        if (resource.partConfig?.size) {
            return resource.partConfig.size;
        }
        return resource.config.size || { width: 0, height: 0 };
    }

    /**
     * Get anchor point
     */
    getAnchor(resource) {
        if (!resource || !resource.config) return { x: 0.5, y: 0.5 };
        if (resource.partConfig?.anchor) {
            return resource.partConfig.anchor;
        }
        return resource.config.anchor || { x: 0.5, y: 0.5 };
    }

    /**
     * Get part rotation speed
     */
    getRotationSpeed(resource) {
        if (!resource || !resource.config) return 0;
        if (resource.partConfig?.rotation?.speed) {
            return resource.partConfig.rotation.speed;
        }
        return 0;
    }

    /**
     * Preload multiple resources
     */
    async preload(folders) {
        const promises = folders.map(folder => this.load(folder));
        return Promise.all(promises);
    }

    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
    }
}

// Singleton instance
export const animationLoader = new AnimationLoader();
