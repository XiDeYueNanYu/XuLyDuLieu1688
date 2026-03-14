// js/modes/mode4.js
import { Utils } from '../utils.js';

export const mode4 = {
    id: 'mode4',
    name: 'MODE 4 (Cụm giá 2 dòng)',
    extraFields: [],
    execute: (cleanedText, inputs) => {
        const products = [];
        const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => l !== "");
        
        let globalNote = "";
        const jgIdx = lines.findIndex(l => l.includes("价格"));
        if (jgIdx !== -1 && lines.length > jgIdx + 1) {
            globalNote = (lines[jgIdx] + " " + lines[jgIdx+1]).trim();
        }

        const productRegex = /(https?:\/\/[^\s]+)\n([^\n]+)\n¥([\d.,\s]+)/g;
        let match;
        while ((match = productRegex.exec(cleanedText)) !== null) {
            if (match[1].includes("detail.1688.com")) continue;
            products.push({
                image: Utils.cleanImageUrl(match[1]),
                name: match[2].trim(),
                price: match[3].replace(/,/g, '.').trim(),
                note: globalNote
            });
        }
        return products;
    }
};