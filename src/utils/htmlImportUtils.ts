/**
 * HTML导入工具
 * 用于导入之前导出的HTML文件
 */

import type { EditorSettings } from '@/types/editor';

/**
 * 从HTML文件中提取内容和设置
 */
export function parseHTMLFile(htmlContent: string): {
  content: string;
  settings: Partial<EditorSettings>;
} {
  // 创建临时DOM解析器
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  // 提取内容
  const content = extractContent(doc);
  
  // 提取设置
  const settings = extractSettings(doc);
  
  return { content, settings };
}

/**
 * 提取文档内容
 */
function extractContent(doc: Document): string {
  // 尝试找到内容容器
  let contentElement = doc.querySelector('.content');
  
  // 如果没有找到.content，尝试其他可能的容器
  if (!contentElement) {
    contentElement = doc.querySelector('.container .content');
  }
  
  if (!contentElement) {
    contentElement = doc.querySelector('body > .container');
  }
  
  if (!contentElement) {
    // 如果都没找到，使用body的内容，但需要清理
    contentElement = doc.body;
  }
  
  if (!contentElement) {
    throw new Error('无法找到文档内容');
  }
  
  // 克隆元素以避免修改原始DOM
  const clonedElement = contentElement.cloneNode(true) as HTMLElement;
  
  // 清理不需要的元素
  cleanupElement(clonedElement);
  
  // 返回清理后的HTML
  return clonedElement.innerHTML;
}

/**
 * 清理元素，移除不需要的内容
 */
function cleanupElement(element: HTMLElement): void {
  // 移除目录相关元素
  const tocElements = element.querySelectorAll('.floating-toc, .toc-toggle, .toc-collapse');
  tocElements.forEach(el => el.remove());
  
  // 移除图片查看器
  const imageViewer = element.querySelectorAll('.image-viewer');
  imageViewer.forEach(el => el.remove());
  
  // 移除脚本标签
  const scripts = element.querySelectorAll('script');
  scripts.forEach(el => el.remove());
  
  // 移除样式标签
  const styles = element.querySelectorAll('style');
  styles.forEach(el => el.remove());
  
  // 移除链接卡片的操作按钮（如果有的话）
  const cardActions = element.querySelectorAll('.card-actions');
  cardActions.forEach(el => el.remove());
  
  // 移除标题的ID属性（编辑器会重新生成）
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    if (heading.id && heading.id.startsWith('heading-')) {
      heading.removeAttribute('id');
    }
  });
  
  // 清理链接卡片的内联样式和属性
  const linkCards = element.querySelectorAll('.link-card');
  linkCards.forEach(card => {
    // 保留data属性，但移除内联样式
    card.removeAttribute('style');
    
    // 清理子元素的内联样式
    const children = card.querySelectorAll('*');
    children.forEach(child => {
      child.removeAttribute('style');
    });
  });
  
  // 清理表格的内联样式
  const tables = element.querySelectorAll('table, td, th');
  tables.forEach(table => {
    // 保留border属性，但移除内联样式
    const style = table.getAttribute('style');
    if (style) {
      // 提取border相关的样式
      const borderMatch = style.match(/border:\s*([^;]+)/);
      if (borderMatch) {
        table.setAttribute('style', `border: ${borderMatch[1]}`);
      } else {
        table.removeAttribute('style');
      }
    }
  });
  
  // 移除contenteditable属性
  const editableElements = element.querySelectorAll('[contenteditable]');
  editableElements.forEach(el => {
    el.removeAttribute('contenteditable');
  });
  
  // 移除onclick等事件属性
  const elementsWithEvents = element.querySelectorAll('[onclick], [onmouseover], [onmouseout]');
  elementsWithEvents.forEach(el => {
    el.removeAttribute('onclick');
    el.removeAttribute('onmouseover');
    el.removeAttribute('onmouseout');
  });
}

/**
 * 提取设置信息
 */
function extractSettings(doc: Document): Partial<EditorSettings> {
  const settings: Partial<EditorSettings> = {};
  
  // 提取标题
  const titleElement = doc.querySelector('title');
  if (titleElement && titleElement.textContent) {
    settings.pageTitle = titleElement.textContent;
  }
  
  // 提取favicon
  const faviconElement = doc.querySelector('link[rel="icon"]') as HTMLLinkElement;
  if (faviconElement && faviconElement.href) {
    settings.favicon = faviconElement.href;
  }
  
  // 提取背景图片（从body的style中）
  const bodyElement = doc.querySelector('body');
  if (bodyElement) {
    const style = bodyElement.getAttribute('style');
    if (style) {
      // 提取背景图片URL
      const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
      if (bgMatch && bgMatch[1]) {
        settings.backgroundImage = bgMatch[1];
      }
      
      // 提取透明度
      const opacityMatch = style.match(/--content-opacity:\s*([\d.]+)/);
      if (opacityMatch && opacityMatch[1]) {
        settings.opacity = parseFloat(opacityMatch[1]) * 100;
      }
    }
  }
  
  // 提取内容区域的透明度（从.content的style中）
  const contentElement = doc.querySelector('.content');
  if (contentElement) {
    const style = contentElement.getAttribute('style');
    if (style) {
      const opacityMatch = style.match(/background:\s*rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/);
      if (opacityMatch && opacityMatch[1]) {
        settings.opacity = parseFloat(opacityMatch[1]) * 100;
      }
    }
  }
  
  return settings;
}

/**
 * 导入HTML文件
 */
export async function importHTMLFile(file: File): Promise<{
  content: string;
  settings: Partial<EditorSettings>;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const htmlContent = event.target?.result as string;
        
        if (!htmlContent) {
          throw new Error('文件内容为空');
        }
        
        const result = parseHTMLFile(htmlContent);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}
