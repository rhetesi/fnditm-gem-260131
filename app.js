import { Utils } from './utils.js';
import { Storage } from './storage.js';
import { PDFGenerator } from './pdfGenerator.js';

class LostAndFoundApp {
    constructor() {
        this.photoBase64 = null;
        this.init();
    }

    init() {
        this.renderItems();
        this.setupEventListeners();
        document.getElementById('itemDate').valueAsDate = new Date();
    }

    setupEventListeners() {
        document.getElementById('fileInput').addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                this.photoBase64 = await Utils.processImage(e.target.files[0]);
                document.getElementById('imgPreview').src = this.photoBase64;
                document.getElementById('previewContainer').classList.remove('d-none');
            }
        });

        document.getElementById('btnSave').addEventListener('click', () => this.saveItem());
        
        document.getElementById('isEmployee').addEventListener('change', (e) => {
            document.getElementById('finderFields').classList.toggle('d-none', e.target.checked);
        });
    }

    async saveItem() {
        const item = {
            id: '697B' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            name: document.getElementById('itemName').value,
            brand: document.getElementById('itemBrand').value,
            material: document.getElementById('itemMaterial').value,
            color: document.getElementById('itemColor').value,
            shape: document.getElementById('itemShape').value,
            location: document.getElementById('itemLocation').value,
            date: document.getElementById('itemDate').value,
            isEmployee: document.getElementById('isEmployee').checked,
            finderName: document.getElementById('finderName').value || 'Munkavállaló',
            finderContact: document.getElementById('finderContact').value || '',
            img: this.photoBase64 || 'https://via.placeholder.com/150',
            creatorName: 'Rendszergazda'
        };

        if (!item.name || !item.location) return alert("Név és helyszín kötelező!");

        Storage.saveItem(item);
        await PDFGenerator.generate(item);
        this.renderItems();
        
        bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
        document.getElementById('addItemForm').reset();
        this.photoBase64 = null;
        document.getElementById('previewContainer').classList.add('d-none');
    }

    renderItems() {
        const items = Storage.getItems();
        const grid = document.getElementById('itemGrid');
        grid.innerHTML = items.map(item => `
            <div class="col">
                <div class="card h-100 shadow-sm border-0">
                    <img src="${item.img}" class="card-img-top" style="height:150px; object-fit:contain; background:#fff; padding:10px;">
                    <div class="card-body p-3">
                        <small class="text-primary fw-bold">${item.id}</small>
                        <h6 class="fw-bold mb-1">${item.name}</h6>
                        <p class="text-muted small mb-0">${item.location} | ${item.date}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => new LostAndFoundApp());