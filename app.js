/**
 * Talált Tárgyak Nyilvántartó Rendszer - I. Fázis
 * Core Logic & PDF Generation
 */

class LostAndFoundSystem {
    constructor() {
        // Adatok betöltése vagy inicializálása
        this.items = JSON.parse(localStorage.getItem('lostItems')) || [];
        this.photoBase64 = null;
        
        // Inicializálás
        this.init();
    }

    init() {
        this.renderItems();
        this.setupEventListeners();
        this.setupCamera();
        
        // Alapértelmezett dátum a rögzítő formon
        if (document.getElementById('itemDate')) {
            document.getElementById('itemDate').valueAsDate = new Date();
        }
    }

    setupEventListeners() {
        // Cég dolgozója kapcsoló kezelése
        const isEmployeeBtn = document.getElementById('isEmployee');
        if (isEmployeeBtn) {
            isEmployeeBtn.addEventListener('change', (e) => {
                document.getElementById('finderFields').classList.toggle('d-none', e.target.checked);
            });
        }

        // Fájl feltöltés
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // Mentés gomb
        const saveBtn = document.getElementById('btnSave');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveItem());
        }

        // Kereső szűrők
        ['filterName', 'filterLocation'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.filterItems());
        });

        // Fotó reset
        const resetBtn = document.getElementById('btnResetPhoto');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetPhoto());
        }
    }

    // --- KAMERA KEZELÉS ---
    async setupCamera() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const btnStart = document.getElementById('btnStartCamera');
        const btnCapture = document.getElementById('btnCapture');

        if (!btnStart) return;

        btnStart.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment" }, 
                    audio: false 
                });
                video.srcObject = stream;
                document.getElementById('videoContainer').classList.remove('d-none');
            } catch (err) {
                alert("Kamera hiba: Ellenőrizze a jogosultságokat vagy használjon HTTPS-t!");
            }
        });

        btnCapture.addEventListener('click', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            // Tömörített JPG a LocalStorage kímélése érdekében
            this.photoBase64 = canvas.toDataURL('image/jpeg', 0.6);
            this.showPreview();
            this.stopCamera();
        });
    }

    stopCamera() {
        const video = document.getElementById('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        document.getElementById('videoContainer').classList.add('d-none');
    }

    handleFileUpload(e) {
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
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                this.photoBase64 = canvas.toDataURL('image/jpeg', 0.6);
                this.showPreview();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    showPreview() {
        document.getElementById('imgPreview').src = this.photoBase64;
        document.getElementById('previewContainer').classList.remove('d-none');
    }

    resetPhoto() {
        this.photoBase64 = null;
        document.getElementById('previewContainer').classList.add('d-none');
        document.getElementById('fileInput').value = '';
    }

    // --- PDF GENERÁLÁS (jsPDF) ---
    generatePDF(item) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

        // Margók (F/L: 0.6cm, B: 2.5cm, J: 2cm)
        const m = { top: 6, bottom: 6, left: 25, right: 20 };
        const contentW = 210 - m.left - m.right;

        const drawLine = (y) => {
            doc.setLineDash([2, 2], 0);
            doc.line(m.left, y, 210 - m.right, y);
            doc.setLineDash();
            doc.setFontSize(12);
            doc.text("✂", m.left - 5, y + 2);
        };

        // 1. RÉSZ: Címke
        doc.setFont(undefined, 'bold');
        doc.setFontSize(14);
        doc.text("NYILVÁNTARTÓ CÍMKE", m.left, 15);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`ID: ${item.id}`, m.left, 22);
        doc.text(`Tárgy: ${item.name}`, m.left, 27);
        doc.text(`Hely: ${item.location} | Idő: ${item.date} ${item.time}`, m.left, 32);
        doc.rect(165, 12, 25, 25); // QR Placeholder
        doc.setFontSize(7);
        doc.text("QR KÓD", 172, 25);
        
        drawLine(45);

        // 2. RÉSZ: Nyilvántartás
        doc.setFont(undefined, 'bold');
        doc.setFontSize(14);
        doc.text("NYILVÁNTARTÁSI ADATLAP", m.left, 55);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        let y = 65;
        const fields = [
            ["Megnevezés:", item.name],
            ["Helyszín:", item.location],
            ["Dátum/Idő:", `${item.date} ${item.time}`],
            ["Találó:", item.isEmployee ? "Cég dolgozója" : `${item.finder.name} (${item.finder.contact})`]
        ];

        fields.forEach(f => {
            doc.setFont(undefined, 'bold');
            doc.text(f[0], m.left, y);
            doc.setFont(undefined, 'normal');
            doc.text(String(f[1]), m.left + 40, y);
            y += 7;
        });

        doc.text("Alulírott büntetőjogi felelősségem tudatában kijelentem, hogy a leírt adatok a valóságnak megfelelnek.", m.left, y + 10, { maxWidth: contentW });
        doc.line(m.left, 130, m.left + 60, 130);
        doc.text("Ügyintéző aláírása", m.left, 135);

        drawLine(145);

        // 3. RÉSZ: Elismervény
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text("ÁTVÉTELI ELISMERVÉNY (ÜGYFÉL PÉLDÁNY)", m.left, 155);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`A(z) ${item.id} azonosítójú tárgy átvételét igazoljuk.`, m.left, 165);
        doc.text("..........................................", 130, 190);
        doc.text("Leadó aláírása", 140, 195);

        // OLDALSÁV
        doc.setFillColor(43, 108, 176);
        doc.rect(202, 0, 8, 297, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`${item.date} | ${item.name} | ID: ${item.id}`, 207, 150, { angle: 90, align: "center" });

        doc.save(`LostItem_${item.id}.pdf`);
    }

    // --- ADATKEZELÉS ---
    saveItem() {
        const name = document.getElementById('itemName').value;
        const location = document.getElementById('itemLocation').value;
        const date = document.getElementById('itemDate').value;

        if (!name || !location || !date) {
            alert("Minden kötelező (*) mezőt töltsön ki!");
            return;
        }

        const newItem = {
            id: 'ITM-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            name,
            location,
            date,
            time: document.getElementById('itemTime').value || "--:--",
            isEmployee: document.getElementById('isEmployee').checked,
            finder: {
                name: document.getElementById('finderName').value || "",
                contact: document.getElementById('finderContact').value || ""
            },
            img: this.photoBase64 || 'https://via.placeholder.com/300x200?text=Nincs+fotó',
            status: 'active',
            tags: [location, "Új"]
        };

        this.items.unshift(newItem);
        localStorage.setItem('lostItems', JSON.stringify(this.items));
        
        // PDF és UI frissítés
        this.generatePDF(newItem);
        this.renderItems();
        this.resetForm();
        
        const modalEl = document.getElementById('addItemModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    resetForm() {
        document.getElementById('addItemForm').reset();
        this.resetPhoto();
        document.getElementById('itemDate').valueAsDate = new Date();
    }

    renderItems(data = this.items) {
        const grid = document.getElementById('itemGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        document.getElementById('itemCount').innerText = data.length;

        data.forEach(item => {
            grid.innerHTML += `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0">
                        <span class="status-badge">Aktív</span>
                        <img src="${item.img}" class="card-img-top" alt="item">
                        <div class="card-body p-3">
                            <div class="mb-1"><span class="item-id-tag">${item.id}</span></div>
                            <h6 class="card-title fw-bold mb-1">${item.name}</h6>
                            <p class="text-muted small mb-2"><i class="bi bi-geo-alt"></i> ${item.location}</p>
                            <div class="d-flex flex-wrap gap-1">
                                ${item.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
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

// Alkalmazás példányosítása
document.addEventListener('DOMContentLoaded', () => {
    window.App = new LostAndFoundSystem();
});