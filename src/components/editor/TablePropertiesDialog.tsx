import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

interface TablePropertiesDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (settings: TableSettings) => void;
  initialSettings?: Partial<TableSettings>;
}

// 边框样式类型
export type BorderStyleType = 
  | 'none'        // 无框线
  | 'all'         // 所有框线
  | 'outer'       // 外侧框线
  | 'inner'       // 内部框线
  | 'horizontal'  // 内部横框线
  | 'vertical'    // 内部竖框线
  | 'top'         // 上框线
  | 'bottom'      // 下框线
  | 'left'        // 左框线
  | 'right';      // 右框线

export interface TableSettings {
  // 尺寸
  width: number;
  widthUnit: 'px' | '%';
  height: number;
  heightUnit: 'px' | 'auto';
  
  // 边框样式（新增）
  borderStyleType: BorderStyleType;
  
  // 边框
  borderWidth: number;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
  borderColor: string;
  
  // 对齐
  alignment: 'left' | 'center' | 'right';
  
  // 间距
  cellPadding: number;
  cellSpacing: number;
  
  // 背景
  backgroundColor: string;
}

const defaultSettings: TableSettings = {
  width: 100,
  widthUnit: '%',
  height: 0,
  heightUnit: 'auto',
  borderStyleType: 'all',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: '#333333',
  alignment: 'left',
  cellPadding: 8,
  cellSpacing: 0,
  backgroundColor: '#ffffff'
};

export function TablePropertiesDialog({ open, onClose, onApply, initialSettings }: TablePropertiesDialogProps) {
  const [settings, setSettings] = useState<TableSettings>({
    ...defaultSettings,
    ...initialSettings
  });

  const handleApply = () => {
    onApply(settings);
    onClose();
  };

  const updateSetting = <K extends keyof TableSettings>(
    key: K,
    value: TableSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[550px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>表格属性</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="size" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="size">尺寸</TabsTrigger>
            <TabsTrigger value="border">边框</TabsTrigger>
            <TabsTrigger value="style">样式</TabsTrigger>
          </TabsList>

          {/* 尺寸选项卡 */}
          <TabsContent value="size" className="space-y-6 mt-4">
            <div className="space-y-4 border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium bg-muted px-3 py-1 -mx-4 -mt-4 mb-4 rounded-t-lg">
                表格尺寸
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="width">宽度:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="width"
                      type="number"
                      value={settings.width}
                      onChange={(e) => updateSetting('width', Number(e.target.value))}
                      className="w-24"
                      min="0"
                    />
                    <Select
                      value={settings.widthUnit}
                      onValueChange={(value: any) => updateSetting('widthUnit', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">px</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">高度:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="height"
                      type="number"
                      value={settings.height}
                      onChange={(e) => updateSetting('height', Number(e.target.value))}
                      className="w-24"
                      min="0"
                      disabled={settings.heightUnit === 'auto'}
                    />
                    <Select
                      value={settings.heightUnit}
                      onValueChange={(value: any) => updateSetting('heightUnit', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">自动</SelectItem>
                        <SelectItem value="px">px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium bg-muted px-3 py-1 -mx-4 -mt-4 mb-4 rounded-t-lg">
                对齐方式
              </h3>
              
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={settings.alignment === 'left' ? 'default' : 'outline'}
                  onClick={() => updateSetting('alignment', 'left')}
                  size="sm"
                >
                  左对齐
                </Button>
                <Button
                  variant={settings.alignment === 'center' ? 'default' : 'outline'}
                  onClick={() => updateSetting('alignment', 'center')}
                  size="sm"
                >
                  居中
                </Button>
                <Button
                  variant={settings.alignment === 'right' ? 'default' : 'outline'}
                  onClick={() => updateSetting('alignment', 'right')}
                  size="sm"
                >
                  右对齐
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* 边框选项卡 */}
          <TabsContent value="border" className="space-y-6 mt-4">
            <div className="space-y-4 border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium bg-muted px-3 py-1 -mx-4 -mt-4 mb-4 rounded-t-lg">
                边框样式类型
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={settings.borderStyleType === 'none' ? 'default' : 'outline'}
                  onClick={() => updateSetting('borderStyleType', 'none')}
                  size="sm"
                  className="justify-start"
                >
                  无框线
                </Button>
                <Button
                  variant={settings.borderStyleType === 'all' ? 'default' : 'outline'}
                  onClick={() => updateSetting('borderStyleType', 'all')}
                  size="sm"
                  className="justify-start"
                >
                  所有框线
                </Button>
                <Button
                  variant={settings.borderStyleType === 'outer' ? 'default' : 'outline'}
                  onClick={() => updateSetting('borderStyleType', 'outer')}
                  size="sm"
                  className="justify-start"
                >
                  外侧框线
                </Button>
                <Button
                  variant={settings.borderStyleType === 'inner' ? 'default' : 'outline'}
                  onClick={() => updateSetting('borderStyleType', 'inner')}
                  size="sm"
                  className="justify-start"
                >
                  内部框线
                </Button>
                <Button
                  variant={settings.borderStyleType === 'horizontal' ? 'default' : 'outline'}
                  onClick={() => updateSetting('borderStyleType', 'horizontal')}
                  size="sm"
                  className="justify-start"
                >
                  内部横框线
                </Button>
                <Button
                  variant={settings.borderStyleType === 'vertical' ? 'default' : 'outline'}
                  onClick={() => updateSetting('borderStyleType', 'vertical')}
                  size="sm"
                  className="justify-start"
                >
                  内部竖框线
                </Button>
                <Button
                  variant={settings.borderStyleType === 'top' ? 'default' : 'outline'}
                  onClick={() => updateSetting('borderStyleType', 'top')}
                  size="sm"
                  className="justify-start"
                >
                  上框线
                </Button>
                <Button
                  variant={settings.borderStyleType === 'bottom' ? 'default' : 'outline'}
                  onClick={() => updateSetting('borderStyleType', 'bottom')}
                  size="sm"
                  className="justify-start"
                >
                  下框线
                </Button>
                <Button
                  variant={settings.borderStyleType === 'left' ? 'default' : 'outline'}
                  onClick={() => updateSetting('borderStyleType', 'left')}
                  size="sm"
                  className="justify-start"
                >
                  左框线
                </Button>
                <Button
                  variant={settings.borderStyleType === 'right' ? 'default' : 'outline'}
                  onClick={() => updateSetting('borderStyleType', 'right')}
                  size="sm"
                  className="justify-start"
                >
                  右框线
                </Button>
              </div>
            </div>

            <div className="space-y-4 border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium bg-muted px-3 py-1 -mx-4 -mt-4 mb-4 rounded-t-lg">
                边框设置
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="borderWidth">边框宽度: {settings.borderWidth}px</Label>
                  <Slider
                    id="borderWidth"
                    value={[settings.borderWidth]}
                    onValueChange={([value]) => updateSetting('borderWidth', value)}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="borderStyle">边框线型:</Label>
                  <Select
                    value={settings.borderStyle}
                    onValueChange={(value: any) => updateSetting('borderStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">实线</SelectItem>
                      <SelectItem value="dashed">虚线</SelectItem>
                      <SelectItem value="dotted">点线</SelectItem>
                      <SelectItem value="double">双线</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="borderColor">边框颜色:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="borderColor"
                      type="color"
                      value={settings.borderColor}
                      onChange={(e) => updateSetting('borderColor', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={settings.borderColor}
                      onChange={(e) => updateSetting('borderColor', e.target.value)}
                      className="flex-1"
                      placeholder="#333333"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 预览 */}
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <h3 className="text-sm font-medium mb-3">边框预览</h3>
              <div className="flex justify-center">
                <div
                  className="w-32 h-20 bg-card"
                  style={{
                    border: `${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor}`
                  }}
                />
              </div>
            </div>
          </TabsContent>

          {/* 样式选项卡 */}
          <TabsContent value="style" className="space-y-6 mt-4">
            <div className="space-y-4 border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium bg-muted px-3 py-1 -mx-4 -mt-4 mb-4 rounded-t-lg">
                单元格间距
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cellPadding">单元格内边距: {settings.cellPadding}px</Label>
                  <Slider
                    id="cellPadding"
                    value={[settings.cellPadding]}
                    onValueChange={([value]) => updateSetting('cellPadding', value)}
                    min={0}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cellSpacing">单元格间距: {settings.cellSpacing}px</Label>
                  <Slider
                    id="cellSpacing"
                    value={[settings.cellSpacing]}
                    onValueChange={([value]) => updateSetting('cellSpacing', value)}
                    min={0}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium bg-muted px-3 py-1 -mx-4 -mt-4 mb-4 rounded-t-lg">
                背景颜色
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="backgroundColor">表格背景:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.backgroundColor}
                    onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                    className="flex-1"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            {/* 预览 */}
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <h3 className="text-sm font-medium mb-3">样式预览</h3>
              <div className="flex justify-center">
                <table
                  style={{
                    borderCollapse: settings.cellSpacing > 0 ? 'separate' : 'collapse',
                    borderSpacing: `${settings.cellSpacing}px`,
                    border: `${settings.borderWidth}px ${settings.borderStyle} ${settings.borderColor}`,
                    backgroundColor: settings.backgroundColor
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          border: `1px solid ${settings.borderColor}`,
                          padding: `${settings.cellPadding}px`,
                          minWidth: '60px',
                          textAlign: 'center'
                        }}
                      >
                        单元格
                      </td>
                      <td
                        style={{
                          border: `1px solid ${settings.borderColor}`,
                          padding: `${settings.cellPadding}px`,
                          minWidth: '60px',
                          textAlign: 'center'
                        }}
                      >
                        单元格
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          border: `1px solid ${settings.borderColor}`,
                          padding: `${settings.cellPadding}px`,
                          minWidth: '60px',
                          textAlign: 'center'
                        }}
                      >
                        单元格
                      </td>
                      <td
                        style={{
                          border: `1px solid ${settings.borderColor}`,
                          padding: `${settings.cellPadding}px`,
                          minWidth: '60px',
                          textAlign: 'center'
                        }}
                      >
                        单元格
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleApply}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
