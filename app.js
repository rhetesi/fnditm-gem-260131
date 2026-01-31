import { Utils } from './utils.js';
import { PDFGenerator } from './pdfGenerator.js';

class LostAndFoundApp {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('lostItems')) || [];
        this.photoBase64 = null;
        this.init();
    }

    init() {
        this.renderItems();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // UI események (Gombok, Inputok)
        document.getElementById('fileInput').addEventListener('change', async (e) => {
            this.photoBase64 = await Utils.processImage(e.target.files[0]);
            document.getElementById('imgPreview').src = this.photoBase64;
        });

        document.getElementById('btnSave').addEventListener('click', () => this.saveItem());
    }

    async saveItem() {
        const item = {
            id: '697B' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            name: document.getElementById('itemName').value,
            location: document.getElementById('itemLocation').value,
            date: document.getElementById('itemDate').value,
            img: this.photoBase64,
            // ... többi adat
        };

        this.items.unshift(item);
        localStorage.setItem('lostItems', JSON.stringify(this.items));
        
        await PDFGenerator.generate(item); // PDF generátor hívása
        this.renderItems();
    }

    renderItems() {
        // Csak a HTML generálás a kártyákhoz
    }
}

new LostAndFoundApp();