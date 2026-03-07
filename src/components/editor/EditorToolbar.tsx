import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Undo,
  Redo,
  Palette,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  IndentIncrease,
  IndentDecrease,
  PilcrowSquare,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Quote,
  Eraser,
  Search,
  Minus as MinusIcon,
  Scissors,
  TableProperties,
  Code,
} from 'lucide-react';
import type { FontFamily, FontSize } from '@/types/editor';
import { ColorPicker } from './ColorPicker';
import { LinkDialog, type LinkData } from './LinkDialog';
import { AttachmentDialog, type AttachmentData } from './AttachmentDialog';
import { ImageDialog } from './ImageDialog';
import { VideoDialog } from './VideoDialog';
import { AudioDialog, type AudioMetadata } from './AudioDialog';
import { EnhancedTableDialog } from './EnhancedTableDialog';
import { CodeDialog } from './CodeDialog';
import { TableToolbar } from './TableToolbar';
import { SpecialCharsDialog } from './SpecialCharsDialog';
import { FindReplaceDialog } from './FindReplaceDialog';

interface EditorToolbarProps {
  onCommand: (command: string, value?: string) => void;
  onInsertImage: (src: string, caption?: string) => void;
  onInsertLink: (linkData: LinkData) => void;
  onInsertAttachment: (data: AttachmentData) => void;
  onInsertVideo: (url: string, platform: string) => void;
  onInsertAudio: (metadata: AudioMetadata) => void;
  onInsertTable: (rows: number, cols: number) => void;
  onInsertCode: (code: string, language: string, theme: string) => void;
  onOpenCodeDialog?: () => void;
  onInsertSpecialChar: (char: string) => void;
  onFindReplace: (find: string, replace: string, all: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  currentFont: FontFamily;
  currentFontSize: FontSize;
  currentHeadingLevel?: string;
  onSaveSelection?: () => void;
  onTableAction?: (action: string, data?: any) => void;
  hasSelectedCells?: boolean;
  currentCodeTheme: string;
  onCodeThemeChange: (theme: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onPrint: () => void;
  selectedText?: string;
  onOpenParagraphDialog?: () => void;
}

const fontFamilies: FontFamily[] = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Comic Sans MS',
  'Microsoft YaHei',
  'SimSun',
];

const fontSizes: FontSize[] = [
  '8px',
  '10px',
  '12px',
  '14px',
  '16px',
  '18px',
  '20px',
  '24px',
  '28px',
  '32px',
  '36px',
  '48px',
];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onCommand,
  onInsertImage,
  onInsertLink,
  onInsertAttachment,
  onInsertVideo,
  onInsertAudio,
  onInsertTable,
  onInsertCode,
  onOpenCodeDialog,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  currentFont,
  currentFontSize,
  currentHeadingLevel,
  onSaveSelection,
  onTableAction,
  hasSelectedCells = false,
  currentCodeTheme,
  onCodeThemeChange,
  isFullscreen,
  onToggleFullscreen,
  onPrint,
  onInsertSpecialChar,
  onFindReplace,
  selectedText = '',
  onOpenParagraphDialog,
}) => {
  const [isSticky, setIsSticky] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTextColorSelect = (color: string) => {
    onCommand('foreColor', color);
  };

  const handleBackColorSelect = (color: string) => {
    onCommand('backColor', color);
  };

  return (
    <div
      className={`bg-card border-b border-border transition-smooth shadow-sm ${
        isSticky && !isFullscreen ? 'fixed top-0 left-0 right-0 z-50 shadow-elegant' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5 p-2">
        <Separator orientation="vertical" className="h-6" />

        {/* 撤销重做 */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onRedo}
            disabled={!canRedo}
            title="重做"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 格式化 */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('removeFormat')}
            title="清除格式"
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 字体选择 */}
        <div className="flex items-center gap-2">
          <Select
            value={currentFont}
            onValueChange={(value) => onCommand('fontName', value)}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="字体" />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map((font) => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentFontSize}
            onValueChange={(value) => onCommand('fontSize', value)}
          >
            <SelectTrigger className="h-8 w-[85px] text-xs">
              <SelectValue placeholder="字号" />
            </SelectTrigger>
            <SelectContent>
              {fontSizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 文本格式 */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('bold')}
            title="加粗"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('italic')}
            title="斜体"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('underline')}
            title="下划线"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('strikeThrough')}
            title="删除线"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('superscript')}
            title="上标"
          >
            <SuperscriptIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('subscript')}
            title="下标"
          >
            <SubscriptIcon className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 颜色选择 */}
        <div className="flex items-center gap-0.5">
          <ColorPicker
            onColorSelect={handleTextColorSelect}
            icon={<Palette className="h-4 w-4" />}
            title="字体颜色"
          />
          <ColorPicker
            onColorSelect={handleBackColorSelect}
            icon={<Highlighter className="h-4 w-4" />}
            title="背景高亮"
          />
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 段落设置 */}
        <div className="flex items-center gap-2">
          <Select 
            value={currentHeadingLevel ? currentHeadingLevel.toLowerCase() : 'p'} 
            onValueChange={(value) => onCommand('formatBlock', value)}
          >
            <SelectTrigger className="h-8 w-[90px] text-xs">
              <SelectValue placeholder="标题" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="p">正文</SelectItem>
              <SelectItem value="h1">标题 1</SelectItem>
              <SelectItem value="h2">标题 2</SelectItem>
              <SelectItem value="h3">标题 3</SelectItem>
              <SelectItem value="h4">标题 4</SelectItem>
              <SelectItem value="h5">标题 5</SelectItem>
              <SelectItem value="h6">标题 6</SelectItem>
              <SelectItem value="blockquote">引用块</SelectItem>
            </SelectContent>
          </Select>

          {/* 行间距 */}
          <Select 
            onValueChange={(value) => onCommand('lineHeight', value)}
            defaultValue="1.5"
          >
            <SelectTrigger className="h-8 w-[95px] text-xs" title="行间距">
              <SelectValue placeholder="行间距" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1.0">1.0</SelectItem>
              <SelectItem value="1.2">1.2</SelectItem>
              <SelectItem value="1.5">1.5</SelectItem>
              <SelectItem value="2.0">2.0</SelectItem>
              <SelectItem value="2.5">2.5</SelectItem>
              <SelectItem value="3.0">3.0</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 对齐与列表 */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('justifyLeft')}
            title="左对齐"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('justifyCenter')}
            title="居中"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('justifyRight')}
            title="右对齐"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          
          {/* 段落设置按钮 */}
          {onOpenParagraphDialog && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onOpenParagraphDialog}
              title="段落设置"
            >
              <PilcrowSquare className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('insertUnorderedList')}
            title="项目符号"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCommand('insertOrderedList')}
            title="编号"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 插入元素 */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onMouseDown={(e) => {
              e.preventDefault();
              if (onSaveSelection) onSaveSelection();
            }}
            onClick={() => onCommand('insertHorizontalRule')}
            title="插入分割线"
          >
            <MinusIcon className="h-4 w-4" />
          </Button>
          <LinkDialog 
            onInsertLink={onInsertLink}
            initialData={{ text: selectedText }}
            onOpenChange={(open) => {
              if (open && onSaveSelection) {
                onSaveSelection();
              }
            }}
          />
          <AttachmentDialog 
            onInsertAttachment={onInsertAttachment}
            onOpenChange={(open) => {
              if (open && onSaveSelection) {
                onSaveSelection();
              }
            }}
          />
          <ImageDialog onInsertImage={onInsertImage} />
          <SpecialCharsDialog onInsertChar={onInsertSpecialChar} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (onSaveSelection) onSaveSelection();
              if (onOpenCodeDialog) onOpenCodeDialog();
            }}
            title="插入代码"
            className="h-8 w-8"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 查找与替换 */}
        <div className="flex items-center gap-0.5">
          <FindReplaceDialog onAction={onFindReplace} />
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 表格工具 */}
        <div className="flex items-center gap-0.5">
          <EnhancedTableDialog onInsertTable={onInsertTable} />
          {onTableAction && (
            <TableToolbar 
              onTableAction={onTableAction} 
              hasSelectedCells={hasSelectedCells}
            />
          )}
        </div>
      </div>
    </div>
  );
}
