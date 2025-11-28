import { DEFAULT_ATTRIBUTES } from './core/constants.js';

// * vite 插件
import createReactDevInjectorPlugin from './vite/react-injector-dev-plugin.js';

export {
  
  // * vite
  // React dev插件
  createReactDevInjectorPlugin,
  
  // 默认配置
  DEFAULT_ATTRIBUTES
};