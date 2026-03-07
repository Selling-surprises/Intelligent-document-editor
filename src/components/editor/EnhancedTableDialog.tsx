import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnhancedTableDialogProps {
  onInsertTable: (rows: number, cols: number) => void;
}

export function EnhancedTableDialog({ onInsertTable }: EnhancedTableDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const { toast } = useToast();

  const handleInsert = () => {
    if (rows < 1 || rows > 20) {
      toast({
        title: '错误',
        description: '行数必须在1-20之间',
        variant: 'destructive',
      });
      return;
    }

    if (cols < 1 || cols > 10) {
      toast({
        title: '错误',
        description: '列数必须在1-10之间',
        variant: 'destructive',
      });
      return;
    }

    onInsertTable(rows, cols);
    setOpen(false);
    
    toast({
      title: '成功',
      description: '表格已插入',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="插入表格"
        >
          <Table2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>插入表格</DialogTitle>
          <DialogDescription>
            设置表格的行数和列数，插入后可以使用右键菜单进行编辑
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rows">行数</Label>
              <Input
                id="rows"
                type="number"
                min="1"
                max="20"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cols">列数</Label>
              <Input
                id="cols"
                type="number"
                min="1"
                max="10"
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">支持的功能：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>右键单元格打开编辑菜单</li>
              <li>合并单元格（选中多个单元格后右键）</li>
              <li>拆分单元格</li>
              <li>插入/删除行</li>
              <li>插入/删除列</li>
              <li>设置单元格背景色</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleInsert}>插入</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
