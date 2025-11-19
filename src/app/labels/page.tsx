'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ChevronDown } from 'lucide-react';
import { ProductData } from '@/types';
import { LabelSettingsDialog } from '@/components/LabelSettingsDialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function LabelsPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('labelData');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setTimeout(() => {
            setProducts(parsedData);
          }, 0);
        } catch (error) {
          console.error('解析存储数据失败:', error);
          router.push('/');
        }
      } else {
        router.push('/');
      }
    }
  }, [router]);

  // 获取所有唯一的批次
  const batches = useMemo(() => {
    const batchSet = new Set<string>();
    products.forEach(product => {
      if (product.remarks) {
        batchSet.add(product.remarks);
      }
    });
    return Array.from(batchSet).sort();
  }, [products]);

  const filteredProducts = products.filter(product => {
    const searchValue = searchTerm.trim().toLowerCase().replace(/\s+/g, '');

    // 批次筛选 - 支持多选
    if (selectedBatches.length > 0 && product.remarks && !selectedBatches.includes(product.remarks)) {
      return false;
    }

    // 搜索过滤
    // 对于批次字段，提取数字进行严格匹配
    const remarksMatch = () => {
      if (!product.remarks) return false;
      const remarksNoSpace = product.remarks.toLowerCase().replace(/\s+/g, '');

      // 如果搜索词是纯数字，则从批次中提取数字进行完整匹配
      if (/^\d+$/.test(searchValue)) {
        const remarksNumbers = product.remarks.match(/\d+/g);
        return remarksNumbers?.some(num => num === searchValue) || false;
      }

      // 否则进行普通的模糊匹配
      return remarksNoSpace.includes(searchValue);
    };

    return (
      product.productName?.toLowerCase().replace(/\s+/g, '').includes(searchValue) ||
      product.orderNumber?.toLowerCase().replace(/\s+/g, '').includes(searchValue) ||
      product.productCode?.toLowerCase().replace(/\s+/g, '').includes(searchValue) ||
      remarksMatch() ||
      product.quantity?.toString().replace(/\s+/g, '').includes(searchValue)
    );
  });

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id!));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleInvertSelection = () => {
    const currentFilteredIds = filteredProducts.map(p => p.id!);
    const newSelected = currentFilteredIds.filter(id => !selectedProducts.includes(id));
    setSelectedProducts(newSelected);
  };

  const handleBatchToggle = (batch: string) => {
    setSelectedBatches(prev => {
      if (prev.includes(batch)) {
        return prev.filter(b => b !== batch);
      } else {
        return [...prev, batch];
      }
    });
  };

  const handleSelectAllBatches = () => {
    setSelectedBatches(batches);
  };

  const handleClearAllBatches = () => {
    setSelectedBatches([]);
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* 标题 - 放大加粗居中 */}
      <div className="text-center py-12 flex-shrink-0">
        <h1 className="text-5xl font-black text-gray-900">标签生成</h1>
      </div>

      {/* 主体内容 */}
      <div className="px-8 pb-8 w-[60%] mx-auto flex-1 flex flex-col overflow-hidden">
        {/* 顶部区域 */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <h2 className="text-3xl font-medium text-gray-900">产品列表</h2>
          <Button
            className="bg-white hover:bg-gray-50 text-black border border-gray-300 px-6 py-2 rounded"
            onClick={() => router.push('/')}
          >
            重新导入
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="mb-6 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="搜索产品名称、订单号、货号、批次、数量"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border border-gray-300 rounded"
            />
          </div>
        </div>

        {/* 批量操作栏 */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-base text-gray-700">批量操作：</span>
              <Button
                variant="outline"
                className="text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-1 h-auto border border-gray-300"
                onClick={() => handleSelectAll(true)}
              >
                全选
              </Button>
              <Button
                variant="outline"
                className="text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-1 h-auto border border-gray-300"
                onClick={handleInvertSelection}
              >
                反选
              </Button>
            </div>
            {/* 批次筛选多选下拉框 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[200px] justify-between border border-gray-300"
                >
                  <span className="truncate">
                    {selectedBatches.length === 0
                      ? '全部批次'
                      : selectedBatches.length === batches.length
                      ? '全部批次'
                      : `已选 ${selectedBatches.length} 个批次`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="end">
                <div className="max-h-[300px] overflow-y-auto">
                  {/* 全选/清空按钮 */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
                      onClick={handleSelectAllBatches}
                    >
                      全选
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-gray-600 hover:text-gray-700"
                      onClick={handleClearAllBatches}
                    >
                      清空
                    </Button>
                  </div>
                  {/* 批次列表 */}
                  <div className="p-2">
                    {batches.map(batch => (
                      <div
                        key={batch}
                        className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => handleBatchToggle(batch)}
                      >
                        <Checkbox
                          checked={selectedBatches.includes(batch)}
                          onCheckedChange={() => handleBatchToggle(batch)}
                        />
                        <span className="text-sm">{batch}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
{/* 表格容器 */}
<div className="border border-gray-300 rounded-lg flex-1 flex flex-col overflow-hidden">
  {/* 表头 - 固定不滚动 */}
  <div className="bg-white border-b border-gray-300 flex-shrink-0 overflow-y-scroll">
    <div className="grid grid-cols-[auto_3fr_2fr_1.5fr_1.5fr_1.5fr] gap-2 pl-6 pr-6 py-3 text-base font-medium text-gray-500">
      <div className="flex items-center">
        <Checkbox
          checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
          onCheckedChange={(checked) => handleSelectAll(!!checked)}
        />
      </div>
      <div className="pl-2 whitespace-nowrap">产品名称</div>
      <div className="px-2 whitespace-nowrap">订单号</div>
      <div className="px-2 whitespace-nowrap">货号</div>
      <div className="px-2 whitespace-nowrap">批次</div>
      <div className="text-right pr-6 whitespace-nowrap">数量</div>
    </div>
  </div>

  {/* 表体 */}
  <div className="overflow-y-scroll flex-1">
    {filteredProducts.map((product, index) => (
      <div
        key={product.id || index}
        className="grid grid-cols-[auto_3fr_2fr_1.5fr_1.5fr_1.5fr] gap-2 pl-6 pr-6 py-3 border-b border-gray-200 hover:bg-gray-50 text-base"
      >
        <div className="flex items-center">
          <Checkbox
            checked={selectedProducts.includes(product.id!)}
            onCheckedChange={(checked) => handleSelectProduct(product.id!, !!checked)}
          />
        </div>
        <div className="pl-2 break-words">
          {product.productName}
        </div>
        <div className="px-2 break-words">
          {product.orderNumber}
        </div>
        <div className="px-2 break-words">
          {product.productCode}
        </div>
        <div className="px-2 break-words">
          {product.remarks}
        </div>
        <div className="text-right font-medium pr-6 whitespace-nowrap">
          {product.quantity}
        </div>
      </div>
    ))}
  </div>
</div>
        {/* 底部生成标签按钮 */}
        <div className="flex justify-end mt-6 flex-shrink-0">
          <Button
            className="bg-black hover:bg-gray-800 text-white px-16 py-6 rounded-lg text-xl font-semibold"
            disabled={selectedProducts.length === 0}
            onClick={() => setDialogOpen(true)}
          >
            生成标签 ({selectedProducts.length})
          </Button>
        </div>
      </div>

      {/* 标签设置弹窗 */}
      <LabelSettingsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedProducts={products.filter(p => selectedProducts.includes(p.id!))}
      />
    </div>
  );
}