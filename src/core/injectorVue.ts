import path from 'path';
import { DEFAULT_PLUGIN_OPTIONS, type DefaultPluginOptionsType } from './constants.js';
import MagicString from 'magic-string';

const VueElementType = 1;

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

  // 处理Vue AST节点
  processVueNode(node: any, context: { filename: string; parentHasVFor?: boolean }): string {
    try {
      const { tag, loc, props: nodeProps } = node;
      const { filename, parentHasVFor } = context;
      const { includeTags, excludeTags, attributes } = this.options;

      // 检查是否在排除列表中
      if (excludeTags?.includes(tag)) return '';
      if (includeTags && includeTags.length > 0 && !includeTags.includes(tag)) return '';

      let result = '';
      let additionJSON: any = {
        'data-plugin-language': 'vue',
      };

      // 获取文件路径（相对路径或绝对路径）
      const projectRoot = process.cwd();
      // 获取相对路径
      const relativePath = path.relative(projectRoot, filename);

      let thisNodeHasVFor = false;
      if (nodeProps.length > 0) {
        const elementMapAttr = attributes?.elementMap as string;
        for (let itemProp of nodeProps) {
          if (itemProp.type === 7 && itemProp.name === 'for') {
            thisNodeHasVFor = true;
            if (!additionJSON[elementMapAttr]) {
              additionJSON['data-plugin-component-for'] = 'for';
              additionJSON[elementMapAttr] = 'true';
            }
          }
        }
      }

      // ✅ 如果父级有 v-for，也标记当前节点
      if (parentHasVFor && attributes?.elementMap) {
        const elementMapAttr = attributes?.elementMap as string;
        additionJSON[elementMapAttr] = 'true';
      }

      // 提取标签内容（适用于 Element 类型节点）
      if (attributes?.tagContent && node.children && Array.isArray(node.children)) {
        const tagContent = attributes?.tagContent as string;
        const hasElementChildrenAttr = attributes?.hasElementChildren as string;
        const elementMapAttr = attributes?.elementMap as string;
        if (Array.isArray(node.children)) {
          const elementChildren = node.children.filter((child) => child.type === VueElementType);
          if (elementChildren.length > 0) {
            additionJSON[hasElementChildrenAttr] = 'true';
          } else {
            additionJSON[hasElementChildrenAttr] = 'false';
          }
        }

        const content = this.extractVueTextContent(node.children);
        if (content && !additionJSON[tagContent]) {
          additionJSON[tagContent] = content;
        }
      }

      const uniqueIdAttr = attributes?.uniqueId as string;
      if (uniqueIdAttr && !additionJSON[uniqueIdAttr]) {
        const uniqueId = `${relativePath}:${loc.start.line}:${loc.start.column}`;
        additionJSON[uniqueIdAttr] = uniqueId;
      }

      // 添加文件位置信息
      const filePathAttr = attributes?.filePath as string;
      if (filePathAttr && !additionJSON[filePathAttr]) {
        additionJSON[filePathAttr] = relativePath || 'unknown';
      }

      // 添加位置信息
      if (loc) {
        const { line: startLine, column: startColumn } = loc.start;
        const { line: endLine, column: endColumn } = loc.end;
        const startLocationNumberAttr = attributes?.startLocationNumber as string;
        if (startLocationNumberAttr && !additionJSON[startLocationNumberAttr]) {
          additionJSON[startLocationNumberAttr] = `${startLine}:${startColumn}`.toString();
        }

        const endLocationNumberAttr = attributes?.endLocationNumber as string;
        if (endLocationNumberAttr && !additionJSON[endLocationNumberAttr]) {
          additionJSON[endLocationNumberAttr] = `${endLine}:${endColumn}`.toString();
        }
      }

      // 添加标签名信息
      const tagNameAttr = attributes?.tagName as string;
      if (attributes?.tagName && !additionJSON[tagNameAttr]) {
        additionJSON[tagNameAttr] = tag;
      }

      // 添加自定义属性
      // @ts-ignore
      if (attributes?.custom && additionJSON[attributes?.custom]) {
        Object.entries(attributes?.custom).forEach(([name, value]) => {
          additionJSON[attributes[name] as string] = value;
        });
      }

      for (const [name, value] of Object.entries(additionJSON)) {
        result += ` ${name}="${encodeURIComponent(value as string)}"`;
      }

      return result;
    } catch (error) {
      console.error('error', error);
      return '';
    }
  }

  // 提取 Vue AST 节点中的文本内容
  extractVueTextContent(children: any[]): string {
    const textParts = children.map((child) => {
      if (child.type === 2) {
        // type 2 表示纯文本
        return child.content.trim();
      } else if (child.type === 5 && child.content?.type === 4) {
        // 插值表达式 {{ msg }}
        return `{{${child.content.content}}}`;
      }
      return '';
    });

    return textParts.filter(Boolean).join(' ').trim();
  }

  // 注入所有子元素
  injectChildren(node: any, filename: string, parentHasVFor: boolean, s: any) {
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (child.type === VueElementType) {
          const insertPosition = child.loc.start.offset + child.tag.length + 1;
          const addition = this.processVueNode(child, {
            filename,
            parentHasVFor,
          });
          s.prependLeft(insertPosition, addition);

          // 继续递归注入子孙
          this.injectChildren(child, filename, parentHasVFor, s);
        }
      }
    }
  }
}

export default TagInjector;
