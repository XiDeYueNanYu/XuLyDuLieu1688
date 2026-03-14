export const Utils = {
    formatPriceVN(val) {
        if (!val) return '';
        // Loại bỏ ¥, khoảng trắng, đổi chấm thành phẩy
        return String(val).replace(/[¥\s]/g, '').replace(/\./g, ',');
    },

    cleanImageUrl(url) {
        if (!url || url.includes('[Khuyết')) return url;
        let cleanUrl = url.trim().replace(/["']/g, "");
        if (cleanUrl.startsWith('//')) cleanUrl = 'https:' + cleanUrl;
        // Bỏ các tham số ? đằng sau
        return cleanUrl.split('?')[0];
    },

    escapeTabular(cellValue) {
        let content = String(cellValue || '').trim();
        if (content.includes('\n') || content.includes('\t') || content.includes('"')) {
            return `"${content.replace(/"/g, '""')}"`;
        }
        return content;
    },

    extractGlobalUrl(text) {
        const urlMatch = text.match(/URL:\s*"([^"]+)"/i) || text.match(/URL:\s*([^\s\n]+)/i);
        return urlMatch ? urlMatch[1].trim() : "";
    }
};