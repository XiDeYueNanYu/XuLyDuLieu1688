// js/modes/mode2.js
import { Utils } from '../utils.js';

export const mode2 = {
    id: 'mode2',
    name: 'MODE 2 (Giá thấp nhất)',
    
    execute: (cleanedText, inputs) => {
        const products = [];
        
        // 1. Tìm cụm "价格" và trích xuất GIÁ THẤP NHẤT + TOÀN BỘ NỘI DUNG
        let globalNote = "";
        let minPriceFound = null;

        // Sử dụng Regex để lấy phần nội dung từ "价格:" đến khi gặp "http" đầu tiên
        const jgMatch = cleanedText.match(/价格:?\s*([\s\S]*?)(?=\n\s*http|$)/);
        
        if (jgMatch && jgMatch[1]) {
            globalNote = jgMatch[1].trim();

            // Tìm tất cả các cụm số sau dấu ¥ trong ghi chú để tìm Min
            const priceMatches = globalNote.match(/¥\s*([\d.,]+)/g);
            if (priceMatches) {
                const numericPrices = priceMatches.map(p => {
                    const cleanP = p.replace('¥', '').replace(/\s/g, '').replace(/,/g, '.');
                    return parseFloat(cleanP);
                }).filter(num => !isNaN(num));

                if (numericPrices.length > 0) {
                    minPriceFound = Math.min(...numericPrices);
                }
            }
        }

        // 2. Regex CẢI TIẾN: Chấp nhận dòng 3 là bất cứ thứ gì (không bắt buộc dấu ¥)
        // Cấu trúc: Link ảnh -> Xuống dòng -> Tên -> Xuống dòng -> Nội dung bất kỳ (giá hoặc text chờ)
        const productRegex = /(https?:\/\/[^\s]+)\n([^\n]+)\n([^\n]+)/g;
        
        let match;
        while ((match = productRegex.exec(cleanedText)) !== null) {
            const imgLink = match[1].trim();
            const productName = match[2].trim();
            
            // Nếu link này thuộc phần URL cuối cùng thì bỏ qua
            if (imgLink.toLowerCase().includes("detail.1688.com")) continue;

            // Ưu tiên: Giá thấp nhất từ cụm 价格 > Giá mặc định UI > 0
            let finalPrice = minPriceFound !== null ? minPriceFound : (inputs.defaultPrice > 0 ? inputs.defaultPrice : 0);

            products.push({
                image: Utils.cleanImageUrl(imgLink),
                name: productName,
                price: finalPrice, 
                note: globalNote || "Giá cố định" 
            });
        }
        
        return products;
    }
};