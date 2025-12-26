import path from "path";
import { types } from "@babel/core";
import type {
  JSXAttribute,
  JSXElement,
  JSXIdentifier,
  JSXText,
  JSXExpressionContainer,
  StringLiteral,
  ConditionalExpression,
} from "@babel/types";
import {
  DEFAULT_PLUGIN_OPTIONS,
  type DefaultPluginOptionsType,
  SVG_COMPONENT_MODULES,
} from "./constants.js";

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
    Object.defineProperty(node, "__tag_injected__", {
      value: true,
      enumerable: false,
    });

    const isJSXElement = node.type === "JSXElement";
    const openingEl = isJSXElement ? node.openingElement : node;
    const loc = openingEl.loc;

    const { filename, root } = state.file.opts;
    const tagName = openingEl.name?.name || "";
    const { includeTags, excludeTags, attributes }: any = this.options;

    // 跳过不处理的标签
    if (excludeTags?.includes(tagName)) return;
    if (
      includeTags &&
      includeTags?.length > 0 &&
      !includeTags?.includes(tagName)
    )
      return;

    // const newAttributes: JSXAttribute[] = [this.createJSXAttribute('data-plugin-language', 'react')];
    const newAttributes: JSXAttribute[] = [];
    const newAttrNames = new Set<string>();
    const existingAttrNames = new Set(
      openingEl.attributes
        .filter((attr: any) => attr.type === "JSXAttribute")
        .map((attr: any) => attr.name?.name)
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
        if (attr.type === "JSXAttribute" && attr.name?.name === name) {
          return true;
        }

        // Spread 属性：尝试静态分析 {...{ 'data-plugin-language': 'react' }}
        if (
          attr.type === "JSXSpreadAttribute" &&
          attr.argument?.type === "ObjectExpression"
        ) {
          return attr.argument.properties.some((prop: any) => {
            if (prop.type !== "ObjectProperty") return false;
            const key = prop.key;
            return (
              (key.type === "Identifier" && key.name === name) ||
              (key.type === "StringLiteral" && key.value === name)
            );
          });
        }

        return false;
      });

      if (alreadyExists) return;

      newAttributes.push(this.createJSXAttribute(name, value));
      newAttrNames.add(name);
    };

    safeAddAttr("data-plugin-language", "react");

    const isSvgTag = this.isSVGElement(openingEl);
    const insideSvg = state?.path ? this.isInsideSVG(state.path) : false;
    const isSvgComponent = state?.path
      ? this.isSVGComponent(openingEl, state.path)
      : false;
    if (isSvgTag || insideSvg || isSvgComponent) {
      safeAddAttr("data-plugin-is-svg", "true");

      // 尝试获取 SVG 尺寸
      const dims = this.getSvgDimensions(openingEl, state?.path);
      if (attributes?.svgWidth && dims?.width != null) {
        safeAddAttr(
          attributes.svgWidth,
          encodeURIComponent(String(dims.width))
        );
      }
      if (attributes?.svgHeight && dims?.height != null) {
        safeAddAttr(
          attributes.svgHeight,
          encodeURIComponent(String(dims.height))
        );
      }
      if (attributes?.svgContent) {
        const sourceCode = state.file.code.slice(node.start, node.end);
        safeAddAttr(attributes.svgContent, encodeURIComponent(sourceCode));
      }
    }

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

    safeAddAttr(
      attributes?.filePath,
      encodeURIComponent(relativePath || "unknown")
    );
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
      safeAddAttr(
        attributes?.startLocationNumber,
        encodeURIComponent(`${startLine}:${startColumn}`)
      );
      // 添加结束位置
      safeAddAttr(
        attributes?.endLocationNumber,
        encodeURIComponent(`${endLine}:${endColumn}`)
      );
    }

    // 添加标签名
    safeAddAttr(attributes?.tagName, tagName);

    // 添加上下文信息
    if (attributes?.contextInfo) {
      const context = this.extractContextInfo(openingEl, state);
      if (context) {
        safeAddAttr(
          attributes.contextInfo,
          encodeURIComponent(JSON.stringify(context))
        );
      }
    }

    // 如果含有 key，则自动添加 data-plugin-component-map
    for (const attr of openingEl.attributes) {
      if (attr.type === "JSXAttribute" && attr.name?.name === "key") {
        safeAddAttr(attributes.elementMap, "map");
        break;
      }
    }
    // 添加来自 .map 的标记属性
    // 来自 .map 判断
    if (state?.path && this.isJSXFromMap(state.path)) {
      safeAddAttr(attributes.elementMap, "map");
    }

    // 检查 JSXElement 是否有元素子节点
    if (isJSXElement && attributes?.hasElementChildren) {
      const hasElementChildren = node.children?.some(
        (child: any) =>
          child.type === "JSXElement" || child.type === "JSXFragment"
      );
      safeAddAttr(attributes.hasElementChildren, String(hasElementChildren));
    }

    // 自定义属性
    if (attributes?.custom) {
      Object.entries(attributes.custom).forEach(([name, value]) => {
        safeAddAttr(name, encodeURIComponent(value));
      });
    }

    // 插入属性，保持 Spread 顺序正确
    const firstSpreadIndex = openingEl.attributes.findIndex(
      (attr: any) => attr.type === "JSXSpreadAttribute"
    );
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
      if (attr.type === "JSXAttribute") {
        if (attr.value?.type === "StringLiteral") {
          acc[attrName] = attr.value.value;
        } else if (attr.value?.type === "JSXExpressionContainer") {
          if (attr.value.expression.type === "StringLiteral") {
            acc[attrName] = attr.value.expression.value;
          } else if (attr.value.expression.type === "ConditionalExpression") {
            acc[attr.value.expression.type] = attrName;
            acc[`${attrName}-consequent`] =
              attr.value.expression.consequent.value;
            acc[`${attrName}-alternate`] =
              attr.value.expression.alternate.value;
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
    if (!node.children || !Array.isArray(node.children)) return "";

    const textParts = node.children
      .map((child: any) => {
        if (child.type === "JSXText") {
          return child.value.trim();
        } else if (child.type === "JSXExpressionContainer") {
          if (child.expression.type === "StringLiteral") {
            return child.expression.value;
          }
        }
        return "";
      })
      .filter(Boolean);

    return textParts.join(" ").trim();
  }

  // 创建JSX属性
  createJSXAttribute(name: any, value: any) {
    return types.jsxAttribute(
      types.jsxIdentifier(name),
      types.stringLiteral(value)
    );
  }

  isSVGElement(openingEl: any): boolean {
    const nameNode: any = openingEl?.name;
    if (!nameNode) return false;
    if (nameNode.type === "JSXIdentifier") {
      const n = nameNode.name;
      return (
        n === "svg" ||
        [
          "g",
          "path",
          "circle",
          "rect",
          "line",
          "polyline",
          "polygon",
          "text",
          "defs",
          "clipPath",
          "linearGradient",
          "radialGradient",
          "stop",
          "use",
          "symbol",
          "marker",
          "pattern",
          "mask",
        ].includes(n)
      );
    }
    return false;
  }

  isInsideSVG(path: any): boolean {
    let p = path;
    while (p) {
      if (p.isJSXElement && p.isJSXElement()) {
        const name: any = p.node?.openingElement?.name;
        if (name && name.type === "JSXIdentifier" && name.name === "svg") {
          return true;
        }
      }
      p = p.parentPath;
    }
    return false;
  }

  isSVGComponent(openingEl: any, path: any): boolean {
    const nameNode: any = openingEl?.name;
    if (!nameNode || nameNode.type !== "JSXIdentifier") return false;
    const compName = nameNode.name;
    const binding = path?.scope?.getBinding?.(compName);
    if (!binding) return false;
    const bpath: any = binding.path;
    if (
      !bpath ||
      !(
        bpath.isImportSpecifier?.() ||
        bpath.isImportDefaultSpecifier?.() ||
        bpath.isImportNamespaceSpecifier?.()
      )
    ) {
      return false;
    }
    const importDecl: any = bpath.parent;
    const source = importDecl?.source?.value || "";
    if (typeof source !== "string") return false;
    if (SVG_COMPONENT_MODULES.includes(source)) return true;
    if (source.startsWith("react-icons")) return true;
    return false;
  }

  getSvgDimensions(
    openingEl: any,
    path: any
  ): { width?: string | number; height?: string | number } {
    const getAttr = (name: string) =>
      openingEl.attributes.find(
        (a: any) => a.type === "JSXAttribute" && a.name?.name === name
      );
    const readVal = (attr: any): any => {
      if (!attr) return undefined;
      if (attr.value?.type === "StringLiteral") return attr.value.value;
      if (attr.value?.type === "JSXExpressionContainer") {
        const e = attr.value.expression;
        if (e?.type === "StringLiteral") return e.value;
        if (e?.type === "NumericLiteral") return e.value;
      }
      return undefined;
    };
    const readStyleDims = (attr: any) => {
      let w: any, h: any, fs: any;
      if (
        attr?.value?.type === "JSXExpressionContainer" &&
        attr.value.expression?.type === "ObjectExpression"
      ) {
        for (const prop of attr.value.expression.properties || []) {
          if (prop.type !== "ObjectProperty") continue;
          const key = prop.key;
          const k =
            key.type === "Identifier"
              ? key.name
              : key.type === "StringLiteral"
              ? key.value
              : undefined;
          if (!k) continue;
          const v = prop.value;
          if (v.type === "StringLiteral") {
            if (k === "width") w = v.value;
            if (k === "height") h = v.value;
            if (k === "fontSize") fs = v.value;
          } else if (v.type === "NumericLiteral") {
            if (k === "width") w = v.value;
            if (k === "height") h = v.value;
            if (k === "fontSize") fs = v.value;
          }
        }
      }
      if ((w == null || h == null) && fs != null) {
        if (w == null) w = fs;
        if (h == null) h = fs;
      }
      return { width: w, height: h };
    };

    let width = readVal(getAttr("width"));
    let height = readVal(getAttr("height"));

    if (width == null || height == null) {
      const styleDims = readStyleDims(getAttr("style"));
      if (width == null) width = styleDims.width;
      if (height == null) height = styleDims.height;
    }

    if (width == null || height == null) {
      const size = readVal(getAttr("size"));
      if (size != null) {
        if (width == null) width = size;
        if (height == null) height = size;
      }
    }

    return { width, height };
  }

  isJSXFromMap(path: any): boolean {
    let parentPath = path.parentPath;
    while (parentPath) {
      if (
        parentPath.isCallExpression() &&
        parentPath.node?.callee?.property?.name === "map"
      ) {
        return true;
      }
      parentPath = parentPath.parentPath;
    }
    return false;
  }
}

export default TagInjector;
