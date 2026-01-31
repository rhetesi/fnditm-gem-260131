/**
 * Talált Tárgyak Nyilvántartó Rendszer
 * Végleges app.js - Integrált PDF generálóval a minta alapján
 */

class LostAndFoundApp {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('lostItems')) || [];
        this.photoBase64 = null;
        this.init();
    }

    init() {
        this.renderItems();
        this.setupEventListeners();
        if (document.getElementById('itemDate')) {
            document.getElementById('itemDate').valueAsDate = new Date();
        }
    }

    setupEventListeners() {
        const isEmployeeSwitch = document.getElementById('isEmployee');
        if (isEmployeeSwitch) {
            isEmployeeSwitch.addEventListener('change', (e) => {
                document.getElementById('finderFields').classList.toggle('d-none', e.target.checked);
            });
        }

        document.getElementById('fileInput').addEventListener('change', (e) => this.processImage(e));
        document.getElementById('btnSave').addEventListener('click', () => this.saveItem());
        
        ['filterName', 'filterLocation'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.filterItems());
        });
    }

    processImage(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.getElementById('canvas');
                const ctx = canvas.getContext('2d');
                const maxW = 800;
                const scale = maxW / img.width;
                canvas.width = maxW;
                canvas.height = img.height * scale;
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                this.photoBase64 = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('imgPreview').src = this.photoBase64;
                document.getElementById('previewContainer').classList.remove('d-none');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    async generateQR(text) {
        return new Promise((resolve) => {
            const qrDiv = document.getElementById("qrcode");
            qrDiv.innerHTML = "";
            new QRCode(qrDiv, { text: text, width: 100, height: 100, margin: 1, correctLevel: QRCode.CorrectLevel.M });
            setTimeout(() => {
                const img = qrDiv.querySelector("img");
                resolve(img ? img.src : '');
            }, 200);
        });
    }

    async generatePDF(item) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        const COMPANY_NAME = 'CÉG';
        const marginLeft = 25;
        const marginRight = 20;
        const marginTop = 6;
        const contentWidth = 210 - marginLeft - marginRight;

        const qrCodeDataUrl = await this.generateQR(item.id);
        const formattedDate = item.date.replace(/-/g, '. ') + '.';

        const drawScissorsLine = (y) => {
            doc.setDrawColor(180, 180, 180);
            doc.setLineDashPattern([2, 2], 0);
            doc.line(marginLeft, y, 210 - marginRight, y);
            doc.setLineDashPattern([], 0);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('✂', marginLeft - 6, y + 1);
            doc.text('✂', 210 - marginRight + 2, y + 1);
            doc.setTextColor(0, 0, 0);
        };

        // 1. SZAKASZ: CÍMKE [cite: 1-2]
        doc.setFont(undefined, 'bold');
        doc.setFontSize(16);
        doc.text(item.name, marginLeft, marginTop + 8);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`${item.location}, ${formattedDate}`, marginLeft, marginTop + 14);
        if (qrCodeDataUrl) doc.addImage(qrCodeDataUrl, 'PNG', 210 - marginRight - 25, marginTop + 2, 25, 25);
        doc.setFontSize(8);
        doc.text(`• ${item.id}`, 210 - marginRight - 12.5, marginTop + 32, { align: 'center' });
        drawScissorsLine(45);

        // 2. SZAKASZ: NYILVÁNTARTÁS [cite: 3-14]
        let currentY = 55;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(16);
        doc.text(item.name, marginLeft, currentY);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(item.id, 210 - marginRight, currentY, { align: 'right' });
        currentY += 6;
        doc.text(`${item.location}, ${formattedDate}`, marginLeft, currentY);

        // Oldalsáv [cite: 53-55]
        doc.setLineWidth(0.5);
        doc.line(210 - marginRight - 2, 55, 210 - marginRight - 2, 180);
        doc.setFont(undefined, 'bold');
        doc.text(item.id, 210 - marginRight + 2, 70, { angle: -90 });
        doc.text('•', 210 - marginRight + 2, 85, { angle: -90 });
        doc.text(item.name, 210 - marginRight + 2, 100, { angle: -90 });
        doc.text('•', 210 - marginRight + 2, 140, { angle: -90 });
        doc.text(formattedDate, 210 - marginRight + 2, 155, { angle: -90 });

        currentY += 12;
        doc.text('Átvevő neve: ___________________________________________________________', marginLeft, currentY);
        currentY += 7;
        doc.text('Átvevő lakcíme: ________________________________________________________', marginLeft, currentY);
        currentY += 14;
        doc.text('Személyazonosító okmány típusa és azonosítója: __________________________', marginLeft, currentY);

        currentY += 12;
        doc.setFontSize(9);
        const ownerStatement = "Átvevő adatainál megjelölt személyként elismerem, hogy mai napon, a '" + COMPANY_NAME + "' képviselője, a megjelölt tárgyat, mint személyes tulajdonomat részemre átadta. A tárgyat megvizsgáltam, azzal kapcsolatban mennyiségi, minőségi kifogást nem támasztok... Meggyőződtem arról, hogy a '" + COMPANY_NAME + "' a tárgyat annak megtalálásától az elvárható gondossággal őrizte meg. [cite: 34-36]";
        doc.text(doc.splitTextToSize(ownerStatement, contentWidth - 10), marginLeft, currentY);

        currentY += 25;
        doc.text('__________________', marginLeft, currentY);
        doc.text('__________________', marginLeft + 55, currentY);
        doc.text('__________________', marginLeft + 110, currentY);
        currentY += 4;
        doc.setFontSize(8);
        doc.text('dátum', marginLeft + 15, currentY);
        doc.text('átadó', marginLeft + 70, currentY);
        doc.text('átvevő', marginLeft + 125, currentY);

        currentY += 15;
        if (item.isEmployee) {
            doc.text(`A tárgyat a napi zárás során a '${COMPANY_NAME}' munkavállalója találta. [cite: 13]`, marginLeft, currentY);
        } else {
            doc.setFont(undefined, 'bold');
            doc.text(`${item.finderName} (${item.finderContact || 'Név'})`, marginLeft, currentY);
            currentY += 5;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            const finderStatement = "mint találó kijelentem, hogy az általam talált tárgy NEM tartozik közeli hozzátartozóim tulajdonába... [cite: 41-42]";
            doc.text(doc.splitTextToSize(finderStatement, contentWidth - 10), marginLeft, currentY);
        }
        drawScissorsLine(220);

        // 3. SZAKASZ: ELISMERVÉNY [cite: 17-19]
        currentY = 235;
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Átvételi elismervény', marginLeft, currentY);
        currentY += 10;
        doc.setFontSize(12);
        doc.text(item.name, marginLeft, currentY);
        currentY += 8;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(doc.splitTextToSize("A „" + COMPANY_NAME.toLowerCase() + "\" képviseletében elismerem, hogy a fent megnevezett tárgyat átvettük... [cite: 49]", contentWidth), marginLeft, currentY);
        currentY += 15;
        doc.text(formattedDate, marginLeft, currentY);
        doc.text('ph.', marginLeft + 70, currentY);
        doc.text('________________________', marginLeft + 100, currentY);

        doc.save(`nyilvantarto_${item.id}.pdf`);
    }

    async saveItem() {
        const nameInput = document.getElementById('itemName');
        const locInput = document.getElementById('itemLocation');
        if (!nameInput.value || !locInput.value) return alert("Hiba!");

        const newItem = {
            id: '697B' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            name: nameInput.value,
            location: locInput.value,
            date: document.getElementById('itemDate').value,
            isEmployee: document.getElementById('isEmployee').checked,
            finderName: document.getElementById('finderName').value || "Munkavállaló",
            finderContact: document.getElementById('finderContact').value || "",
            img: this.photoBase64 || 'https://via.placeholder.com/150',
            tags: [locInput.value, "Új"]
        };

        this.items.unshift(newItem);
        localStorage.setItem('lostItems', JSON.stringify(this.items));
        await this.generatePDF(newItem);
        this.renderItems();
        bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
        document.getElementById('addItemForm').reset();
    }

    renderItems(data = this.items) {
        const grid = document.getElementById('itemGrid');
        grid.innerHTML = '';
        document.getElementById('itemCount').innerText = data.length;
        data.forEach(item => {
            grid.innerHTML += `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0">
                        <img src="${item.img}" class="card-img-top" style="height: 180px; object-fit: contain; background: #fff; padding: 10px;">
                        <div class="card-body p-3">
                            <div class="mb-1"><span class="item-id-tag">${item.id}</span></div>
                            <h6 class="fw-bold mb-1">${item.name}</h6>
                            <p class="text-muted small mb-0">${item.location} | ${item.date}</p>
                        </div>
                    </div>
                </div>`;
        });
    }

    filterItems() {
        const n = document.getElementById('filterName').value.toLowerCase();
        const l = document.getElementById('filterLocation').value.toLowerCase();
        this.renderItems(this.items.filter(i => i.name.toLowerCase().includes(n) && i.location.toLowerCase().includes(l)));
    }
}

document.addEventListener('DOMContentLoaded', () => new LostAndFoundApp());