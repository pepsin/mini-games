// 动画资源加载器
// 支持从文件夹加载 PNG 图片，解析 info.json 配置

const fs = wx.getFileSystemManager();

// 检查文件是否存在
function fileExists(path) {
  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    return false;
  }
}

class AnimationLoader {
  constructor() {
    this.cache = new Map(); // 缓存加载的资源
    // WeChat 小游戏路径格式
    this.basePath = 'assets/';
  }

  /**
   * 加载单个资源文件夹
   * @param {string} folder - 资源文件夹名 (如 'bomb', 'flower')
   * @returns {Promise<Object>} 资源对象
   */
  async load(folder) {
    if (this.cache.has(folder)) {
      return this.cache.get(folder);
    }

    try {
      console.log(`=== 开始加载资源: ${folder} ===`);
      const configPath = `${this.basePath}${folder}/info.json`;
      console.log(`配置文件路径: ${configPath}`);
      
      let config;
      try {
        config = await this.loadJSON(configPath);
      } catch (jsonErr) {
        console.error(`加载 JSON 配置失败:`, jsonErr);
        throw new Error(`Config load failed: ${jsonErr.message}`);
      }
      
      console.log(`配置加载成功:`, config.name, config.type);
      
      const resource = {
        name: config.name,
        type: config.type,
        config: config,
        images: {},
        frames: []
      };

      // 根据类型加载资源
      try {
        if (config.type === 'animation') {
          await this.loadAnimation(resource, folder, config);
        } else if (config.type === 'static') {
          await this.loadStatic(resource, folder, config);
        }
      } catch (loadErr) {
        console.error(`加载资源内容失败:`, loadErr);
        throw loadErr;
      }

      this.cache.set(folder, resource);
      console.log(`=== 资源 ${folder} 加载完成 ===`);
      return resource;
    } catch (e) {
      console.error(`加载资源 [${folder}] 失败:`, e.message || e);
      console.error(`错误详情:`, JSON.stringify(e));
      return null;
    }
  }

  /**
   * 加载动画资源
   */
  async loadAnimation(resource, folder, config) {
    // 带状态的动画
    if (config.states) {
      resource.states = {};
      for (const [stateName, stateConfig] of Object.entries(config.states)) {
        resource.states[stateName] = await this.loadFrames(folder, stateConfig.frames);
      }
      // 默认使用第一个状态
      resource.currentState = Object.keys(config.states)[0];
      resource.frames = resource.states[resource.currentState];
    } else {
      // 普通动画
      resource.frames = await this.loadFrames(folder, config.frames);
    }

    resource.currentFrame = 0;
    resource.fps = config.fps || 8;
    resource.frameDuration = 1000 / resource.fps;
    resource.loop = config.loop !== false;
    resource.lastFrameTime = 0;
  }

  /**
   * 加载静态资源
   */
  async loadStatic(resource, folder, config) {
    // 多版本静态图
    if (config.variants) {
      resource.variants = {};
      for (const variant of config.variants) {
        try {
          const path = `${this.basePath}${folder}/${variant.file}`;
          console.log(`加载变体: ${path}`);
          const img = await this.loadImage(path);
          resource.variants[variant.id] = img;
        } catch (e) {
          console.error(`加载变体失败: ${variant.file}`, e);
        }
      }
      // 默认使用第一个变体
      const variantIds = Object.keys(resource.variants);
      if (variantIds.length > 0) {
        resource.currentVariant = variantIds[0];
        resource.image = resource.variants[resource.currentVariant];
      }
    } else {
      // 单张静态图
      try {
        const path = `${this.basePath}${folder}/${config.file}`;
        console.log(`加载静态图: ${path}`);
        resource.image = await this.loadImage(path);
      } catch (e) {
        console.error(`加载静态图失败: ${config.file}`, e);
      }
    }
  }

  /**
   * 加载动画帧
   */
  async loadFrames(folder, frameConfigs) {
    const frames = [];
    for (const frameConfig of frameConfigs) {
      try {
        const path = `${this.basePath}${folder}/${frameConfig.file}`;
        console.log(`加载帧: ${path}`);
        const img = await this.loadImage(path);
        frames.push({
          image: img,
          duration: frameConfig.duration || 125
        });
      } catch (e) {
        console.error(`加载帧失败: ${frameConfig.file}`, e);
        // 继续加载其他帧
      }
    }
    return frames;
  }

  /**
   * 加载图片
   */
  loadImage(originalPath) {
    return new Promise((resolve, reject) => {
      console.log(`尝试加载图片: ${originalPath}`);
      
      // 尝试多种路径格式
      const pathsToTry = [
        originalPath,
        originalPath.replace('./', ''),
        '/' + originalPath.replace('./', ''),
        wx.env.USER_DATA_PATH + '/' + originalPath.replace('./', '')
      ];
      
      // 找到第一个存在的路径
      let actualPath = originalPath;
      for (const path of pathsToTry) {
        if (fileExists(path)) {
          actualPath = path;
          console.log(`  使用存在的路径: ${path}`);
          break;
        }
      }
      
      // WeChat 小游戏使用 wx.createImage()
      const img = wx.createImage();
      
      img.onload = () => {
        console.log(`图片加载成功: ${actualPath} (${img.width}x${img.height})`);
        resolve(img);
      };
      
      img.onerror = (e) => {
        console.error(`图片加载失败: ${actualPath}`, e);
        reject(new Error(`加载图片失败: ${actualPath}`));
      };
      
      img.src = actualPath;
    });
  }

  /**
   * 加载 JSON 文件
   */
  async loadJSON(originalPath) {
    console.log(`加载 JSON: ${originalPath}`);
    
    // 尝试多种路径格式
    const pathsToTry = [
      originalPath,
      originalPath.replace('./', ''),
      '/' + originalPath.replace('./', ''),
      wx.env.USER_DATA_PATH + '/' + originalPath.replace('./', '')
    ];
    
    for (const path of pathsToTry) {
      console.log(`  检查路径: ${path}`);
      if (fileExists(path)) {
        console.log(`  文件存在: ${path}`);
        try {
          const data = fs.readFileSync(path, 'utf8');
          const json = JSON.parse(data);
          console.log(`  JSON 加载成功: ${path}`);
          return json;
        } catch (e) {
          console.warn(`  读取失败: ${e.message}`);
        }
      }
    }
    
    // 如果同步方法都失败，尝试异步方法
    return new Promise((resolve, reject) => {
      fs.readFile({
        filePath: originalPath,
        encoding: 'utf8',
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            console.log(`JSON 异步加载成功: ${originalPath}`);
            resolve(data);
          } catch (e) {
            reject(new Error(`JSON parse: ${e.message}`));
          }
        },
        fail: (err) => {
          console.error(`JSON 加载失败: ${originalPath}`, err);
          reject(new Error(`File not found: ${originalPath}`));
        }
      });
    });
  }

  /**
   * 更新动画帧
   * @param {Object} resource - 资源对象
   * @param {number} deltaTime - 距离上一帧的时间(ms)
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
   * 获取当前帧图片
   */
  getCurrentFrame(resource) {
    if (!resource) return null;
    
    if (resource.type === 'animation') {
      if (!resource.frames || resource.frames.length === 0) {
        console.log('动画没有帧数据');
        return null;
      }
      const frame = resource.frames[resource.currentFrame];
      if (!frame) {
        console.log('当前帧不存在:', resource.currentFrame);
        return null;
      }
      if (!frame.image) {
        console.log('当前帧没有图片');
        return null;
      }
      return frame.image;
    }
    return resource.image || null;
  }

  /**
   * 切换动画状态
   */
  setState(resource, stateName) {
    if (!resource || !resource.states || !resource.states[stateName]) return;
    
    resource.currentState = stateName;
    resource.frames = resource.states[stateName];
    resource.currentFrame = 0;
    resource.lastFrameTime = 0;
  }

  /**
   * 切换静态图变体
   */
  setVariant(resource, variantId) {
    if (!resource || !resource.variants || !resource.variants[variantId]) return;
    
    resource.currentVariant = variantId;
    resource.image = resource.variants[variantId];
  }

  /**
   * 获取资源尺寸
   */
  getSize(resource) {
    if (!resource || !resource.config) return { width: 0, height: 0 };
    return resource.config.size || { width: 0, height: 0 };
  }

  /**
   * 获取锚点
   */
  getAnchor(resource) {
    if (!resource || !resource.config) return { x: 0.5, y: 0.5 };
    return resource.config.anchor || { x: 0.5, y: 0.5 };
  }

  /**
   * 预加载多个资源
   */
  async preload(folders) {
    const promises = folders.map(folder => this.load(folder));
    return Promise.all(promises);
  }

  /**
   * 清除缓存
   */
  clear() {
    this.cache.clear();
  }
}

// 导出单例
const animationLoader = new AnimationLoader();

// 兼容 module.exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AnimationLoader, animationLoader };
}
