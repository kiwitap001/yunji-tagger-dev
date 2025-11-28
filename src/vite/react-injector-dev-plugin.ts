import fs from "fs";
import { transformSync } from "@babel/core";
import { createFilter } from '@rollup/pluginutils';
import TagInjector from '../core/injectorReact.js';
import syntaxJsx from "@babel/plugin-syntax-jsx"; // ← 需要这行
import checkPeerDeps from '../core/checkPeerDeps.js';
import ReactBabelPlugin from "../babel/react-plugin.js";

import { type DefaultPluginOptionsType } from '../core/constants.js';

export default function createReactDevInjectorPlugin(options: DefaultPluginOptionsType = {}) {

  // 检查必需的 peerDependencies 是否存在
  checkPeerDeps(['@babel/plugin-syntax-jsx', '@babel/preset-typescript', '@babel/preset-react', '@babel/core'], 'yunji-tagger');
  
  const filter = createFilter(options.include || /\.(jsx|tsx)$/, options.exclude || /node_modules/);

  const injector = new TagInjector();

  return {
    name: "react-injector-plugin",
    enforce: "pre",

    transform(code: string, id: string) {
      if (!filter(id)) return;
      
      if (!/\.(tsx?|jsx)$/.test(id)) return null;
      if (id.includes("node_modules")) return null;

      let realCode = code;

      if (process.env.NODE_ENV === "development") {
        try {
          realCode = fs.readFileSync(id, "utf8");
        } catch {
          console.warn(`[react-injector-plugin] read file failed: ${id}`);
        }
      }

      const output = transformSync(realCode, {
        filename: id,
        configFile: false, // ⛔ 不加载外部 Babel 配置
        babelrc: false, // ⛔ 不加载 .babelrc
        plugins: [
          syntaxJsx, // 👈 只负责语法解析，不改变 JSX
          [
            ReactBabelPlugin,
            {
              injector,
            },
          ],
        ],
        ast: false,
        code: true,
        compact: false,
      });

      return {
        code: output?.code ?? realCode,
        map: null,
      };
    },
  };
}
