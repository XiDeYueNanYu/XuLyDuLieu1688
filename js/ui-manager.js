export const UIManager = {
    init() {
        this.bindCommonEvents();
    },

    showToast(msg) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }
    },

    updateImageFormula(rowNum) {
        const col2 = document.getElementById('col2');
        if (col2) col2.value = `=IMAGE(D${rowNum})`;
    },

    bindCommonEvents() {
        const startNumInput = document.getElementById('startNumber');
        if (startNumInput) {
            startNumInput.onwheel = (e) => {
                e.preventDefault();
                let direction = e.deltaY < 0 ? 1 : -1;
                let val = parseInt(startNumInput.value) || 0;
                startNumInput.value = Math.max(1, val + direction);
                this.updateImageFormula(startNumInput.value);
            };
            startNumInput.oninput = () => this.updateImageFormula(startNumInput.value);
        }
    },

    // QUAN TRỌNG: Chỉ thay đổi vùng rỗng extraFieldsArea
    renderDynamicFields(processor) {
        const extraArea = document.getElementById('extraFieldsArea');
        if (!extraArea) return;

        let extraHtml = '';
        if (processor && processor.extraFields && processor.extraFields.length > 0) {
            extraHtml = processor.extraFields.map(field => `
                <div class="input-group-pill">
                    <label>${field.label}:</label>
                    <input type="${field.type}" id="${field.id}" value="${field.default}">
                </div>
            `).join('');
        }
        
        // Tuyệt đối không chạm vào phần nút bấm ở phía trên
        extraArea.innerHTML = extraHtml;
    },

    updateModeUI(modeId, modeName) {
        // Cập nhật class active cho nút dựa trên data-mode
        document.querySelectorAll('.mode-btn').forEach(btn => {
            if (btn.dataset.mode === modeId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const indicator = document.getElementById('modeIndicator');
        if (indicator) indicator.textContent = `Đang dùng ${modeName}`;
    }
};