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
    UIManager.renderDynamicFields(allModes[currentModeId]);

    // Gán sự kiện cho các nút chức năng
    const processBtn = document.getElementById('processBtn');
    const copyBtn = document.getElementById('copyBtn');
    const autoDetectBtn = document.getElementById('autoDetectBtn');
    const quickProcessBtn = document.getElementById('quickProcessBtn');

    if (processBtn) processBtn.onclick = handleMainProcess;
    if (copyBtn) copyBtn.onclick = handleCopy;
    
    if (autoDetectBtn) {
        autoDetectBtn.onclick = (e) => {
            if (e) e.stopPropagation();
            detectModeLogic();
            UIManager.showToast("✨ Đã tự động chọn " + allModes[currentModeId].name);
        };
    }

    if (quickProcessBtn) {
        quickProcessBtn.onclick = async () => {
            try {
                const text = await navigator.clipboard.readText();
                document.getElementById('rawInput').value = text;
                detectModeLogic();
                handleMainProcess(); // Chạy luôn sau khi dán
            } catch (err) {
                UIManager.showToast("❌ Không thể đọc Clipboard!");
            }
        };
    }

    // Xử lý chuyển đổi Mode từ giao diện
    document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
        btn.onclick = (e) => {
            currentModeId = e.target.dataset.mode;
            UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
            UIManager.renderDynamicFields(allModes[currentModeId]);
        };
    });
});

/**
 * LOGIC ĐIỀU PHỐI CHÍNH
 * Thay thế hoàn toàn cơ chế showFixModal bằng cơ chế Silent Warning
 */
async function handleMainProcess() {
    const rawInput = document.getElementById('rawInput');
    const text = rawInput.value.trim();
    if (!text) return UIManager.showToast("❌ Dữ liệu trống!");

    // 1. Lấy thông tin cơ bản từ pre-processor
    // Lấy được globalUrl từ dòng "URL: ..." và danh sách SP thô
    const { products: rawProducts, globalUrl } = analyzeData(text);

    // 2. Chạy Mode để bóc tách sâu hơn theo kịch bản đã chọn
    const inputs = UIManager.getInputs();
    const modeResults = allModes[currentModeId].execute(text, inputs);

    // 3. KIỂM TRA THIẾU HỤT & GÁN NHÃN (Thay vì hiện Modal)
    // Chúng ta quét qua kết quả của Mode, nếu có nhãn "[Khuyết...]" thì chuyển đổi
    const finalProducts = modeResults.map(p => {
        const isImgErr = !p.image || p.image.includes('[Khuyết');
        const isNameErr = !p.name || p.name.includes('[Khuyết');
        const isPriceErr = !p.price || String(p.price).includes('[Khuyết');

        if (isImgErr || isNameErr || isPriceErr) {
            return {
                ...p,
                image: isImgErr ? "⚠️ THIẾU ẢNH" : p.image,
                name: isNameErr ? "⚠️ KIỂM TRA THỦ CÔNG (Tên)" : p.name,
                price: isPriceErr ? "KIỂM TRA THỦ CÔNG" : p.price,
                note: "Dữ liệu thiếu - Vui lòng check Link tổng"
            };
        }
        return p;
    });

    if (finalProducts.length === 0) return UIManager.showToast("❌ Không bóc tách được SP!");

    // 4. Render thẳng ra kết quả cuối cùng
    renderResults(finalProducts, globalUrl);
    UIManager.showToast(`✅ Đã xuất ${finalProducts.length} sản phẩm`);
}

/**
 * XUẤT DỮ LIỆU RA TEXTAREA THEO ĐỊNH DẠNG TAB (EXCEL)
 */
function renderResults(products, globalUrl) {
    const startNum = parseInt(document.getElementById('startNumber').value) || 1;
    let output = "";

    products.forEach((p, index) => {
        const currentRow = startNum + index;
        // Công thức ảnh lấy Link từ cột C (Dòng thứ 3 trong rowData)
        const imgFormula = `=IMAGE(D${currentRow})`;
        
        // Kiểm tra định dạng giá: Nếu là chữ (cảnh báo) thì giữ nguyên, nếu số thì format
        const displayPrice = isNaN(parseFloat(p.price)) ? p.price : Utils.formatPriceVN(p.price);

        const rowData = [
            p.name,           // Cột A: Tên
            imgFormula,       // Cột B: Công thức
            p.image,          // Cột C: Link ảnh
            globalUrl,        // Cột D: Link tổng
            displayPrice,     // Cột E: Giá
            p.note            // Cột F: Ghi chú
        ];
        
        output += rowData.join('\t') + '\n';
    });

    const outputBox = document.getElementById('outputBox');
    outputBox.value = output;
    navigator.clipboard.writeText(output);
}

/**
 * TỰ ĐỘNG NHẬN DIỆN MODE DỰA TRÊN NỘI DUNG
 */
function detectModeLogic() {
    const text = document.getElementById('rawInput').value;
    let detectedId = 'mode1';

    if (text.includes("价格") && text.match(/¥[\d.,\s]+\nhttps?:\/\//)) {
        detectedId = 'mode4';
    } else if (text.includes("◤") || text.includes("◥")) {
        detectedId = 'mode3';
    } else if (text.includes("价格")) {
        detectedId = 'mode2';
    }

    currentModeId = detectedId;
    UIManager.updateModeUI(currentModeId, allModes[currentModeId].name);
    UIManager.renderDynamicFields(allModes[currentModeId]);
}

function handleCopy() {
    const outputBox = document.getElementById('outputBox');
    outputBox.select();
    document.execCommand('copy');
    UIManager.showToast("📋 Đã sao chép vào bộ nhớ tạm!");
}