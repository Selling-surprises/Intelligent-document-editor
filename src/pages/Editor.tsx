import { useState, useRef, useCallback, useEffect } from 'react';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { EditorContent, EditorContentRef } from '@/components/editor/EditorContent';
import { EditorStatusBar } from '@/components/editor/EditorStatusBar';
import { TableOfContents } from '@/components/editor/TableOfContents';
import { SettingsPanel } from '@/components/editor/SettingsPanel';
import { EnhancedTableToolbar, EnhancedTableToolbarRef } from '@/components/editor/EnhancedTableToolbar';
import { ScrollButtons } from '@/components/editor/ScrollButtons';

import { LinkDialog, type LinkData } from '@/components/editor/LinkDialog';
import { AttachmentDialog, type AttachmentData } from '@/components/editor/AttachmentDialog';
import { AttachmentCodeDialog } from '@/components/editor/AttachmentCodeDialog';
import { CodeDialog } from '@/components/editor/CodeDialog';

import type { AudioMetadata } from '@/components/editor/AudioDialog';
import type { EditorSettings, HeadingItem, FontFamily, FontSize } from '@/types/editor';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { MobileToolbar } from '@/components/editor/MobileToolbar';
import { Settings, Menu } from 'lucide-react';
import { useContextMenu } from '@/hooks/useContextMenu';
import { ContextMenu } from '@/components/editor/ContextMenu';
import { ParagraphDialog } from '@/components/editor/ParagraphDialog';
import { TablePropertiesDialog } from '@/components/editor/TablePropertiesDialog';
import { generateVideoEmbed, generateAudioEmbed } from '@/utils/mediaUtils';
import { exportMarkdown } from '@/utils/markdownUtils';
import { importHTMLFile } from '@/utils/htmlImportUtils';
import { importMarkdownFile } from '@/utils/markdownImportUtils';
import { supabase } from '@/db/supabase';
import hljs from 'highlight.js/lib/core';
// 导入常用语言
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
// 不再静态导入主题CSS，改为动态加载

// 注册语言
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
// 作用域化主题样式缓存
const scopedThemesCache = new Set<string>();

/**
 * 动态加载并隔离代码高亮主题样式
 * 通过为所有CSS选择器添加作用域类名前缀，解决多个主题共存时的冲突问题
 */
async function loadScopedTheme(themeName: string) {
  if (scopedThemesCache.has(themeName)) return;
  
  const styleId = `scoped-hljs-theme-${themeName}`;
  if (document.getElementById(styleId)) {
    scopedThemesCache.add(themeName);
    return;
  }

  try {
    const response = await fetch(`https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${themeName}.min.css`);
    if (!response.ok) throw new Error('Failed to fetch theme');
    
    let cssText = await response.text();
    
    // 为所有非媒体查询的选择器添加作用域前缀
    // 这里的正则表达式会将 .hljs 替换为 .code-theme-xxx .hljs
    // 处理复杂的CSS选择器列表
    const scopedCss = cssText.replace(/([^\r\n,{}]+)(?=[^{}]*{)/g, (match) => {
      // 忽略媒体查询和动画帧
      if (match.includes('@') || match.trim().startsWith('from') || match.trim().startsWith('to') || /^\d/.test(match.trim())) {
        return match;
      }
      return `.code-theme-${themeName} ${match.trim()}`;
    });
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = scopedCss;
    document.head.appendChild(style);
    scopedThemesCache.add(themeName);
  } catch (error) {
    console.error(`Failed to load scoped theme ${themeName}:`, error);
    // 降级处理：如果动态处理失败，则使用传统的link方式（虽有冲突风险但总比没样式好）
    if (!document.getElementById(`hljs-theme-${themeName}`)) {
      const link = document.createElement('link');
      link.id = `hljs-theme-${themeName}`;
      link.rel = 'stylesheet';
      link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${themeName}.min.css`;
      document.head.appendChild(link);
    }
  }
}

hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('php', php);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('markdown', markdown);
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const MAX_HISTORY = 50;

export default function Editor() {
  const { toast } = useToast();
  const editorRef = useRef<EditorContentRef>(null);
  const tableToolbarRef = useRef<EnhancedTableToolbarRef>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const handleEditLinkRef = useRef<((linkElement: HTMLAnchorElement) => void) | null>(null);
  
  const isInternalChange = useRef(false);

  const [content, setContent] = useState('<p>开始编辑您的文档...</p>');
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [currentFont, setCurrentFont] = useState<FontFamily>('Arial');
  const [currentFontSize, setCurrentFontSize] = useState<FontSize>('16px');
  const [currentHeadingLevel, setCurrentHeadingLevel] = useState<string>('');
  const [selectedText, setSelectedText] = useState('');
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const [hasSelectedCells, setHasSelectedCells] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [settings, setSettings] = useState<EditorSettings>({
    pageTitle: '文档1',
    favicon: '',
    backgroundImage: '',
    opacity: 100,
    enableMobileAdaptation: false,
    mobileBackgroundImage: '',
    enableGlassEffect: false,
    glassBlur: 10,
    enableFloatingToc: true, // 默认启用悬浮目录
    useBlackMask: false, // 默认使用白色遮罩
    tocTitleColor: '#4361ee', // 默认蓝色
    codeTheme: 'atom-one-dark', // 默认代码主题
    tocStyle: 'block', // 默认色块风格
    enableScrollButtons: true, // 默认开启跳转按钮
  });

  // 链接编辑状态
  const [editingLink, setEditingLink] = useState<HTMLAnchorElement | null>(null);
  const [linkEditData, setLinkEditData] = useState<Partial<LinkData> | null>(null);
  const [editingAttachment, setEditingAttachment] = useState<HTMLElement | null>(null);
  const [attachmentEditData, setAttachmentEditData] = useState<Partial<AttachmentData> | null>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  
  // 附件提取码弹窗状态
  const [activeAttachmentForCode, setActiveAttachmentForCode] = useState<{
    code: string;
    url: string;
    fileName: string;
  } | null>(null);

  // 代码块编辑状态
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [editingCodeBlock, setEditingCodeBlock] = useState<{ id: string; code: string; language: string; theme: string } | null>(null);


  // 右键菜单系统
  const editorContentRef = useRef<HTMLDivElement | null>(null);
  
  // 获取编辑器内容的 DOM 元素
  useEffect(() => {
    if (editorRef.current) {
      const element = editorRef.current.getElement();
      if (element) {
        editorContentRef.current = element;
      }
    }
  }, []);

  const {
    menuState,
    closeMenu,
    executeCommand,
    paragraphDialogOpen,
    setParagraphDialogOpen,
    applyParagraphSettings,
    tablePropertiesDialogOpen,
    setTablePropertiesDialogOpen,
    applyTableSettings
  } = useContextMenu({
    editorRef: editorContentRef as any,
    onContentChange: () => {
      // editorContentRef.current 已经是 DOM 元素本身，或者是 EditorContent 暴露的 getElement 方法返回的结果
      // 在 useEffect 中它被赋值为 editorRef.current.getElement()，即 HTMLDivElement
      const element = editorContentRef.current;
      if (element) {
        // @ts-ignore
        const html = element.innerHTML || (element as any).getElement?.()?.innerHTML;
        if (html !== undefined) {
          handleContentChange(html);
        }
      }
    },
    onCommand: (command, item, context) => {
      console.log('执行右键菜单命令:', command, item, context);
      
      // 处理自定义命令
      switch (command) {
        case 'fontDialog':
          toast({
            title: '字体对话框',
            description: '字体对话框功能即将推出'
          });
          break;
        case 'insertSymbol':
          toast({
            title: '插入符号',
            description: '符号选择器功能即将推出'
          });
          break;
        case 'hyperlink':
        case 'insertHyperlink':
          const url = prompt('请输入链接地址:', 'https://');
          if (url) {
            handleInsertLink({ url, type: 'text', text: '' });
          }
          break;
        case 'insertImage':
          const imageUrl = prompt('请输入图片地址:');
          if (imageUrl) {
            handleImageUpload(imageUrl);
          }
          break;
        case 'insertTable':
          const rows = parseInt(prompt('行数:', '3') || '0');
          const cols = parseInt(prompt('列数:', '3') || '0');
          if (rows > 0 && cols > 0) {
            handleInsertTable(rows, cols);
          }
          break;
        case 'insertCode':
          const code = prompt('请输入代码:');
          if (code) {
            handleInsertCode(code, 'javascript');
          }
          break;
        case 'insertPageBreak':
          handleCommand('insertHTML', '<hr style="page-break-after: always;">');
          break;
        case 'newComment':
          toast({
            title: '新建批注',
            description: '批注功能即将推出'
          });
          break;
        default:
          console.log('未处理的命令:', command);
      }
    }
  });

  // 动态加载并隔离文档中使用的所有代码主题
  useEffect(() => {
    // 同时也加载设置中的全局默认主题（用于预览和新插入）
    loadScopedTheme(settings.codeTheme);
    
    const editor = editorRef.current?.getElement();
    if (!editor) return;
    
    const codeBlocks = editor.querySelectorAll('.code-block-wrapper');
    codeBlocks.forEach(block => {
      const theme = block.getAttribute('data-theme');
      if (theme) {
        // 加载隔离的主题样式
        loadScopedTheme(theme);
        // 确保块上带有对应的主题类名以触发隔离样式
        if (block instanceof HTMLElement && !block.classList.contains(`code-theme-${theme}`)) {
          block.classList.add(`code-theme-${theme}`);
        }
      }
    });
  }, [content, settings.codeTheme]);

  // 更新统计信息
  useEffect(() => {
    // 创建临时DOM元素来解析内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // 移除所有链接编辑图标（不计入字符统计）
    const linkEditIcons = tempDiv.querySelectorAll('.link-edit-icon');
    linkEditIcons.forEach(icon => icon.remove());
    
    // 移除所有卡片操作按钮（不计入字符统计）
    const cardActions = tempDiv.querySelectorAll('.card-actions');
    cardActions.forEach(action => action.remove());
    
    // 获取纯文本内容
    const text = (tempDiv.textContent || '').trim();
    setCharacterCount(text.length);
    
    const words = text.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [content]);

  // 更新目录
  useEffect(() => {
    const updateHeadings = () => {
      const editor = editorRef.current?.getElement();
      if (!editor) return;

      const headingElements = editor.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const newHeadings: HeadingItem[] = [];

      headingElements.forEach((element, index) => {
        const id = `heading-${index}`;
        element.id = id;
        
        newHeadings.push({
          id,
          level: parseInt(element.tagName[1]),
          text: element.textContent || '',
          element: element as HTMLElement,
        });
      });

      setHeadings(newHeadings);
    };

    updateHeadings();
  }, [content]);

  // 更新页面标题
  useEffect(() => {
    document.title = settings.pageTitle;
  }, [settings.pageTitle]);

  // 更新favicon
  useEffect(() => {
    if (settings.favicon) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.favicon;
    }
  }, [settings.favicon]);

  // 设置卡片和代码块的全局函数
  useEffect(() => {
    // 兼容旧版本的卡片编辑功能（旧卡片可能仍有 onclick="window.editLinkCard()"）
    // @ts-ignore
    window.editLinkCard = (cardId: string) => {
      const card = document.getElementById(cardId) as HTMLElement;
      if (!card) {
        console.error('找不到卡片元素:', cardId);
        toast({
          title: '错误',
          description: '找不到要编辑的卡片',
          variant: 'destructive',
        });
        return;
      }
      
      // 调用新的编辑逻辑（通过 ref）
      if (handleEditLinkRef.current) {
        handleEditLinkRef.current(card as unknown as HTMLAnchorElement);
      }
    };
    
    // @ts-ignore
    window.deleteLinkCard = (cardId: string) => {
      const editor = editorRef.current?.getElement();
      if (!editor) return;
      
      // 使用document.getElementById更可靠
      const card = document.getElementById(cardId) as HTMLElement;
      if (!card) {
        console.error('找不到卡片元素:', cardId);
        toast({
          title: '错误',
          description: '找不到要删除的卡片',
          variant: 'destructive',
        });
        return;
      }
      
      if (confirm('确定要删除这个链接卡片吗？')) {
        card.remove();
        
        // 触发内容更新
        if (editor) {
          setContent(editor.innerHTML);
          handleContentChange(editor.innerHTML);
        }
        
        toast({
          title: '成功',
          description: '链接卡片已删除',
        });
      }
    };
    
    // @ts-ignore
    window.viewAttachment = (attachId: string) => {
      const element = document.getElementById(attachId);
      if (element) {
        const dataStr = element.getAttribute('data-attachment');
        if (dataStr) {
          try {
            const data: AttachmentData = JSON.parse(dataStr);
            if (data.code) {
              setActiveAttachmentForCode({
                code: data.code,
                url: data.url,
                fileName: data.name
              });
            } else {
              window.open(data.url, '_blank');
            }
          } catch (e) {
            console.error('解析附件数据失败:', e);
          }
        }
      }
    };

    // @ts-ignore
    window.editAttachment = (attachId: string) => {
      const element = document.getElementById(attachId);
      if (element) {
        const dataStr = element.getAttribute('data-attachment');
        if (dataStr) {
          try {
            const data = JSON.parse(dataStr);
            setEditingAttachment(element);
            setAttachmentEditData(data);
          } catch (e) {
            console.error('解析附件数据失败:', e);
          }
        }
      }
    };

    // @ts-ignore
    window.deleteAttachment = (attachId: string) => {
      const editor = editorRef.current?.getElement();
      if (!editor) return;
      const element = document.getElementById(attachId);
      if (element && confirm('确定要删除这个附件吗？')) {
        element.remove();
        if (editor) {
          setContent(editor.innerHTML);
          handleContentChange(editor.innerHTML);
        }
        toast({
          title: '成功',
          description: '附件已删除',
        });
      }
    };
    
    // @ts-ignore
    window.editCodeBlock = (codeBlockId: string) => {
      const codeBlock = document.getElementById(codeBlockId) as HTMLElement;
      if (!codeBlock) {
        toast({
          title: '错误',
          description: '找不到代码块',
          variant: 'destructive',
        });
        return;
      }
      
      const code = codeBlock.getAttribute('data-code') || '';
      const language = codeBlock.getAttribute('data-language') || 'javascript';
      const theme = codeBlock.getAttribute('data-theme') || settings.codeTheme;
      const decodedCode = code.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      
      setEditingCodeBlock({
        id: codeBlockId,
        code: decodedCode,
        language,
        theme,
      });
      setCodeDialogOpen(true);
    };

    // @ts-ignore
    window.copyCodeBlock = (codeBlockId: string, buttonElement?: HTMLButtonElement) => {
      const codeBlock = document.getElementById(codeBlockId) as HTMLElement;
      if (!codeBlock) {
        toast({
          title: '错误',
          description: '找不到代码块',
          variant: 'destructive',
        });
        return;
      }
      
      // 从data属性获取原始代码
      const code = codeBlock.getAttribute('data-code') || '';
      const decodedCode = code.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      
      // 更新按钮状态的函数
      const updateButtonState = (success: boolean) => {
        if (buttonElement) {
          const originalText = buttonElement.textContent || '复制';
          const originalBg = buttonElement.style.background || '#3b82f6';
          if (success) {
            buttonElement.textContent = '已复制';
            buttonElement.style.background = '#10b981';
            setTimeout(() => {
              buttonElement.textContent = originalText;
              buttonElement.style.background = originalBg;
            }, 2000);
          }
        }
      };
      
      // 复制到剪贴板
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(decodedCode).then(() => {
          updateButtonState(true);
          toast({
            title: '成功',
            description: '代码已复制到剪贴板',
          });
        }).catch((err) => {
          console.error('复制失败:', err);
          toast({
            title: '错误',
            description: '复制失败，请手动复制',
            variant: 'destructive',
          });
        });
      } else {
        // 降级方案：使用 textarea
        const textarea = document.createElement('textarea');
        textarea.value = decodedCode;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          updateButtonState(true);
          toast({
            title: '成功',
            description: '代码已复制到剪贴板',
          });
        } catch (err) {
          console.error('复制失败:', err);
          toast({
            title: '错误',
            description: '复制失败，请手动复制',
            variant: 'destructive',
          });
        }
        document.body.removeChild(textarea);
      }
    };
    
    // @ts-ignore
    window.deleteCodeBlock = (codeBlockId: string) => {
      const editor = editorRef.current?.getElement();
      if (!editor) return;
      
      const codeBlock = document.getElementById(codeBlockId) as HTMLElement;
      if (!codeBlock) {
        toast({
          title: '错误',
          description: '找不到要删除的代码块',
          variant: 'destructive',
        });
        return;
      }
      
      if (confirm('确定要删除这个代码块吗？')) {
        codeBlock.remove();
        
        // 触发内容更新
        if (editor) {
          setContent(editor.innerHTML);
        }
        
        toast({
          title: '成功',
          description: '代码块已删除',
        });
      }
    };
    
    return () => {
      // @ts-ignore
      delete window.editLinkCard;
      // @ts-ignore
      delete window.deleteLinkCard;
      // @ts-ignore
      delete window.copyCodeBlock;
      // @ts-ignore
      delete window.deleteCodeBlock;
      // @ts-ignore
      delete window.viewAttachment;
      // @ts-ignore
      delete window.editAttachment;
      // @ts-ignore
      delete window.deleteAttachment;
    };
  }, [toast]);

  // 保存光标位置
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  // 恢复光标位置
  const restoreSelection = useCallback(() => {
    const editor = editorRef.current?.getElement();
    if (editor && savedRangeRef.current) {
      editor.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
      }
    }
  }, []);

  // 检测当前格式状态
  const updateFormatState = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // 如果选区在编辑器内，保存当前位置
    const range = selection.getRangeAt(0);
    const editor = editorRef.current?.getElement();
    if (editor && editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
    
    setSelectedText(selection.toString());


    let node = selection.anchorNode;
    if (!node) return;

    // 如果是文本节点，获取其父元素
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }

    if (!node || !(node instanceof HTMLElement)) return;

    // 检测标题级别
    let currentElement: HTMLElement | null = node;
    let headingLevel = '';
    
    while (currentElement && currentElement !== editorRef.current?.getElement()) {
      const tagName = currentElement.tagName?.toLowerCase();
      if (tagName && /^h[1-6]$/.test(tagName)) {
        headingLevel = tagName.toUpperCase();
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    setCurrentHeadingLevel(headingLevel);

    // 检测字体
    const computedStyle = window.getComputedStyle(node);
    const fontFamily = computedStyle.fontFamily;
    
    // 提取第一个字体名称
    if (fontFamily) {
      const firstFont = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      // 匹配已知字体
      const knownFonts: FontFamily[] = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Comic Sans MS', 'Microsoft YaHei', 'SimSun'];
      const matchedFont = knownFonts.find(f => firstFont.includes(f) || f.includes(firstFont));
      if (matchedFont) {
        setCurrentFont(matchedFont);
      }
    }

    // 检测字号
    const fontSize = computedStyle.fontSize;
    if (fontSize) {
      // 将px转换为我们支持的字号
      const pxValue = parseInt(fontSize);
      const knownSizes: FontSize[] = ['8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];
      
      // 找到最接近的字号
      let closestSize: FontSize = '16px';
      let minDiff = Infinity;
      
      knownSizes.forEach(size => {
        const sizeValue = parseInt(size);
        const diff = Math.abs(sizeValue - pxValue);
        if (diff < minDiff) {
          minDiff = diff;
          closestSize = size;
        }
      });
      
      setCurrentFontSize(closestSize);
    }
  }, []);

  // 监听选区变化
  useEffect(() => {
    const editor = editorRef.current?.getElement();
    if (!editor) return;

    const handleSelectionChange = () => {
      updateFormatState();
      // 更新表格单元格选中状态
      if (tableToolbarRef.current) {
        const cells = tableToolbarRef.current.getSelectedCells();
        setHasSelectedCells(cells.length > 0);
      }
    };

    // 监听选区变化
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // 监听鼠标点击
    editor.addEventListener('click', handleSelectionChange);
    
    // 监听键盘事件
    editor.addEventListener('keyup', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      editor.removeEventListener('click', handleSelectionChange);
      editor.removeEventListener('keyup', handleSelectionChange);
    };
  }, [updateFormatState]);

  const handleContentChange = useCallback((newContent: string) => {
    // 严谨检查, 防止 undefined 字符串进入
    if (newContent === undefined || newContent === null || String(newContent) === 'undefined') {
      return;
    }
    
    // 如果内容完全相同，不触发更新
    if (newContent === content) return;
    
    setContent(newContent);

    // 如果是内部撤销/重做触发的变化，不计入历史记录
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    // 历史记录更新逻辑
    setHistory(prev => {
      // 截取当前进度之前的历史
      const newHistory = prev.slice(0, historyIndex + 1);
      
      // 如果新内容与最后一条历史相同，则不添加
      if (newHistory.length > 0 && newHistory[newHistory.length - 1] === newContent) {
        return prev;
      }
      
      const updatedHistory = [...newHistory, newContent];
      
      // 限制最大历史记录数量
      if (updatedHistory.length > MAX_HISTORY) {
        const sliced = updatedHistory.slice(updatedHistory.length - MAX_HISTORY);
        setHistoryIndex(sliced.length - 1);
        return sliced;
      }
      
      setHistoryIndex(updatedHistory.length - 1);
      return updatedHistory;
    });
  }, [content, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const undoContent = history[newIndex];
      
      if (undoContent !== undefined && String(undoContent) !== 'undefined') {
        isInternalChange.current = true;
        setHistoryIndex(newIndex);
        setContent(undoContent);
      }
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const redoContent = history[newIndex];
      
      if (redoContent !== undefined && String(redoContent) !== 'undefined') {
        isInternalChange.current = true;
        setHistoryIndex(newIndex);
        setContent(redoContent);
      }
    }
  }, [history, historyIndex]);

  const handleCommand = useCallback((command: string, value?: string) => {
    const editor = editorRef.current?.getElement();
    if (!editor) return;

    // 如果有保存的选区位置，尝试恢复它，确保命令插入到正确位置
    if (savedRangeRef.current) {
      restoreSelection();
    } else {
      editor.focus();
    }

    // 处理行高
    if (command === 'lineHeight') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer as Node;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement as HTMLElement;
      }
      
      const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TD', 'TH'];
      let target = container as HTMLElement;
      while (target && target !== editor && !blockTags.includes(target.tagName)) {
        target = target.parentElement as HTMLElement;
      }
      
      if (target && target !== editor) {
        target.style.lineHeight = value || '1.5';
        setContent(editor.innerHTML);
      } else {
        document.execCommand('formatBlock', false, 'p');
        setTimeout(() => {
          handleCommand('lineHeight', value);
        }, 10);
      }
      return;
    }

    // 处理首行缩进
    if (command === 'textIndent') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer as Node;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement as HTMLElement;
      }
      
      const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'];
      let target = container as HTMLElement;
      while (target && target !== editor && !blockTags.includes(target.tagName)) {
        target = target.parentElement as HTMLElement;
      }
      
      if (target && target !== editor) {
        const currentIndent = target.style.textIndent;
        target.style.textIndent = currentIndent === '2em' ? '0' : '2em';
        setContent(editor.innerHTML);
      }
      return;
    }

    // 处理对齐命令（图片和表格）
    if (command === 'justifyLeft' || command === 'justifyCenter' || command === 'justifyRight' || command === 'justifyFull') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let element = range.commonAncestorContainer;
        
        if (element.nodeType === Node.TEXT_NODE) {
          element = element.parentElement as Node;
        }
        
        const cell = (element as HTMLElement).closest('td, th');
        if (cell) {
          const alignValue = command === 'justifyLeft' ? 'left' 
            : command === 'justifyCenter' ? 'center' : command === 'justifyRight' ? 'right' : 'justify';
          
          (cell as HTMLTableCellElement).style.textAlign = alignValue;
          setContent(editor.innerHTML);
          toast({
            title: '对齐成功',
            description: `单元格内容已${alignValue === 'left' ? '左对齐' : alignValue === 'center' ? '居中对齐' : alignValue === 'right' ? '右对齐' : '两端对齐'}`,
          });
          return;
        }
        
        let img: HTMLImageElement | null = null;
        if ((element as HTMLElement).tagName === 'IMG') {
          img = element as HTMLImageElement;
        } else if (element instanceof HTMLElement) {
          const imgs = element.querySelectorAll('img');
          if (imgs.length > 0) {
            img = imgs[0] as HTMLImageElement;
          }
        }
        
        if (img) {
          const alignClass = command === 'justifyLeft' ? 'img-left' 
            : command === 'justifyCenter' ? 'img-center' : command === 'justifyRight' ? 'img-right' : '';
          img.className = alignClass;
          setContent(editor.innerHTML);
          toast({
            title: '图片对齐成功',
            description: `图片已${command === 'justifyLeft' ? '左对齐' : command === 'justifyCenter' ? '居中' : command === 'justifyRight' ? '右对齐' : '清除对齐'}`,
          });
          return;
        }
      }
    }

    if (command === 'fontSize') {
      document.execCommand('fontSize', false, '7');
      const fontSpans = editor.querySelectorAll('font[size="7"]');
      fontSpans.forEach((span) => {
        span.removeAttribute('size');
        (span as HTMLElement).style.fontSize = value || '16px';
        const newSpan = document.createElement('span');
        newSpan.style.fontSize = value || '16px';
        newSpan.innerHTML = span.innerHTML;
        span.parentNode?.replaceChild(newSpan, span);
      });
    } else if (command === 'fontName') {
      document.execCommand('fontName', false, value);
    } else if (command === 'formatBlock') {
      document.execCommand('formatBlock', false, value);
    } else if (command === 'removeFormat') {
      document.execCommand('removeFormat', false);
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer as Node;
        if (container.nodeType === Node.TEXT_NODE) {
          container = container.parentElement as HTMLElement;
        }
        const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'];
        let target = container as HTMLElement;
        while (target && target !== editor && !blockTags.includes(target.tagName)) {
          target = target.parentElement as HTMLElement;
        }
        if (target && target !== editor) {
          target.removeAttribute('style');
        }
      }
    } else {
      document.execCommand(command, false, value);
    }
    
    setContent(editor.innerHTML);
    updateFormatState();
  }, [updateFormatState, toast]);

  const handleInsertSpecialChar = useCallback((char: string) => {
    const editor = editorRef.current?.getElement();
    if (!editor) return;
    editor.focus();
    document.execCommand('insertText', false, char);
    setContent(editor.innerHTML);
  }, []);

  const handleFindReplace = useCallback((find: string, replace: string, all: boolean) => {
    const editor = editorRef.current?.getElement();
    if (!editor || !find) return;
    const currentHtml = editor.innerHTML;
    if (all) {
      const newHtml = currentHtml.split(find).join(replace);
      if (currentHtml !== newHtml) {
        setContent(newHtml);
        toast({ title: '替换完成', description: `已完成全部替换` });
      }
    } else {
      const newHtml = currentHtml.replace(find, replace);
      if (currentHtml !== newHtml) {
        setContent(newHtml);
        toast({ title: '替换完成', description: `已替换第一个匹配项` });
      } else {
        toast({ title: '未找到', description: `未找到匹配项: ${find}`, variant: 'destructive' });
      }
    }
  }, [toast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // 处理编辑链接

  const handleInsertLink = useCallback((linkData: LinkData) => {
    restoreSelection();
    
    if (linkData.type === 'text') {
      // 检查当前是否已经有选区
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        // 如果有选中的文字，直接应用链接
        document.execCommand('createLink', false, linkData.url);
        // 如果提供了显示文本且不同于选区，则修改
        if (linkData.text && linkData.text !== selection.toString()) {
          const anchor = selection.anchorNode?.parentElement;
          if (anchor && anchor.tagName === 'A') {
            anchor.textContent = linkData.text;
          }
        }
      } else {
        // 如果没有选中文字，插入带链接的文本
        const linkText = linkData.text || linkData.url;
        const html = `<a href="${linkData.url}" target="_blank">${linkText}</a>`;
        document.execCommand('insertHTML', false, html);
      }
    } else {
      // 插入卡片链接
      const cardId = `card-${Date.now()}`;
      const html = `
        <div id="${cardId}" class="link-card-container my-4" contenteditable="false">
          <a href="${linkData.url}" target="_blank" class="link-card flex border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow no-underline text-foreground">
            ${linkData.image ? `<div class="w-1/3 shrink-0"><img src="${linkData.image}" class="w-full h-full object-cover" /></div>` : ''}
            <div class="flex-1 p-4 flex flex-col justify-center">
              <h4 class="m-0 text-lg font-bold line-clamp-1">${linkData.title || linkData.url}</h4>
              ${linkData.description ? `<p class="m-0 mt-2 text-sm text-muted-foreground line-clamp-2">${linkData.description}</p>` : ''}
              <span class="mt-2 text-xs text-primary truncate">${linkData.url}</span>
            </div>
          </a>
          <div class="card-actions flex gap-2 mt-2">
            <button onclick="window.editLinkCard('${cardId}')" class="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">编辑</button>
            <button onclick="window.deleteLinkCard('${cardId}')" class="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90">删除</button>
          </div>
        </div>
        <p><br></p>
      `;
      document.execCommand('insertHTML', false, html);
    }
    
    if (editorRef.current) {
      setContent(editorRef.current.getElement()?.innerHTML || '');
    }
  }, [restoreSelection]);

  const handleInsertTable = useCallback((rows: number, cols: number) => {
    restoreSelection();
    // 使用 table-layout: fixed 确保列宽稳定
    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 1em 0; table-layout: fixed;"><tbody>';
    
    // 计算每列初始宽度（平均分配）
    const colWidth = (100 / cols).toFixed(2) + '%';
    
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        // 给每个单元格设置初始百分比宽度
        tableHtml += `<td style="border: 1px solid #333; padding: 10px; width: ${colWidth}; overflow-wrap: break-word; word-break: break-all; vertical-align: top;">&nbsp;</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, tableHtml);
    
    if (editorRef.current) {
      setContent(editorRef.current.getElement()?.innerHTML || '');
    }
  }, [restoreSelection]);

  const handleImageUpload = useCallback((url: string, caption?: string) => {
    if (!url) return;
    
    if (caption) {
      const figureHtml = `
        <figure class="image-container" style="display: flex; flex-direction: column; align-items: center; margin: 1.5em 0; border: 1px solid rgba(0,0,0,0.05); padding: 8px; border-radius: 8px; background: rgba(0,0,0,0.02);">
          <img src="${url}" style="max-width: 100%; height: auto; border-radius: 4px;" />
          <figcaption style="margin-top: 10px; font-size: 14px; color: #666; font-style: italic; text-align: center; font-family: inherit;">${caption}</figcaption>
        </figure>
        <p><br></p>
      `;
      handleCommand("insertHTML", figureHtml);
    } else {
      handleCommand("insertImage", url);
    }
  }, [handleCommand]);

  const handleInsertVideo = useCallback((url: string, platform: string) => {
    restoreSelection();
    const embed = generateVideoEmbed(url, platform);
    const html = `<div class="video-container my-4" contenteditable="false">${embed}</div><p><br></p>`;
    document.execCommand('insertHTML', false, html);
    if (editorRef.current) {
      setContent(editorRef.current.getElement()?.innerHTML || '');
    }
  }, [restoreSelection]);

  const handleInsertAudio = useCallback((metadata: AudioMetadata) => {
    restoreSelection();
    const embed = generateAudioEmbed(metadata.url, metadata.platform, metadata);
    const html = `<div class="audio-container my-4" contenteditable="false">${embed}</div><p><br></p>`;
    document.execCommand('insertHTML', false, html);
    if (editorRef.current) {
      setContent(editorRef.current.getElement()?.innerHTML || '');
    }
  }, [restoreSelection]);

  const handleEditLink = useCallback((linkElement: HTMLAnchorElement) => {
    setEditingLink(linkElement);
    
    // 检查是否是卡片链接
    const isCard = linkElement.classList?.contains('link-card');
    
    if (isCard) {
      // 卡片链接 - 从data属性提取数据
      const url = linkElement.getAttribute('data-url') || '';
      const title = linkElement.getAttribute('data-title') || '';
      const description = linkElement.getAttribute('data-description') || '';
      const image = linkElement.getAttribute('data-image') || '';
      
      setLinkEditData({
        url: url,
        text: title,
        title: title,
        description: description,
        image: image,
        type: 'card',
      });
    } else {
      // 文本链接
      const href = linkElement.getAttribute('href') || '';
      // 优先从data属性获取原始文本,否则从textContent获取(需要移除编辑图标)
      let text = linkElement.getAttribute('data-link-text') || '';
      if (!text) {
        const textContent = linkElement.textContent || '';
        // 移除编辑图标emoji
        text = textContent.replace(/✏️/g, '').trim();
      }
      
      setLinkEditData({
        url: href,
        text: text,
        type: 'text',
      });
    }
  }, []);
  
  // 更新 ref，使全局函数可以访问最新的 handleEditLink
  useEffect(() => {
    handleEditLinkRef.current = handleEditLink;
  }, [handleEditLink]);

  // 处理更新链接
  const handleUpdateLink = useCallback((linkData: LinkData) => {
    if (!editingLink) return;
    
    const editor = editorRef.current?.getElement();
    if (!editor) return;
    
    // 检查原链接类型
    const wasCard = editingLink.classList?.contains('link-card');
    const isCard = linkData.type === 'card';
    
    // 如果类型改变,需要替换整个元素
    if (wasCard !== isCard) {
      // 创建新的链接HTML
      let newLinkHtml: string;
      
      if (isCard) {
        // 转换为卡片链接
        const cardTitle = linkData.title || linkData.text || linkData.url;
        const cardDescription = linkData.description || '';
        const cardImage = linkData.image || '';
        const cardId = `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        newLinkHtml = `<div class="link-card" id="${cardId}" contenteditable="false" data-url="${linkData.url}" data-title="${cardTitle}" data-description="${cardDescription}" data-image="${cardImage}" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; display: block; width: 100%; min-height: 96px; max-height: 160px; box-sizing: border-box; text-decoration: none; color: inherit; transition: all 0.2s; background: #ffffff; position: relative; overflow: hidden;"><div class="card-actions" style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; transition: opacity 0.2s; z-index: 10;"><button class="card-edit-btn" style="padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; transition: background 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">编辑</button><button class="card-delete-btn" onclick="event.stopPropagation(); window.deleteLinkCard('${cardId}');" style="padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; transition: background 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">删除</button></div><div class="card-content" onclick="window.open('${linkData.url}', '_blank')" style="display: flex; gap: 16px; cursor: pointer; height: 100%;">${cardImage ? `<div style="width: 96px; height: 96px; flex-shrink: 0; overflow: hidden; border-radius: 4px;"><img src="${cardImage}" alt="${cardTitle}" style="width: 100%; height: 100%; object-fit: cover; display: block;" /></div>` : ''}<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;"><div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cardTitle}</div>${cardDescription ? `<div style="font-size: 14px; color: #6b7280; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 8px;">${cardDescription}</div>` : ''}<div style="font-size: 12px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${linkData.url}</div></div></div></div><p><br></p>`;
      } else {
        // 转换为文本链接
        const linkText = linkData.text || linkData.url;
        newLinkHtml = `<span style="display: inline-block; position: relative;" class="link-wrapper"><a href="${linkData.url}" target="_blank" rel="noopener noreferrer" style="color: #4361ee; text-decoration: underline; display: inline;" data-link-text="${linkText}">${linkText}</a><span class="link-edit-icon" contenteditable="false" unselectable="on" data-ignore-count="true" style="position: absolute; right: -18px; top: 0; cursor: pointer; opacity: 0; transition: opacity 0.2s; font-size: inherit; display: inline-block; white-space: nowrap; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; pointer-events: auto; width: 0; overflow: visible;">✏️</span></span>`;
      }
      
      // 创建临时容器
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newLinkHtml;
      const newElement = tempDiv.firstChild as HTMLElement;
      
      // 替换元素
      editingLink.parentNode?.replaceChild(newElement, editingLink);
      
    } else if (isCard) {
      // 更新卡片链接
      const cardTitle = linkData.title || linkData.text || linkData.url;
      const cardDescription = linkData.description || '';
      const cardImage = linkData.image || '';
      
      editingLink.setAttribute('data-url', linkData.url);
      editingLink.setAttribute('data-title', cardTitle);
      editingLink.setAttribute('data-description', cardDescription);
      editingLink.setAttribute('data-image', cardImage);
      
      // 更新卡片容器样式
      const cardElement = editingLink as HTMLElement;
      cardElement.style.minHeight = '96px';
      cardElement.style.maxHeight = '160px';
      cardElement.style.overflow = 'hidden';
      
      // 更新卡片内容显示
      const cardContent = editingLink.querySelector('.card-content');
      if (cardContent) {
        const cardContentElement = cardContent as HTMLElement;
        cardContentElement.setAttribute('onclick', `window.open('${linkData.url}', '_blank')`);
        cardContentElement.style.height = '100%';
        
        // 重新生成卡片内容HTML
        cardContent.innerHTML = `${cardImage ? `<div style="width: 96px; height: 96px; flex-shrink: 0; overflow: hidden; border-radius: 4px;"><img src="${cardImage}" alt="${cardTitle}" style="width: 100%; height: 100%; object-fit: cover; display: block;" /></div>` : ''}<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;"><div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cardTitle}</div>${cardDescription ? `<div style="font-size: 14px; color: #6b7280; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 8px;">${cardDescription}</div>` : ''}<div style="font-size: 12px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${linkData.url}</div></div>`;
      }
      
    } else {
      // 更新文本链接
      // 由于链接结构改变，需要替换整个包裹的span元素
      const linkText = linkData.text || linkData.url;
      const newLinkHtml = `<span style="display: inline-block; position: relative;" class="link-wrapper"><a href="${linkData.url}" target="_blank" rel="noopener noreferrer" style="color: #4361ee; text-decoration: underline; display: inline;" data-link-text="${linkText}">${linkText}</a><span class="link-edit-icon" contenteditable="false" unselectable="on" data-ignore-count="true" style="position: absolute; right: -18px; top: 0; cursor: pointer; opacity: 0; transition: opacity 0.2s; font-size: inherit; display: inline-block; white-space: nowrap; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; pointer-events: auto; width: 0; overflow: visible;">✏️</span></span>`;
      
      // 创建临时容器
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newLinkHtml;
      const newElement = tempDiv.firstChild as HTMLElement;
      
      // 找到包裹的span元素（如果存在）
      const wrapperSpan = editingLink.parentElement;
      if (wrapperSpan && wrapperSpan.tagName === 'SPAN' && wrapperSpan.style.display === 'inline-block') {
        // 替换整个包裹的span
        wrapperSpan.parentNode?.replaceChild(newElement, wrapperSpan);
      } else {
        // 如果没有包裹的span（旧版本链接），直接替换a标签
        editingLink.parentNode?.replaceChild(newElement, editingLink);
      }
    }
    
    // 更新内容
    handleContentChange(editor.innerHTML);
    
    // 清空编辑状态
    setEditingLink(null);
    setLinkEditData(null);
    
    toast({
      title: '链接更新成功',
      description: '链接已成功更新',
    });
  }, [editingLink, handleContentChange, toast]);

  const handleInsertAttachment = useCallback((data: AttachmentData) => {
    restoreSelection();
    const editor = editorRef.current?.getElement();
    if (!editor) return;

    const id = `attach-${Date.now()}`;
    const iconName = data.type === 'archive' ? '压缩' : (data.type === 'program' ? '程序' : '其它');
    const dataStr = JSON.stringify(data);
    
    const html = `
      <div class="attachment-wrapper" 
           id="${id}" 
           contenteditable="false" 
           data-attachment='${dataStr.replace(/'/g, "&apos;")}'
           style="display: flex; align-items: center; justify-content: space-between; background: #ffffff; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; margin: 16px 0; user-select: none; transition: all 0.2s ease-in-out; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <div class="attachment-content" style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; cursor: pointer;" onclick="window.viewAttachment('${id}')">
          <div style="background: ${data.type === 'archive' ? '#4361ee' : (data.type === 'program' ? '#10b981' : '#64748b')}; color: white; padding: 2px 8px; border-radius: 5px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">${iconName}</div>
          <div class="attachment-file-info" style="display: flex; flex-direction: column; min-width: 0;">
            <span class="attachment-file-name" style="font-size: 14px; font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${data.name}</span>
            <span style="font-size: 11px; color: #6b7280; white-space: nowrap;">${data.url.substring(0, 40)}${data.url.length > 40 ? '...' : ''}</span>
          </div>
          ${data.code ? `<div class="attachment-code" style="font-size: 11px; color: #4b5563; background: #f3f4f6; padding: 1px 6px; border-radius: 4px; border: 1px dashed #d1d5db; margin-left: 4px;">码: ${data.code}</div>` : ''}
        </div>
        <div class="attachment-actions" style="display: flex; gap: 6px; margin-left: 12px;">
           <button class="attachment-edit-btn" onclick="event.stopPropagation(); window.editAttachment('${id}')" style="padding: 4px 10px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;">编辑</button>
           <button class="attachment-delete-btn" onclick="event.stopPropagation(); window.deleteAttachment('${id}')" style="padding: 4px 10px; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;">删除</button>
        </div>
      </div>
      <p><br></p>
    `;
    
    document.execCommand('insertHTML', false, html);
    handleContentChange(editor.innerHTML);
    
    toast({
      title: '附件已插入',
      description: `已成功插入附件: ${data.name}`,
    });
  }, [handleContentChange, toast]);

  const handleUpdateAttachment = useCallback((data: AttachmentData) => {
    if (!editingAttachment) return;
    
    const editor = editorRef.current?.getElement();
    if (!editor) return;

    const iconName = data.type === 'archive' ? '压缩' : (data.type === 'program' ? '程序' : '其它');
    const dataStr = JSON.stringify(data);
    
    editingAttachment.setAttribute('data-attachment', dataStr);
    const content = editingAttachment.querySelector('.attachment-content');
    if (content) {
      // 同时更新点击链接
      content.setAttribute('onclick', `window.viewAttachment('${editingAttachment.id}')`);
      content.innerHTML = `
        <div style="background: ${data.type === 'archive' ? '#4361ee' : (data.type === 'program' ? '#10b981' : '#64748b')}; color: white; padding: 2px 8px; border-radius: 5px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">${iconName}</div>
        <div class="attachment-file-info" style="display: flex; flex-direction: column; min-width: 0;">
          <span class="attachment-file-name" style="font-size: 14px; font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${data.name}</span>
          <span style="font-size: 11px; color: #6b7280; white-space: nowrap;">${data.url.substring(0, 40)}${data.url.length > 40 ? '...' : ''}</span>
        </div>
        ${data.code ? `<div class="attachment-code" style="font-size: 11px; color: #4b5563; background: #f3f4f6; padding: 1px 6px; border-radius: 4px; border: 1px dashed #d1d5db; margin-left: 4px;">码: ${data.code}</div>` : ''}
      `;
    }
    
    handleContentChange(editor.innerHTML);
    setEditingAttachment(null);
    setAttachmentEditData(null);
    
    toast({
      title: '附件已更新',
      description: `附件 ${data.name} 已更新`,
    });
  }, [editingAttachment, handleContentChange, toast]);

  const handleInsertCode = useCallback((code: string, language: string, theme?: string) => {
    // 恢复光标位置
    if (editorRef.current?.getElement()) editorRef.current.getElement()!.focus();
    restoreSelection();
    
    const editor = editorRef.current?.getElement();
    if (!editor) return;

    // 使用传入的主题，或设置中的全局主题
    const activeTheme = theme || settings.codeTheme;
    
    // 异步加载作用域化的主题样式
    loadScopedTheme(activeTheme);

    // 转义HTML特殊字符
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    // 使用highlight.js进行代码高亮
    let highlightedCode: string;
    try {
      if (language === 'plaintext') {
        highlightedCode = escapeHtml(code);
      } else {
        const result = hljs.highlight(code, { language });
        highlightedCode = result.value;
      }
    } catch (error) {
      // 如果高亮失败，使用纯文本
      highlightedCode = escapeHtml(code);
    }

    // 生成唯一ID
    const codeBlockId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 转义代码用于data属性
    const escapedCode = code.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
    // 获取语言显示名称
    const languageLabels: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      csharp: 'C#',
      php: 'PHP',
      ruby: 'Ruby',
      go: 'Go',
      rust: 'Rust',
      swift: 'Swift',
      kotlin: 'Kotlin',
      html: 'HTML',
      css: 'CSS',
      sql: 'SQL',
      bash: 'Bash',
      powershell: 'PowerShell',
      vbscript: 'VBScript',
      json: 'JSON',
      xml: 'XML',
      yaml: 'YAML',
      markdown: 'Markdown',
      plaintext: '纯文本',
    };
    
    const displayLanguage = languageLabels[language] || language;

    // 创建代码块HTML，使用作用域类名隔离主题样式
    const codeHtml = `
      <div class="code-block-wrapper code-theme-${activeTheme}" id="${codeBlockId}" data-code="${escapedCode}" data-language="${language}" data-theme="${activeTheme}" style="margin: 1em 0; border-radius: 8px; overflow: hidden; position: relative;">
        <div class="code-block-header" style="background: rgba(0,0,0,0.05); padding: 8px 16px; color: inherit; font-size: 12px; font-family: 'Courier New', monospace; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;">
          <span>${displayLanguage}</span>
          <div class="code-block-actions" style="display: flex; gap: 8px;">
            <button class="code-edit-btn" onclick="event.stopPropagation(); window.editCodeBlock('${codeBlockId}');" style="padding: 4px 8px; background: #4361ee; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: background 0.2s;" onmouseover="this.style.background='#3f37c9'" onmouseout="this.style.background='#4361ee'">编辑</button>
            <button class="code-delete-btn" onclick="event.stopPropagation(); window.deleteCodeBlock('${codeBlockId}');" style="padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: background 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">删除</button>
            <button class="code-copy-btn" onclick="event.stopPropagation(); window.copyCodeBlock('${codeBlockId}', this);" style="padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: background 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">复制</button>
          </div>
        </div>
        <pre style="margin: 0; padding: 16px; overflow-x: auto; background: inherit;"><code class="hljs language-${language}" style="font-family: 'Courier New', Consolas, monospace; font-size: 14px; line-height: 1.5; display: block;">${highlightedCode}</code></pre>
      </div>
      <p><br></p>
    `;
    
    // 插入代码块
    document.execCommand('insertHTML', false, codeHtml);
    
    // 更新内容
    handleContentChange(editor.innerHTML);

    toast({
      title: '代码已插入',
      description: `已成功插入 ${displayLanguage} 代码块块（主题: ${activeTheme}）`
    });
  }, [handleContentChange, settings.codeTheme]);

  const handleUpdateCode = useCallback((id: string, code: string, language: string, theme: string) => {
    const editor = editorRef.current?.getElement();
    if (!editor) return;

    const codeBlock = editor.querySelector(`#${id}`);
    if (!codeBlock) {
      toast({
        title: '错误',
        description: '找不到要更新的代码块',
        variant: 'destructive',
      });
      return;
    }

    // 转义HTML特殊字符
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    // 使用highlight.js进行代码高亮
    let highlightedCode: string;
    try {
      if (language === 'plaintext') {
        highlightedCode = escapeHtml(code);
      } else {
        const result = hljs.highlight(code, { language });
        highlightedCode = result.value;
      }
    } catch (error) {
      highlightedCode = escapeHtml(code);
    }

    const escapedCode = code.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
    // 获取语言显示名称
    const languageLabels: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      csharp: 'C#',
      php: 'PHP',
      ruby: 'Ruby',
      go: 'Go',
      rust: 'Rust',
      swift: 'Swift',
      kotlin: 'Kotlin',
      html: 'HTML',
      css: 'CSS',
      sql: 'SQL',
      bash: 'Bash',
      powershell: 'PowerShell',
      vbscript: 'VBScript',
      json: 'JSON',
      xml: 'XML',
      yaml: 'YAML',
      markdown: 'Markdown',
      plaintext: '纯文本',
    };
    
    const displayLanguage = languageLabels[language] || language;

    // 异步加载作用域化的主题样式
    loadScopedTheme(theme);

    // 更新属性
    codeBlock.setAttribute('data-code', escapedCode);
    codeBlock.setAttribute('data-language', language);
    codeBlock.setAttribute('data-theme', theme);
    
    // 更新代码块的主题类名
    if (codeBlock instanceof HTMLElement) {
      // 移除旧的主题类
      codeBlock.className = codeBlock.className.replace(/code-theme-\S+/g, '').trim();
      // 添加新的主题类
      codeBlock.classList.add('code-block-wrapper', `code-theme-${theme}`);
      
      // 清除硬编码样式
      codeBlock.style.background = '';
      codeBlock.style.border = '1px solid rgba(0,0,0,0.1)';
      const header = codeBlock.querySelector('div:first-child') as HTMLElement;
      if (header) {
        header.style.background = 'rgba(0,0,0,0.05)';
        header.style.color = 'inherit';
        header.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
      }
      const preEl = codeBlock.querySelector('pre') as HTMLElement;
      if (preEl) preEl.style.background = 'inherit';
      const codeEl = codeBlock.querySelector('code') as HTMLElement;
      if (codeEl) codeEl.style.color = '';
    }
    
    // 更新语言标签和高亮内容
    const langSpan = codeBlock.querySelector('div:first-child span');
    if (langSpan) langSpan.textContent = displayLanguage;

    // 移除旧的内联 link 标签（如果存在）
    const oldLink = codeBlock.querySelector('link');
    if (oldLink) oldLink.remove();

    const codeElement = codeBlock.querySelector('code');
    if (codeElement) {
      codeElement.className = `hljs language-${language}`;
      codeElement.innerHTML = highlightedCode;
    }

    // 更新内容
    handleContentChange(editor.innerHTML);

    toast({
      title: '成功',
      description: '代码块已更新',
    });
  }, [handleContentChange, toast]);

  // 处理表格操作
  const handleTableAction = useCallback((action: string, data?: any) => {
    if (tableToolbarRef.current) {
      tableToolbarRef.current.handleTableAction(action, data);
    }
  }, []);

  const handleHeadingClick = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // 高亮效果
      element.style.backgroundColor = 'hsl(var(--accent))';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 1000);
    }
  }, []);

  const handleExport = useCallback(() => {
    console.log('=== 开始导出 ===');
    console.log('原始content长度:', content.length);
    console.log('原始content前100字符:', content.substring(0, 100));
    
    // 创建临时div来处理内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    console.log('tempDiv创建成功');
    
    // 提取并设置标题ID
    const headingElements = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const exportHeadings: HeadingItem[] = [];
    
    console.log('找到的标题数量:', headingElements.length);
    console.log('headingElements:', headingElements);
    
    headingElements.forEach((element, index) => {
      const id = `heading-${index}`;
      element.id = id;
      
      const headingItem = {
        id,
        level: parseInt(element.tagName[1]),
        text: element.textContent || '',
        element: element as HTMLElement,
      };
      
      exportHeadings.push(headingItem);
      console.log(`标题 ${index}:`, {
        text: headingItem.text,
        level: headingItem.level,
        tagName: element.tagName,
        id: id
      });
    });
    
    // 移除链接卡片的编辑和删除按钮（导出的HTML不需要编辑功能）
    const cardActions = tempDiv.querySelectorAll('.card-actions');
    cardActions.forEach(action => action.remove());
    
    // 移除文本链接的编辑图标（导出的HTML不需要编辑功能）
    const linkEditIcons = tempDiv.querySelectorAll('.link-edit-icon');
    linkEditIcons.forEach(icon => icon.remove());
    
    // 移除代码块的删除和编辑按钮（导出的HTML不需要这些功能），但保留复制按钮
    const codeDeleteBtns = tempDiv.querySelectorAll('.code-delete-btn');
    codeDeleteBtns.forEach(btn => btn.remove());
    
    const codeEditBtns = tempDiv.querySelectorAll('.code-edit-btn');
    codeEditBtns.forEach(btn => btn.remove());

    // 移除附件的编辑和删除按钮
    const attachmentEditBtns = tempDiv.querySelectorAll('.attachment-edit-btn');
    attachmentEditBtns.forEach(btn => btn.remove());
    const attachmentDeleteBtns = tempDiv.querySelectorAll('.attachment-delete-btn');
    attachmentDeleteBtns.forEach(btn => btn.remove());
    
    // 处理表格单元格：移除contenteditable属性和cursor样式，确保链接可以正常点击
    const tableCells = tempDiv.querySelectorAll('td, th');
    tableCells.forEach(cell => {
      const cellElement = cell as HTMLTableCellElement;
      // 移除contenteditable属性
      cellElement.removeAttribute('contenteditable');
      // 移除cursor: text样式，避免阻止链接点击
      if (cellElement.style.cursor === 'text') {
        cellElement.style.cursor = 'default';
      }
    });
    
    // 检查表格边框样式，如果是虚线、点线或双线，导出时移除所有边框
    // 单元格背景将通过CSS设置为和遮罩层一致的颜色和透明度
    const tables = tempDiv.querySelectorAll('table');
    tables.forEach(table => {
      const tableElement = table as HTMLTableElement;
      const borderStyle = tableElement.style.borderStyle;
      
      // 如果表格使用了虚线、点线或双线边框，导出时移除所有边框
      if (borderStyle === 'dashed' || borderStyle === 'dotted' || borderStyle === 'double') {
        // 移除表格边框
        tableElement.style.border = 'none';
        tableElement.style.borderStyle = 'none';
        
        // 移除所有单元格的边框
        const cells = tableElement.querySelectorAll('td, th');
        cells.forEach(cell => {
          const cellElement = cell as HTMLTableCellElement;
          cellElement.style.border = 'none';
          cellElement.style.borderStyle = 'none';
        });
      }
    });
    
    const processedContent = tempDiv.innerHTML;
    
    // 获取所有已加载的作用域样式，以便在导出的HTML中也能正确显示不同主题的代码块
    const scopedStyles = Array.from(document.querySelectorAll('style[id^="scoped-hljs-theme-"]'))
      .map(s => s.textContent)
      .join('\n');
    
    console.log('exportHeadings数组长度:', exportHeadings.length);
    console.log('是否生成目录:', exportHeadings.length > 0 ? '是' : '否');
    console.log('exportHeadings数组:', exportHeadings.map(h => ({ id: h.id, text: h.text, level: h.level })));
    
    // 根据useBlackMask设置决定使用黑色还是白色背景
    const useBlackMask = settings.useBlackMask;
    const backgroundColor = useBlackMask 
      ? `rgba(0, 0, 0, ${settings.opacity / 100})`
      : `rgba(255, 255, 255, ${settings.opacity / 100})`;
    const textColor = useBlackMask ? '#ffffff' : '#333';
    const headingColor = useBlackMask ? '#60a5fa' : '#4361ee';
    const linkColor = useBlackMask ? '#60a5fa' : '#4361ee';
    const linkHoverColor = useBlackMask ? '#93c5fd' : '#3f37c9';
    const isBlock = settings.tocStyle === 'block';
    const tocTitleColor = settings.tocTitleColor || '#4361ee';
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="referrer" content="no-referrer">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${settings.pageTitle}</title>
  ${settings.favicon ? `<link rel="icon" href="${settings.favicon}">` : ''}
  <style>
    ${scopedStyles}
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', 'Microsoft YaHei', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: ${textColor};
      background: ${settings.backgroundImage 
        ? `url(${settings.backgroundImage})` 
        : 'linear-gradient(135deg, #e0e7ff 0%, #d1e0fd 100%)'};
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      background-attachment: fixed;
      padding: 20px;
      min-height: 100vh;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: ${backgroundColor};
      color: ${textColor};
      ${settings.enableGlassEffect ? `backdrop-filter: blur(${settings.glassBlur}px);` : ''}
      ${settings.enableGlassEffect ? `-webkit-backdrop-filter: blur(${settings.glassBlur}px);` : ''}
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(67, 97, 238, 0.3);
      min-height: calc(100vh - 40px);
      box-sizing: border-box;
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: break-word;
    }
    
    .container * {
      max-width: 100%;
      box-sizing: border-box;
    }
    
    h1, h2, h3, h4, h5, h6 {
      color: ${headingColor};
    }
    
    h1 { 
      font-size: 2em; 
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }
    h2 { 
      font-size: 1.5em; 
      margin-top: 0.6em;
      margin-bottom: 0.6em;
    }
    h3 { 
      font-size: 1.25em; 
      margin-top: 0.7em;
      margin-bottom: 0.7em;
    }
    h4 { 
      font-size: 1em; 
      margin-top: 0.8em;
      margin-bottom: 0.8em;
    }
    h5 { 
      font-size: 0.83em; 
      margin-top: 0.9em;
      margin-bottom: 0.9em;
    }
    h6 { 
      font-size: 0.67em; 
      margin-top: 1em;
      margin-bottom: 1em;
    }
    
    p {
      margin-bottom: 1em;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    a {
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: break-all;
    }
    
    hr {
      border: none;
      border-top: 2px solid ${useBlackMask ? 'rgba(96, 165, 250, 0.4)' : 'rgba(67, 97, 238, 0.3)'};
      margin: 1.8em 0;
      max-width: 100%;
      height: 0;
      box-sizing: content-box;
    }
    
    table {
      max-width: 100%;
      width: 100% !important;
      border-collapse: collapse;
      margin: 1em 0;
      display: block;
      overflow-x: auto;
      word-break: normal;
    }
    
    pre {
      max-width: 100%;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 1em 0;
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    img:hover {
      transform: scale(1.02);
    }
    
    /* 卡片图片样式优先级更高，覆盖全局img样式 */
    .link-card .card-content > div:first-child img {
      max-width: 100% !important;
      max-height: 100% !important;
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      border-radius: 0 !important;
      transform: none !important;
    }
    
    .link-card .card-content > div:first-child img:hover {
      transform: none !important;
    }
    
    /* 图片查看器样式 */
    .image-viewer {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 9999;
      justify-content: center;
      align-items: center;
    }
    
    .image-viewer.active {
      display: flex;
    }

    /* 代码块滚动条美化 */
    .code-block-wrapper pre {
      scrollbar-width: thin;
      scrollbar-color: rgba(128, 128, 128, 0.3) transparent;
    }

    .code-block-wrapper pre::-webkit-scrollbar {
      height: 8px;
    }
    
    .code-block-wrapper pre::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .code-block-wrapper pre::-webkit-scrollbar-thumb {
      background: rgba(128, 128, 128, 0.3);
      border-radius: 10px;
    }
    
    .code-block-wrapper pre::-webkit-scrollbar-thumb:hover {
      background: rgba(128, 128, 128, 0.5);
    }
    
    .image-viewer img {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
      cursor: default;
      margin: 0;
    }
    
    .image-viewer-close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid white;
      border-radius: 50%;
      color: white;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }
    
    .image-viewer-close:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
    
    .image-viewer-controls {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 15px;
      background: rgba(0, 0, 0, 0.5);
      padding: 10px 20px;
      border-radius: 25px;
    }
    
    .image-viewer-btn {
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid white;
      border-radius: 50%;
      color: white;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }
    
    .image-viewer-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    .attachment-wrapper:hover {
      border-color: #4361ee !important;
      box-shadow: 0 2px 10px rgba(67, 97, 238, 0.1);
    }
    
    #attachmentDialog {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
      justify-content: center; align-items: center;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    #attachmentDialog.active { display: flex; }
    .attach-modal {
      background: white; border-radius: 12px; padding: 24px;
      width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .attach-modal h3 { margin-top: 0; margin-bottom: 8px; font-size: 18px; color: #1f2937; }
    .attach-modal p { color: #6b7280; font-size: 14px; margin-bottom: 20px; line-height: 1.5; }
    .code-box {
      background: #f3f4f6; border-radius: 8px; padding: 12px;
      display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
      border: 1px solid #e5e7eb;
    }
    .code-box input {
      flex: 1; border: none; background: transparent; font-family: monospace;
      font-size: 20px; text-align: center; font-weight: bold; color: #111827;
      letter-spacing: 2px; outline: none;
    }
    .btn-group { display: flex; gap: 12px; }
    .btn {
      flex: 1; padding: 12px; border-radius: 8px; border: none;
      cursor: pointer; font-weight: 600; font-size: 14px;
      transition: all 0.2s;
    }
    .btn-close { background: #f3f4f6; color: #374151; }
    .btn-close:hover { background: #e5e7eb; }
    .btn-open { background: #4361ee; color: white; }
    .btn-open:hover { background: #3b82f6; }
    
    .scroll-buttons {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 9999;
    }
    
    .scroll-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid #e2e8f0;
      color: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: all 0.2s;
    }
    
    .scroll-btn:hover {
      background: #f8fafc;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
      color: #4361ee;
    }
    
    .scroll-btn svg {
      width: 20px;
      height: 20px;
    }
    
    a {
      color: ${linkColor};
      text-decoration: none;
    }
    
    a:hover {
      color: ${linkHoverColor};
      text-decoration: underline;
    }
    
    ul, ol {
      margin-left: 2em;
      margin-bottom: 1em;
    }
    
    /* 代码块样式 */
    .code-block-wrapper {
      margin: 1em 0;
      border-radius: 8px;
      overflow: hidden;
      
      border: 1px solid rgba(0,0,0,0.1);
      position: relative;
    }
    
    .code-block-wrapper > div:first-child {
      background: rgba(0,0,0,0.05);
      padding: 8px 16px;
      color: inherit;
      font-size: 12px;
      font-family: 'Courier New', monospace;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .code-block-wrapper pre {
      margin: 0;
      padding: 16px;
      overflow-x: auto;
      background: inherit;
      /* 滚动条美化 */
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
    }

    .code-block-wrapper pre::-webkit-scrollbar {
      height: 8px;
    }
    
    .code-block-wrapper pre::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .code-block-wrapper pre::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 10px;
    }
    
    .code-block-wrapper pre::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.25);
    }
    
    .code-block-wrapper code {
      font-family: 'Courier New', Consolas, monospace;
      font-size: 14px;
      line-height: 1.5;
      
      display: block;
    }
    
    .code-copy-btn {
      padding: 4px 8px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      transition: background 0.2s;
    }
    
    .code-copy-btn:hover {
      background: #2563eb;
    }
    
    /* Highlight.js 代码高亮样式 (Atom One Dark) */
    .hljs {
      color: #abb2bf;
      background: #282c34;
    }
    .hljs-comment, .hljs-quote {
      color: #5c6370;
      font-style: italic;
    }
    .hljs-doctag, .hljs-keyword, .hljs-formula {
      color: #c678dd;
    }
    .hljs-section, .hljs-name, .hljs-selector-tag, .hljs-deletion, .hljs-subst {
      color: #e06c75;
    }
    .hljs-literal {
      color: #56b6c2;
    }
    .hljs-string, .hljs-regexp, .hljs-addition, .hljs-attribute, .hljs-meta .hljs-string {
      color: #98c379;
    }
    .hljs-attr, .hljs-variable, .hljs-template-variable, .hljs-type, .hljs-selector-class, .hljs-selector-attr, .hljs-selector-pseudo, .hljs-number {
      color: #d19a66;
    }
    .hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-id, .hljs-title {
      color: #61aeee;
    }
    .hljs-built_in, .hljs-title.class_, .hljs-class .hljs-title {
      color: #e6c07b;
    }
    .hljs-emphasis {
      font-style: italic;
    }
    .hljs-strong {
      font-weight: bold;
    }
    .hljs-link {
      text-decoration: underline;
    }
    
    /* 表格样式 */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.8em 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    /* 默认表格样式（实线边框） */
    table:not([style*="border-style: dashed"]):not([style*="border-style: dotted"]):not([style*="border-style: double"]) {
      background: white !important;
      opacity: 1 !important;
    }
    
    table td, table th {
      border: none;
      padding: 10px 12px;
      min-width: 80px;
      text-align: left;
      color: #333;
    }
    
    /* 确保表格中的链接可以正常点击 */
    table td a, table th a {
      pointer-events: auto;
      cursor: pointer;
      position: relative;
      z-index: 1;
    }
    
    table td, table th {
      cursor: default;
    }
    
    /* 默认单元格样式（实线边框表格） */
    table:not([style*="border-style: dashed"]):not([style*="border-style: dotted"]):not([style*="border-style: double"]) td {
      background: white !important;
    }
    
    table:not([style*="border-style: dashed"]):not([style*="border-style: dotted"]):not([style*="border-style: double"]) th {
      background: #4361ee !important;
      color: white !important;
      font-weight: 600;
    }
    
    table:not([style*="border-style: dashed"]):not([style*="border-style: dotted"]):not([style*="border-style: double"]) tr:nth-child(even) td {
      background: #f8f9fa !important;
    }
    
    table:not([style*="border-style: dashed"]):not([style*="border-style: dotted"]):not([style*="border-style: double"]) tr:hover td {
      background: #e8f0fe !important;
    }
    
    /* 虚线/点线/双线边框表格样式 - 使用和遮罩层一致的背景色和透明度 */
    table[style*="border-style: dashed"],
    table[style*="border-style: dotted"],
    table[style*="border-style: double"] {
      background: ${backgroundColor} !important;
    }
    
    table[style*="border-style: dashed"] td,
    table[style*="border-style: dashed"] th,
    table[style*="border-style: dotted"] td,
    table[style*="border-style: dotted"] th,
    table[style*="border-style: double"] td,
    table[style*="border-style: double"] th {
      background: ${backgroundColor} !important;
      color: ${textColor} !important;
    }
    
    ${settings.enableFloatingToc ? `
    /* 悬浮目录样式 */
    .floating-toc {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%) translateX(-280px);
      width: 280px;
      max-height: 80vh;
      background: ${useBlackMask ? `rgba(0, 0, 0, ${settings.opacity / 100})` : `rgba(255, 255, 255, ${settings.opacity / 100})`};
      border-radius: 0 8px 8px 0;
      box-shadow: 2px 0 20px rgba(0, 0, 0, 0.15);
      padding: 20px;
      padding-top: 60px; /* 为折叠按钮留出空间 */
      overflow-y: auto;
      transition: transform 0.3s ease;
      z-index: 1000;
    }
    
    .floating-toc.visible {
      transform: translateY(-50%) translateX(0);
    }
    
    /* 目录展开按钮 */
    .toc-toggle {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      background: ${useBlackMask ? 'rgba(96, 165, 250, 0.95)' : 'rgba(67, 97, 238, 0.95)'};
      border: none;
      border-radius: 0 8px 8px 0;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      transition: all 0.3s;
      box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
      z-index: 1001;
      opacity: 1;
    }
    
    .toc-toggle.hidden {
      opacity: 0;
      pointer-events: none;
    }
    
    .toc-toggle:hover {
      background: ${useBlackMask ? 'rgba(96, 165, 250, 1)' : 'rgba(67, 97, 238, 1)'};
      transform: translateY(-50%) scale(1.1);
    }
    
    /* 目录折叠按钮 */
    .toc-collapse {
      position: absolute;
      right: 10px;
      top: 10px;
      width: 32px;
      height: 32px;
      background: ${useBlackMask ? 'rgba(96, 165, 250, 0.95)' : 'rgba(67, 97, 238, 0.95)'};
      border: none;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.3s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .toc-collapse:hover {
      background: ${useBlackMask ? 'rgba(96, 165, 250, 1)' : 'rgba(67, 97, 238, 1)'};
      transform: scale(1.1);
    }
    
    .floating-toc h2 {
      margin-top: 0;
      margin-bottom: 15px;
      font-size: 1.2em;
      color: ${useBlackMask ? '#60a5fa' : '#4361ee'};
      border-bottom: 2px solid ${useBlackMask ? '#60a5fa' : '#4361ee'};
      padding-bottom: 10px;
    }
    
    .floating-toc ul {
      list-style: none;
      margin-left: 0;
    }
    
    .floating-toc a {
      display: block;
      padding: ${isBlock ? '8px 12px' : '8px 0'};
      color: ${tocTitleColor};
      font-weight: 600;
      transition: all 0.2s;
      ${isBlock ? `
      margin-bottom: 4px;
      border-radius: 4px;
      text-decoration: none;
      ` : 'transition: color 0.2s, padding-left 0.2s;'}
    }
    
    .floating-toc a:hover {
      color: ${useBlackMask ? '#60a5fa' : '#4361ee'};
      padding-left: 5px;
      text-decoration: none;
      ${isBlock ? 'background: rgba(0,0,0,0.05); transform: translateX(2px);' : ''}
    }
    
    .floating-toc .level-1 a {
      ${isBlock ? `
      background-color: ${tocTitleColor};
      color: white !important;
      position: relative;
      padding-right: 28px;
      ` : 'position: relative; padding-right: 24px;'}
    }
    
    .floating-toc .level-2 a {
      ${isBlock ? `
      position: relative;
      padding-right: 28px;
      ` : 'position: relative; padding-right: 24px;'}
    }
    
    .floating-toc .level-1 .toggle-icon,
    .floating-toc .level-2 .toggle-icon {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      padding: 2px;
      border-radius: 2px;
      transition: background 0.2s;
      font-size: 10px;
    }
    
    .floating-toc .level-1 .toggle-icon {
      ${isBlock ? 'color: white;' : `color: ${tocTitleColor};`}
    }
    
    .floating-toc .level-2 .toggle-icon {
      color: ${tocTitleColor};
    }
    
    .floating-toc .level-1 .toggle-icon:hover,
    .floating-toc .level-2 .toggle-icon:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    .floating-toc .level-2 {
      margin-left: 15px;
      font-size: 0.95em;
      ${isBlock ? `
      border-left: 4px solid ${tocTitleColor};
      background-color: ${tocTitleColor}15;
      ` : ''}
    }
    
    .floating-toc .level-3 {
      margin-left: 30px;
      font-size: 0.9em;
    }
    
    .floating-toc .collapsed {
      display: none;
    }
    ` : ''}
    
    /* 链接卡片样式 */
    .link-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      display: block;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s;
      background: #ffffff;
      position: relative;
      min-height: 96px;
      max-height: 160px;
      overflow: hidden;
    }
    
    .link-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
      border-color: #4361ee;
    }
    
    .link-card .card-content {
      display: flex;
      gap: 16px;
      cursor: pointer;
      height: 100%;
    }
    
    .link-card .card-content > div:first-child {
      width: 96px;
      height: 96px;
      flex-shrink: 0;
      overflow: hidden;
      border-radius: 4px;
    }
    
    .link-card .card-content > div:first-child img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    
    .link-card .card-content > div:last-child {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    /* 移动端适配 */
    @media (max-width: 768px) {
      ${settings.enableMobileAdaptation ? `
      body {
        ${settings.mobileBackgroundImage 
          ? `background-image: url(${settings.mobileBackgroundImage}) !important;` 
          : ''}
        background-position: center !important;
        background-size: cover !important;
        background-repeat: no-repeat !important;
        background-attachment: fixed !important;
        padding: 10px;
      }
      
      .container {
        padding: 15px;
        border-radius: 4px;
        min-height: calc(100vh - 20px);
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
      }
      
      h1 { font-size: 1.4em; }
      h2 { font-size: 1.2em; }
      h3 { font-size: 1.1em; }
      h4 { font-size: 1em; }
      h5 { font-size: 0.9em; }
      h6 { font-size: 0.85em; }
      ` : ''}
      
      .floating-toc {
        width: 240px;
        transform: translateY(-50%) translateX(-240px);
      }
      
      .floating-toc.visible {
        transform: translateY(-50%) translateX(0);
      }
      
      .link-card .card-content {
        flex-direction: column;
        height: auto !important;
      }
      
      .link-card .card-content > div:first-child {
        width: 100%;
        height: 200px;
        flex-shrink: 0;
      }
      
      .link-card .card-content > div:last-child {
        width: 100%;
        padding-top: 12px;
      }
      
      .link-card {
        max-height: none !important;
        height: auto !important;
      }
      
      .link-card .card-content > div:last-child div {
        white-space: normal !important;
        word-break: break-all !important;
      }
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${settings.codeTheme}.min.css">
</head>
<body>
  ${exportHeadings.length > 0 && settings.enableFloatingToc ? `
  <button class="toc-toggle" id="tocToggle" onclick="toggleToc()" title="目录">☰</button>
  <div class="floating-toc" id="floatingToc">
    <button class="toc-collapse" onclick="toggleToc()" title="折叠目录">✕</button>
    <h2>目录</h2>
    <ul>
      ${exportHeadings.map((h, index) => {
        const currentHeading = h;
        const nextHeading = exportHeadings[index + 1];
        const hasChildren = nextHeading && nextHeading.level > currentHeading.level;
        const canCollapse = (currentHeading.level === 1 || currentHeading.level === 2) && hasChildren;
        
        return `
        <li class="level-${h.level}" data-level="${h.level}" data-id="${h.id}">
          <a href="#${h.id}" onclick="scrollToHeading('${h.id}')">
            ${h.text}
            ${canCollapse ? '<span class="toggle-icon" onclick="toggleHeadingChildren(event, \'' + h.id + '\', ' + h.level + ')">▼</span>' : ''}
          </a>
        </li>
        `;
      }).join('')}
    </ul>
  </div>
  ` : ''}
  
  <div class="container">
    <div class="content">
      ${processedContent}
    </div>
  </div>
  
  <!-- 图片查看器 -->
  <div class="image-viewer" id="imageViewer">
    <button class="image-viewer-close" onclick="closeImageViewer()">✕</button>
    <img id="viewerImage" src="" alt="">
    <div class="image-viewer-controls">
      <button class="image-viewer-btn" onclick="zoomOut()" title="缩小">−</button>
      <button class="image-viewer-btn" onclick="resetZoom()" title="重置">⟲</button>
      <button class="image-viewer-btn" onclick="zoomIn()" title="放大">+</button>
    </div>
  </div>
  
  <!-- 附件提取码弹窗 -->
  <div id="attachmentDialog">
    <div class="attach-modal">
      <h3>提取码提示</h3>
      <p id="attachFileName"></p>
      <div class="code-box">
        <input type="text" id="attachCodeInput" readonly>
        <button onclick="copyAttachCode()" style="background:none;border:none;cursor:pointer;padding:8px;color:#6b7280;display:flex;align-items:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>
      <div class="btn-group">
        <button class="btn btn-close" onclick="closeAttachDialog()">关闭</button>
        <button class="btn btn-open" id="attachOpenBtn">复制并打开链接</button>
      </div>
    </div>
  </div>
  
  ${settings.enableScrollButtons ? `
  <div class="scroll-buttons">
    <button class="scroll-btn" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" title="回到顶部">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
    </button>
    <button class="scroll-btn" onclick="window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'smooth'})" title="跳到底部">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>
  </div>
  ` : ''}
  
  <script>
    // 附件查看功能
    function viewAttachment(id) {
      const el = document.getElementById(id);
      if (!el) return;
      const dataStr = el.getAttribute('data-attachment');
      const data = JSON.parse(dataStr);
      if (data.code) {
        document.getElementById('attachFileName').innerText = '附件 ' + data.name + ' 需要提取码。';
        document.getElementById('attachCodeInput').value = data.code;
        document.getElementById('attachmentDialog').classList.add('active');
        document.getElementById('attachOpenBtn').onclick = function() {
          copyAttachCode();
          window.open(data.url, '_blank');
          closeAttachDialog();
        };
      } else {
        window.open(data.url, '_blank');
      }
    }
    
    function closeAttachDialog() {
      document.getElementById('attachmentDialog').classList.remove('active');
    }
    
    function copyAttachCode() {
      const input = document.getElementById('attachCodeInput');
      input.select();
      document.execCommand('copy');
      // 可以选择是否 alert，在离线环境下 alert 比较保险
      alert('提取码已复制');
    }

    // 图片查看器功能
    let currentScale = 1;
    const scaleStep = 0.2;
    const minScale = 0.5;
    const maxScale = 3;
    
    // 为所有图片添加点击事件
    document.addEventListener('DOMContentLoaded', function() {
      const images = document.querySelectorAll('.content img');
      images.forEach(img => {
        img.addEventListener('click', function() {
          openImageViewer(this.src);
        });
      });
    });
    
    function openImageViewer(src) {
      const viewer = document.getElementById('imageViewer');
      const viewerImage = document.getElementById('viewerImage');
      if (viewer && viewerImage) {
        viewerImage.src = src;
        viewer.classList.add('active');
        currentScale = 1;
        updateImageScale();
        document.body.style.overflow = 'hidden';
      }
    }
    
    function closeImageViewer() {
      const viewer = document.getElementById('imageViewer');
      if (viewer) {
        viewer.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
    
    function zoomIn() {
      if (currentScale < maxScale) {
        currentScale += scaleStep;
        updateImageScale();
      }
    }
    
    function zoomOut() {
      if (currentScale > minScale) {
        currentScale -= scaleStep;
        updateImageScale();
      }
    }
    
    function resetZoom() {
      currentScale = 1;
      updateImageScale();
    }
    
    function updateImageScale() {
      const viewerImage = document.getElementById('viewerImage');
      if (viewerImage) {
        viewerImage.style.transform = 'scale(' + currentScale + ')';
      }
    }
    
    // 点击背景关闭查看器
    document.getElementById('imageViewer')?.addEventListener('click', function(e) {
      if (e.target === this) {
        closeImageViewer();
      }
    });
    
    // ESC键关闭查看器
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeImageViewer();
      }
    });
    
    ${exportHeadings.length > 0 && settings.enableFloatingToc ? `
    // 目录显示/隐藏控制
    let tocVisible = false;
    
    function toggleToc() {
      const toc = document.getElementById('floatingToc');
      const toggleBtn = document.getElementById('tocToggle');
      if (!toc || !toggleBtn) return;
      
      tocVisible = !tocVisible;
      
      if (tocVisible) {
        // 显示目录，隐藏展开按钮
        toc.classList.add('visible');
        toggleBtn.classList.add('hidden');
      } else {
        // 隐藏目录，显示展开按钮
        toc.classList.remove('visible');
        toggleBtn.classList.remove('hidden');
      }
    }
    
    // 标题子目录折叠/展开控制（支持H1和H2）
    function toggleHeadingChildren(event, headingId, headingLevel) {
      event.preventDefault();
      event.stopPropagation();
      
      const allItems = document.querySelectorAll('.floating-toc li');
      const toggleIcon = event.target;
      let foundHeading = false;
      let isCollapsed = toggleIcon.textContent === '▶';
      
      // 遍历所有目录项
      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        const level = parseInt(item.getAttribute('data-level'));
        const itemId = item.getAttribute('data-id');
        
        // 找到对应的标题
        if (itemId === headingId) {
          foundHeading = true;
          continue;
        }
        
        // 如果已经找到标题，处理其子项
        if (foundHeading) {
          // 如果遇到同级或更高级的标题，停止
          if (level <= headingLevel) {
            break;
          }
          
          // 切换子项的显示状态
          if (isCollapsed) {
            item.classList.remove('collapsed');
          } else {
            item.classList.add('collapsed');
          }
        }
      }
      
      // 切换图标
      toggleIcon.textContent = isCollapsed ? '▼' : '▶';
      
      return false;
    }
    
    // 平滑滚动到标题
    function scrollToHeading(id) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return false;
    }
    ` : ''}
    
    // 代码块复制功能
    window.copyCodeBlock = function(codeBlockId, buttonElement) {
      const codeBlock = document.getElementById(codeBlockId);
      if (!codeBlock) {
        alert('找不到代码块');
        return;
      }
      
      // 从data属性获取原始代码
      const code = codeBlock.getAttribute('data-code') || '';
      const decodedCode = code.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      
      // 更新按钮状态的函数
      function updateButtonState(success) {
        if (buttonElement && success) {
          const originalText = buttonElement.textContent || '复制';
          const originalBg = buttonElement.style.background || '#3b82f6';
          buttonElement.textContent = '已复制';
          buttonElement.style.background = '#10b981';
          setTimeout(function() {
            buttonElement.textContent = originalText;
            buttonElement.style.background = originalBg;
          }, 2000);
        }
      }
      
      // 复制到剪贴板
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(decodedCode).then(function() {
          updateButtonState(true);
        }).catch(function(err) {
          console.error('复制失败:', err);
          alert('复制失败，请手动复制');
        });
      } else {
        // 降级方案：使用textarea
        const textarea = document.createElement('textarea');
        textarea.value = decodedCode;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          updateButtonState(true);
        } catch (err) {
          console.error('复制失败:', err);
          alert('复制失败，请手动复制');
        }
        document.body.removeChild(textarea);
      }
      // 图片放大缩小功能
      document.querySelectorAll('img:not(.link-card img)').forEach(img => {
        let isResizing = false;
        let startX, startWidth;

        img.addEventListener('mousedown', function(e) {
          isResizing = true;
          startX = e.clientX;
          startWidth = img.offsetWidth;
          e.preventDefault();
          img.style.cursor = 'nwse-resize';
        });

        window.addEventListener('mousemove', function(e) {
          if (!isResizing) return;
          const deltaX = e.clientX - startX;
          img.style.width = (startWidth + deltaX) + 'px';
          img.style.height = 'auto'; // 保持比例
        });

        window.addEventListener('mouseup', function() {
          if (isResizing) {
            isResizing = false;
            img.style.cursor = 'pointer';
          }
        });
      });
    };
  </script>
</body>
</html>
    `.trim();

    // 输出HTML的目录部分用于调试
    const bodyStart = htmlContent.indexOf('<body>');
    const containerStart = htmlContent.indexOf('<div class="container">');
    if (bodyStart !== -1 && containerStart !== -1) {
      const tocSection = htmlContent.substring(bodyStart, containerStart);
      console.log('=== 导出HTML的目录部分 ===');
      console.log(tocSection);
      console.log('=== 目录部分结束 ===');
    }

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${settings.pageTitle}.html`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: '导出成功',
      description: exportHeadings.length > 0 
        ? `文档已导出！目录已生成（${exportHeadings.length}个标题）。打开HTML文件后，将鼠标移到左侧边缘或点击蓝色"☰"按钮查看目录。` 
        : '文档已导出！提示：添加H1-H6标题可自动生成悬浮目录。',
    });
  }, [content, settings, toast]);

  // 导出为JSON
  const handleExportJSON = useCallback(() => {
    const data = {
      version: '5.1.0',
      content,
      settings,
      exportDate: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${settings.pageTitle || '文档'}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: '导出成功',
      description: 'JSON文件已导出，包含文档内容和所有设置',
    });
  }, [content, settings, toast]);

  // 导出为Markdown
  const handleExportMarkdown = useCallback(() => {
    try {
      const filename = `${settings.pageTitle || '文档'}.md`;
      exportMarkdown(content, filename);
      
      toast({
        title: '导出成功',
        description: 'Markdown文件已导出，本地图片已转换为base64格式',
      });
    } catch (error) {
      console.error('导出Markdown失败:', error);
      toast({
        title: '导出失败',
        description: '导出Markdown时发生错误，请重试',
        variant: 'destructive',
      });
    }
  }, [content, settings, toast]);

  // 导入JSON
  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          
          // 验证数据格式
          if (!jsonData.content) {
            throw new Error('无效的JSON文件格式');
          }

          // 导入内容
          setContent(jsonData.content);
          
          // 导入设置（如果存在）
          if (jsonData.settings) {
            setSettings(jsonData.settings);
          }

          // 更新编辑器内容
          const editor = editorRef.current?.getElement();
          if (editor) {
            editor.innerHTML = jsonData.content;
          }

          toast({
            title: '导入成功',
            description: `已导入文档内容${jsonData.settings ? '和设置' : ''}`,
          });
        } catch (error) {
          toast({
            title: '导入失败',
            description: '无法解析JSON文件，请确保文件格式正确',
            variant: 'destructive',
          });
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }, [toast]);

  // 导入HTML
  const handleImportHTML = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.htm';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await importHTMLFile(file);
        
        // 导入内容
        setContent(result.content);
        
        // 导入设置（如果存在）
        if (result.settings && Object.keys(result.settings).length > 0) {
          setSettings(prev => ({ ...prev, ...result.settings }));
        }

        // 更新编辑器内容
        const editor = editorRef.current?.getElement();
        if (editor) {
          editor.innerHTML = result.content;
        }

        toast({
          title: '导入成功',
          description: `已导入HTML文档${Object.keys(result.settings).length > 0 ? '和设置' : ''}`,
        });
      } catch (error) {
        console.error('导入HTML失败:', error);
        toast({
          title: '导入失败',
          description: error instanceof Error ? error.message : '无法解析HTML文件，请确保文件格式正确',
          variant: 'destructive',
        });
      }
    };
    
    input.click();
  }, [toast]);

  // 导入Markdown
  const handleImportMarkdown = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await importMarkdownFile(file);
        
        // 导入内容
        setContent(result.content);
        
        // 如果有标题，更新设置
        if (result.title) {
          setSettings(prev => ({ ...prev, pageTitle: result.title || '' }));
        }

        // 更新编辑器内容
        const editor = editorRef.current?.getElement();
        if (editor) {
          editor.innerHTML = result.content;
        }

        toast({
          title: '导入成功',
          description: `已导入Markdown文档${result.title ? '，标题：' + result.title : ''}`,
        });
      } catch (error) {
        console.error('导入Markdown失败:', error);
        toast({
          title: '导入失败',
          description: error instanceof Error ? error.message : '无法解析Markdown文件，请确保文件格式正确',
          variant: 'destructive',
        });
      }
    };
    
    input.click();
  }, [toast]);

  return (
    <div 
      className="min-h-screen flex flex-col pb-16 md:pb-0"
      style={{
        backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* 顶部标题栏 - 优化移动端 */}
      <div className="bg-card/95 backdrop-blur-md border-b border-border px-3 md:px-4 py-2 md:py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-2 md:gap-4">
          <h1 className="text-base md:text-xl font-bold gradient-text">智能文档编辑器</h1>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2">
          {/* 移动端目录按钮 */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="xl:hidden h-8 w-8 md:h-9 md:w-9 touch-target">
                <Menu className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle>目录</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                {headings.length > 0 ? (
                  <div className="space-y-1">
                    {headings.map((heading) => (
                      <button
                        key={heading.id}
                        onClick={() => handleHeadingClick(heading.id)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-smooth text-sm touch-target"
                        style={{
                          paddingLeft: `${(heading.level - 1) * 12 + 12}px`,
                        }}
                      >
                        <span className="line-clamp-2">{heading.text}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无标题</p>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* 设置按钮 */}
          <Sheet open={settingsSheetOpen} onOpenChange={setSettingsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-9 touch-target">
                <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>设置</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <SettingsPanel
                  settings={settings}
                  onSettingsChange={(newSettings) =>
                    setSettings(prev => ({ ...prev, ...newSettings }))
                  }
                  onExport={handleExport}
                  onExportJSON={handleExportJSON}
                  onExportMarkdown={handleExportMarkdown}
                  onImportJSON={handleImportJSON}
                  onImportHTML={handleImportHTML}
                  onImportMarkdown={handleImportMarkdown}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* 工具栏 */}
      <EditorToolbar
        onCommand={handleCommand}
        onInsertImage={handleImageUpload}
        onInsertLink={handleInsertLink}
        onInsertAttachment={handleInsertAttachment}
        onInsertVideo={handleInsertVideo}
        onInsertAudio={handleInsertAudio}
        onInsertTable={handleInsertTable}
        onInsertCode={handleInsertCode}
        onOpenCodeDialog={() => {
          setEditingCodeBlock(null);
          setCodeDialogOpen(true);
        }}
        onInsertSpecialChar={handleInsertSpecialChar}
        onFindReplace={handleFindReplace}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        currentFont={currentFont}
        currentFontSize={currentFontSize}
        currentHeadingLevel={currentHeadingLevel}
        onSaveSelection={saveSelection}
        onTableAction={handleTableAction}
        hasSelectedCells={hasSelectedCells}
        currentCodeTheme={settings.codeTheme}
        onCodeThemeChange={(theme) => setSettings({ ...settings, codeTheme: theme })}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onPrint={handlePrint}
        selectedText={selectedText}
        onOpenParagraphDialog={() => {
          // 保存当前选区
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            try {
              const clonedRange = range.cloneRange();
              (window as any).__savedRange = clonedRange;
            } catch (e) {
              console.warn('无法保存选区:', e);
            }
          }
          setParagraphDialogOpen(true);
        }}
      />

      {/* 主内容区域 */}
      <div className="flex-1 gradient-bg overflow-auto" ref={mainContentRef}>
        <div className="container mx-auto px-3 md:px-4 py-4 md:py-6">
          <div className="flex gap-4 md:gap-6 items-start">

            {/* 左侧目录 - 仅桌面端显示 */}
            {showToc && headings.length > 0 && (
              <div className="hidden xl:block">
                <TableOfContents 
                  headings={headings} 
                  onHeadingClick={handleHeadingClick}
                  tocTitleColor={settings.tocTitleColor}
                  tocStyle={settings.tocStyle}
                />
              </div>
            )}

            {/* 编辑器主体 */}
            <div className="flex-1 min-w-0">
              <EditorContent
                ref={editorRef}
                content={content}
                onChange={handleContentChange}
                opacity={settings.opacity}
                onSelectionChange={saveSelection}
                enableGlassEffect={settings.enableGlassEffect}
                glassBlur={settings.glassBlur}
                useBlackMask={settings.useBlackMask}
                onEditLink={handleEditLink}
              />
              
              {/* 增强表格工具栏 */}
              <EnhancedTableToolbar
                ref={tableToolbarRef}
                editorRef={editorRef}
                onContentChange={handleContentChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 底部状态栏 - 桌面端显示 */}
      <div className="hidden md:block">
        <EditorStatusBar 
          characterCount={characterCount} 
          wordCount={wordCount}
          currentFont={currentFont}
          currentFontSize={currentFontSize}
          currentHeadingLevel={currentHeadingLevel}
        />
      </div>
      
      {/* 移动端底部工具栏 */}
      <div className="md:hidden">
        <MobileToolbar
          onCommand={handleCommand}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onOpenLinkDialog={() => {}}
          onOpenAttachmentDialog={() => setAttachmentDialogOpen(true)}
          onOpenImageDialog={() => {}}
          onOpenTableDialog={() => {}}
          onOpenCodeDialog={() => {
            setEditingCodeBlock(null);
            setCodeDialogOpen(true);
          }}
          onOpenColorPicker={() => {}}
        />
      </div>
      
      {/* 编辑链接对话框 */}
      {editingLink && linkEditData && (
        <LinkDialog
          editMode={true}
          initialData={linkEditData}
          onInsertLink={handleUpdateLink}
          onOpenChange={(open) => {
            if (!open) {
              setEditingLink(null);
              setLinkEditData(null);
            }
          }}
          trigger={<div style={{ display: 'none' }} />}
        />
      )}

      {/* 编辑附件对话框 */}
      {editingAttachment && attachmentEditData && (
        <AttachmentDialog
          editMode={true}
          initialData={attachmentEditData}
          onInsertAttachment={handleUpdateAttachment}
          onOpenChange={(open) => {
            if (!open) {
              setEditingAttachment(null);
              setAttachmentEditData(null);
            }
          }}
          trigger={<div style={{ display: 'none' }} />}
        />
      )}

      {/* 插入附件对话框 (移动端或通用) */}
      {!editingAttachment && (
        <AttachmentDialog
          open={attachmentDialogOpen}
          onOpenChange={setAttachmentDialogOpen}
          onInsertAttachment={handleInsertAttachment}
          trigger={<div style={{ display: 'none' }} />}
          editMode={false}
        />
      )}

      {/* 提取码提示弹窗 */}
      {activeAttachmentForCode && (
        <AttachmentCodeDialog
          open={!!activeAttachmentForCode}
          onOpenChange={(open) => !open && setActiveAttachmentForCode(null)}
          code={activeAttachmentForCode.code}
          url={activeAttachmentForCode.url}
          fileName={activeAttachmentForCode.fileName}
        />
      )}

      {/* 右键菜单 */}
      {menuState.visible && (
        <ContextMenu
          items={menuState.items}
          position={menuState.position}
          onClose={closeMenu}
          onCommand={executeCommand}
        />
      )}

      {/* 代码块对话框 */}
      <CodeDialog
        showTrigger={false}
        open={codeDialogOpen}
        onOpenChange={setCodeDialogOpen}
        initialData={editingCodeBlock}
        onInsertCode={handleInsertCode}
        onUpdateCode={handleUpdateCode}
        currentTheme={settings.codeTheme}
        onThemeChange={(theme) => setSettings(prev => ({ ...prev, codeTheme: theme }))}
      />

      {/* 段落对话框 */}
      <ParagraphDialog
        open={paragraphDialogOpen}
        onClose={() => setParagraphDialogOpen(false)}
        onApply={applyParagraphSettings}
      />

      {/* 表格属性对话框 */}
      <TablePropertiesDialog
        open={tablePropertiesDialogOpen}
        onClose={() => setTablePropertiesDialogOpen(false)}
        onApply={applyTableSettings}
      />

      {/* 右下角悬浮按钮组 */}
      <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex flex-col gap-3">
        {settings.enableScrollButtons && (
          <ScrollButtons containerRef={mainContentRef} />
        )}
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 md:h-12 md:w-12 rounded-full shadow-lg border border-border hover:scale-110 transition-smooth touch-target bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setSettingsSheetOpen(true)}
          title="设置"
        >
          <Settings className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
      </div>
    </div>
  );
}
