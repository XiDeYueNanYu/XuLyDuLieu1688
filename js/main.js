// js/main.js
import { UIManager } from './ui-manager.js';
import { Utils } from './utils.js';
import { analyzeData, rebuildRawData } from './pre-processor.js';
import { mode1 } from './modes/mode1.js';
import { mode2 } from './modes/mode2.js';
import { mode3 } from './modes/mode3.js';
import { mode4 } from './modes/mode4.js'; // Đã import Mode 4

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

            // BƯỚC 1: Kiểm tra thiếu dữ liệu (Pre-processor)
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

            // Cập nhật lại textarea với dữ liệu đã chuẩn
            const updatedFullText = rebuildRawData(originalValue, fixedProducts);
            rawInput.value = updatedFullText;

            // BƯỚC 2: Nhận diện Mode thông minh
            const detectedId = detectModeLogic(updatedFullText);
            
            if (detectedId) {
                currentModeId = detectedId;
                UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
                UIManager.renderDynamicFields(allModes[currentModeId]);
                UIManager.showToast(`🤖 AI Nhận diện: ${allModes[currentModeId].name}`);
                
                // Thực thi xử lý
                const uiInputs = UIManager.getInputs();
                const processedProducts = allModes[currentModeId].execute(updatedFullText, uiInputs);
                renderResults(processedProducts, globalUrl);
            } else {
                UIManager.showToast("⚠️ Không khớp đặc trưng Mode nào!");
            }
        });
    }

    // --- NÚT ⚡ TỰ ĐỘNG (PASTE & RUN) ---
    if (quickProcessBtn) {
        quickProcessBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (!text.trim()) {
                    UIManager.showToast("❌ Bộ nhớ tạm trống!");
                    return;
                }
                document.getElementById('rawInput').value = text;
                autoDetectBtn.click();
            } catch (err) {
                UIManager.showToast("⚠️ Hãy cấp quyền truy cập Clipboard!");
            }
        });
    }
    
    // SỬA LỖI MODE 4: Dùng Event Delegation thay vì forEach để nút không bao giờ mất sự kiện
    const modeSelector = document.querySelector('.mode-selector');
    if (modeSelector) {
        modeSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn[data-mode]');
            if (!btn) return;
            
            const mode = btn.dataset.mode;
            if (mode && allModes[mode]) {
                currentModeId = mode;
                UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
                UIManager.renderDynamicFields(allModes[currentModeId]);
                UIManager.showToast(`Chế độ: ${allModes[mode].name}`);
            }
        });
    }
});

/**
 * HÀM NHẬN DIỆN MODE (Đưa Mode 4 lên ưu tiên)
 */
function detectModeLogic(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== "");
    
    const jgLineIndex = lines.findIndex(l => l.startsWith("价格"));
    if (jgLineIndex !== -1) {
        const lineAfterJgContent = lines[jgLineIndex + 2] || "";
        if (lineAfterJgContent.startsWith('http')) return 'mode4';
    }

    const blocks = text.split(/(?=https?:\/\/)/);
    let realMode3 = false;
    for (const b of blocks) {
        const bl = b.trim().split('\n').filter(l => l !== "");
        if (bl.length >= 3) {
            const priceLine = bl[2];
            if (priceLine.includes('【') || (priceLine.match(/¥/g) || []).length > 1) {
                realMode3 = true;
                break;
            }
        }
    }
    if (realMode3) return 'mode3';

    const jgMatch = text.match(/价格:?\s*([\s\S]*?)(?=\n\s*http|$)/);
    const jgLines = jgMatch ? jgMatch[1].trim().split('\n').filter(l => l !== "") : [];
    if (jgLines.length >= 2) return 'mode2';
    
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
 * XUẤT KẾT QUẢ VÀ TỰ ĐỘNG COPY
 */
function renderResults(products, globalUrl) {
    const uiInputs = UIManager.getInputs();
    const startNum = parseInt(uiInputs.startNumber) || 49;
    
    const outputRows = products.map((p, idx) => {
        const row = startNum + idx;
        return [
            p.name, 
            `=IMAGE(D${row})`, 
            p.image, 
            p.image, // Cột D Link ảnh
            globalUrl, 
            "999", "100", "1", 
            Utils.formatPriceVN(p.price), 
            p.note || ""
        ].map(Utils.escapeTabular).join('\t');
    });

    const finalResult = outputRows.join('\n');
    const outputBox = document.getElementById('outputBox');
    outputBox.value = finalResult;

    // Tự động cập nhật Matrix Preview dòng đầu
    if (products.length > 0) {
        const first = products[0];
        const cols = [first.name, `=IMAGE(D${startNum})`, first.image, first.image, globalUrl, "999", "100", "1", Utils.formatPriceVN(first.price), first.note];
        cols.forEach((val, i) => {
            const el = document.getElementById(`col${i+1}`);
            if (el) el.value = val;
        });
    }

    if (finalResult) {
        navigator.clipboard.writeText(finalResult).then(() => {
            UIManager.showToast(`✅ Đã xuất & Copy ${products.length} dòng!`);
        }).catch(() => {
            outputBox.select();
            document.execCommand('copy');
            UIManager.showToast(`✅ Đã xuất ${products.length} dòng!`);
        });
    }

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

/**
 * MODAL SỬA DỮ LIỆU THIẾU
 */
function showFixModal(products) {
    return new Promise((resolve) => {
        const modal = document.getElementById('fixDataModal');
        const list = document.getElementById('fixDataList');
        modal.style.display = 'flex';
        
        const headerHtml = `
            <div class="note-price-global">
                <div class="checkbox-container">
                    <input type="checkbox" id="enableGlobalNote">
                    <label for="enableGlobalNote"> Ghi chú nhanh cho giá khuyết:</label>
                </div>
                <div class="note-input-group">
                    <input type="text" id="globalNoteValue" placeholder="VD: [Chờ Mode2]...">
                </div>
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
        
        const apply = () => {
            if(gCheck.checked) {
                list.querySelectorAll('.fix-price').forEach(i => {
                    i.value = gInput.value || "[Chờ Mode2]";
                    i.dispatchEvent(new Event('input', {bubbles:true}));
                });
            }
        };
        gCheck.onchange = apply; 
        gInput.oninput = apply;

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