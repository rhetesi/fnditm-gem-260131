/**
 * Talált Tárgyak Nyilvántartó Rendszer - I. Fázis
 * Véglegesített app.js a minta PDF kódja alapján
 */

class LostAndFoundApp {
    constructor() {
        // Adatok betöltése LocalStorage-ból
        this.items = JSON.parse(localStorage.getItem('lostItems')) || [];
        this.photoBase64 = null;
        this.init();
    }

    init() {
        this.renderItems();
        this.setupEventListeners();
        // Alapértelmezett dátum beállítása a mai napra
        const dateInput = document.getElementById('itemDate');
        if (dateInput) dateInput.valueAsDate = new Date();
    }

    setupEventListeners() {
        // "Cég dolgozója találta" kapcsoló
        const isEmployeeSwitch = document.getElementById('isEmployee');
        if (isEmployeeSwitch) {
            isEmployeeSwitch.addEventListener('change', (e) => {
                document.getElementById('finderFields').classList.toggle('d-none', e.target.checked);
            });
        }

        // Fénykép feldolgozás
        document.getElementById('fileInput').addEventListener('change', (e) => this.processImage(e));
        
        // Mentés gomb eseménykezelője
        document.getElementById('btnSave').addEventListener('click', () => this.saveItem());
        
        // Szűrési események
        ['filterName', 'filterLocation'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.filterItems());
        });
    }

    // Képfeldolgozás: Átméretezés és fehér háttér biztosítása
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

                // Fehér háttér rajzolása (PNG átlátszóság kezelése)
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                this.photoBase64 = canvas.toDataURL('image/jpeg', 0.8);
                const preview = document.getElementById('imgPreview');
                preview.src = this.photoBase64;
                document.getElementById('previewContainer').classList.remove('d-none');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // QR kód generálása aszinkron módon
    async generateQR(text) {
        return new Promise((resolve) => {
            const qrDiv = document.getElementById("qrcode");
            qrDiv.innerHTML = "";
            new QRCode(qrDiv, {
                text: text,
                width: 128,
                height: 128,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
            // Kis késleltetés, hogy a könyvtár biztosan végezzen a rendereléssel
            setTimeout(() => {
                const img = qrDiv.querySelector("img");
                resolve(img ? img.src : null);
            }, 200);
        });
    }

    // PDF Generálás a megadott minta kód alapján
    async generatePDF(item) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = 210;
        const marginLeft = 25;
        const marginRight = 20;
        const marginTop = 6;
        const contentWidth = pageWidth - marginLeft - marginRight;
        const COMPANY_NAME = 'CÉG';

        const qrCodeDataUrl = await this.generateQR(item.id);
        const dateStr = item.date.replace(/-/g, '. ') + ".";

        // Segédfüggvény a szaggatott vonalhoz és az ollóhoz
        const drawScissorsLine = (y) => {
            doc.setDrawColor(180, 180, 180);
            doc.setLineDashPattern([2, 2], 0);
            doc.line(marginLeft, y, pageWidth - marginRight, y);
            doc.setLineDashPattern([], 0);
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text('✂', marginLeft - 6, y + 1);
            doc.text('✂', pageWidth - marginRight + 2, y + 1);
            doc.setTextColor(0, 0, 0);
        };

        // --- 1. NYILVÁNTARTÓ CÍMKE ---
        let currentY = marginTop + 10;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(16);
        doc.text(item.name, marginLeft, currentY);
        
        currentY += 7;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`${item.location}, ${dateStr}`, marginLeft, currentY);
        
        if (qrCodeDataUrl) {
            doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - marginRight - 25, marginTop + 2, 25, 25);
        }
        
        doc.setFontSize(8);
        doc.text(item.id, pageWidth - marginRight - 12.5, marginTop + 32, { align: 'center' });

        drawScissorsLine(45);

        // --- 2. NYILVÁNTARTÁS (Középső szakasz) ---
        currentY = 55;
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(item.name, marginLeft, currentY);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(item.id, pageWidth - marginRight, currentY, { align: 'right' });
        
        currentY += 8;
        doc.text(`${item.location}, ${dateStr}`, marginLeft, currentY);

        // Függőleges sáv elforgatott szöveggel
        const sidebarX = pageWidth - marginRight + 3;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text(item.id, sidebarX, 60, { angle: -90 });
        doc.text(item.name, sidebarX, 100, { angle: -90 });
        doc.text(dateStr, sidebarX, 150, { angle: -90 });
        doc.setLineWidth(0.4);
        doc.line(pageWidth - marginRight - 1, 55, pageWidth - marginRight - 1, 180);

        currentY += 15;
        doc.text('Átvevő neve: ________________________________________________________________', marginLeft, currentY);
        currentY += 8;
        doc.text('Átvevő lakcíme: _____________________________________________________________', marginLeft, currentY);
        currentY += 16;
        doc.text('Személyazonosító okmány típusa és azonosítója: _______________________________', marginLeft, currentY);

        currentY += 12;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const ownerStatement = `Átvevő adatainál megjelölt személyként elismerem, hogy mai napon, a '${COMPANY_NAME}' képviselője, a megjelölt tárgyat, mint személyes tulajdonomat részemre átadta. A tárgyat megvizsgáltam, azzal kapcsolatban mennyiségi, minőségi kifogást nem támasztok a '${COMPANY_NAME}' felé, egyidejűleg elismerem, hogy általam történő elhagyása és megtalálása között a tárgy mennyiségi, minőségi változásaiért a '${COMPANY_NAME}' nem tartozik felelősséggel.`;
        const ownerLines = doc.splitTextToSize(ownerStatement, contentWidth - 10);
        doc.text(ownerLines, marginLeft, currentY);

        currentY += 25;
        doc.text('__________________', marginLeft, currentY);
        doc.text('__________________', marginLeft + 55, currentY);
        doc.text('__________________', marginLeft + 110, currentY);
        currentY += 4;
        doc.setFontSize(7);
        doc.text('dátum', marginLeft + 15, currentY);
        doc.text('átadó', marginLeft + 70, currentY);
        doc.text('átvevő', marginLeft + 125, currentY);

        currentY += 15;
        doc.setFontSize(10);
        if (item.isEmployee) {
            doc.text(`A tárgyat a napi zárás során a '${COMPANY_NAME}' munkavállalója találta.`, marginLeft, currentY);
        } else {
            doc.setFont(undefined, 'bold');
            doc.text(`${item.finderName} (${item.finderContact || 'Nincs elérhetőség'})`, marginLeft, currentY);
            currentY += 6;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            const finderStatement = "mint találó kijelentem, hogy az általam talált fent megjelölt tárgy NEM tartozik a személyes és közeli hozzátartozóim tulajdona körébe, így annak tulajdonjogára sem most, sem később nem tartok igényt.";
            doc.text(doc.splitTextToSize(finderStatement, contentWidth - 10), marginLeft, currentY);
        }

        drawScissorsLine(220);

        // --- 3. ÁTVÉTELI ELISMERVÉNY (Leadó példánya) ---
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
        const ackStatement = `A „${COMPANY_NAME.toLowerCase()}" képviseletében elismerem, hogy a fent megnevezett tárgyat átvettük. Tájékoztattam a találót, hogy ezen átvételi elismervény NEM jogosít a talált tárgy találó részére történő kiadására.`;
        doc.text(doc.splitTextToSize(ackStatement, contentWidth), marginLeft, currentY);

        currentY += 20;
        doc.text(dateStr, marginLeft, currentY);
        doc.text('ph.', marginLeft + 70, currentY);
        doc.text('________________________', marginLeft + 100, currentY);
        doc.setFontSize(7);
        doc.text('cég képviselője', marginLeft + 115, currentY + 4);

        // PDF mentése
        doc.save(`nyilvantarto_${item.id}.pdf`);
    }

    async saveItem() {
        const nameInput = document.getElementById('itemName');
        const locInput = document.getElementById('itemLocation');

        if (!nameInput.value || !locInput.value) {
            alert("Kérjük, töltse ki a Megnevezés és Helyszín mezőket!");
            return;
        }

        const newItem = {
            id: '697B' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            name: nameInput.value,
            location: locInput.value,
            date: document.getElementById('itemDate').value,
            time: document.getElementById('itemTime').value || "",
            isEmployee: document.getElementById('isEmployee').checked,
            finderName: document.getElementById('finderName').value || "Név nélkül",
            finderContact: document.getElementById('finderContact').value || "",
            img: this.photoBase64 || 'https://via.placeholder.com/300x200?text=Nincs+fotó',
            tags: [locInput.value, "Új"]
        };

        // Mentés és renderelés
        this.items.unshift(newItem);
        localStorage.setItem('lostItems', JSON.stringify(this.items));
        
        // PDF generálása (megvárjuk a QR kód miatt)
        await this.generatePDF(newItem);
        
        this.renderItems();
        this.resetForm();
        
        // Modál bezárása
        const modal = bootstrap.Modal.getInstance(document.getElementById('addItemModal'));
        if (modal) modal.hide();
    }

    resetForm() {
        document.getElementById('addItemForm').reset();
        this.photoBase64 = null;
        document.getElementById('itemDate').valueAsDate = new Date();
        document.getElementById('previewContainer').classList.add('d-none');
        document.getElementById('imgPreview').src = "";
    }

    renderItems(data = this.items) {
        const grid = document.getElementById('itemGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        document.getElementById('itemCount').innerText = data.length;

        data.forEach(item => {
            grid.innerHTML += `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0 position-relative">
                        <span class="status-badge">Aktív</span>
                        <img src="${item.img}" class="card-img-top" alt="${item.name}">
                        <div class="card-body p-3">
                            <div class="mb-1"><span class="item-id-tag">${item.id}</span></div>
                            <h6 class="fw-bold mb-1">${item.name}</h6>
                            <p class="text-muted small mb-2"><i class="bi bi-geo-alt"></i> ${item.location}</p>
                            <div class="d-flex flex-wrap gap-1">
                                ${item.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>`;
        });
    }

    filterItems() {
        const nameQuery = document.getElementById('filterName').value.toLowerCase();
        const locQuery = document.getElementById('filterLocation').value.toLowerCase();

        const filtered = this.items.filter(item => 
            item.name.toLowerCase().includes(nameQuery) && 
            item.location.toLowerCase().includes(locQuery)
        );
        this.renderItems(filtered);
    }
}

// Alkalmazás inicializálása
document.addEventListener('DOMContentLoaded', () => {
    window.App = new LostAndFoundApp();
});