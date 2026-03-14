// js/main.js
import { UIManager } from './ui-manager.js';
import { Utils } from './utils.js';
import { analyzeData, rebuildRawData } from './pre-processor.js';
import { mode1 } from './modes/mode1.js';
import { mode2 } from './modes/mode2.js';
import { mode3 } from './modes/mode3.js';
import { mode4 } from './modes/mode4.js'; // 1. Import thêm Mode 4

const allModes = { mode1, mode2, mode3, mode4 }; // 2. Thêm vào danh sách
let currentModeId = 'mode1';

document.addEventListener('DOMContentLoaded', () => {
    UIManager.init();
    UIManager.renderDynamicFields(allModes[currentModeId]);

    const processBtn = document.getElementById('processBtn');
    const copyBtn = document.getElementById('copyBtn');
    const autoDetectBtn = document.getElementById('autoDetectBtn');
    const quickProcessBtn = document.getElementById('quickProcessBtn');

    if (processBtn) processBtn.addEventListener('click', handleMainProcess);
    if (copyBtn) copyBtn.addEventListener('click', handleCopy);
    
    // --- NÚT TỰ ĐỘNG NHẬN DIỆN ---
    if (autoDetectBtn) {
        autoDetectBtn.addEventListener('click', async (e) => {
            if (e) e.stopPropagation(); 
            const rawInput = document.getElementById('rawInput');
            const originalValue = rawInput.value;

            if (!originalValue.trim()) {
                UIManager.showToast("❌ Dữ liệu trống!");
                return;
            }

            let { products, globalUrl } = analyzeData(originalValue);
            if (products.length === 0) {
                UIManager.showToast("❌ Không tìm thấy SP!");
                return;
            }

            // Xử lý thiếu dữ liệu bằng Modal gốc của bạn
            let fixedProducts = products.some(p => p.isMissing) ? await showFixModal(products) : products;
            if (!fixedProducts) return;

            const updatedFullText = rebuildRawData(originalValue, fixedProducts);
            rawInput.value = updatedFullText;

            // Nhận diện Mode thông minh
            const detectedId = detectModeLogic(updatedFullText);
            if (detectedId) {
                currentModeId = detectedId;
                UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
                UIManager.renderDynamicFields(allModes[currentModeId]);
                UIManager.showToast(`🤖 AI Nhận diện: ${allModes[currentModeId].name}`);
                
                const uiInputs = UIManager.getInputs();
                const processedProducts = allModes[currentModeId].execute(updatedFullText, uiInputs);
                renderResults(processedProducts, globalUrl);
            }
        });
    }

    // --- NÚT ⚡ TỰ ĐỘNG (PASTE & RUN) ---
    if (quickProcessBtn) {
        quickProcessBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text.trim()) {
                    document.getElementById('rawInput').value = text;
                    autoDetectBtn.click();
                }
            } catch (err) { UIManager.showToast("⚠️ Lỗi truy cập Clipboard"); }
        });
    }

    // --- SỬA LỖI MẤT NÚT MODE 4 (Dùng Event Delegation) ---
    const modeSelector = document.querySelector('.mode-selector');
    if (modeSelector) {
        modeSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn[data-mode]');
            if (!btn) return;
            
            const mode = btn.dataset.mode;
            if (allModes[mode]) {
                currentModeId = mode;
                UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
                UIManager.renderDynamicFields(allModes[currentModeId]);
            }
        });
    }
});

/**
 * LOGIC NHẬN DIỆN (Đã thêm Mode 4 làm ưu tiên)
 */
function detectModeLogic(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== "");
    
    // Ưu tiên 1: Mode 4 (Cụm giá 2 dòng đặc trưng)
    const jgIdx = lines.findIndex(l => l.startsWith("价格"));
    if (jgIdx !== -1) {
        const lineAfterJgContent = lines[jgIdx + 2] || "";
        if (lineAfterJgContent.startsWith('http')) return 'mode4';
    }

    // Ưu tiên 2: Mode 3 (Có ngoặc ◤ ◥ hoặc nhiều dấu ¥ ở dòng giá)
    const blocks = text.split(/(?=https?:\/\/)/);
    for (const b of blocks) {
        const bl = b.trim().split('\n').filter(l => l !== "");
        if (bl.length >= 3) {
            const priceLine = bl[2];
            if (priceLine.includes('◤') || (priceLine.match(/¥/g) || []).length > 1) return 'mode3';
        }
    }

    // Ưu tiên 3: Mode 2
    const jgMatch = text.match(/价格:?\s*([\s\S]*?)(?=\n\s*http|$)/);
    if (jgMatch && jgMatch[1].trim().split('\n').filter(l => l !== "").length >= 2) return 'mode2';

    return 'mode1';
}

async function handleMainProcess() {
    const rawInput = document.getElementById('rawInput');
    let { products, globalUrl } = analyzeData(rawInput.value);
    if (products.length === 0) return UIManager.showToast("❌ Không tìm thấy SP!");

    let fixedProducts = products.some(p => p.isMissing) ? await showFixModal(products) : products;
    if (!fixedProducts) return;

    const updatedText = rebuildRawData(rawInput.value, fixedProducts);
    rawInput.value = updatedText;
    
    const processed = allModes[currentModeId].execute(updatedText, UIManager.getInputs());
    renderResults(processed, globalUrl);
}

/**
 * XUẤT KẾT QUẢ & AUTO COPY (Giữ nguyên logic của bạn)
 */
function renderResults(products, globalUrl) {
    const uiInputs = UIManager.getInputs();
    const startNum = parseInt(uiInputs.startNumber) || 49;
    
    const outputRows = products.map((p, idx) => {
        const row = startNum + idx;
        return [
            p.name, `=IMAGE(D${row})`, p.image, "",
            globalUrl, "", "", "", 
            Utils.formatPriceVN(p.price), p.note || ""
        ].map(Utils.escapeTabular).join('\t');
    });

    const finalResult = outputRows.join('\n');
    document.getElementById('outputBox').value = finalResult;

    if (finalResult) {
        navigator.clipboard.writeText(finalResult).then(() => {
            UIManager.showToast(`✅ Đã xuất & Copy ${products.length} dòng!`);
        });
    }

    // Tự động tăng số dòng
    const startNumInput = document.getElementById('startNumber');
    if (startNumInput) startNumInput.value = startNum + products.length;
}

async function handleCopy() {
    const val = document.getElementById('outputBox').value;
    if (val) {
        await navigator.clipboard.writeText(val);
        UIManager.showToast("✅ Đã copy!");
    }
}

/**
 * MODAL SỬA LỖI (Giữ nguyên 100% bản gốc của bạn)
 */
function showFixModal(products) {
    return new Promise((resolve) => {
        const modal = document.getElementById('fixDataModal');
        const list = document.getElementById('fixDataList');
        modal.style.display = 'flex';
        
        const headerHtml = `
            <div class="note-price-global">
                <input type="checkbox" id="enableGlobalNote">
                <label for="enableGlobalNote"> Ghi chú nhanh cho giá khuyết:</label>
                <input type="text" id="globalNoteValue" placeholder="VD: [Chờ Mode2]...">
            </div>`;
        
        list.innerHTML = headerHtml + products.map((p, idx) => {
            const isDone = !p.isMissing;
            return `
            <div class="fix-item ${isDone ? 'all-done' : ''}" data-idx="${idx}">
                <div class="status-icon">${isDone ? '●' : '○'}<small>${idx + 1}</small></div>
                <div class="img-col">${p.image.includes('[Khuyết') ? `<input type="text" class="fix-img" placeholder="Link ảnh...">` : `<img src="${p.displayImage}">`}</div>
                <div class="name-col" style="flex:1;">${p.name.includes('[Khuyết') ? `<input type="text" class="fix-name" style="width:100%" placeholder="Tên SP...">` : `<span>${p.name}</span>`}</div>
                <div class="price-col">${p.price.includes('[Khuyết') ? `<input type="text" class="fix-price" placeholder="Giá...">` : `<span>${p.price}</span>`}</div>
            </div>`;
        }).join('');

        const gCheck = document.getElementById('enableGlobalNote');
        const gInput = document.getElementById('globalNoteValue');
        const apply = () => { if(gCheck.checked) list.querySelectorAll('.fix-price').forEach(i => { i.value = gInput.value || "[Chờ Mode2]"; i.dispatchEvent(new Event('input', {bubbles:true})); })};
        gCheck.onchange = apply; gInput.oninput = apply;

        list.querySelectorAll('input').forEach(input => {
            input.oninput = (e) => {
                const row = e.target.closest('.fix-item');
                const p = products[row.dataset.idx];
                if (input.classList.contains('fix-img')) p.image = input.value || "[Khuyết ảnh]";
                if (input.classList.contains('fix-name')) p.name = input.value || "[Khuyết danh]";
                if (input.classList.contains('fix-price')) p.price = input.value || "[Khuyết giá]";
                const done = !p.image.includes('[K') && !p.name.includes('[K') && !p.price.includes('[K');
                p.isMissing = !done;
                row.classList.toggle('all-done', done);
                row.querySelector('.status-icon').innerHTML = `${done ? '●' : '○'}<small>${parseInt(row.dataset.idx)+1}</small>`;
            };
        });

        document.getElementById('submitFixBtn').onclick = () => { modal.style.display = 'none'; resolve(products); };
        document.getElementById('cancelFixBtn').onclick = () => { modal.style.display = 'none'; resolve(null); };
    });
}