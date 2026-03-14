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

    if (processBtn) processBtn.addEventListener('click', handleMainProcess);
    if (copyBtn) copyBtn.addEventListener('click', handleCopy);
    
    // --- NÚT TỰ ĐỘNG NHẬN DIỆN (LUỒNG MỚI) ---
    if (autoDetectBtn) {
        autoDetectBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); 
            const rawInput = document.getElementById('rawInput');
            const originalValue = rawInput.value;

            if (!originalValue.trim()) {
                UIManager.showToast("❌ Dữ liệu trống!");
                return;
            }

            // BƯỚC 1: Kiểm tra và bắt bổ sung dữ liệu trước
            let { products, globalUrl } = analyzeData(originalValue);
            if (products.length === 0) {
                UIManager.showToast("❌ Không tìm thấy khối sản phẩm 3 dòng!");
                return;
            }

            const hasMissing = products.some(p => p.isMissing);
            let fixedProducts = products;

            if (hasMissing) {
                fixedProducts = await showFixModal(products); 
                if (!fixedProducts) return; // Người dùng hủy
            }

            // BƯỚC 2: Cập nhật lại dữ liệu thô đã được "lấp đầy"
            const updatedFullText = rebuildRawData(originalValue, fixedProducts);
            rawInput.value = updatedFullText;

            // BƯỚC 3: Bây giờ mới thực hiện nhận diện Mode trên dữ liệu đã chuẩn
            const detectedId = detectModeLogic(updatedFullText);
            
            if (detectedId) {
                currentModeId = detectedId;
                UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
                UIManager.renderDynamicFields(allModes[currentModeId]);
                UIManager.showToast(`🤖 AI Nhận diện: ${allModes[currentModeId].name}`);
                
                // Thực thi xử lý cuối cùng
                const uiInputs = UIManager.getInputs();
                const processedProducts = allModes[currentModeId].execute(updatedFullText, uiInputs);
                renderResults(processedProducts, globalUrl);
            } else {
                UIManager.showToast("⚠️ Dữ liệu đã đủ nhưng không khớp Mode 1, 2, 3!");
            }
        });
    }
    
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

/**
 * LOGIC NHẬN DIỆN STRICT (AND CONDITIONS)
 */
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

    // Phân tích cụm "价格"
    let jgContent = "";
    const jgMatch = text.match(/价格:?\s*([\s\S]*?)(?=\n\s*http|$)/);
    if (jgMatch) jgContent = jgMatch[1].trim();
    const jgLines = jgContent.split('\n').filter(l => l.trim() !== "");
    const hasTildeInJG = jgContent.includes('~');

    const isAllPricesSame = productPrices.every(p => p === productPrices[0]);
    const hasBracketInPrice = productPrices.some(p => p.includes('【') && p.includes('】'));

    // --- MODE 3 ---
    if (hasBracketInPrice) return 'mode3';

    // --- MODE 1 (STRICT AND) ---
    if (!hasBracketInPrice && !isAllPricesSame && jgLines.length === 1 && hasTildeInJG) {
        return 'mode1';
    }

    // --- MODE 2 ---
    if (jgLines.length >= 2 && isAllPricesSame) {
        return 'mode2';
    }

    return null;
}

/**
 * XỬ LÝ KHI NHẤN NÚT "XỬ LÝ & XUẤT" THỦ CÔNG
 */
async function handleMainProcess() {
    try {
        const rawInput = document.getElementById('rawInput');
        const originalValue = rawInput.value;
        let { products, globalUrl } = analyzeData(originalValue);

        if (products.length === 0) {
            UIManager.showToast("❌ Không tìm thấy sản phẩm!");
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
        
        const uiInputs = UIManager.getInputs();
        const processedProducts = allModes[currentModeId].execute(updatedFullText, uiInputs);
        renderResults(processedProducts, globalUrl);
    } catch (error) {
        console.error(error);
        UIManager.showToast("💥 Lỗi xử lý!");
    }
}

// Các hàm bổ trợ giữ nguyên
// js/main.js

// ... (giữ nguyên phần trên)

function renderResults(products, globalUrl) {
    const uiInputs = UIManager.getInputs();
    const startNum = parseInt(uiInputs.startNumber) || 49;
    
    const outputRows = products.map((p, idx) => {
        const currentRow = startNum + idx;
        return [
            p.name,                                     
            `=IMAGE(D${currentRow})`,                   
            p.image,                                    
            "",                                         
            globalUrl,                                  
            "",                                         
            "",                                         
            "",                                         
            Utils.formatPriceVN(p.price),               
            p.note || ""                                
        ].map(Utils.escapeTabular).join('\t');
    });

    const finalOutput = outputRows.join('\n');
    document.getElementById('outputBox').value = finalOutput;
    
    // --- CẢI TIẾN: TỰ ĐỘNG COPY VÀO BỘ NHỚ TẠM ---
    if (finalOutput) {
        navigator.clipboard.writeText(finalOutput).then(() => {
            UIManager.showToast(`✅ Đã xuất & Tự động Copy ${products.length} dòng!`);
        }).catch(err => {
            // Fallback nếu trình duyệt chặn clipboard API tự động
            const outputBox = document.getElementById('outputBox');
            outputBox.select();
            document.execCommand('copy');
            UIManager.showToast(`✅ Đã xuất ${products.length} dòng!`);
        });
    }

    // --- CẢI TIẾN: TỰ ĐỘNG ĐẨY SỐ DÒNG LÊN CHO LẦN SAU ---
    const nextRowNumber = startNum + products.length;
    const startNumInput = document.getElementById('startNumber');
    if (startNumInput) {
        startNumInput.value = nextRowNumber;
        startNumInput.style.backgroundColor = "#dcfce7"; 
        setTimeout(() => {
            startNumInput.style.backgroundColor = ""; 
        }, 1000);
    }
}
async function handleCopy() {
    const outputBox = document.getElementById('outputBox');
    if (!outputBox.value) return;
    try { await navigator.clipboard.writeText(outputBox.value); UIManager.showToast("✅ Đã copy!"); }
    catch (err) { outputBox.select(); document.execCommand('copy'); }
}

function showFixModal(products) {
    return new Promise((resolve) => {
        const modal = document.getElementById('fixDataModal');
        const list = document.getElementById('fixDataList');
        modal.style.display = 'flex';
        const headerHtml = `<div class="note-global-area" style="background:#f8fafc; padding:15px; border-radius:12px; margin-bottom:15px; display:flex; align-items:center; gap:10px; border:1px solid #e2e8f0;"><input type="checkbox" id="enableGlobalNote" style="width:20px; height:20px; cursor:pointer;"><label for="enableGlobalNote" style="font-weight:bold; cursor:pointer; color:#1e293b;"> Ghi chú nhanh:</label><input type="text" id="globalNoteValue" list="notePresets" placeholder="Nhập..." style="flex:1; padding:8px; border-radius:8px; border:1px solid #cbd5e1;"><datalist id="notePresets"><option value="[Chờ Mode2]"><option value="[Chờ Mode3]"></datalist></div>`;
        const itemsHtml = products.map((p, idx) => {
            const isDone = !p.isMissing;
            return `<div class="fix-item ${isDone ? 'all-done' : ''}" data-idx="${idx}"><div class="status-icon ${isDone ? 'status-v' : 'status-x'}">${isDone ? '●' : '○'}<small style="display:block; font-size:10px;">${idx + 1}</small></div><div class="img-col">${p.image.includes('[Khuyết') ? `<input type="text" placeholder="Dán link ảnh..." class="fix-img">` : `<img src="${p.displayImage}" referrerpolicy="no-referrer" onerror="this.src='https://placehold.co/80?text=Lỗi+Ảnh'">`}</div><div class="name-col">${p.name.includes('[Khuyết') ? `<input type="text" placeholder="Tên SP..." class="fix-name">` : `<span>${p.name}</span>`}</div><div class="price-col">${p.price.includes('[Khuyết') ? `<input type="text" placeholder="Giá..." class="fix-price">` : `<span>${p.price}</span>`}</div></div>`;
        }).join('');
        list.innerHTML = headerHtml + itemsHtml;
        const gCheck = document.getElementById('enableGlobalNote');
        const gInput = document.getElementById('globalNoteValue');
        const applyNote = () => { if (gCheck.checked) { const noteVal = gInput.value || "[Chờ Mode2]"; list.querySelectorAll('.fix-price').forEach(input => { if (!input.value || input.value.includes('[Khuyết')) { input.value = noteVal; input.dispatchEvent(new Event('input', { bubbles: true })); } }); } };
        gCheck.onchange = applyNote; gInput.oninput = applyNote;
        list.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const row = e.target.closest('.fix-item'); const idx = row.dataset.idx; const p = products[idx]; const val = e.target.value.trim();
                if (input.classList.contains('fix-img')) p.image = val || "[Khuyết ảnh]";
                if (input.classList.contains('fix-name')) p.name = val || "[Khuyết danh]";
                if (input.classList.contains('fix-price')) p.price = val || "[Khuyết giá]";
                const done = !p.image.includes('[K') && !p.name.includes('[K') && !p.price.includes('[K');
                p.isMissing = !done; row.querySelector('.status-icon').innerHTML = `${done ? '●' : '○'} <small style="display:block; font-size:10px;">${parseInt(idx)+1}</small>`; row.classList.toggle('all-done', done);
            });
        });
        document.getElementById('submitFixBtn').onclick = () => { modal.style.display = 'none'; resolve(products); };
        document.getElementById('cancelFixBtn').onclick = () => { modal.style.display = 'none'; resolve(null); };
    });
}