export const Utils = {
    // Dátum formázása: yyyy. MM. dd.
    formatDate: (dateStr) => {
        if (!dateStr) return '';
        return dateStr.replace(/-/g, '. ') + '.';
    },

    // QR kód generálása Image Data URL-ként
    generateQR: async (text) => {
        return new Promise((resolve) => {
            const qrDiv = document.createElement("div");
            new QRCode(qrDiv, { text: text, width: 128, height: 128, correctLevel: QRCode.CorrectLevel.M });
            setTimeout(() => {
                const img = qrDiv.querySelector("img");
                resolve(img ? img.src : null);
            }, 200);
        });
    },

    // Kép előkészítése fehér háttérrel (Canvas)
    processImage: (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const maxW = 800;
                    canvas.width = maxW;
                    canvas.height = img.height * (maxW / img.width);
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