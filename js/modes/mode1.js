// js/modes/mode1.js
import { Utils } from '../utils.js';

export const mode1 = {
    id: 'mode1',
    name: 'Chế độ 1 (Giá gốc)',
    extraFields: [],

    execute: (cleanedText, inputs) => {
        const products = [];
        
        // 1. Lấy ghi chú từ dòng "价格" (Sử dụng cách tìm chuỗi thuần túy cho an toàn)
        let globalNote = "";
        const jgKey = "价格";
        const jgIdx = cleanedText.indexOf(jgKey);
        if (jgIdx !== -1) {
            // Lấy từ sau chữ "价格" đến khi xuống dòng 2 lần (hết khối)
            const afterJg = cleanedText.substring(jgIdx + jgKey.length).trim();
            const endNoteIdx = afterJg.indexOf("\n\n");
            globalNote = endNoteIdx !== -1 ? afterJg.substring(0, endNoteIdx).trim() : afterJg.split('\n')[0].trim();
        }

        // 2. Dùng CHÍNH XÁC Regex của Mode 2 để đảm bảo bắt được sản phẩm
        const productRegex = /(https?:\/\/[^\s]+)\n([^\n]+)\n¥([\d.,\s]+)/g;
        
        let match;
        while ((match = productRegex.exec(cleanedText)) !== null) {
            // Lấy giá thô, xử lý dấu phẩy thành dấu chấm để Utils.extractPrice hoặc parseFloat chạy được
            const rawPrice = match[3].replace(/,/g, '.').trim();

            products.push({
                image: Utils.cleanImageUrl(match[1]),
                name: match[2].trim(),
                price: rawPrice, // Mode 1 giữ nguyên giá gốc
                note: globalNote || "Giá gốc" // Ưu tiên nội dung sau "价格", nếu không có thì ghi "Giá gốc"
            });
        }
        
        return products;
    }
};