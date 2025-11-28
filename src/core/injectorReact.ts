import path from 'path';
import { types } from '@babel/core';
import type {
  JSXAttribute,
  JSXElement,
  JSXIdentifier,
  JSXText,
  JSXExpressionContainer,
  StringLiteral,
  ConditionalExpression,
} from '@babel/types';
import { DEFAULT_PLUGIN_OPTIONS, type DefaultPluginOptionsType } from './constants.js';

class TagInjector {
  options: DefaultPluginOptionsType = {};
  constructor(options: DefaultPluginOptionsType = {}) {
    this.options = {
      ...DEFAULT_PLUGIN_OPTIONS,
      ...options,
      attributes: {
        ...DEFAULT_PLUGIN_OPTIONS.attributes,
        ...(options?.attributes || {}),
      },
    };
  }

  // 处理React JSX节点
  processReactNode(node: any, state: any) {
    if ((node as any).__tag_injected__) return;
    Object.defineProperty(node, '__tag_injected__', {
      value: true,
      enumerable: false,
    });

    const isJSXElement = node.type === 'JSXElement';
    const openingEl = isJSXElement ? node.openingElement : node;
    const loc = openingEl.loc;

    const { filename, root } = state.file.opts;
    const tagName = openingEl.name?.name || '';
    const { includeTags, excludeTags, attributes }: any = this.options;

    // 跳过不处理的标签
    if (excludeTags?.includes(tagName)) return;
    if (includeTags && includeTags?.length > 0 && !includeTags?.includes(tagName)) return;

    // const newAttributes: JSXAttribute[] = [this.createJSXAttribute('data-plugin-language', 'react')];
    const newAttributes: JSXAttribute[] = [];
    const newAttrNames = new Set<string>();
    const existingAttrNames = new Set(
      openingEl.attributes.filter((attr: any) => attr.type === 'JSXAttribute').map((attr: any) => attr.name?.name)
    );

    // 工具函数：安全添加属性
    // const safeAddAttr = (name: string, value: string) => {
    //   if (!name || existingAttrNames.has(name) || newAttrNames.has(name)) return;
    //   newAttributes.push(this.createJSXAttribute(name, value));
    //   newAttrNames.add(name);
    // };

    const safeAddAttr = (name: string, value: string) => {
      if (!name || newAttrNames.has(name)) return;

      // 判断 JSX 中已有此属性名
      const alreadyExists = openingEl.attributes.some((attr: any) => {
        // 显式属性
        if (attr.type === 'JSXAttribute' && attr.name?.name === name) {
          return true;
        }

        // Spread 属性：尝试静态分析 {...{ 'data-plugin-language': 'react' }}
        if (attr.type === 'JSXSpreadAttribute' && attr.argument?.type === 'ObjectExpression') {
          return attr.argument.properties.some((prop: any) => {
            if (prop.type !== 'ObjectProperty') return false;
            const key = prop.key;
            return (
              (key.type === 'Identifier' && key.name === name) || (key.type === 'StringLiteral' && key.value === name)
            );
          });
        }

        return false;
      });

      if (alreadyExists) return;

      newAttributes.push(this.createJSXAttribute(name, value));
      newAttrNames.add(name);
    };

    safeAddAttr('data-plugin-language', 'react');

    // 提取标签文本内容，仅在 JSXElement 中执行
    if (attributes?.tagContent && isJSXElement) {
      const content = this.extractTextContent(node);
      if (content) {
        safeAddAttr(attributes.tagContent, encodeURIComponent(content));
      }
    }

    // 获取相对路径和文件名
    const relativePath = path.relative(root, filename);
    const fileName = path.basename(filename);

    safeAddAttr(attributes?.filePath, encodeURIComponent(relativePath || 'unknown'));
    safeAddAttr(attributes?.fileName, encodeURIComponent(fileName));

    // 添加位置信息属性（必须使用 openingElement.loc）
    if (loc) {
      const { line: startLine, column: startColumn } = loc.start;
      let endLine = loc.end.line;
      let endColumn = loc.end.column;

      if (isJSXElement && node.closingElement?.loc?.end) {
        endLine = node.closingElement.loc.end.line;
        endColumn = node.closingElement.loc.end.column;
      }

      // 添加唯一标识符
      if (attributes?.uniqueId) {
        const uniqueId = `${relativePath}:${startLine}:${startColumn}:${endLine}:${endColumn}`;
        safeAddAttr(attributes?.uniqueId, encodeURIComponent(uniqueId));
      }
      // 添加开始位置
      safeAddAttr(attributes?.startLocationNumber, encodeURIComponent(`${startLine}:${startColumn}`));
      // 添加结束位置
      safeAddAttr(attributes?.endLocationNumber, encodeURIComponent(`${endLine}:${endColumn}`));
    }

    // 添加标签名
    safeAddAttr(attributes?.tagName, tagName);

    // 添加上下文信息
    if (attributes?.contextInfo) {
      const context = this.extractContextInfo(openingEl);
      if (context) {
        safeAddAttr(attributes.contextInfo, encodeURIComponent(JSON.stringify(context)));
      }
    }

    // 如果含有 key，则自动添加 data-plugin-component-map
    for (const attr of openingEl.attributes) {
      if (attr.type === 'JSXAttribute' && attr.name?.name === 'key') {
        safeAddAttr(attributes.elementMap, 'map');
        break;
      }
    }
    // 添加来自 .map 的标记属性
    // 来自 .map 判断
    if (state?.path && this.isJSXFromMap(state.path)) {
      safeAddAttr(attributes.elementMap, 'map');
    }

    // 检查 JSXElement 是否有元素子节点
    if (isJSXElement && attributes?.hasElementChildren) {
      const hasElementChildren = node.children?.some(
        (child: any) => child.type === 'JSXElement' || child.type === 'JSXFragment'
      );
      safeAddAttr(attributes.hasElementChildren, String(hasElementChildren));
    }

    // 自定义属性
    if (attributes?.custom) {
      Object.entries(attributes.custom).forEach(([name, value]: any) => {
        safeAddAttr(name, encodeURIComponent(value));
      });
    }

    // 插入属性，保持 Spread 顺序正确
    const firstSpreadIndex = openingEl.attributes.findIndex((attr: any) => attr.type === 'JSXSpreadAttribute');
    if (firstSpreadIndex === -1) {
      // 没有展开属性，直接追加
      openingEl.attributes.push(...newAttributes);
    } else {
      // 在第一个展开属性前插入
      openingEl.attributes.splice(firstSpreadIndex, 0, ...newAttributes);
    }
  }

  // 提取上下文信息的辅助方法
  extractContextInfo(node: any) {
    const context: Record<string, string | number> = {};

    const attributes = node.attributes.reduce((acc: any, attr: any) => {
      const attrName = attr?.name?.name;
      if (attr.type === 'JSXAttribute') {
        if (attr.value?.type === 'StringLiteral') {
          acc[attrName] = attr.value.value;
        } else if (attr.value?.type === 'JSXExpressionContainer') {
          if (attr.value.expression.type === 'StringLiteral') {
            acc[attrName] = attr.value.expression.value;
          } else if (attr.value.expression.type === 'ConditionalExpression') {
            acc[attr.value.expression.type] = attrName;
            acc[`${attrName}-consequent`] = attr.value.expression.consequent.value;
            acc[`${attrName}-alternate`] = attr.value.expression.alternate.value;
          }
        }
      }
      return acc;
    }, {});

    if (attributes.placeholder) {
      context.placeholder = attributes.placeholder;
    }
    if (attributes.className) {
      context.className = attributes.className;
    }
    if (attributes.id) {
      context.id = attributes.id;
    }
    if (attributes.href) {
      context.href = attributes.href;
    }
    if (attributes.src) {
      context.src = attributes.src;
    }
    if (attributes.ConditionalExpression) {
      context[`${attributes.ConditionalExpression}-consequent`] =
        attributes[`${attributes.ConditionalExpression}-consequent`];
      context[`${attributes.ConditionalExpression}-alternate`] =
        attributes[`${attributes.ConditionalExpression}-alternate`];
      context[`ConditionalExpression`] = attributes.ConditionalExpression;
    }

    return Object.keys(context).length > 0 ? context : null;
  }

  // 提取文本内容的辅助方法
  extractTextContent(node: any) {
    if (!node.children || !Array.isArray(node.children)) return '';

    const textParts = node.children
      .map((child: any) => {
        if (child.type === 'JSXText') {
          return child.value.trim();
        } else if (child.type === 'JSXExpressionContainer') {
          if (child.expression.type === 'StringLiteral') {
            return child.expression.value;
          }
        }
        return '';
      })
      .filter(Boolean);

    return textParts.join(' ').trim();
  }

  // 创建JSX属性
  createJSXAttribute(name: any, value: any) {
    return types.jsxAttribute(types.jsxIdentifier(name), types.stringLiteral(value));
  }

  isJSXFromMap(path: any): boolean {
    let parentPath = path.parentPath;
    while (parentPath) {
      if (parentPath.isCallExpression() && parentPath.node?.callee?.property?.name === 'map') {
        return true;
      }
      parentPath = parentPath.parentPath;
    }
    return false;
  }
}

export default TagInjector;
