// js/main.js
import { UIManager } from './ui-manager.js';
import { Utils } from './utils.js';
import { analyzeData, rebuildRawData } from './pre-processor.js';
import { mode1 } from './modes/mode1.js';
import { mode2 } from './modes/mode2.js';
import { mode3 } from './modes/mode3.js';

const allModes = { mode1, mode2, mode3 };
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
                UIManager.showToast("❌ Không tìm thấy khối sản phẩm 3 dòng!");
                return;
            }

            const hasMissing = products.some(p => p.isMissing);
            let fixedProducts = products;

            if (hasMissing) {
                fixedProducts = await showFixModal(products); 
                if (!fixedProducts) return; 
            }

            const updatedFullText = rebuildRawData(originalValue, fixedProducts);
            rawInput.value = updatedFullText;

            const detectedId = detectModeLogic(updatedFullText);
            
            if (detectedId) {
                currentModeId = detectedId;
                UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
                UIManager.renderDynamicFields(allModes[currentModeId]);
                UIManager.showToast(`🤖 AI Nhận diện: ${allModes[currentModeId].name}`);
                
                const uiInputs = UIManager.getInputs();
                const processedProducts = allModes[currentModeId].execute(updatedFullText, uiInputs);
                renderResults(processedProducts, globalUrl);
            } else {
                UIManager.showToast("⚠️ Không khớp Mode 1, 2, 3!");
            }
        });
    }

    // --- CẢI TIẾN: NÚT TỰ ĐỘNG (PASTE & RUN) ---
    if (quickProcessBtn) {
        quickProcessBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (!text.trim()) {
                    UIManager.showToast("❌ Clipboard trống!");
                    return;
                }
                document.getElementById('rawInput').value = text;
                // Kích hoạt nhận diện ngay lập tức
                autoDetectBtn.click();
            } catch (err) {
                UIManager.showToast("⚠️ Cần cấp quyền Clipboard!");
            }
        });
    }
    
    // Chuyển Mode thủ công
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            if (mode) {
                currentModeId = mode;
                UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
                UIManager.renderDynamicFields(allModes[currentModeId]);
            }
        });
    });
});

function detectModeLogic(text) {
    const productPrices = [];
    const blockRegex = /(?:^|\n)(https?:\/\/|\/\/|\[Khuyết ảnh\])([^\n]*)\n([^\n]+)\n([^\n]+)(?=\n|$)/g;
    
    let match;
    while ((match = blockRegex.exec(text)) !== null) {
        if (!(match[1] + match[2]).toLowerCase().includes("detail.1688.com")) {
            productPrices.push(match[4].trim()); 
        }
    }
    if (productPrices.length === 0) return null;

    let jgContent = "";
    const jgMatch = text.match(/价格:?\s*([\s\S]*?)(?=\n\s*http|$)/);
    if (jgMatch) jgContent = jgMatch[1].trim();
    const jgLines = jgContent.split('\n').filter(l => l.trim() !== "");
    const hasTildeInJG = jgContent.includes('~');

    const isAllPricesSame = productPrices.every(p => p === productPrices[0]);
    const hasBracketInPrice = productPrices.some(p => p.includes('【') && p.includes('】'));

    if (hasBracketInPrice) return 'mode3';
    if (!hasBracketInPrice && !isAllPricesSame && jgLines.length === 1 && hasTildeInJG) return 'mode1';
    if (jgLines.length >= 2 && isAllPricesSame) return 'mode2';

    return null;
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

function renderResults(products, globalUrl) {
    const uiInputs = UIManager.getInputs();
    const startNum = parseInt(uiInputs.startNumber) || 49;
    
    const outputRows = products.map((p, idx) => {
        const row = startNum + idx;
        return [
            p.name, `=IMAGE(D${row})`, p.image, "", globalUrl, "", "", "", 
            Utils.formatPriceVN(p.price), p.note || ""
        ].map(Utils.escapeTabular).join('\t');
    });

    const finalResult = outputRows.join('\n');
    document.getElementById('outputBox').value = finalResult;

    // --- TỰ ĐỘNG COPY VÀO CLIPBOARD ---
    if (finalResult) {
        navigator.clipboard.writeText(finalResult).then(() => {
            UIManager.showToast(`✅ Đã xuất & Copy ${products.length} dòng!`);
        }).catch(() => {
            document.getElementById('outputBox').select();
            document.execCommand('copy');
            UIManager.showToast(`✅ Đã xuất ${products.length} dòng!`);
        });
    }

    // Tự động tăng số dòng
    const startNumInput = document.getElementById('startNumber');
    if (startNumInput) {
        startNumInput.value = startNum + products.length;
        startNumInput.style.backgroundColor = "#dcfce7"; 
        setTimeout(() => startNumInput.style.backgroundColor = "", 1000);
    }
}

async function handleCopy() {
    const val = document.getElementById('outputBox').value;
    if (!val) return;
    await navigator.clipboard.writeText(val);
    UIManager.showToast("✅ Đã copy!");
}

function showFixModal(products) {
    return new Promise((resolve) => {
        const modal = document.getElementById('fixDataModal');
        const list = document.getElementById('fixDataList');
        modal.style.display = 'flex';
        
        const headerHtml = `<div class="note-global-area" style="background:#f8fafc; padding:15px; border-radius:12px; margin-bottom:15px; display:flex; align-items:center; gap:10px; border:1px solid #e2e8f0;"><input type="checkbox" id="enableGlobalNote"><label for="enableGlobalNote"> Ghi chú nhanh:</label><input type="text" id="globalNoteValue" list="notePresets" placeholder="Nhập..."><datalist id="notePresets"><option value="[Chờ Mode2]"><option value="[Chờ Mode3]"></datalist></div>`;
        
        list.innerHTML = headerHtml + products.map((p, idx) => {
            const isDone = !p.isMissing;
            return `<div class="fix-item ${isDone ? 'all-done' : ''}" data-idx="${idx}">
                <div class="status-icon">${isDone ? '●' : '○'}<small>${idx + 1}</small></div>
                <div class="img-col">${p.image.includes('[Khuyết') ? `<input type="text" class="fix-img" placeholder="Link ảnh...">` : `<img src="${p.displayImage}" referrerpolicy="no-referrer">`}</div>
                <div class="name-col">${p.name.includes('[Khuyết') ? `<input type="text" class="fix-name" placeholder="Tên...">` : `<span>${p.name}</span>`}</div>
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