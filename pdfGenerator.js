import { Utils } from './utils.js';
import { RobotoBase64 } from './fonts.js';

export const PDFGenerator = {
    async generate(item) {
        const { jsPDF } = window.jspdf;
        
        // --- A MINTA SZERINTI DOC KIALAKÍTÁS ---
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        // Roboto betűtípusok betöltése és hozzáadása
        try {
            if (RobotoBase64.normal && RobotoBase64.bold) {
                doc.addFileToVFS('Roboto-Regular.ttf', RobotoBase64.normal);
                doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
                doc.addFileToVFS('Roboto-Bold.ttf', RobotoBase64.bold);
                doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
                doc.setFont('Roboto');
            }
        } catch (error) {
            console.error('Failed to load Roboto fonts, using default:', error);
            doc.setFont('helvetica');
        }

        const pageWidth = 210;
        const pageHeight = 297;
        const marginTop = 6;
        const marginLeft = 25;
        const marginRight = 20;
        const contentWidth = pageWidth - marginLeft - marginRight;
        const COMPANY_NAME = 'CÉG';

        const qrCodeDataUrl = await Utils.generateQR(item.id);
        const formattedDate = Utils.formatDate(item.date);
        const creatorName = item.creatorName || 'Rendszergazda';

        // Márka és paraméterek formázása a minta szerint
        const brandLine = item.brand ? `${item.brand}${item.material || item.color || item.shape ? ` (${[item.material, item.color, item.shape].filter(Boolean).join(', ')})` : ''}` : '';

        const qrSize = 25;
        const section1Top = marginTop;
        const section1Height = 45;
        const section1BottomLine = section1Top + section1Height;
        const section2Top = section1BottomLine + 3;

        const drawScissorsLine = (y) => {
            doc.setDrawColor(180, 180, 180);
            doc.setLineDashPattern([2, 2], 0);
            doc.setLineWidth(0.3);
            doc.line(marginLeft, y, pageWidth - marginRight, y);
            doc.setLineDashPattern([], 0);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('✂', marginLeft - 6, y + 1);
            doc.text('✂', pageWidth - marginRight + 2, y + 1);
            doc.setTextColor(0, 0, 0);
        };

        // 1. NYILVÁNTARTÓ CÍMKE
        let currentY = section1Top + 8;
        doc.setFontSize(16);
        doc.setFont('Roboto', 'bold');
        doc.text(item.name, marginLeft, currentY);
        currentY += 6;
        if (brandLine) {
            doc.setFontSize(10);
            doc.setFont('Roboto', 'normal');
            doc.text(brandLine, marginLeft, currentY);
            currentY += 5;
        }
        doc.setFontSize(10);
        doc.setFont('Roboto', 'normal');
        doc.text(`${item.location}, ${formattedDate}`, marginLeft, currentY);

        if (qrCodeDataUrl) {
            doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - marginRight - qrSize, section1Top + 2, qrSize, qrSize);
        }
        currentY = section1Top + qrSize + 7;
        doc.setFontSize(8);
        const idTextWidth = doc.getTextWidth(item.id);
        doc.text(item.id, pageWidth - marginRight - qrSize / 2 - idTextWidth / 2, currentY);
        drawScissorsLine(section1BottomLine);

        // 2. NYILVÁNTARTÁS (Belső rész)
        currentY = section2Top + 8;
        doc.setFontSize(16);
        doc.setFont('Roboto', 'bold');
        doc.text(item.name, marginLeft, currentY);
        doc.setFontSize(10);
        doc.setFont('Roboto', 'normal');
        doc.text(item.id, pageWidth - marginRight - doc.getTextWidth(item.id), currentY);
        currentY += 6;
        if (brandLine) {
            doc.setFontSize(10);
            doc.text(brandLine, marginLeft, currentY);
            currentY += 5;
        }
        doc.text(`${item.location}, ${formattedDate}`, marginLeft, currentY);
        currentY += 10;

        // Függőleges sáv a jobb oldalon
        const sidebarX = pageWidth - marginRight + 2;
        const sidebarTop = section2Top + 5;
        doc.setLineWidth(0.5);
        doc.line(pageWidth - marginRight - 2, sidebarTop, pageWidth - marginRight - 2, sidebarTop + 150);
        doc.setFontSize(10); doc.setFont('Roboto', 'bold');
        doc.text(item.id, sidebarX, sidebarTop + 15, { angle: 90 });
        doc.setFontSize(8); doc.text('•', sidebarX, sidebarTop + 30, { angle: 90 });
        doc.setFontSize(12); doc.text(item.name, sidebarX, sidebarTop + 45, { angle: 90 });
        doc.setFontSize(8); doc.text('•', sidebarX, sidebarTop + 95, { angle: 90 });
        doc.setFontSize(12); doc.text(formattedDate, sidebarX, sidebarTop + 110, { angle: 90 });

        doc.setFontSize(10); doc.setFont('Roboto', 'normal');
        doc.text('Átvevő neve: ___________________________________________________________________________', marginLeft, currentY);
        currentY += 7;
        doc.text('Átvevő lakcíme: ________________________________________________________________________', marginLeft, currentY);
        currentY += 7;
        doc.text('___________________________________________________________________________________________', marginLeft, currentY);
        currentY += 7;
        doc.text('Személyazonosító okmány típusa és azonosítója: _________________________________________', marginLeft, currentY);
        currentY += 12;

        doc.setFontSize(9);
        const ownerStatement = `Átvevő adatainál megjelölt személyként elismerem, hogy mai napon, a '${COMPANY_NAME}' képviselője, a megjelölt tárgyat, mint személyes tulajdonomat részemre átadta. A tárgyat megvizsgáltam, azzal kapcsolatban mennyiségi, minőségi kifogást nem támasztok a '${COMPANY_NAME}' felé, egyidejűleg elismerem, hogy általam történő elhagyása és megtalálása között a tárgy mennyiségi, minőségi változásaiért a '${COMPANY_NAME}' nem tartozik felelősséggel. Meggyőződtem arról, hogy a '${COMPANY_NAME}' a tárgyat annak megtalálásától az elvárható gondossággal őrizte meg.`;
        const ownerLines = doc.splitTextToSize(ownerStatement, contentWidth - 25);
        doc.text(ownerLines, marginLeft, currentY);
        currentY += ownerLines.length * 4 + 10;

        const signatureWidth = (contentWidth - 25) / 3;
        doc.text('__________________', marginLeft, currentY);
        doc.text('__________________', marginLeft + signatureWidth, currentY);
        doc.text('__________________', marginLeft + signatureWidth * 2, currentY);
        currentY += 4;
        doc.setFontSize(8);
        doc.text('dátum', marginLeft + 15, currentY);
        doc.text('átadó', marginLeft + signatureWidth + 15, currentY);
        doc.text('átvevő', marginLeft + signatureWidth * 2 + 15, currentY);
        currentY += 12;

        if (item.isEmployee) {
            doc.setFontSize(10);
            doc.text(`A tárgyat a napi zárás során a '${COMPANY_NAME}' munkavállalója találta.`, marginLeft, currentY);
            currentY += 15;
        } else {
            doc.setFontSize(11); doc.setFont('Roboto', 'bold');
            doc.text(`${item.finderName}${item.finderContact ? ` (${item.finderContact})` : ''}`, marginLeft, currentY);
            currentY += 5;
            doc.setFontSize(9); doc.setFont('Roboto', 'normal');
            const finderStatement = `mint találó kijelentem, hogy az általam talált fent megjelölt tárgy NEM tartozik a személyes és közeli hozzátartozóim tulajdona köréinbe, így annak tulajdonjogára sem most, sem később nem tartok igényt... (stb)`;
            const finderLines = doc.splitTextToSize(finderStatement, contentWidth - 25);
            doc.text(finderLines, marginLeft, currentY);
            currentY += finderLines.length * 3.5 + 8;
            doc.setFontSize(10); doc.text(formattedDate, marginLeft, currentY);
            const sigSpacing = (contentWidth - 25 - 30) / 2;
            doc.text('__________________', marginLeft + 40 + sigSpacing * 0.5, currentY);
            doc.text('__________________', marginLeft + 40 + sigSpacing * 1.5, currentY);
        }

        const section2BottomLine = currentY + 8;
        drawScissorsLine(section2BottomLine);

        // 3. ÁTVÉTELI ELISMERVÉNY
        currentY = section2BottomLine + 10;
        doc.setFontSize(16); doc.setFont('Roboto', 'bold');
        doc.text('Átvételi elismervény', marginLeft, currentY);
        currentY += 10;
        doc.setFontSize(12); doc.text(item.name, marginLeft, currentY);
        currentY += 8;
        doc.setFontSize(9); doc.setFont('Roboto', 'normal');
        const ackStatement = `A „${COMPANY_NAME.toLowerCase()}" képviseletében elismerem, hogy a fent megnevezett tárgyat átvettük.`;
        doc.text(doc.splitTextToSize(ackStatement, contentWidth), marginLeft, currentY);

        doc.save(`nyilvantarto_${item.id}.pdf`);
    }
};