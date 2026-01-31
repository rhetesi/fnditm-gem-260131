class LostAndFoundApp {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('lostItems')) || [];
        this.photoBase64 = null;
        this.init();
    }

    init() {
        this.renderItems();
        this.setupEventListeners();
        const dateInput = document.getElementById('itemDate');
        if (dateInput) dateInput.valueAsDate = new Date();
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
            new QRCode(qrDiv, { text: text, width: 128, height: 128, correctLevel: QRCode.CorrectLevel.M });
            setTimeout(() => {
                const img = qrDiv.querySelector("img");
                resolve(img ? img.src : null);
            }, 250);
        });
    }

    async generatePDF(item) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        const pageWidth = 210;
        const marginLeft = 25;
        const marginRight = 20;
        const marginTop = 6;
        const contentWidth = pageWidth - marginLeft - marginRight;
        const COMPANY_NAME = 'CÉG';

        const qrCodeDataUrl = await this.generateQR(item.id);
        const dateStr = item.date.replace(/-/g, '. ') + ".";
        const creatorName = "Minta Felhasználó"; // Ez dinamikusan is jöhet

        const drawScissorsLine = (y) => {
            doc.setDrawColor(180, 180, 180);
            doc.setLineDashPattern([2, 2], 0);
            doc.line(marginLeft, y, pageWidth - marginRight, y);
            doc.setLineDashPattern([], 0);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('✂', marginLeft - 6, y + 1);
            doc.text('✂', pageWidth - marginRight + 2, y + 1);
            doc.setTextColor(0, 0, 0);
        };

        // 1. RÉSZ: NYILVÁNTARTÓ CÍMKE
        doc.setFont(undefined, 'bold');
        doc.setFontSize(16);
        doc.text(item.name, marginLeft, marginTop + 8);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`${item.location}, ${dateStr}`, marginLeft, marginTop + 14);
        
        if (qrCodeDataUrl) {
            doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - marginRight - 25, marginTop, 25, 25);
        }
        doc.setFontSize(8);
        doc.text(`• ${item.id}`, pageWidth - marginRight - 12.5, marginTop + 28, { align: 'center' });

        drawScissorsLine(40);

        // 2. RÉSZ: NYILVÁNTARTÁS
        let currentY = 50;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(16);
        doc.text(item.name, marginLeft, currentY);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(item.id, pageWidth - marginRight, currentY, { align: 'right' });
        
        currentY += 6;
        doc.text(`${item.location}, ${dateStr}`, marginLeft, currentY);

        // Függőleges oldalsáv (Minta B alapján)
        const sidebarX = pageWidth - marginRight + 3;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`${dateStr}. • ${item.name} • ${item.id}`, sidebarX, 55, { angle: -90 });
        doc.setLineWidth(0.5);
        doc.line(pageWidth - marginRight - 1, 50, pageWidth - marginRight - 1, 180);

        currentY += 12;
        doc.text('Átvevő neve: ___________________________________________________________', marginLeft, currentY);
        currentY += 7;
        doc.text('Átvevő lakcíme: ________________________________________________________', marginLeft, currentY);
        currentY += 14;
        doc.text('Személyazonosító okmány típusa és azonosítója: __________________________', marginLeft, currentY);

        currentY += 10;
        doc.setFontSize(9);
        const ownerStatement = [
            `Átvevő adatainál megjelölt személyként elismerem, hogy mai napon, a '${COMPANY_NAME}' képviselője, a megjelölt tárgyat, mint személyes tulajdonomat részemre átadta. [cite: 34]`,
            `A tárgyat megvizsgáltam, azzal kapcsolatban mennyiségi, minőségi kifogást nem támasztok a '${COMPANY_NAME}' felé, egyidejűleg elismerem, hogy általam történő elhagyása és megtalálása között a tárgy mennyiségi, minőségi változásaiért a '${COMPANY_NAME}' nem tartozik felelősséggel. [cite: 35]`,
            `Meggyőződtem arról, hogy a '${COMPANY_NAME}' a tárgyat annak megtalálásától az elvárható gondosságal őrizte meg. [cite: 36]`
        ].join(' ');
        doc.text(doc.splitTextToSize(ownerStatement, contentWidth - 10), marginLeft, currentY, { align: 'justify' });

        currentY += 25;
        doc.text('__________________', marginLeft, currentY);
        doc.text('__________________', marginLeft + 55, currentY);
        doc.text('__________________', marginLeft + 110, currentY);
        currentY += 4;
        doc.setFontSize(8);
        doc.text('dátum [cite: 37]', marginLeft + 15, currentY);
        doc.text('átadó [cite: 38]', marginLeft + 70, currentY);
        doc.text('átvevő [cite: 39]', marginLeft + 125, currentY);

        currentY += 12;
        if (item.isEmployee) {
            doc.text(`A tárgyat a napi zárás során a '${COMPANY_NAME}' munkavállalója találta. [cite: 13]`, marginLeft, currentY);
        } else {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(`${item.finderName} (${item.finderContact || 'Név (lakcím)'}) [cite: 40, 48]`, marginLeft, currentY);
            currentY += 5;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            const finderStatement = `mint találó kijelentem, hogy az általam talált fent megjelölt tárgy NEM tartozik a személyes és közeli hozzátartozóim tulajdona körébe, így annak tulajdonjogára sem most, sem később nem tartok igényt. [cite: 41] Egyben kijelentem, hogy megértettem és tudomásul veszem, hogy az átvételi elismervényen található figyelmeztetés szerint az átvételi elismervény nem jogosít a talált tárgy kiadására. [cite: 42]`;
            doc.text(doc.splitTextToSize(finderStatement, contentWidth - 10), marginLeft, currentY, { align: 'justify' });
            
            currentY += 15;
            doc.text(dateStr, marginLeft, currentY);
            doc.text('__________________', marginLeft + 60, currentY);
            doc.text('__________________', marginLeft + 115, currentY);
            currentY += 4;
            doc.setFontSize(7);
            doc.text('átadó', marginLeft + 75, currentY);
            doc.text('cég képviselője', marginLeft + 125, currentY);
            currentY += 4;
            doc.text(item.finderName, marginLeft + 75, currentY);
            doc.text(creatorName, marginLeft + 125, currentY);
        }

        drawScissorsLine(215);

        // 3. RÉSZ: ÁTVÉTELI ELISMERVÉNY
        currentY = 225;
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Átvételi elismervény [cite: 46]', marginLeft, currentY);
        currentY += 10;
        doc.setFontSize(12);
        doc.text(item.name, marginLeft, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`${item.finderName} (${item.finderContact || 'Név (lakcím)'}) [cite: 48]`, marginLeft, currentY);
        
        currentY += 8;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const ackStatement = `A „${COMPANY_NAME.toLowerCase()}" képviseletében elismerem, hogy a fent megnevezett tárgyat, megnevezett találótól átvettem. [cite: 49] Egyben tájékoztattam a találót, hogy ezen átvételi elismervény NEM jogosít a talált tárgy találó részére történő kiadására. [cite: 49]`;
        doc.text(doc.splitTextToSize(ackStatement, contentWidth), marginLeft, currentY, { align: 'justify' });

        currentY += 20;
        doc.text(dateStr, marginLeft, currentY);
        doc.text('ph [cite: 51]', marginLeft + 70, currentY);
        doc.text('________________________', marginLeft + 100, currentY);
        currentY += 4;
        doc.setFontSize(8);
        doc.text(creatorName, marginLeft + 115, currentY);

        doc.save(`nyilvantarto_${item.id}.pdf`);
    }

    async saveItem() {
        const nameInput = document.getElementById('itemName');
        const locInput = document.getElementById('itemLocation');
        if (!nameInput.value || !locInput.value) return alert("Mezők kitöltése kötelező!");

        const newItem = {
            id: '697B' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            name: nameInput.value,
            location: locInput.value,
            date: document.getElementById('itemDate').value,
            time: document.getElementById('itemTime').value || "",
            isEmployee: document.getElementById('isEmployee').checked,
            finderName: document.getElementById('finderName').value || "Ismeretlen",
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
        this.photoBase64 = null;
        document.getElementById('previewContainer').classList.add('d-none');
    }

    renderItems(data = this.items) {
        const grid = document.getElementById('itemGrid');
        grid.innerHTML = '';
        document.getElementById('itemCount').innerText = data.length;
        data.forEach(item => {
            grid.innerHTML += `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0 position-relative">
                        <span class="status-badge">Aktív</span>
                        <img src="${item.img}" class="card-img-top">
                        <div class="card-body p-3">
                            <div class="mb-1"><span class="item-id-tag">${item.id}</span></div>
                            <h6 class="fw-bold mb-1">${item.name}</h6>
                            <p class="text-muted small mb-2"><i class="bi bi-geo-alt"></i> ${item.location}</p>
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