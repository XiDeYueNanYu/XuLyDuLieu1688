import { Utils } from './utils.js';

export function analyzeData(rawText) {
    const products = [];
    // Regex tìm khối 3 dòng: Dòng 1 (Ảnh), Dòng 2 (Tên), Dòng 3 (Giá)
    const blockRegex = /(?:^|\n)(https?:\/\/|\/\/|\[Khuyết ảnh\])([^\n]*)\n([^\n]+)\n([^\n]+)(?=\n|$)/g;
    
    let match;
    while ((match = blockRegex.exec(rawText)) !== null) {
        const product = {
            image: (match[1] + match[2]).trim(),
            name: match[3].trim(),
            price: match[4].trim(),
            fullMatch: match[0].trim(), // Lưu lại để replace chính xác
            isMissing: false
        };

        if (product.image.includes('[K') || product.name.includes('[K') || product.price.includes('[K')) {
            product.isMissing = true;
        }

        product.displayImage = Utils.cleanImageUrl(product.image);
        products.push(product);
    }

    return { products, globalUrl: Utils.extractGlobalUrl(rawText) };
}

export function rebuildRawData(originalText, fixedProducts) {
    let newText = originalText;
    fixedProducts.forEach(p => {
        const newBlock = `${p.image}\n${p.name}\n${p.price}`;
        newText = newText.replace(p.fullMatch, newBlock);
    });
    return newText;
}