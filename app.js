class LostAndFoundApp {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('lostItems')) || [];
        this.photoBase64 = null;
        this.init();
    }

    init() {
        this.renderItems();
        this.setupEventListeners();
        document.getElementById('itemDate').valueAsDate = new Date();
    }

    setupEventListeners() {
        // Céges találat kapcsoló
        const isEmployeeSwitch = document.getElementById('isEmployee');
        if (isEmployeeSwitch) {
            isEmployeeSwitch.addEventListener('change', (e) => {
                document.getElementById('finderFields').classList.toggle('d-none', e.target.checked);
            });
        }

        // Képfeldolgozás fehér háttér kényszerítésével
        document.getElementById('fileInput').addEventListener('change', (e) => this.processImage(e));
        
        // Mentés és PDF generálás
        document.getElementById('btnSave').addEventListener('click', () => this.saveItem());
        
        // Alapvető keresés
        document.getElementById('filterName').addEventListener('input', () => this.filterItems());
        document.getElementById('filterLocation').addEventListener('input', () => this.filterItems());
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
                
                // Kép méretezése
                const maxW = 800;
                const scale = maxW / img.width;
                canvas.width = maxW;
                canvas.height = img.height * scale;

                // FEHÉR HÁTTÉR BEÁLLÍTÁSA (átlátszó képekhez)
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

    async generateQR(text) {
        return new Promise((resolve) => {
            const qrDiv = document.getElementById("qrcode");
            qrDiv.innerHTML = "";
            new QRCode(qrDiv, { text: text, width: 128, height: 128 });
            setTimeout(() => {
                const img = qrDiv.querySelector("img");
                resolve(img ? img.src : null);
            }, 250);
        });
    }

    async generatePDF(item) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const qrCode = await this.generateQR(item.id);
        const dateStr = item.date.replace(/-/g, '. ') + '.';

        // 1. RÉSZ: NYILVÁNTARTÓ CÍMKE
        doc.setFontSize(14); doc.setFont(undefined, 'bold');
        doc.text(item.name, 25, 12);
        doc.setFontSize(10); doc.setFont(undefined, 'normal');
        doc.text(`${item.location}, ${dateStr}`, 25, 18);
        if(qrCode) doc.addImage(qrCode, 'PNG', 165, 8, 25, 25);
        doc.setFontSize(8); doc.text(`• ${item.id}`, 165, 36);
        
        doc.setLineDash([1, 1]); 
        doc.line(25, 42, 190, 42); // Vágóvonal szaggatottal

        // 2. RÉSZ: NYILVÁNTARTÁSI ADATLAP (Minta szövegezéssel)
        doc.setFontSize(11); doc.setFont(undefined, 'bold');
        doc.text(item.name, 25, 52);
        doc.setFontSize(10); doc.setFont(undefined, 'normal');
        doc.text(`${item.location}, ${dateStr}`, 25, 58);
        doc.text(item.id, 25, 63);

        doc.text("Átvevő neve: ...................................................", 25, 75);
        doc.text("Átvevő lakcíme: .................................................", 25, 82);
        doc.text("Személyazonosító okmány típusa és azonosítója: ...................", 25, 89);
        
        doc.setFontSize(8);
        const statement = "Átvevő adatainál megjelölt személyként elismerem, hogy mai napon, a 'CÉG' képviselője, a megjelölt tárgyat, mint személyes tulajdonomat részemre átadta. A tárgyat megvizsgáltam, azzal kapcsolatban kifogást nem támasztok...";
        doc.text(statement, 25, 98, {maxWidth: 165, align: 'justify'});

        doc.text("dátum", 25, 125); doc.text("átadó", 85, 125); doc.text("átvevő", 145, 125);
        doc.setLineDash([1, 1]); doc.line(25, 140, 190, 140);

        // 3. RÉSZ: ÁTVÉTELI ELISMERVÉNY (Leadó részére)
        doc.setFontSize(10); doc.setFont(undefined, 'bold');
        doc.text("Átvételi elismervény", 25, 150);
        doc.setFont(undefined, 'normal');
        doc.text(item.name, 25, 158);
        
        const finderNote = "A cég képviseletében elismerem, hogy a fent megnevezett tárgyat átvettem. Tájékoztattam a találót, hogy ezen elismervény nem jogosít a tárgy kiadására.";
        doc.text(finderNote, 25, 168, {maxWidth: 165});
        
        doc.text(dateStr, 25, 200);
        doc.text("cég képviselője", 140, 200);

        // OLDALSÁV (Inverz azonosító)
        doc.setFillColor(0, 0, 0); doc.rect(202, 260, 5, 30, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(7);
        doc.text(item.id, 205.5, 275, {angle: 90, align: 'center'});

        doc.save(`Nyilvantartas_${item.id}.pdf`);
    }

    async saveItem() {
        const nameInput = document.getElementById('itemName');
        const locInput = document.getElementById('itemLocation');

        if(!nameInput.value || !locInput.value) return alert("Kérjük töltse ki a név és helyszín mezőket!");

        const item = {
            id: '697' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            name: nameInput.value,
            location: locInput.value,
            date: document.getElementById('itemDate').value,
            time: document.getElementById('itemTime').value || "",
            img: this.photoBase64 || 'https://via.placeholder.com/300x200?text=No+Photo',
            tags: [locInput.value, "Új"]
        };

        this.items.unshift(item);
        localStorage.setItem('lostItems', JSON.stringify(this.items));
        
        await this.generatePDF(item);
        this.renderItems();
        
        // Modál bezárása és alaphelyzet
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
                        <img src="${item.img}" class="card-img-top" alt="${item.name}">
                        <div class="card-body p-3">
                            <div class="mb-1"><span class="item-id-tag">${item.id}</span></div>
                            <h6 class="fw-bold mb-1">${item.name}</h6>
                            <p class="text-muted small mb-2"><i class="bi bi-calendar3"></i> ${item.date.replace(/-/g, '. ')}</p>
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
        const filtered = this.items.filter(i => 
            i.name.toLowerCase().includes(nameQuery) && 
            i.location.toLowerCase().includes(locQuery)
        );
        this.renderItems(filtered);
    }
}

document.addEventListener('DOMContentLoaded', () => new LostAndFoundApp());