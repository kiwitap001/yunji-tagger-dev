type CustomerAttributes = {
  customer?: Record<string, string>;
}

/**
 * 自定义属性类型
 */
export type CustomAttributes = Record<string, string>;
/**
 * 默认属性类型
 */
export type DefaultAttributes = Record<string, string> & CustomerAttributes;

/**
 * 默认属性配置
 * 这些是插件将注入的标准属性名称
 */
const DEFAULT_ATTRIBUTES: DefaultAttributes = {
  uniqueId: 'data-plugin-component-unique-id',
  filePath: 'data-plugin-component-file-path',
  fileName: 'data-plugin-component-file-name',
  startLocationNumber: 'data-plugin-start-line-column',
  endLocationNumber: 'data-plugin-end-line-column',
  tagName: 'data-plugin-tag-name',
  tagContent: 'data-plugin-tag-content',
  elementMap: 'data-plugin-element-map',
  contextInfo: 'data-plugin-component-context',
  hasElementChildren: 'data-plugin-has-element-children',
  isSVG: 'data-plugin-is-svg',
  svgWidth: 'data-plugin-svg-width',
  svgHeight: 'data-plugin-svg-height',
  svgContent: 'data-plugin-svg-content',
};

/**
 * 默认包含的标签（空数组表示包含所有标签）
 */
const DEFAULT_INCLUDE_TAGS: string[] = [];

/**
 * 默认排除的标签
 * 这些标签通常不包含有意义的UI内容
 */
const DEFAULT_EXCLUDE_TAGS: string[] = [
  'script',
  'style',
  'template',
  'link',
  'meta',
  'html',
  'head',
  'body',
  'title',
  'base',
  'noscript',
  'noframes',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'Fragment'
];

/**
 * 框架类型常量
 */
const FRAMEWORKS: Record<string, string> = {
  VUE: 'vue',
  REACT: 'react',
  UNKNOWN: 'unknown',
};

/**
 * 构建工具类型常量
 */
const BUILD_TOOLS: Record<string, string> = {
  WEBPACK: 'webpack',
  VITE: 'vite',
  ROLLUP: 'rollup',
  UNKNOWN: 'unknown',
};

/**
 * 环境类型常量
 */
const ENVIRONMENTS: Record<string, string> = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
};

/**
 * AST节点类型常量（Vue编译器）
 */
const VUE_NODE_TYPES: Record<string, number> = {
  ELEMENT: 1, // 元素节点
  TEXT: 2, // 文本节点
  COMMENT: 3, // 注释节点
  SIMPLE_EXPRESSION: 4, // 简单表达式
  INTERPOLATION: 5, // 插值表达式
  ATTRIBUTE: 6, // 属性节点
  DIRECTIVE: 7, // 指令节点
};

/**
 * 日志级别
 */
const LOG_LEVELS: Record<string, string> = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  VERBOSE: 'verbose',
};

const SVG_COMPONENT_MODULES: string[] = ['lucide-react', '@ant-design/icons'];

export type DefaultPluginOptionsType = {
  enabled?: boolean;
  logLevel?: string;
  env?: string;
  disableInDevelopment?: boolean;
  disableInProduction?: boolean;
  include?: string | string[] | RegExp[];
  exclude?: string | string[] | RegExp[];
  attributes?: {
    custom?: CustomAttributes;
    [key: string]: string | CustomAttributes | undefined;
  };
  includeTags?: string[];
  excludeTags?: string[];
}

/**
 * 默认插件配置
 */
const DEFAULT_PLUGIN_OPTIONS: DefaultPluginOptionsType = {
  // 是否启用插件
  enabled: true,

  // 日志级别
  logLevel: 'warn',

  // 环境过滤
  env: process.env.NODE_ENV || 'development',

  // 是否在开发环境禁用
  disableInDevelopment: false,

  // 是否在生产环境禁用
  disableInProduction: true,

  // 包含的文件模式
  include: [/\.vue$/, /\.(jsx|tsx)$/],

  // 排除的文件模式
  exclude: [/node_modules/],

  // 属性配置
  attributes: { ...DEFAULT_ATTRIBUTES },

  // 包含的标签
  includeTags: [...DEFAULT_INCLUDE_TAGS],

  // 排除的标签
  excludeTags: [...DEFAULT_EXCLUDE_TAGS],
};

/**
 * 特殊属性处理
 * 这些属性不会被注入位置信息
 */
const RESERVED_ATTRIBUTES: string[] = [
  'key',
  'ref',
  'slot',
  'is',
  'v-for',
  'v-if',
  'v-else',
  'v-else-if',
  'v-show',
  'v-model',
];

/**
 * 默认源映射设置
 */
const SOURCE_MAP_OPTIONS: Record<string, boolean> = {
  includeSources: true,
  inlineSources: true,
  inline: true,
};

export {
  DEFAULT_ATTRIBUTES,
  DEFAULT_INCLUDE_TAGS,
  DEFAULT_EXCLUDE_TAGS,
  FRAMEWORKS,
  BUILD_TOOLS,
  ENVIRONMENTS,
  VUE_NODE_TYPES,
  LOG_LEVELS,
  DEFAULT_PLUGIN_OPTIONS,
  RESERVED_ATTRIBUTES,
  SOURCE_MAP_OPTIONS,
  SVG_COMPONENT_MODULES,
};
