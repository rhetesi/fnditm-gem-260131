import { Utils } from './utils.js';

export const PDFGenerator = {
    async generate(item) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const COMPANY_NAME = 'CÉG';
        const marginLeft = 25;
        const marginRight = 20;
        const contentWidth = 210 - marginLeft - marginRight;

        const qrCodeDataUrl = await Utils.generateQR(item.id);
        const dateStr = Utils.formatDate(item.date);

        const drawScissorsLine = (y) => {
            doc.setDrawColor(180, 180, 180);
            doc.setLineDashPattern([2, 2], 0);
            doc.line(marginLeft, y, 210 - marginRight, y);
            doc.setLineDashPattern([], 0);
            doc.text('✂', marginLeft - 6, y + 1);
            doc.text('✂', 210 - marginRight + 2, y + 1);
        };

        // 1. SZEKCIÓ (Címke)
        doc.setFont(undefined, 'bold').setFontSize(16);
        doc.text(item.name, marginLeft, 14);
        doc.setFont(undefined, 'normal').setFontSize(10);
        doc.text(`${item.location}, ${dateStr}`, marginLeft, 20);
        if (qrCodeDataUrl) doc.addImage(qrCodeDataUrl, 'PNG', 210 - marginRight - 25, 6, 25, 25);
        doc.setFontSize(8).text(`• ${item.id}`, 210 - marginRight - 12.5, 34, { align: 'center' });
        drawScissorsLine(40);

        // 2. SZEKCIÓ (Nyilvántartás)
        doc.setFont(undefined, 'bold').setFontSize(16).text(item.name, marginLeft, 55);
        doc.setFont(undefined, 'normal').setFontSize(10).text(item.id, 210 - marginRight, 55, { align: 'right' });
        
        // Oldalsáv
        doc.line(210 - marginRight - 2, 55, 210 - marginRight - 2, 180);
        doc.text(`${dateStr} • ${item.name} • ${item.id}`, 210 - marginRight + 2, 55, { angle: -90 });

        // Jogi szöveg (A mintából másolva)
        const ownerStatement = `Átvevő adatainál megjelölt személyként elismerem... [TELJES SZÖVEG]`;
        doc.setFontSize(9).text(doc.splitTextToSize(ownerStatement, contentWidth - 10), marginLeft, 110);
        
        // ... (További aláírás mezők és a 3. szekció helye)

        doc.save(`nyilvantarto_${item.id}.pdf`);
    }
};