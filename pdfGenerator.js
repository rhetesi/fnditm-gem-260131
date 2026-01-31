import { Utils } from './utils.js';

export const PDFGenerator = {
    async generate(item) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const COMPANY_NAME = 'CÉG';
        const qrCodeDataUrl = await Utils.generateQR(item.id);
        const formattedDate = Utils.formatDate(item.date);
        
        // Tulajdonságok összefűzése: Márka (anyag, szín, forma)
        const details = [item.material, item.color, item.shape].filter(Boolean).join(', ');
        const brandLine = item.brand ? `${item.brand} (${details})` : details;

        const pageWidth = 210;
        const marginLeft = 25;
        const marginRight = 20;
        const contentWidth = pageWidth - marginLeft - marginRight;

        // --- 1. RÉSZ: NYILVÁNTARTÓ CÍMKE ---
        doc.setFont(undefined, 'bold');
        doc.setFontSize(16);
        doc.text(item.name || '', marginLeft, 14);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        if (brandLine) {
            doc.text(brandLine, marginLeft, 19);
        }
        doc.text(`${item.location || ''}, ${formattedDate}`, marginLeft, 24);

        if (qrCodeDataUrl) {
            doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - marginRight - 25, 6, 25, 25);
        }
        doc.setFontSize(8);
        doc.text(`• ${item.id}`, pageWidth - marginRight - 12.5, 35, { align: 'center' });

        this.drawScissorsLine(doc, marginLeft, 40, pageWidth - marginRight);

        // --- 2. RÉSZ: NYILVÁNTARTÓ LAP ---
        let currentY = 55;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(16);
        doc.text(item.name || '', marginLeft, currentY);
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(item.id, pageWidth - marginRight, currentY, { align: 'right' });

        currentY += 6;
        if (brandLine) {
            doc.text(brandLine, marginLeft, currentY);
            currentY += 6;
        }
        doc.text(`${item.location || ''}, ${formattedDate}`, marginLeft, currentY);

        // FÜGGŐLEGES OLDALSÁV (Elforgatott szöveg a minta alapján)
        const sidebarX = pageWidth - marginRight + 2;
        doc.setLineWidth(0.5);
        doc.line(pageWidth - marginRight - 2, 55, pageWidth - marginRight - 2, 200);
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text(item.id, sidebarX, 70, { angle: -90 });
        doc.setFontSize(8);
        doc.text('•', sidebarX, 85, { angle: -90 });
        doc.setFontSize(12);
        doc.text(item.name || '', sidebarX, 100, { angle: -90 });
        doc.setFontSize(8);
        doc.text('•', sidebarX, 145, { angle: -90 });
        doc.setFontSize(12);
        doc.text(formattedDate, sidebarX, 160, { angle: -90 });

        // Kitöltendő mezők
        currentY += 15;
        doc.setFontSize(10);
        doc.text('Átvevő neve: ___________________________________________________________', marginLeft, currentY);
        currentY += 8;
        doc.text('Átvevő lakcíme: ________________________________________________________', marginLeft, currentY);
        currentY += 8;
        doc.text('________________________________________________________________________', marginLeft, currentY);
        currentY += 10;
        doc.text('Személyazonosító okmány típusa és azonosítója: __________________________', marginLeft, currentY);

        // Jogi nyilatkozat
        currentY += 12;
        doc.setFontSize(9);
        const ownerStatement = `Átvevő adatainál megjelölt személyként elismerem, hogy mai napon, a '${COMPANY_NAME}' képviselője, a megjelölt tárgyat, mint személyes tulajdonomat részemre átadta. A tárgyat megvizsgáltam, azzal kapcsolatban mennyiségi, minőségi kifogást nem támasztok a '${COMPANY_NAME}' felé, egyidejűleg elismerem, hogy általam történő elhagyása és megtalálása között a tárgy mennyiségi, minőségi változásaiért a '${COMPANY_NAME}' nem tartozik felelősséggel. Meggyőződtem arról, hogy a '${COMPANY_NAME}' a tárgyat annak megtalálásától az elvárható gondosságal őrizte meg.`;
        doc.text(doc.splitTextToSize(ownerStatement, contentWidth - 10), marginLeft, currentY, { align: 'justify' });

        currentY += 25;
        doc.text('__________________', marginLeft, currentY);
        doc.text('__________________', marginLeft + 55, currentY);
        doc.text('__________________', marginLeft + 110, currentY);
        currentY += 4;
        doc.setFontSize(7);
        doc.text('dátum', marginLeft + 15, currentY);
        doc.text('átadó', marginLeft + 70, currentY);
        doc.text('átvevő', marginLeft + 125, currentY);

        // Találó rész
        currentY += 15;
        if (item.isEmployee) {
            doc.setFontSize(10);
            doc.text(`A tárgyat a napi zárás során a '${COMPANY_NAME}' munkavállalója találta.`, marginLeft, currentY);
        } else {
            doc.setFont(undefined, 'bold').setFontSize(10);
            doc.text(`${item.finderName || ''} (${item.finderContact || 'Név (lakcím)'})`, marginLeft, currentY);
            currentY += 5;
            doc.setFont(undefined, 'normal').setFontSize(8.5);
            const finderStatement = `mint találó kijelentem, hogy az általam talált fent megjelölt tárgy NEM tartozik a személyes és közeli hozzátartozóim tulajdona körébe, így annak tulajdonjogára sem most, sem később nem tartok igényt. Egyben kijelentem, hogy megértettem és tudomásul veszem, hogy az átvételi elismervényen található figyelmeztetés szerint az átvételi elismervény nem jogosít a talált tárgy kiadására.`;
            doc.text(doc.splitTextToSize(finderStatement, contentWidth - 10), marginLeft, currentY, { align: 'justify' });
            
            currentY += 15;
            doc.setFontSize(10);
            doc.text(formattedDate, marginLeft, currentY);
            doc.text('__________________', marginLeft + 60, currentY);
            doc.text('__________________', marginLeft + 110, currentY);
            currentY += 4;
            doc.setFontSize(7);
            doc.text('átadó', marginLeft + 75, currentY);
            doc.text('cég képviselője', marginLeft + 125, currentY);
        }

        this.drawScissorsLine(doc, marginLeft, 215, pageWidth - marginRight);

        // --- 3. RÉSZ: ÁTVÉTELI ELISMERVÉNY ---
        currentY = 225;
        doc.setFont(undefined, 'bold').setFontSize(16);
        doc.text('Átvételi elismervény', marginLeft, currentY);
        currentY += 10;
        doc.setFontSize(12);
        doc.text(item.name || '', marginLeft, currentY);
        currentY += 7;
        doc.setFontSize(10);
        const fLabel = item.isEmployee ? `A '${COMPANY_NAME}' munkavállalója` : `${item.finderName || ''} (${item.finderContact || 'lakcím'})`;
        doc.text(fLabel, marginLeft, currentY);
        currentY += 8;
        doc.setFont(undefined, 'normal').setFontSize(9);
        const receiptTxt = `A „${COMPANY_NAME.toLowerCase()}" képviseletében elismerem, hogy a fent megnevezett tárgyat, megnevezett találótól átvettük. Egyben tájékoztattam a találót, hogy ezen átvételi elismervény NEM jogosít a talált tárgy találó részére történő kiadására.`;
        doc.text(doc.splitTextToSize(receiptTxt, contentWidth), marginLeft, currentY, { align: 'justify' });

        currentY += 20;
        doc.text(formattedDate, marginLeft, currentY);
        doc.text('ph.', marginLeft + 70, currentY);
        doc.text('________________________', marginLeft + 100, currentY);

        doc.save(`nyilvantarto_${item.id}.pdf`);
    },

    drawScissorsLine(doc, x1, y, x2) {
        doc.setDrawColor(180);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(x1, y, x2, y);
        doc.setLineDashPattern([], 0);
        doc.setFontSize(10);
        doc.text('✂', x1 - 5, y + 1);
        doc.text('✂', x2 + 1, y + 1);
    }
};