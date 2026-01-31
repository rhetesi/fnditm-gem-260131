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
        
        // Részletes leírás összefűzése a minta alapján: Márka (anyag, szín, forma)
        const details = [item.material, item.color, item.shape].filter(Boolean).join(', ');
        const fullDescription = item.brand ? `${item.brand} (${details})` : details;

        const drawLine = (y) => {
            doc.setDrawColor(180).setLineDashPattern([2, 2], 0);
            doc.line(marginLeft, y, 210 - marginRight, y);
            doc.setLineDashPattern([], 0).setFontSize(8).setTextColor(150);
            doc.text('✂', marginLeft - 6, y + 1);
            doc.text('✂', 210 - marginRight + 2, y + 1);
            doc.setTextColor(0);
        };

        // --- 1. RÉSZ: CÍMKE ---
        doc.setFont(undefined, 'bold').setFontSize(16).text(item.name, marginLeft, 14);
        doc.setFont(undefined, 'normal').setFontSize(10).text(fullDescription, marginLeft, 19);
        doc.text(`${item.location}, ${dateStr}`, marginLeft, 24);
        if (qrCodeDataUrl) doc.addImage(qrCodeDataUrl, 'PNG', 210 - marginRight - 25, 6, 25, 25);
        doc.setFontSize(8).text(`• ${item.id}`, 210 - marginRight - 12.5, 34, { align: 'center' });
        drawLine(40);

        // --- 2. RÉSZ: NYILVÁNTARTÁS ---
        let currY = 55;
        doc.setFont(undefined, 'bold').setFontSize(16).text(item.name, marginLeft, currY);
        doc.setFont(undefined, 'normal').setFontSize(10).text(item.id, 210 - marginRight, currY, { align: 'right' });
        currY += 6;
        doc.text(fullDescription, marginLeft, currY);
        currY += 6;
        doc.text(`${item.location}, ${dateStr}`, marginLeft, currY);

        // Függőleges oldalsáv (Minta B)
        doc.setLineWidth(0.5).line(210 - marginRight - 2, 55, 210 - marginRight - 2, 200);
        doc.setFont(undefined, 'bold').text(`${dateStr} • ${item.name} • ${item.id}`, 210 - marginRight + 2, 55, { angle: -90 });

        currY += 15;
        doc.setFont(undefined, 'normal').setFontSize(10);
        doc.text('Átvevő neve: ___________________________________________________________', marginLeft, currY);
        currY += 8;
        doc.text('Átvevő lakcíme: ________________________________________________________', marginLeft, currY);
        currY += 15;
        doc.text('Személyazonosító okmány típusa és azonosítója: __________________________', marginLeft, currY);

        currY += 12;
        doc.setFontSize(9);
        const ownerStatement = `Átvevő adatainál megjelölt személyként elismerem, hogy mai napon, a '${COMPANY_NAME}' képviselője, a megjelölt tárgyat, mint személyes tulajdonomat részemre átadta. A tárgyat megvizsgáltam, azzal kapcsolatban mennyiségi, minőségi kifogást nem támasztok a '${COMPANY_NAME}' felé, egyidejűleg elismerem, hogy általam történő elhagyása és megtalálása között a tárgy mennyiségi, minőségi változásaiért a '${COMPANY_NAME}' nem tartozik felelősséggel. Meggyőződtem arról, hogy a '${COMPANY_NAME}' a tárgyat annak megtalálásától az elvárható gondosságal őrizte meg.`;
        doc.text(doc.splitTextToSize(ownerStatement, contentWidth - 10), marginLeft, currY, { align: 'justify' });

        currY += 25;
        doc.text('__________________', marginLeft, currY);
        doc.text('__________________', marginLeft + 55, currY);
        doc.text('__________________', marginLeft + 110, currY);
        doc.setFontSize(7).text('dátum', marginLeft + 15, currY + 4).text('átadó', marginLeft + 70, currY + 4).text('átvevő', marginLeft + 125, currY + 4);

        currY += 15;
        if (item.isEmployee) {
            doc.setFontSize(10).text(`A tárgyat a napi zárás során a '${COMPANY_NAME}' munkavállalója találta.`, marginLeft, currY);
        } else {
            doc.setFont(undefined, 'bold').text(`${item.finderName} (${item.finderContact || 'Név (lakcím)'})`, marginLeft, currY);
            currY += 5;
            doc.setFont(undefined, 'normal').setFontSize(8);
            const fStatement = "mint találó kijelentem, hogy az általam talált fent megjelölt tárgy NEM tartozik a személyes és közeli hozzátartozóim tulajdona körébe, így annak tulajdonjogára sem most, sem később nem tartok igényt...";
            doc.text(doc.splitTextToSize(fStatement, contentWidth - 10), marginLeft, currY);
        }
        drawLine(215);

        // --- 3. RÉSZ: ÁTVÉTELI ELISMERVÉNY ---
        currY = 230;
        doc.setFont(undefined, 'bold').setFontSize(16).text('Átvételi elismervény', marginLeft, currY);
        currY += 10;
        doc.setFontSize(12).text(item.name, marginLeft, currY);
        currY += 7;
        doc.setFontSize(9).setFont(undefined, 'normal');
        const ack = `A „${COMPANY_NAME.toLowerCase()}" képviseletében elismerem, hogy a fent megnevezett tárgyat átvettük. Tájékoztattam a találót, hogy ezen átvételi elismervény NEM jogosít a talált tárgy találó részére történő kiadására.`;
        doc.text(doc.splitTextToSize(ack, contentWidth), marginLeft, currY);
        
        doc.save(`nyilvantarto_${item.id}.pdf`);
    }
};