// BitArray for efficient bit storage
class BitArray {
    constructor(size) {
        this.size = size;
        this.words = new Uint32Array(Math.ceil(size / 32));
    }
    getBit(index) {
        const word = Math.floor(index / 32);
        const bit = index % 32;
        return (this.words[word] & (1 << bit)) !== 0;
    }
    setBit(index, value) {
        const word = Math.floor(index / 32);
        const bit = index % 32;
        if (value) {
            this.words[word] |= (1 << bit);
        } else {
            this.words[word] &= ~(1 << bit);
        }
    }
    fromBase64(base64) {
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        for (let i = 0; i < this.size; i++) {
            const byte = bytes[Math.floor(i / 8)];
            const bit = i % 8;
            this.setBit(i, (byte & (1 << bit)) !== 0);
        }
    }
}

const GRID_ROWS = 1000;
const GRID_COLS = 1000;
const CHECKBOX_COUNT = GRID_ROWS * GRID_COLS;
const CHECKBOX_SIZE = 16; // px
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;
const RENDER_BUFFER = 2; // extra rows/cols to render for smoother scrolling

const checkboxState = new BitArray(CHECKBOX_COUNT);
const grid = document.getElementById('checkbox-grid');
const viewport = document.getElementById('grid-viewport');

function renderVisibleCheckboxes() {
    // Remove all children
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    const scrollLeft = viewport.scrollLeft;
    const scrollTop = viewport.scrollTop;
    const firstCol = Math.max(0, Math.floor(scrollLeft / CHECKBOX_SIZE) - RENDER_BUFFER);
    const firstRow = Math.max(0, Math.floor(scrollTop / CHECKBOX_SIZE) - RENDER_BUFFER);
    const visibleCols = Math.ceil(VIEWPORT_WIDTH / CHECKBOX_SIZE) + 2 * RENDER_BUFFER;
    const visibleRows = Math.ceil(VIEWPORT_HEIGHT / CHECKBOX_SIZE) + 2 * RENDER_BUFFER;

    for (let row = firstRow; row < Math.min(GRID_ROWS, firstRow + visibleRows); row++) {
        for (let col = firstCol; col < Math.min(GRID_COLS, firstCol + visibleCols); col++) {
            const i = row * GRID_COLS + col;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'checkbox';
            checkbox.style.left = (col * CHECKBOX_SIZE) + 'px';
            checkbox.style.top = (row * CHECKBOX_SIZE) + 'px';
            checkbox.checked = checkboxState.getBit(i);
            checkbox.dataset.index = i;
            checkbox.addEventListener('change', (e) => {
                checkboxState.setBit(i, checkbox.checked);
                connection.invoke('ToggleCheckbox', i, checkbox.checked);
            });
            grid.appendChild(checkbox);
        }
    }
}

viewport.addEventListener('scroll', renderVisibleCheckboxes);
window.addEventListener('resize', renderVisibleCheckboxes);

// Initial render
renderVisibleCheckboxes();

// SignalR connection
const connection = new signalR.HubConnectionBuilder()
    .withUrl('/checkboxHub')
    .build();

connection.on('CheckboxToggled', (index, isChecked) => {
    checkboxState.setBit(index, isChecked);
    // Only update if the checkbox is visible
    const cb = grid.querySelector(`input[data-index='${index}']`);
    if (cb) cb.checked = isChecked;
});

connection.on('FullState', (base64) => {
    checkboxState.fromBase64(base64);
    renderVisibleCheckboxes();
});

connection.start(); 