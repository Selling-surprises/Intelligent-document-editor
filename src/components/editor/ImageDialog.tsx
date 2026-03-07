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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/ui/file-upload';
import { Image } from 'lucide-react';

interface ImageDialogProps {
  onInsertImage: (src: string) => void;
}

export function ImageDialog({ onInsertImage }: ImageDialogProps) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [previewImage, setPreviewImage] = useState('');

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageUrl.trim()) {
      return;
    }

    onInsertImage(imageUrl.trim());
    
    // 重置表单并关闭对话框
    setImageUrl('');
    setOpen(false);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setPreviewImage(src);
      onInsertImage(src);
      setOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // 关闭时重置表单
      setImageUrl('');
      setPreviewImage('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="插入图片">
          <Image className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>插入图片</DialogTitle>
          <DialogDescription>
            从本地上传图片或输入在线图片地址
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="local" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">本地上传</TabsTrigger>
            <TabsTrigger value="online">在线图片</TabsTrigger>
          </TabsList>
          
          <TabsContent value="local" className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="image-file">选择图片文件</Label>
              <FileUpload
                accept="image/*"
                onChange={handleFileUpload}
                value={previewImage}
                onRemove={() => setPreviewImage('')}
                previewType="image"
                buttonText="选择图片"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="online">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="image-url">
                  图片地址 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="image-url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  required
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={!imageUrl.trim()}>
                  插入图片
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
