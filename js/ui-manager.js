/**
 * UI Manager - Quản lý toàn bộ giao diện và tương tác người dùng
 */

export const UIManager = {
    // Khởi tạo các sự kiện cơ bản
    init() {
        this.bindCommonEvents();
    },

    // Hiển thị thông báo Toast
    showToast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    },

    // Cập nhật công thức ảnh khi dòng bắt đầu thay đổi
    updateImageFormula(rowNum) {
        const col2 = document.getElementById('col2');
        if (col2) {
            col2.value = `=IMAGE(D${rowNum})`;
        }
    },

    // Lắng nghe các sự kiện tĩnh trên giao diện
    bindCommonEvents() {
        const startNumInput = document.getElementById('startNumber');
        
        // Sự kiện cuộn chuột để tăng/giảm số dòng
        startNumInput.addEventListener('wheel', (e) => {
            e.preventDefault();
            let direction = e.deltaY < 0 ? 1 : -1;
            let val = parseInt(startNumInput.value) || 0;
            startNumInput.value = val + direction;
            this.updateImageFormula(startNumInput.value);
        }, { passive: false });

        // Cập nhật công thức khi gõ số trực tiếp
        startNumInput.addEventListener('input', () => {
            this.updateImageFormula(startNumInput.value);
        });
    },

    /**
     * Render các ô nhập liệu đặc thù cho từng MODE
     * @param {Object} processor - Đối tượng mode đang được chọn
     */
    renderDynamicFields(processor) {
        const container = document.getElementById('dynamicFields');
        
        // Giữ lại 2 ô mặc định (Dòng đầu và Giá mặc định)
        // Lưu ý: Trong index.html bạn nên đặt class 'default-field' cho 2 ô này để dễ quản lý
        const defaultFields = `
            <div class="input-group-pill" title="Cuộn chuột để chỉnh dòng">
                <label>🔢 Dòng đầu:</label>
                <input type="number" id="startNumber" value="${document.getElementById('startNumber').value}">
            </div>
            <div class="input-group-pill">
                <label>💰 Giá mặc định:</label>
                <input type="number" id="defaultPrice" value="${document.getElementById('defaultPrice').value}">
            </div>
        `;

        let extraHtml = '';
        if (processor.extraFields) {
            extraHtml = processor.extraFields.map(field => `
                <div class="input-group-pill">
                    <label>${field.label}:</label>
                    <input type="${field.type}" id="${field.id}" value="${field.default}">
                </div>
            `).join('');
        }

        container.innerHTML = defaultFields + extraHtml;
        
        // Sau khi render lại, phải gán lại sự kiện wheel cho ô startNumber mới
        this.bindCommonEvents();
    },

    // Cập nhật trạng thái Active trên các nút Mode
    updateModeUI(modeId, modeName) {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === modeId);
        });
        document.getElementById('modeIndicator').textContent = `Đang dùng ${modeName}`;
    },

    // Lấy toàn bộ dữ liệu từ các ô input (cả mặc định và động)
    getInputs() {
        const inputs = {
            startNumber: parseInt(document.getElementById('startNumber').value) || 49,
            defaultPrice: parseFloat(document.getElementById('defaultPrice').value) || 0,
            // Tự động gom các input động khác nếu có
            extras: {}
        };

        // Tìm tất cả input trong dynamicFields mà không phải 2 ô mặc định
        const extraInputs = document.querySelectorAll('#dynamicFields input:not(#startNumber):not(#defaultPrice)');
        extraInputs.forEach(input => {
            inputs.extras[input.id] = input.type === 'number' ? parseFloat(input.value) : input.value;
        });

        return inputs;
    }
};