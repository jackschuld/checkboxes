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

// Example usage:
const CHECKBOX_COUNT = 10000; // Adjust for performance testing
const checkboxState = new BitArray(CHECKBOX_COUNT);
const grid = document.getElementById('checkbox-grid');

// Render checkboxes
for (let i = 0; i < CHECKBOX_COUNT; i++) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.index = i;
    checkbox.addEventListener('change', (e) => {
        connection.invoke('ToggleCheckbox', i, checkbox.checked);
    });
    grid.appendChild(checkbox);
    if ((i + 1) % 100 === 0) grid.appendChild(document.createElement('br'));
}

// SignalR connection
const connection = new signalR.HubConnectionBuilder()
    .withUrl('/checkboxHub')
    .build();

connection.on('CheckboxToggled', (index, isChecked) => {
    const cb = grid.querySelector(`input[data-index='${index}']`);
    if (cb) cb.checked = isChecked;
});

connection.on('FullState', (base64) => {
    checkboxState.fromBase64(base64);
    // Update UI to reflect state
    for (let i = 0; i < CHECKBOX_COUNT; i++) {
        const cb = grid.querySelector(`input[data-index='${i}']`);
        if (cb) cb.checked = checkboxState.getBit(i);
    }
});

connection.start(); 