// js/modes/mode3.js
import { Utils } from '../utils.js';

export const mode3 = {
    id: 'mode3',
    name: 'MODE 3 (Tách phiên bản trong 【 】)',
    execute: (cleanedText, inputs) => {
        const products = [];
        
        // 1. Lấy cụm "价格" làm ghi chú chung
        let globalPriceNote = "";
        const jgKey = "价格";
        const jgIdx = cleanedText.indexOf(jgKey);
        if (jgIdx !== -1) {
            const afterJg = cleanedText.substring(jgIdx + jgKey.length).trim();
            const endNoteIdx = afterJg.indexOf("\n\n");
            globalPriceNote = endNoteIdx !== -1 ? afterJg.substring(0, endNoteIdx).trim() : afterJg.split('\n')[0].trim();
        }

        // 2. Tách sản phẩm theo Link ảnh
        const parts = cleanedText.split(/(?=https?:\/\/)/);

        parts.forEach(part => {
            const lines = part.trim().split('\n').map(l => l.trim()).filter(l => l !== "");
            
            if (lines.length >= 3 && lines[0].startsWith('http') && !lines[0].includes('detail.1688.com')) {
                const imgLink = lines[0];
                const mainName = lines[1];
                let dirtyPriceLine = lines[2]; 

                // --- CẢI TIẾN MỚI: Xử lý dấu hiệu 【 】 ---
                // Tìm nội dung nằm giữa 【 và 】
                const bracketMatch = dirtyPriceLine.match(/【([\s\S]*?)】/);
                if (bracketMatch) {
                    dirtyPriceLine = bracketMatch[1].trim(); // Chỉ lấy nội dung bên trong
                }
                // ---------------------------------------

                // 3. Tách biến thể dựa trên dấu ¥
                const variantRegex = /[^¥\n]+?¥\s*[\d.,]+/g;
                const matches = dirtyPriceLine.match(variantRegex) || [];
                
                let minPrice = Infinity;
                let processedVariants = [];

                if (matches.length > 0) {
                    matches.forEach(item => {
                        const variantText = item.trim();
                        processedVariants.push(variantText);

                        const priceMatch = variantText.match(/¥\s*([\d.,]+)/);
                        if (priceMatch) {
                            const num = parseFloat(priceMatch[1].replace(/,/g, '.'));
                            if (!isNaN(num) && num < minPrice) {
                                minPrice = num;
                            }
                        }
                    });
                } else {
                    processedVariants.push(dirtyPriceLine);
                    minPrice = inputs.defaultPrice > 0 ? inputs.defaultPrice : 0;
                }

                products.push({
                    image: Utils.cleanImageUrl(imgLink),
                    name: mainName,
                    price: minPrice === Infinity ? 0 : minPrice,
                    note: (globalPriceNote ? globalPriceNote + "\n" : "") + processedVariants.join('\n')
                });
            }
        });

        return products;
    }
};