// js/main.js
import { UIManager } from './ui-manager.js';
import { Utils } from './utils.js';
import { analyzeData, rebuildRawData } from './pre-processor.js';
import { mode1 } from './modes/mode1.js';
import { mode2 } from './modes/mode2.js';
import { mode3 } from './modes/mode3.js';
import { mode4 } from './modes/mode4.js'; 

const allModes = { mode1, mode2, mode3, mode4 };
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
    
    // --- EVENT DELEGATION CHO NÚT MODE ---
    const modeSelector = document.querySelector('.mode-selector');
    if (modeSelector) {
        modeSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn[data-mode]');
            if (!btn) return;
            currentModeId = btn.dataset.mode;
            UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
            UIManager.renderDynamicFields(allModes[currentModeId]);
        });
    }

    if (autoDetectBtn) {
        autoDetectBtn.addEventListener('click', async (e) => {
            if (e) e.stopPropagation(); 
            const rawInput = document.getElementById('rawInput');
            if (!rawInput.value.trim()) return UIManager.showToast("❌ Dữ liệu trống!");

            let { products, globalUrl } = analyzeData(rawInput.value);
            if (products.length === 0) return UIManager.showToast("❌ Không tìm thấy SP!");

            let fixedProducts = products.some(p => p.isMissing) ? await showFixModal(products) : products;
            if (!fixedProducts) return;

            const updatedText = rebuildRawData(rawInput.value, fixedProducts);
            rawInput.value = updatedText;

            const detectedId = detectModeLogic(updatedText);
            if (detectedId) {
                currentModeId = detectedId;
                UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
                UIManager.renderDynamicFields(allModes[currentModeId]);
                const processed = allModes[currentModeId].execute(updatedText, UIManager.getInputs());
                renderResults(processed, globalUrl);
            }
        });
    }

    if (quickProcessBtn) {
        quickProcessBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text.trim()) {
                    document.getElementById('rawInput').value = text;
                    autoDetectBtn.click();
                }
            } catch (err) { UIManager.showToast("⚠️ Lỗi Clipboard"); }
        });
    }
});

function detectModeLogic(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== "");
    const jgIdx = lines.findIndex(l => l.includes("价格"));
    if (jgIdx !== -1 && lines.length > jgIdx + 2 && lines[jgIdx + 2].startsWith('http')) return 'mode4';
    if (text.includes('【') || (text.match(/¥/g) || []).length > 5) return 'mode3';
    const jgMatch = text.match(/价格:?\s*([\s\S]*?)(?=\n\s*http|$)/);
    if (jgMatch && jgMatch[1].trim().split('\n').length >= 2) return 'mode2';
    return 'mode1';
}

/**
 * HÀM XUẤT KẾT QUẢ - ĐÚNG CẤU TRÚC 10 CỘT CŨ
 */
function renderResults(products, globalUrl) {
    const uiInputs = UIManager.getInputs();
    const startNum = parseInt(uiInputs.startNumber) || 49;
    
    const outputRows = products.map((p, idx) => {
        const row = startNum + idx;
        
        // CẤU TRÚC CHUẨN:
        // Cột 1: Tên | Cột 2: Hàm ảnh | Cột 3: Trống | Cột 4: Link ảnh | Cột 5: URL | Cột 6-8: Trống | Cột 9: Giá | Cột 10: Ghi chú
        const columns = [
            p.name,                          // 1. Tên
            `=IMAGE(D${row})`,               // 2. Hàm ảnh (phải trỏ vào cột D)
            "",                              // 3. Trống (Cột C)
            p.image,                         // 4. Link ảnh (Cột D)
            globalUrl,                       // 5. URL (Cột E)
            "",                              // 6. Trống (Cột F)
            "",                              // 7. Trống (Cột G)
            "",                              // 8. Trống (Cột H)
            Utils.formatPriceVN(p.price),    // 9. Giá (Cột I)
            p.note || ""                     // 10. Ghi chú (Cột J)
        ];
        
        return columns.map(Utils.escapeTabular).join('\t');
    });

    const finalResult = outputRows.join('\n');
    document.getElementById('outputBox').value = finalResult;

    if (finalResult) {
        navigator.clipboard.writeText(finalResult).then(() => {
            UIManager.showToast(`✅ Đã xuất & Copy ${products.length} SP!`);
        });
    }

    const startNumInput = document.getElementById('startNumber');
    if (startNumInput) startNumInput.value = startNum + products.length;
}

async function handleMainProcess() {
    const rawInput = document.getElementById('rawInput');
    let { products, globalUrl } = analyzeData(rawInput.value);
    if (products.length === 0) return;
    let fixedProducts = products.some(p => p.isMissing) ? await showFixModal(products) : products;
    if (!fixedProducts) return;
    const updatedText = rebuildRawData(rawInput.value, fixedProducts);
    rawInput.value = updatedText;
    const processed = allModes[currentModeId].execute(updatedText, UIManager.getInputs());
    renderResults(processed, globalUrl);
}

async function handleCopy() {
    const val = document.getElementById('outputBox').value;
    if (val) { await navigator.clipboard.writeText(val); UIManager.showToast("✅ Đã copy!"); }
}

function showFixModal(products) {
    return new Promise((resolve) => {
        const modal = document.getElementById('fixDataModal');
        const list = document.getElementById('fixDataList');
        modal.style.display = 'flex';
        list.innerHTML = `<div class="note-price-global"><input type="checkbox" id="enableGlobalNote"><label for="enableGlobalNote"> Ghi chú nhanh cho giá khuyết:</label><input type="text" id="globalNoteValue" placeholder="VD: [Chờ Mode2]..."></div>` + 
        products.map((p, idx) => {
            const isDone = !p.isMissing;
            return `<div class="fix-item ${isDone ? 'all-done' : ''}" data-idx="${idx}"><div class="status-icon">${isDone ? '●' : '○'}<small>${idx + 1}</small></div><div class="img-col">${p.image.includes('[Khuyết') ? '<input type="text" class="fix-img" placeholder="Link ảnh...">' : `<img src="${p.displayImage}">`}</div><div class="name-col" style="flex:1;">${p.name.includes('[Khuyết') ? `<input type="text" class="fix-name" style="width:100%" placeholder="Tên SP...">` : `<span>${p.name}</span>`}</div><div class="price-col">${p.price.includes('[Khuyết') ? '<input type="text" class="fix-price" placeholder="Giá...">' : `<span>${p.price}</span>`}</div></div>`;
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