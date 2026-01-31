export const Utils = {
    formatDate: (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`;
    },

    generateQR: async (text) => {
        return new Promise((resolve) => {
            const qrDiv = document.getElementById("qrcode");
            qrDiv.innerHTML = "";
            new QRCode(qrDiv, { 
                text: text, 
                width: 128, 
                height: 128, 
                correctLevel: QRCode.CorrectLevel.M 
            });
            setTimeout(() => {
                const img = qrDiv.querySelector("img");
                resolve(img ? img.src : null);
            }, 250);
        });
    },

    processImage: (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 800;
                    canvas.height = img.height * (800 / img.width);
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
};