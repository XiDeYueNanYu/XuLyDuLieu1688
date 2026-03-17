// js/modes/mode3.js
import { Utils } from '../utils.js';

export const mode3 = {
    id: 'mode3',
    name: 'MODE 3 (Logic kiểm tra đồng nhất)',
    execute: (cleanedText, inputs) => {
        // 1. Tìm cụm 价格 và lấy giá thấp nhất từ đó (Global Min Price)
        let globalMinPrice = Infinity;
        let globalPriceNote = "";
        const jgKey = "价格";
        const jgIdx = cleanedText.indexOf(jgKey);
        
        if (jgIdx !== -1) {
            const fromJg = cleanedText.substring(jgIdx);
            const endNoteIdx = fromJg.search(/\n\s*\n/);
            globalPriceNote = endNoteIdx !== -1 ? fromJg.substring(0, endNoteIdx).trim() : fromJg.trim();
            
            const globalPrices = globalPriceNote.match(/¥\s*([\d.,]+)/g) || [];
            globalPrices.forEach(pStr => {
                const num = parseFloat(pStr.replace('¥', '').replace(/,/g, '.').trim());
                if (!isNaN(num) && num < globalMinPrice) globalMinPrice = num;
            });
        }

        // 2. Tách các cụm sản phẩm (dựa trên link ảnh)
        const parts = cleanedText.split(/(?=https?:\/\/)/).filter(p => p.trim() !== "");
        const validProductsData = [];

        // Bước chuẩn bị: Thu thập dữ liệu thô của từng sản phẩm hợp lệ
        parts.forEach(part => {
            const lines = part.trim().split('\n').map(l => l.trim());
            if (lines.length >= 3 && lines[0].startsWith('http') && !lines[0].includes('detail.1688.com')) {
                const bracketMatch = part.match(/◤([\s\S]*?)◥/);
                const versionContent = bracketMatch ? bracketMatch[1].trim() : "";
                const pricesInBracket = versionContent.match(/¥\s*([\d.,]+)/g) || [];
                const parsedPrices = pricesInBracket.map(p => parseFloat(p.replace('¥', '').replace(/,/g, '.').trim()));

                validProductsData.push({
                    img: lines[0],
                    name: lines[1],
                    versionContent: versionContent,
                    prices: parsedPrices,
                    partText: part
                });
            }
        });

        const productCount = validProductsData.length;

        // 3. THỰC THI LOGIC ƯU TIÊN THEO YÊU CẦU
        return validProductsData.map(prod => {
            let finalPrice = Infinity;

            if (productCount === 1) {
                // TRƯỜNG HỢP 1 SẢN PHẨM
                if (prod.prices.length > 1) {
                    // Nhiều giá trong ngoặc -> lấy thấp nhất trong ngoặc
                    finalPrice = Math.min(...prod.prices);
                } else if (prod.prices.length === 1) {
                    // Chỉ 1 giá trong ngoặc -> lấy thấp nhất từ cụm 价格
                    finalPrice = globalMinPrice !== Infinity ? globalMinPrice : prod.prices[0];
                }
            } else if (productCount > 1) {
                // TRƯỜNG HỢP NHIỀU SẢN PHẨM
                // Kiểm tra xem tất cả các giá trong ◤ ◥ của mọi sản phẩm có bằng nhau không
                const allPricesInAllProds = validProductsData.flatMap(p => p.prices);
                const isAllPricesIdentical = allPricesInAllProds.length > 0 && 
                                             allPricesInAllProds.every(val => val === allPricesInAllProds[0]);

                if (isAllPricesIdentical) {
                    // Nếu hoàn toàn bằng nhau -> lấy giá sàn trong cụm 价格
                    finalPrice = globalMinPrice !== Infinity ? globalMinPrice : allPricesInAllProds[0];
                } else {
                    // Nếu có ít nhất 1 cặp khác nhau -> lấy giá thấp nhất trong ◤ ◥ của TỪNG sản phẩm
                    if (prod.prices.length > 0) {
                        finalPrice = Math.min(...prod.prices);
                    }
                }
            }

            // Fallback nếu không tính được giá
            if (finalPrice === Infinity) finalPrice = inputs.defaultPrice || 0;

            return {
                image: Utils.cleanImageUrl(prod.img),
                name: prod.name,
                price: finalPrice,
                note: (globalPriceNote ? globalPriceNote + "\n---\n" : "") + (prod.versionContent || "Không có thông tin phiên bản")
            };
        });
    }
};