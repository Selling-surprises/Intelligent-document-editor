import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Minus,
  Palette,
  Grid3x3,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

interface TableToolbarProps {
  onTableAction: (action: string, data?: any) => void;
  hasSelectedCells: boolean;
}

export function TableToolbar({ onTableAction, hasSelectedCells }: TableToolbarProps) {
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');

  return (
    <div className="flex items-center gap-1">
      {/* 插入行列 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title="插入行列"
            disabled={!hasSelectedCells}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onTableAction('insertRowAbove')}>
            在上方插入行
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTableAction('insertRowBelow')}>
            在下方插入行
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onTableAction('insertColumnLeft')}>
            在左侧插入列
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTableAction('insertColumnRight')}>
            在右侧插入列
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 删除行列 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title="删除行列"
            disabled={!hasSelectedCells}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onTableAction('deleteRow')}>
            删除行
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTableAction('deleteColumn')}>
            删除列
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => onTableAction('deleteTable')}
            className="text-destructive"
          >
            删除表格
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 表格颜色 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title="表格颜色"
            disabled={!hasSelectedCells}
          >
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <div className="p-3 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                背景颜色
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => {
                    setBgColor(e.target.value);
                    onTableAction('backgroundColor', e.target.value);
                  }}
                  className="w-full h-8 rounded cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">{bgColor}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                文字颜色
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    onTableAction('textColor', e.target.value);
                  }}
                  className="w-full h-8 rounded cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">{textColor}</span>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 边框样式 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title="边框样式"
            disabled={!hasSelectedCells}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onTableAction('borderStyle', 'solid')}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-foreground" />
              <span>实线</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTableAction('borderStyle', 'dashed')}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-foreground border-t-2 border-dashed border-foreground" />
              <span>虚线</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTableAction('borderStyle', 'dotted')}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-foreground border-t-2 border-dotted border-foreground" />
              <span>点线</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTableAction('borderStyle', 'double')}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 border-y-2 border-double border-foreground" />
              <span>双线</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
