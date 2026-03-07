import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, List } from 'lucide-react';
import type { HeadingItem } from '@/types/editor';

interface TableOfContentsProps {
  headings: HeadingItem[];
  onHeadingClick: (id: string) => void;
  tocTitleColor?: string;
  tocStyle?: 'text' | 'block';
}

export function TableOfContents({ 
  headings, 
  onHeadingClick, 
  tocTitleColor = '#4361ee',
  tocStyle = 'text'
}: TableOfContentsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  // 记录每个可折叠标题（H1、H2）的展开/折叠状态，默认全部展开
  const [expandedHeadings, setExpandedHeadings] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    headings.forEach(h => {
      if (h.level === 1 || h.level === 2) {
        initial[h.id] = true;
      }
    });
    return initial;
  });

  if (headings.length === 0) {
    return null;
  }

  // 切换标题的展开/折叠状态
  const toggleHeading = (headingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedHeadings(prev => ({
      ...prev,
      [headingId]: !prev[headingId]
    }));
  };

  // 检查某个标题是否应该显示
  const shouldShowHeading = (heading: HeadingItem, index: number): boolean => {
    if (heading.level === 1) return true; // H1始终显示
    
    // 找到这个标题的所有父标题，检查是否都是展开状态
    let currentLevel = heading.level;
    for (let i = index - 1; i >= 0; i--) {
      const parentHeading = headings[i];
      
      // 找到直接父标题
      if (parentHeading.level < currentLevel) {
        // 如果父标题是折叠状态，则当前标题不显示
        if (expandedHeadings[parentHeading.id] === false) {
          return false;
        }
        // 继续向上查找更高层级的父标题
        currentLevel = parentHeading.level;
        if (currentLevel === 1) break; // 已经到H1，不需要再向上查找
      }
    }
    return true;
  };

  // 检查标题是否有子标题
  const hasChildren = (headingIndex: number): boolean => {
    if (headingIndex >= headings.length - 1) return false;
    const currentHeading = headings[headingIndex];
    const nextHeading = headings[headingIndex + 1];
    return nextHeading && nextHeading.level > currentHeading.level;
  };

  return (
    <div className="fixed left-4 top-24 w-64 bg-card rounded-lg shadow-elegant border border-border max-h-[calc(100vh-120px)] overflow-hidden flex flex-col max-xl:hidden">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <List className="h-4 w-4" />
          <span>目录</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-6"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="overflow-y-auto p-2 flex-1">
          {headings.map((heading, index) => {
            const isBlock = tocStyle === 'block';
            const canCollapse = (heading.level === 1 || heading.level === 2) && hasChildren(index);
            const isHeadingExpanded = expandedHeadings[heading.id];
            const shouldShow = shouldShowHeading(heading, index);

            if (!shouldShow) return null;
            
            return (
              <div key={heading.id} className="relative">
                <button
                  onClick={() => onHeadingClick(heading.id)}
                  className={`w-full text-left px-3 py-2 rounded transition-smooth text-sm mb-1 ${
                    isBlock 
                      ? 'hover:opacity-90 active:scale-[0.98]' 
                      : 'hover:bg-accent'
                  } ${canCollapse ? 'pr-8' : ''}`}
                  style={{
                    paddingLeft: isBlock 
                      ? (heading.level === 1 ? '12px' : heading.level === 2 ? '24px' : '36px')
                      : `${(heading.level - 1) * 12 + 12}px`,
                    backgroundColor: isBlock
                      ? (heading.level === 1 ? tocTitleColor : heading.level === 2 ? `${tocTitleColor}15` : 'transparent')
                      : 'transparent',
                    color: isBlock
                      ? (heading.level === 1 ? 'white' : tocTitleColor)
                      : tocTitleColor,
                    fontWeight: isBlock
                      ? (heading.level === 1 ? 700 : 600)
                      : 600,
                    borderLeft: isBlock && heading.level === 2
                      ? `4px solid ${tocTitleColor}`
                      : 'none',
                    fontSize: heading.level >= 3 ? '0.8rem' : '0.875rem'
                  }}
                >
                  <span className="line-clamp-2">{heading.text}</span>
                </button>
                
                {/* 可折叠标题的折叠按钮 */}
                {canCollapse && (
                  <button
                    onClick={(e) => toggleHeading(heading.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/10 transition-colors"
                    style={{
                      color: isBlock && heading.level === 1 ? 'white' : tocTitleColor
                    }}
                    title={isHeadingExpanded ? '折叠子目录' : '展开子目录'}
                  >
                    {isHeadingExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
