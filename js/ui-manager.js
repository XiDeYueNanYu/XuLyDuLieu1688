// js/ui-manager.js

export const UIManager = {
    init() {
        this.bindCommonEvents();
    },

    showToast(msg) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    },

    updateImageFormula(rowNum) {
        const col2 = document.getElementById('col2');
        if (col2) {
            col2.value = `=IMAGE(D${rowNum})`;
        }
    },

    bindCommonEvents() {
        const startNumInput = document.getElementById('startNumber');
        if (!startNumInput) return;
        
        startNumInput.onwheel = (e) => {
            e.preventDefault();
            let direction = e.deltaY < 0 ? 1 : -1;
            let val = parseInt(startNumInput.value) || 0;
            startNumInput.value = Math.max(1, val + direction);
        };
    },

    // Quan trọng: Hàm render lại khu vực nhập liệu động cho từng Mode
    renderDynamicFields(modeConfig) {
        const container = document.getElementById('extraFieldsArea');
        if (!container) return;

        if (!modeConfig.extraFields || modeConfig.extraFields.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = modeConfig.extraFields.map(field => `
            <div class="input-group-pill">
                <label>${field.label}:</label>
                <input type="${field.type}" id="${field.id}" value="${field.default}">
            </div>
        `).join('');
    },

    // Cập nhật trạng thái Active để nút Mode 4 sáng lên khi chọn
    updateModeUI(modeId, modeName) {
        const buttons = document.querySelectorAll('.mode-btn[data-mode]');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === modeId);
        });

        const indicator = document.getElementById('modeIndicator');
        if (indicator) {
            indicator.textContent = `Đang dùng ${modeName}`;
        }
    },

    getInputs() {
        const startInput = document.getElementById('startNumber');
        const defaultPriceInput = document.getElementById('defaultPrice');

        const inputs = {
            startNumber: startInput ? (parseInt(startInput.value) || 49) : 49,
            defaultPrice: defaultPriceInput ? (parseFloat(defaultPriceInput.value) || 0) : 0,
            extras: {}
        };

        const extraContainer = document.getElementById('extraFieldsArea');
        if (extraContainer) {
            const extraInputs = extraContainer.querySelectorAll('input');
            extraInputs.forEach(input => {
                inputs.extras[input.id] = input.type === 'number' ? parseFloat(input.value) : input.value;
            });
        }
        return inputs;
    }
};