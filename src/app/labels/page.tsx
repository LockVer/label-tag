'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
import { ProductData } from '@/types';
import { LabelSettingsDialog } from '@/components/LabelSettingsDialog';

export default function LabelsPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const filteredProducts = products.filter(product =>
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* 标题 - 放大加粗居中 */}
      <div className="text-center py-12 flex-shrink-0">
        <h1 className="text-5xl font-black text-gray-900">标签生成</h1>
      </div>

      {/* 主体内容 */}
      <div className="px-8 pb-8 max-w-[60%] mx-auto flex-1 flex flex-col overflow-hidden">
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
              placeholder="搜索产品名称、订单号、货号、批次"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border border-gray-300 rounded"
            />
          </div>
        </div>
{/* 表格容器 */}
<div className="border border-gray-300 rounded-lg overflow-x-auto flex-1 flex flex-col overflow-hidden">
  {/* 表头 - 固定不滚动 */}
  <div className="bg-white border-b border-gray-300 min-w-[900px] flex-shrink-0">
    <div className="grid grid-cols-[auto_3fr_2fr_1.5fr_1.5fr_1.5fr] gap-2 pl-6 pr-[calc(1.5rem+17px)] py-3 text-base font-medium text-gray-500">
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
      <div className="text-right pr-20 whitespace-nowrap">数量</div>
    </div>
  </div>

  {/* 表体 */}
  <div className="min-w-[900px] overflow-y-auto flex-1">
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
        <div className="text-right font-medium pr-20 whitespace-nowrap">
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