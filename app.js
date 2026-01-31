class LostAndFoundSystem {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('lostItems')) || [];
        this.photoBase64 = null;
        this.init();
    }

    init() {
        this.renderItems();
        this.setupEventListeners();
        this.setupCamera();
        
        // Mai dátum beállítása alapértelmezettnek
        document.getElementById('itemDate').valueAsDate = new Date();
    }

    setupEventListeners() {
        // Cég dolgozója kapcsoló
        document.getElementById('isEmployee').addEventListener('change', (e) => {
            document.getElementById('finderFields').classList.toggle('d-none', e.target.checked);
        });

        // Fájl feltöltés
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));

        // Mentés gomb
        document.getElementById('btnSave').addEventListener('click', () => this.saveItem());

        // Szűrők
        ['filterName', 'filterLocation'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.filterItems());
        });

        // Fotó reset
        document.getElementById('btnResetPhoto').addEventListener('click', () => this.resetPhoto());
    }

    // --- KAMERA ÉS FOTÓ KEZELÉS ---
    async setupCamera() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const btnStart = document.getElementById('btnStartCamera');
        const btnCapture = document.getElementById('btnCapture');

        btnStart.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment" }, 
                    audio: false 
                });
                video.srcObject = stream;
                document.getElementById('videoContainer').classList.remove('d-none');
                btnStart.classList.add('active');
            } catch (err) {
                alert("Nem sikerült elérni a kamerát: " + err.message);
            }
        });

        btnCapture.addEventListener('click', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            // Tömörített JPG készítése (0.6 minőség a LocalStorage kímélése érdekében)
            this.photoBase64 = canvas.toDataURL('image/jpeg', 0.6);
            this.showPreview();
            this.stopCamera();
        });
    }

    stopCamera() {
        const video = document.getElementById('video');
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        document.getElementById('videoContainer').classList.add('d-none');
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            // Kép betöltése canvas-ra átméretezéshez (opcionális, de ajánlott)
            const img = new Image();
            img.onload = () => {
                const canvas = document.getElementById('canvas');
                const ctx = canvas.getContext('2d');
                // Fix max szélesség a tároláshoz
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
        document.getElementById('videoContainer').classList.add('d-none');
    }

    resetPhoto() {
        this.photoBase64 = null;
        document.getElementById('previewContainer').classList.add('d-none');
        document.getElementById('fileInput').value = '';
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
            id: 'ITM-' + Date.now().toString(36).toUpperCase(),
            name,
            location,
            date,
            time: document.getElementById('itemTime').value,
            isEmployee: document.getElementById('isEmployee').checked,
            finder: {
                name: document.getElementById('finderName').value,
                contact: document.getElementById('finderContact').value
            },
            img: this.photoBase64 || 'https://via.placeholder.com/300x200?text=Nincs+fotó',
            status: 'Aktív',
            tags: [location, name.split(' ')[0]]
        };

        this.items.unshift(newItem);
        localStorage.setItem('lostItems', JSON.stringify(this.items));
        
        this.renderItems();
        this.resetForm();
        
        // Modal bezárása (Bootstrap 5)
        bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
    }

    resetForm() {
        document.getElementById('addItemForm').reset();
        this.resetPhoto();
        document.getElementById('itemDate').valueAsDate = new Date();
    }

    renderItems(data = this.items) {
        const grid = document.getElementById('itemGrid');
        const count = document.getElementById('itemCount');
        grid.innerHTML = '';
        count.innerText = data.length;

        data.forEach(item => {
            grid.innerHTML += `
                <div class="col">
                    <div class="card h-100 shadow-sm">
                        <span class="status-badge">Aktív</span>
                        <img src="${item.img}" class="card-img-top" alt="tárgy">
                        <div class="card-body p-3">
                            <div class="mb-2"><span class="item-id-tag">${item.id}</span></div>
                            <h6 class="card-title fw-bold mb-1">${item.name}</h6>
                            <p class="text-muted small mb-2"><i class="bi bi-calendar3 me-1"></i> ${item.date.replace(/-/g, '. ')}</p>
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

document.addEventListener('DOMContentLoaded', () => {
    new LostAndFoundSystem();
});