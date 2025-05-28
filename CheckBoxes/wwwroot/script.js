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
    // Load from a base64 string
    fromBase64(base64) {
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        for (let i = 0; i < this.size; i++) {
            const byte = bytes[Math.floor(i / 8)];
            const bit = i % 8;
            this.setBit(i, (byte & (1 << bit)) !== 0);
        }
    }
}

// Grid and rendering parameters
const GRID_ROWS = 1000;
const GRID_COLS = 1000;
const CHECKBOX_COUNT = GRID_ROWS * GRID_COLS;
const CHECKBOX_SIZE = 16; // px
const RENDER_BUFFER = 2; // extra rows/cols to render for smoother scrolling

const checkboxState = new BitArray(CHECKBOX_COUNT);
const grid = document.getElementById('checkbox-grid');
const viewport = document.getElementById('grid-viewport');

// Throttle rendering to animation frames
let renderScheduled = false;
function scheduleRender() {
    if (!renderScheduled) {
        renderScheduled = true;
        requestAnimationFrame(() => {
            renderVisibleCheckboxes();
            renderScheduled = false;
        });
    }
}

// Calculate the maximum number of checkboxes that can be visible at once (plus buffer)
function getMaxVisible() {
    const cols = Math.ceil(viewport.clientWidth / CHECKBOX_SIZE) + 2 * RENDER_BUFFER;
    const rows = Math.ceil(viewport.clientHeight / CHECKBOX_SIZE) + 2 * RENDER_BUFFER;
    return cols * rows;
}

// Pool of checkbox elements for DOM recycling
let checkboxPool = [];
// Create the pool of checkboxes (only as many as needed for the visible area)
function createCheckboxPool() {
    const maxVisible = getMaxVisible();
    // Remove any existing checkboxes from the DOM
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    checkboxPool = [];
    for (let i = 0; i < maxVisible; i++) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checkbox';
        // Only one event listener per checkbox (never recreated)
        checkbox.addEventListener('change', (e) => {
            const idx = parseInt(checkbox.dataset.index);
            checkboxState.setBit(idx, checkbox.checked);
            connection.invoke('ToggleCheckbox', idx, checkbox.checked);
        });
        grid.appendChild(checkbox);
        checkboxPool.push(checkbox);
    }
}

// Render only the checkboxes that are visible in the viewport
function renderVisibleCheckboxes() {
    const scrollLeft = viewport.scrollLeft;
    const scrollTop = viewport.scrollTop;
    // Calculate which rows and columns are visible
    const firstCol = Math.max(0, Math.floor(scrollLeft / CHECKBOX_SIZE) - RENDER_BUFFER);
    const firstRow = Math.max(0, Math.floor(scrollTop / CHECKBOX_SIZE) - RENDER_BUFFER);
    const visibleCols = Math.ceil(viewport.clientWidth / CHECKBOX_SIZE) + 2 * RENDER_BUFFER;
    const visibleRows = Math.ceil(viewport.clientHeight / CHECKBOX_SIZE) + 2 * RENDER_BUFFER;
    let poolIndex = 0;
    // For each visible cell, update a checkbox from the pool
    for (let row = firstRow; row < Math.min(GRID_ROWS, firstRow + visibleRows); row++) {
        for (let col = firstCol; col < Math.min(GRID_COLS, firstCol + visibleCols); col++) {
            if (poolIndex >= checkboxPool.length) continue;
            const i = row * GRID_COLS + col;
            const checkbox = checkboxPool[poolIndex++];
            checkbox.style.left = (col * CHECKBOX_SIZE) + 'px';
            checkbox.style.top = (row * CHECKBOX_SIZE) + 'px';
            checkbox.checked = checkboxState.getBit(i);
            checkbox.dataset.index = i;
        }
    }
    // Hide any unused checkboxes in the pool (move them offscreen)
    for (; poolIndex < checkboxPool.length; poolIndex++) {
        checkboxPool[poolIndex].style.left = '-9999px';
        checkboxPool[poolIndex].style.top = '-9999px';
        checkboxPool[poolIndex].dataset.index = -1;
    }
}

// Listen for scroll and resize events to update the visible checkboxes
viewport.addEventListener('scroll', scheduleRender);
window.addEventListener('resize', () => {
    createCheckboxPool();
    scheduleRender();
});

// Initial pool and render, using requestIdleCallback for faster perceived load if available
function initialRender() {
    createCheckboxPool();
    renderVisibleCheckboxes();
    // Now start SignalR connection
    connection.start();
}
if ('requestIdleCallback' in window) {
    requestIdleCallback(initialRender);
} else {
    setTimeout(initialRender, 0);
}

// SignalR connection (deferred start)
const connection = new signalR.HubConnectionBuilder()
    .withUrl('/checkboxHub')
    .build();

// When another client toggles a checkbox, update the state and UI if visible
connection.on('CheckboxToggled', (index, isChecked) => {
    checkboxState.setBit(index, isChecked);
    // Only update if the checkbox is visible
    const cb = grid.querySelector(`input[data-index='${index}']`);
    if (cb) cb.checked = isChecked;
});

// When the full state is received (on connect), update the BitArray and rerender
connection.on('FullState', (base64) => {
    checkboxState.fromBase64(base64);
    renderVisibleCheckboxes();
}); 