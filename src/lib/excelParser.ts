import * as XLSX from 'xlsx';
import { ProductData } from '@/types';

// 定义关键字映射
const COLUMN_KEYWORDS = {
    productName: ['产品名称', '品名', '商品名称',
        '货品名称'],
    orderNumber: ['工单号'],
    productCode: ['产品编号', '货号', '商品编号', '款号'],
    quantity: ['数量', '件数', '总数'],
    remarks: ['批次', '备注', '说明', '批号']
};

// 查找关键字所在的单元格位置
const findKeywordPosition = (worksheet: XLSX.WorkSheet,
    keywords: string[]): { row: number, col: number } | null => {
    const range = XLSX.utils.decode_range(worksheet['!ref']
        || 'A1:Z100');

    for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({
                r: row,
                c: col
            });
            const cell = worksheet[cellAddress];

            if (cell && cell.v) {
                const cellValue = cell.v.toString().trim();
                for (const keyword of keywords) {
                    if (cellValue === keyword) {
                        return { row, col };
                    }
                }
            }
        }
    }
    return null;
};

// 提取某列下方的所有数据
const extractColumnData = (worksheet: XLSX.WorkSheet, col:
    number, startRow: number): string[] => {
    const range = XLSX.utils.decode_range(worksheet['!ref']
        || 'A1:Z100');
    const data: string[] = [];

    for (let row = startRow + 1; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({
            r: row, c:
                col
        });
        const cell = worksheet[cellAddress];
        const value = cell && cell.v ? cell.v.toString().trim()
            : '';

        // 如果遇到空行且已经有数据了，可能是数据结束
        if (!value && data.length > 0) {
            // 检查后面几行是否还有数据
            let hasMoreData = false;
            for (let checkRow = row + 1; checkRow <= Math.min(row
                + 5, range.e.r); checkRow++) {
                const checkAddress = XLSX.utils.encode_cell({
                    r:
                        checkRow, c: col
                });
                const checkCell = worksheet[checkAddress];
                if (checkCell && checkCell.v &&
                    checkCell.v.toString().trim()) {
                    hasMoreData = true;
                    break;
                }
            }
            if (!hasMoreData) break;
        }

        data.push(value);
    }

    return data;
};

export const parseExcelFile = async (file: File):
    Promise<ProductData[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, {
                    type: 'binary'
                });

                // 获取第一个工作表
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // 查找各关键字的位置
                const productNamePos =
                    findKeywordPosition(worksheet,
                        COLUMN_KEYWORDS.productName);
                const orderNumberPos =
                    findKeywordPosition(worksheet,
                        COLUMN_KEYWORDS.orderNumber);
                const productCodePos =
                    findKeywordPosition(worksheet,
                        COLUMN_KEYWORDS.productCode);
                const quantityPos = findKeywordPosition(worksheet,
                    COLUMN_KEYWORDS.quantity);
                const remarksPos = findKeywordPosition(worksheet,
                    COLUMN_KEYWORDS.remarks);

                console.log('关键字位置:', {
                    productName: productNamePos,
                    orderNumber: orderNumberPos,
                    productCode: productCodePos,
                    quantity: quantityPos,
                    remarks: remarksPos
                });

                // 检查必需的列是否找到
                if (!productNamePos) {
                    throw new Error('未找到产品名称列，请检查表格是否包含：产品名称、品名等关键字');
                }
                if (!orderNumberPos) {
                    throw new Error('未找到工单号列，请检查表格是否包含：工单号');
                }
                if (!productCodePos) {
                    throw new Error('未找到货号列，请检查表格是否包含：产品编号、货号、商品编号、款号等关键字');
                }
                if (!remarksPos) {
                    throw new Error('未找到批次列，请检查表格是否包含：批次、备注、说明、批号等关键字');
                }
                if (!quantityPos) {
                    throw new Error('未找到数量列，请检查表格是否包含：数量、件数、总数等关键字');
                }

                // 提取各列数据
                const productNames = extractColumnData(worksheet,
                    productNamePos.col, productNamePos.row);
                const orderNumbers = extractColumnData(worksheet,
                    orderNumberPos.col, orderNumberPos.row);
                const productCodes = extractColumnData(worksheet,
                    productCodePos.col, productCodePos.row);
                const quantities = extractColumnData(worksheet,
                    quantityPos.col, quantityPos.row);
                const remarks = extractColumnData(worksheet,
                    remarksPos.col, remarksPos.row);

                // 构建产品数据
                const products: ProductData[] = [];
                const maxLength = Math.max(productNames.length,
                    orderNumbers.length, productCodes.length,
                    quantities.length, remarks.length);

                for (let i = 0; i < maxLength; i++) {
                    const productName = productNames[i] || '';

                    // 跳过空的产品名称
                    if (!productName) continue;

                    const product: ProductData = {
                        id: `product-${i + 1}`,
                        productName: productName,
                        orderNumber: orderNumbers[i] || '',
                        productCode: productCodes[i] || '',
                        quantity: parseInt(quantities[i]) || 0,
                        remarks: remarks[i] || ''
                    };

                    products.push(product);
                }

                if (products.length === 0) {
                    throw new Error('未找到有效的产品数据');
                }

                resolve(products);
            } catch (error) {
                reject(new Error(error instanceof Error ?
                    error.message : 'Excel文件解析失败'));
            }
        };

        reader.onerror = () => {
            reject(new Error('文件读取失败'));
        };

        reader.readAsBinaryString(file);
    });
};