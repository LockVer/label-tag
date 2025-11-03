'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductData } from '@/types';
import LabelRenderer from '@/lib/LabelRenderer';
import { toast } from 'sonner';

interface LabelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: ProductData[];
}

export function LabelSettingsDialog({
  open,
  onOpenChange,
  selectedProducts,
}: LabelSettingsDialogProps) {
  const [generateSpare, setGenerateSpare] = useState(true);
  const [spareQuantity, setSpareQuantity] = useState<number | ''>(0);
  const [fontSize, setFontSize] = useState<number | ''>(10);
  const [styles, setStyles] = useState({
    chinese: true,
    english: true,
    silver: true,
  });

  // 当弹窗关闭后重置状态
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setGenerateSpare(true);
        setSpareQuantity(0);
        setFontSize(10);
        setStyles({
          chinese: true,
          english: true,
          silver: true,
        });
      }, 300);
    }
  }, [open]);

  // 计算逻辑
  const calculateLabels = () => {
    const enabledStyles = Object.values(styles).filter(Boolean).length;

    // 常规标签：每个产品单独按 5000 分包
    const regularLabels = selectedProducts.reduce((sum, product) => {
      return sum + Math.ceil(product.quantity / 5000);
    }, 0);

    // 备品标签：只有选中生成备品时才计算
    const spareLabels = generateSpare ? selectedProducts.length : 0;

    // 总标签数
    const totalLabels = (regularLabels + spareLabels) * enabledStyles;

    return {
      selectedCount: selectedProducts.length,
      enabledStyles,
      regularLabels: regularLabels * enabledStyles,
      spareLabels: spareLabels * enabledStyles,
      totalLabels,
    };
  };

  const stats = calculateLabels();

  const handleStyleChange = (style: 'chinese' | 'english' | 'silver') => {
    setStyles(prev => ({ ...prev, [style]: !prev[style] }));
  };

  const handleConfirm = () => {
    try {
      // 创建 renderer 实例并生成 PDF
      const renderer = new LabelRenderer();

      // 生成 PDF
      renderer.exportToPDF(selectedProducts, {
        generateSpare: generateSpare,
        spareQuantity: spareQuantity === '' ? 0 : spareQuantity,
        fontSize: fontSize === '' ? 10 : fontSize,
        styles
      });

      // 显示成功提示
      toast.success('生成成功');

      onOpenChange(false);
    } catch (error) {
      // 显示失败提示
      toast.error('生成失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">生成标签设置</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 提示信息 */}
          <p className="text-sm text-gray-600">
            配置标签生成参数，系统暂且自动拆分超过 5000 数量的标签
          </p>

          {/* 生成备品标签复选框 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generate-spare"
                checked={generateSpare}
                onCheckedChange={(checked) => setGenerateSpare(!!checked)}
              />
              <label htmlFor="generate-spare" className="text-sm font-medium cursor-pointer">
                生成备品标签
              </label>
            </div>
          </div>

          {/* 备品数量 - 只有选中生成备品时才显示 */}
          {generateSpare && (
            <div className="space-y-2">
              <Label htmlFor="spare-quantity">
                备品数量 <span className="text-gray-500">(每个产品款式)</span>
              </Label>
              <Input
                id="spare-quantity"
                type="number"
                value={spareQuantity}
                onChange={(e) => {
                  const value = e.target.value;
                  setSpareQuantity(value === '' ? '' : Number(value));
                }}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                每个产品的备件默认式都会生成一张备品标签
              </p>
            </div>
          )}

          {/* 标签字体大小 */}
          <div className="space-y-2">
            <Label htmlFor="font-size">标签字体大小</Label>
            <Input
              id="font-size"
              type="number"
              value={fontSize}
              onChange={(e) => {
                const value = e.target.value;
                setFontSize(value === '' ? '' : Number(value));
              }}
              className="w-full"
            />
          </div>

          {/* 选择标签款式 */}
          <div className="space-y-2">
            <Label>选择标签款式</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chinese"
                  checked={styles.chinese}
                  onCheckedChange={() => handleStyleChange('chinese')}
                />
                <label htmlFor="chinese" className="text-sm cursor-pointer">
                  中文吊牌
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="english"
                  checked={styles.english}
                  onCheckedChange={() => handleStyleChange('english')}
                />
                <label htmlFor="english" className="text-sm cursor-pointer">
                  英文吊牌
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="silver"
                  checked={styles.silver}
                  onCheckedChange={() => handleStyleChange('silver')}
                />
                <label htmlFor="silver" className="text-sm cursor-pointer">
                  烫银吊牌
                </label>
              </div>
            </div>
          </div>

          {/* 生成摘要 */}
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <h3 className="font-medium text-sm">生成摘要</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>选择产品：{stats.selectedCount}</div>
              <div>启用款式：{stats.enabledStyles}</div>
              <div>常规标签：{stats.regularLabels} 张</div>
              <div>备品标签：{stats.spareLabels} 张</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-black hover:bg-gray-800 text-white"
            disabled={stats.enabledStyles === 0}
          >
            确认生成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
