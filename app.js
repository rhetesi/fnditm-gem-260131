// --- KONFIGURÁCIÓ ÉS MINTADATOK ---
const LOCATIONS = ["Főépület", "Uszoda", "Kert", "Öltöző", "Garázs"];
const USERS = [
    { email: "admin@system.hu", pass: "admin123", name: "Admin Béla", role: "admin" },
    { email: "user@system.hu", pass: "user123", name: "Kezelő Kata", role: "user" }
];

// --- FŐ ALKALMAZÁS LOGIKA ---
class LostAndFoundApp {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('lf_items')) || this.loadSeedData();
        this.currentUser = JSON.parse(sessionStorage.getItem('lf_user')) || null;
        this.activeIssueId = null;
        
        this.init();
    }

    init() {
        this.renderItems();
        this.setupEventListeners();
        this.checkAuthUI();
        this.startInactivityTimer();
    }

    loadSeedData() {
        return [
            { id: "697E0061F28761A8", name: "Piros úszóshort", date: "2026-01-31", location: "Uszoda", tags: ["polyester", "Champion"], status: "Aktív", creator: "admin@system.hu" },
            { id: "697E05624155FD7F", name: "Samsung okosóra", date: "2026-01-31", location: "Öltöző", tags: ["fém", "ezüst"], status: "Aktív", creator: "user@system.hu" },
            { id: "697B781F52740ECF", name: "Férfi karóra", date: "2026-01-29", location: "Főépület", tags: ["Casio", "kerek"], status: "Aktív", creator: "admin@system.hu" }
        ];
    }

    // --- MEGJELENÍTÉS ---
    renderItems() {
        const grid = document.getElementById('itemGrid');
        const fName = document.getElementById('fName').value.toLowerCase();
        const fLoc = document.getElementById('fLocation').value.toLowerCase();
        
        const filtered = this.items.filter(item => 
            item.status === "Aktív" &&
            item.name.toLowerCase().includes(fName) &&
            item.location.toLowerCase().includes(fLoc)
        );

        document.getElementById('itemCount').innerText = filtered.length;
        grid.innerHTML = '';

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'col';
            card.innerHTML = `
                <div class="card h-100 shadow-sm p-2">
                    <span class="status-badge">Aktív</span>
                    <img src="https://via.placeholder.com/300x200?text=${item.name}" class="card-img-top rounded mb-2">
                    <div class="card-body p-1">
                        <div class="item-id-hex mb-1">${item.id}</div>
                        <h6 class="fw-bold mb-1">${item.name}</h6>
                        <p class="text-muted small mb-2">${item.date.replace(/-/g, '. ')}.</p>
                        <div class="mb-2">
                            ${item.tags.map(t => `<span class="tag-badge">${t}</span>`).join('')}
                        </div>
                        ${this.currentUser?.role === 'admin' ? `<div class="small text-primary mb-2">Rögzítő: ${item.creator}</div>` : ''}
                        <button class="btn btn-issue" onclick="app.openIssueModal('${item.id}')">Kiadás indítása</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // --- FUNKCIÓK ---
    saveItem() {
        const name = document.getElementById('itemName').value;
        if(!name) return alert("Név kötelező!");

        const newItem = {
            id: Math.random().toString(16).toUpperCase().substring(2, 18),
            name: name,
            location: document.getElementById('itemLocation').value,
            date: document.getElementById('itemDate').value || new Date().toISOString().split('T')[0],
            tags: document.getElementById('itemTags').value.split(',').map(t => t.trim()),
            status: "Aktív",
            creator: this.currentUser?.email || "Rendszer"
        };

        this.items.unshift(newItem);
        localStorage.setItem('lf_items', JSON.stringify(this.items));
        this.generatePDF(newItem);
        
        bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
        this.renderItems();
    }

    generatePDF(item) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont("helvetica", "bold");
        doc.text("NYILVÁNTARTÓ LAP - " + item.id, 25, 20);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Tárgy: ${item.name}`, 25, 30);
        doc.text(`Helyszín: ${item.location}`, 25, 35);
        doc.text(`Dátum: ${item.date}`, 25, 40);
        
        doc.setLineDashPattern([2, 2], 0);
        doc.line(10, 80, 200, 80); // Szaggatott vonal
        
        doc.text("Átvételi elismervény (Ügyfél példány)", 25, 90);
        
        doc.save(`atvetel_${item.id}.pdf`);
    }

    // --- KIADÁS FOLYAMAT ---
    openIssueModal(id) {
        this.activeIssueId = id;
        const item = this.items.find(i => i.id === id);
        document.getElementById('issueItemTitle').innerText = item.name;
        document.getElementById('issueAuthSection').classList.remove('d-none');
        document.getElementById('issueFormSection').classList.add('d-none');
        new bootstrap.Modal(document.getElementById('issueModal')).show();
    }

    verifyIssuer() {
        const email = document.getElementById('issueEmail').value;
        const pass = document.getElementById('issuePass').value;
        const user = USERS.find(u => u.email === email && u.pass === pass);

        if(user) {
            this.currentUser = user;
            sessionStorage.setItem('lf_user', JSON.stringify(user));
            this.checkAuthUI();
            document.getElementById('issueAuthSection').classList.add('d-none');
            document.getElementById('issueFormSection').classList.remove('d-none');
        } else {
            alert("Hibás adatok!");
        }
    }

    finalizeIssue() {
        if(!document.getElementById('legalAgree').checked) return alert("Elfogadás kötelező!");
        
        const index = this.items.findIndex(i => i.id === this.activeIssueId);
        this.items[index].status = "Kiadott";
        localStorage.setItem('lf_items', JSON.stringify(this.items));
        
        bootstrap.Modal.getInstance(document.getElementById('issueModal')).hide();
        this.renderItems();
        alert("Tárgy sikeresen kiadva és archiválva.");
    }

    // --- AUTH & SEGÉD ---
    checkAuthUI() {
        const btn = document.getElementById('authBtn');
        const badge = document.getElementById('userBadge');
        if(this.currentUser) {
            btn.innerText = "Kijelentkezés";
            badge.innerText = `${this.currentUser.name} (${this.currentUser.role})`;
        } else {
            btn.innerText = "Bejelentkezés";
            badge.innerText = "";
        }
    }

    toggleLogin() {
        if(this.currentUser) {
            sessionStorage.removeItem('lf_user');
            location.reload();
        } else {
            // Egyszerűsített login
            this.currentUser = USERS[0]; // Admin beléptetés teszthez
            sessionStorage.setItem('lf_user', JSON.stringify(this.currentUser));
            this.checkAuthUI();
            this.renderItems();
        }
    }

    startInactivityTimer() {
        let time;
        const reset = () => {
            clearTimeout(time);
            time = setTimeout(() => {
                alert("Munkamenet lejárt inaktivitás miatt.");
                sessionStorage.removeItem('lf_user');
                location.reload();
            }, 120000); // 2 perc
        };
        window.onload = reset;
        document.onmousemove = reset;
        document.onkeypress = reset;
    }

    setupEventListeners() {
        ['fName', 'fLocation'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.renderItems());
        });
        
        document.getElementById('isEmployee').addEventListener('change', (e) => {
            document.getElementById('finderDetails').classList.toggle('d-none', e.target.checked);
        });
    }
}

// UI segéd
const uiManager = {
    openAddModal: () => {
        document.getElementById('itemDate').valueAsDate = new Date();
        new bootstrap.Modal(document.getElementById('addModal')).show();
    }
};

const app = new LostAndFoundApp();
