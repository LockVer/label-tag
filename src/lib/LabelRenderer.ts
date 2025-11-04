import { jsPDF } from 'jspdf';
import { ProductData } from '@/types';
import { MicrosoftYaHeiFont } from '@/assets/fonts/msyh';

interface StyleLabels {
  chinese: boolean;
  english: boolean;
  silver: boolean;
}

interface LabelConfig {
  generateSpare: boolean;
  spareQuantity: number;
  fontSize: number;
  styles: StyleLabels;
}

interface LabelData {
  productName: string;
  orderNumber: string;
  productCode: string;
  quantity: string;
  remarks: string;
}

// 款式名称映射
const STYLE_NAMES: Record<string, string> = {
  chinese: '中文吊牌',
  english: '英文吊牌',
  silver: '烫银吊牌'
};

class LabelRenderer {
  // 标签尺寸（mm）
  private readonly LABEL_WIDTH = 90;
  private readonly LABEL_HEIGHT = 50;

  // 页边距（mm）
  private readonly PAGE_MARGIN = 5;

  // 表格布局（mm）- 减去页边距后的可用空间
  private readonly TABLE_WIDTH = 90 - 2 * 5; // 80mm (90mm - 左右各5mm)
  private readonly TABLE_HEIGHT = 50 - 2 * 5; // 40mm (50mm - 上下各5mm)
  private readonly COL1_WIDTH = 20; // 左列宽度
  private readonly COL2_WIDTH = 60; // 右列宽度 (80mm - 20mm)
  private readonly ROW_HEIGHT = 8; // 行高 (40mm / 5行 = 8mm)
  private readonly LINE_WIDTH = 0.8; // pt - 增加线条宽度使表格更清晰

  constructor() {
    // 构造函数不需要参数
  }

  /**
   * 导出为 PDF
   */
  exportToPDF(products: ProductData[], config: LabelConfig): void {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [this.LABEL_WIDTH, this.LABEL_HEIGHT],
      putOnlyUsedFonts: true,
      floatPrecision: 16
    });

    // 添加微软雅黑字体（加粗）
    pdf.addFileToVFS('msyh.ttf', MicrosoftYaHeiFont);
    pdf.addFont('msyh.ttf', 'Microsoft YaHei', 'normal');
    pdf.addFont('msyh.ttf', 'Microsoft YaHei', 'bold');
    pdf.setFont('Microsoft YaHei', 'bold');

    let isFirstPage = true;
    const enabledStyles = this.getEnabledStyles(config.styles);

    // 遍历每个产品
    products.forEach((product) => {
      // 按 5000 分包
      const packages = this.splitByQuantity(product.quantity);

      // 为每个分包生成标签
      packages.forEach((packageQty) => {
        enabledStyles.forEach((style) => {
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          const labelData = this.prepareLabelData(product, packageQty, style, false);
          this.drawLabelToPDF(pdf, labelData, config.fontSize);
        });
      });

      // 生成备品标签 - 只有当选择生成备品时才生成
      if (config.generateSpare) {
        enabledStyles.forEach((style) => {
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          const labelData = this.prepareLabelData(product, config.spareQuantity, style, true);
          this.drawLabelToPDF(pdf, labelData, config.fontSize);
        });
      }
    });

    // 生成文件名
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `${dateStr}_华旺标签.pdf`;

    pdf.save(filename);
  }

  /**
   * 准备标签数据
   */
  private prepareLabelData(
    product: ProductData,
    quantity: number,
    style: string,
    isSpare: boolean
  ): LabelData {
    const styleName = STYLE_NAMES[style];
    const productName = isSpare
      ? `${product.productName}-${styleName}-备品`
      : `${product.productName}-${styleName}`;

    const quantityStr = quantity > 0 ? `${quantity}张` : '';

    return {
      productName,
      orderNumber: product.orderNumber,
      productCode: product.productCode,
      quantity: quantityStr,
      remarks: product.remarks
    };
  }

  /**
   * 获取启用的款式列表
   */
  private getEnabledStyles(styles: StyleLabels): string[] {
    const enabled: string[] = [];
    if (styles.chinese) enabled.push('chinese');
    if (styles.english) enabled.push('english');
    if (styles.silver) enabled.push('silver');
    return enabled;
  }

  /**
   * 按 5000 分包
   */
  private splitByQuantity(totalQuantity: number): number[] {
    const packages: number[] = [];
    let remaining = totalQuantity;

    while (remaining > 0) {
      const packageQty = Math.min(remaining, 5000);
      packages.push(packageQty);
      remaining -= packageQty;
    }

    return packages;
  }

  /**
   * 绘制标签到 PDF
   */
  private drawLabelToPDF(pdf: jsPDF, labelData: LabelData, fontSize: number): void {
    const lineWidthMm = (this.LINE_WIDTH / 72) * 25.4; // pt 转 mm

    pdf.setLineWidth(lineWidthMm);
    pdf.setFont('Microsoft YaHei', 'bold'); // 确保使用加粗字体

    const defaultFontSize = 10; // 其他字段的固定字体大小

    const rows = [
      { label: '品 名', value: labelData.productName, isProductName: true },
      { label: '订单号', value: labelData.orderNumber, isProductName: false },
      { label: '货 号', value: labelData.productCode, isProductName: false },
      { label: '数 量', value: labelData.quantity, isProductName: false },
      { label: '备 注', value: labelData.remarks, isProductName: false }
    ];

    rows.forEach((row, index) => {
      // 应用页边距
      const y = this.PAGE_MARGIN + index * this.ROW_HEIGHT;

      // 绘制单元格边框
      pdf.rect(this.PAGE_MARGIN, y, this.COL1_WIDTH, this.ROW_HEIGHT);
      pdf.rect(this.PAGE_MARGIN + this.COL1_WIDTH, y, this.COL2_WIDTH, this.ROW_HEIGHT);

      // 绘制左列文本（居中、加粗）- 所有标签都使用固定字体大小
      pdf.setFontSize(defaultFontSize);
      const labelX = this.PAGE_MARGIN + this.COL1_WIDTH / 2;
      const labelY = y + this.ROW_HEIGHT / 2 + defaultFontSize * 0.1;

      // 多次绘制模拟粗体效果
      this.drawBoldText(pdf, row.label, labelX, labelY, {
        align: 'center',
        baseline: 'middle'
      });

      // 绘制右列文本（居中、加粗、支持换行）
      if (row.value) {
        // 品名使用用户设置的字体大小，其他字段使用固定字体大小
        const currentFontSize = row.isProductName ? fontSize : defaultFontSize;
        const maxWidth = this.COL2_WIDTH - 2;

        pdf.setFontSize(currentFontSize);
        const lines = pdf.splitTextToSize(row.value, maxWidth);

        // 计算垂直居中位置
        // 行高使用 mm 单位：字体大小(pt) * 0.35(mm/pt) * 1.2(行距系数)
        const lineHeightMm = currentFontSize * 0.35 * 1.2;
        const totalHeightMm = lines.length * lineHeightMm;

        // 计算起始Y坐标，使整体垂直居中
        const startY = y + (this.ROW_HEIGHT - totalHeightMm) / 2 + lineHeightMm / 2;

        // 右列单元格中心 X 坐标（应用页边距）
        const valueX = this.PAGE_MARGIN + this.COL1_WIDTH + this.COL2_WIDTH / 2;

        // 绘制每一行，居中对齐，使用多次绘制模拟粗体
        lines.forEach((line: string, lineIndex: number) => {
          const lineY = startY + lineIndex * lineHeightMm;
          this.drawBoldText(pdf, line, valueX, lineY, {
            align: 'center',
            baseline: 'middle'
          });
        });
      }
    });
  }

  /**
   * 通过多次绘制文字模拟粗体效果
   */
  private drawBoldText(
    pdf: jsPDF,
    text: string,
    x: number,
    y: number,
    options: { align: 'center' | 'left' | 'right'; baseline: 'middle' | 'top' | 'bottom' }
  ): void {
    // 绘制多次，微调位置模拟粗体
    const offsets = [
      { dx: 0, dy: 0 },      // 原始位置
      { dx: 0.1, dy: 0 },    // 右移
      { dx: 0, dy: 0.1 },    // 下移
      { dx: 0.1, dy: 0.1 },  // 右下移
    ];

    offsets.forEach(offset => {
      pdf.text(text, x + offset.dx, y + offset.dy, options);
    });
  }
}

export default LabelRenderer;
