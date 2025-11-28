// src/core/utils.js
import path from 'path';
import fs from 'fs';
import {
  DEFAULT_ATTRIBUTES,
  DEFAULT_PLUGIN_OPTIONS,
  FRAMEWORKS,
  BUILD_TOOLS,
  ENVIRONMENTS,
  LOG_LEVELS,
  VUE_NODE_TYPES,
  type DefaultPluginOptionsType
} from './constants.js';

/**
 * 合并插件选项
 * @param {Object} userOptions 用户传入的选项
 * @returns {Object} 合并后的选项
 */
const mergeOptions = (userOptions: DefaultPluginOptionsType = {}) => {
  const merged = {
    ...DEFAULT_PLUGIN_OPTIONS,
    ...userOptions,
    attributes: {
      ...DEFAULT_ATTRIBUTES,
      ...(userOptions.attributes || {}),
      custom: {
        ...(DEFAULT_ATTRIBUTES.custom as any || {}),
        ...(userOptions.attributes?.custom || {}),
      },
    },
    includeTags: [...(DEFAULT_PLUGIN_OPTIONS.includeTags ?? []), ...(userOptions.includeTags || [])],
    excludeTags: [...(DEFAULT_PLUGIN_OPTIONS.excludeTags ?? []), ...(userOptions.excludeTags || [])],
  };

  // 环境处理
  merged.env = userOptions.env || process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;

  // 根据环境禁用插件
  if (merged.disableInDevelopment && merged.env === ENVIRONMENTS.DEVELOPMENT) {
    merged.enabled = false;
  }

  if (merged.disableInProduction && merged.env === ENVIRONMENTS.PRODUCTION) {
    merged.enabled = false;
  }

  return merged;
};

/**
 * 检测当前项目框架
 * @param {string} projectRoot 项目根目录
 * @returns {string} 框架类型 (vue, react, unknown)
 */
const detectFramework = (projectRoot: string) => {
  const pkgPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return FRAMEWORKS.UNKNOWN;
  }

  try {
    const pkg = require(pkgPath);
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

    if (dependencies.vue || dependencies['vue-loader']) {
      return FRAMEWORKS.VUE;
    }

    if (dependencies.react || dependencies['react-dom']) {
      return FRAMEWORKS.REACT;
    }

    return FRAMEWORKS.UNKNOWN;
  } catch (error) {
    return FRAMEWORKS.UNKNOWN;
  }
};

/**
 * 检测当前构建工具
 * @param {Object} config 构建配置对象
 * @returns {string} 构建工具类型
 */
const detectBuildTool = (config: any) => {
  if (config?.vite) return BUILD_TOOLS.VITE;
  if (config?.webpack) return BUILD_TOOLS.WEBPACK;
  if (config?.rollup) return BUILD_TOOLS.ROLLUP;

  // 根据配置文件判断
  const projectRoot = process.cwd();
  if (fs.existsSync(path.join(projectRoot, 'vite.config.js')) || fs.existsSync(path.join(projectRoot, 'vite.config.ts'))) {
    return BUILD_TOOLS.VITE;
  }

  if (fs.existsSync(path.join(projectRoot, 'webpack.config.js')) || fs.existsSync(path.join(projectRoot, 'webpack.config.ts'))) {
    return BUILD_TOOLS.WEBPACK;
  }

  return BUILD_TOOLS.UNKNOWN;
};

/**
 * 日志工具
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 * @param {Object} options 插件选项
 */
const log = (level: any, message: any, options: DefaultPluginOptionsType) => {
  const { logLevel } = options || DEFAULT_PLUGIN_OPTIONS;
  const levels = Object.values(LOG_LEVELS);

  // 检查是否应该记录此级别的日志
  if (levels.indexOf(level) > levels.indexOf(logLevel)) {
    return;
  }

  const prefix = `[tag-attr-injector] ${level.toUpperCase()}:`;

  switch (level) {
    case LOG_LEVELS.ERROR:
      console.error(prefix, message);
      break;
    case LOG_LEVELS.WARN:
      console.warn(prefix, message);
      break;
    case LOG_LEVELS.INFO:
      console.info(prefix, message);
      break;
    case LOG_LEVELS.DEBUG:
    case LOG_LEVELS.VERBOSE:
      console.debug(prefix, message);
      break;
    default:
      console.log(prefix, message);
  }
};

/**
 * 规范化文件路径
 * @param {string} filePath 文件路径
 * @param {string} projectRoot 项目根目录
 * @returns {string} 规范化后的路径
 */
const normalizeFilePath = (filePath: string, projectRoot: string = process.cwd()) => {
  // 如果是绝对路径，转换为相对路径
  if (path.isAbsolute(filePath)) {
    return path.relative(projectRoot, filePath);
  }

  return filePath;
};

/**
 * 检查标签是否应该被处理
 * @param {string} tagName 标签名
 * @param {Object} options 插件选项
 * @returns {boolean} 是否应该处理
 */
const shouldProcessTag = (tagName: string, options: DefaultPluginOptionsType) => {
  if (!tagName) return false;

  const { includeTags = [], excludeTags = [] } = options;

  // 如果标签在排除列表中，不处理
  if (excludeTags.includes(tagName)) {
    return false;
  }

  // 如果包含列表不为空且标签不在包含列表中，不处理
  if (includeTags.length > 0 && !includeTags.includes(tagName)) {
    return false;
  }

  return true;
};

/**
 * 安全获取位置信息
 * @param {Object} node AST节点
 * @returns {Object} 位置信息
 */
const getSafeLocation = (node: any) => {
  if (!node || !node.loc) {
    return {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 0 },
    };
  }

  return node.loc;
};

/**
 * 创建唯一标识符
 * @param {Object} node AST节点
 * @param {Object} location 位置信息
 * @returns {string} 唯一ID
 */
const createElementId = (node: any, location: any) => {
  if (!node || !location) return '';

  const tag = node.tag || node.name?.name || 'unknown';
  const { line, column } = location.start;

  return `${tag}-${line}-${column}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
};

/**
 * 检查是否是Vue元素节点
 * @param {Object} node Vue AST节点
 * @returns {boolean} 是否是元素节点
 */
const isVueElementNode = (node: any) => {
  return node && node.type === VUE_NODE_TYPES.ELEMENT;
};

/**
 * 检查是否是React JSX元素节点
 * @param {Object} node Babel AST节点
 * @returns {boolean} 是否是JSX元素节点
 */
const isReactElementNode = (node: any) => {
  return node && node.type === 'JSXOpeningElement';
};

/**
 * 深度克隆对象
 * @param {Object} obj 要克隆的对象
 * @returns {Object} 克隆后的对象
 */
const deepClone = (obj: Record<string, string>) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * 生成源映射注释
 * @param {Object} map 源映射对象
 * @returns {string} 源映射注释
 */
const generateSourceMapComment = (map: any) => {
  if (!map) return '';

  const base64Map = Buffer.from(JSON.stringify(map)).toString('base64');
  return `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}`;
};

/**
 * 测量函数执行时间
 * @param {Function} fn 要测量的函数
 * @param {string} name 测量名称
 * @param {Object} options 插件选项
 * @returns 函数执行结果
 */
const measureTime = (fn: any, name: string, options: any) => {
  const start = process.hrtime.bigint();
  const result = fn();
  const end = process.hrtime.bigint();

  const duration = Number(end - start) / 1e6; // 转换为毫秒
  log(LOG_LEVELS.DEBUG, `${name} took ${duration.toFixed(2)}ms`, options);

  return result;
};

/**
 * 获取文件内容哈希值
 * @param {string} content 文件内容
 * @returns {string} 哈希值
 */
const getContentHash = (content: string) => {
  // 简单哈希实现，实际项目中可使用更复杂的算法
  let hash = 0;

  if (content.length === 0) return hash.toString(16);

  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }

  return Math.abs(hash).toString(16);
};

export {
  mergeOptions,
  detectFramework,
  detectBuildTool,
  log,
  normalizeFilePath,
  shouldProcessTag,
  getSafeLocation,
  createElementId,
  isVueElementNode,
  deepClone,
  generateSourceMapComment,
  measureTime,
  getContentHash,
};
