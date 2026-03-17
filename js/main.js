// js/main.js
import { UIManager } from './ui-manager.js';
import { Utils } from './utils.js';
import { analyzeData } from './pre-processor.js';
import { mode1 } from './modes/mode1.js';
import { mode2 } from './modes/mode2.js';
import { mode3 } from './modes/mode3.js';
import { mode4 } from './modes/mode4.js';

const allModes = { mode1, mode2, mode3, mode4 };
let currentModeId = 'mode1';

document.addEventListener('DOMContentLoaded', () => {
    UIManager.init();
    
    document.getElementById('processBtn').onclick = handleMainProcess;
    
    // Nút "Tự Động Paste & Run" (quickProcessBtn)
    const quickBtn = document.getElementById('quickProcessBtn');
    if (quickBtn) {
        quickBtn.onclick = async () => {
            const text = await navigator.clipboard.readText();
            document.getElementById('rawInput').value = text;
            // Bước 1: Nhận diện mode
            detectModeLogic(text); 
            // Bước 2: Chạy xử lý ngay
            handleMainProcess();
        };
    }

    // Các sự kiện chọn Mode thủ công
    document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
        btn.onclick = (e) => {
            currentModeId = e.target.dataset.mode;
            UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
            UIManager.renderDynamicFields(allModes[currentModeId]);
        };
    });
});

async function handleMainProcess() {
    const rawInput = document.getElementById('rawInput');
    const text = rawInput.value.trim();
    if (!text) return;

    // 1. Lấy Global URL từ dòng "URL: ..."
    const globalUrl = Utils.extractGlobalUrl(text);

    // 2. Chạy Mode (Dù là Mode nào, ta cũng sẽ hậu xử lý lỗi)
    const inputs = UIManager.getInputs();
    let products = allModes[currentModeId].execute(text, inputs);

    // 3. LOGIC CẢI TIẾN: Kiểm tra cụm [Khuyết...] và ghi đè Cảnh báo
    const finalProducts = products.map(p => {
        const isImgErr = !p.image || p.image.includes('[Khuyết');
        const isNameErr = !p.name || p.name.includes('[Khuyết');
        const isPriceErr = !p.price || String(p.price).includes('[Khuyết');

        return {
            ...p,
            image: isImgErr ? "⚠️ THIẾU ẢNH" : p.image,
            name: isNameErr ? "⚠️ KIỂM TRA THỦ CÔNG (Tên)" : p.name,
            // Nếu khuyết giá, để chữ để Excel không tính toán sai
            price: isPriceErr ? "KIỂM TRA THỦ CÔNG" : p.price, 
            note: (isImgErr || isNameErr || isPriceErr) ? "Dữ liệu thiếu" : p.note
        };
    });

    renderResults(finalProducts, globalUrl);
    UIManager.showToast(`✅ Đã xuất ${finalProducts.length} sản phẩm`);
}

function renderResults(products, globalUrl) {
    const startNum = parseInt(document.getElementById('startNumber').value) || 1;
    let output = "";

    products.forEach((p, index) => {
        const currentRow = startNum + index;
        const imgFormula = `=IMAGE(D${currentRow})`;
        
        // Dùng Utils để format nếu là số, nếu là chữ "KIỂM TRA..." thì giữ nguyên
        const displayPrice = isNaN(parseFloat(String(p.price).replace(/[¥,]/g, ''))) 
                             ? p.price 
                             : Utils.formatPriceVN(p.price);

        const rowData = [
            p.name,
            imgFormula,
            p.image,
            globalUrl,
            displayPrice,
            p.note
        ];
        output += rowData.join('\t') + '\n';
    });

    const outputBox = document.getElementById('outputBox');
    outputBox.value = output;
    navigator.clipboard.writeText(output);
}

function detectModeLogic(text) {
    // Nếu dữ liệu có cụm "[Khuyết giá]" thì khả năng cao là Mode 1 (lấy trực tiếp) 
    // vì Mode 2 sẽ luôn cố điền giá thấp nhất vào chỗ đó.
    if (text.includes("[Khuyết giá]")) {
        currentModeId = 'mode1';
    } else if (text.includes("价格") && text.match(/¥[\d.,\s]+\nhttps?:\/\//)) {
        currentModeId = 'mode4';
    } else if (text.includes("◤") || text.includes("◥")) {
        currentModeId = 'mode3';
    } else if (text.includes("价格")) {
        currentModeId = 'mode2';
    } else {
        currentModeId = 'mode1';
    }

    UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
    UIManager.renderDynamicFields(allModes[currentModeId]);
}