import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFColumn {
    headerName?: string;
    field: string;
}

interface PDFGeneratorOptions {
    title: string;
    description?: string;
    columns: PDFColumn[];
    data: any[];
}

export const generateAndPrintPDF = ({ title, description, columns, data }: PDFGeneratorOptions) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // Report Title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(title.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    // Report Description
    if (description) {
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(description, pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;
    }

    // Prepare table headers and body
    const head = [columns.map(col => col.headerName || col.field)];
    // Convert data to arrays in the order of columns
    const body = data.map(row => 
        columns.map(col => {
            const val = row[col.field];
            return val !== null && val !== undefined ? String(val) : '';
        })
    );

    // Generate table
    autoTable(doc, {
        startY: currentY,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: {
            fillColor: [63, 81, 181], // MUI Primary color approximate
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center',
        },
        bodyStyles: {
            fontSize: 9,
            textColor: 50,
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        margin: { top: 20, right: 15, bottom: 20, left: 15 },
        didDrawPage: function (data) {
            // Header for every page except the first where we already draw the title
            if (data.pageNumber > 1) {
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150);
                doc.text(title, data.settings.margin.left, 15);
            }

            // Footer with page number
            const str = 'Página ' + data.pageNumber;
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(
                str,
                data.settings.margin.left,
                doc.internal.pageSize.getHeight() - 10
            );

            // Print Date
            const dateStr = new Date().toLocaleString('pt-BR');
            doc.text(
                `Gerado em: ${dateStr}`,
                doc.internal.pageSize.getWidth() - data.settings.margin.right,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'right' }
            );
        },
    });

    // Output PDF to a new tab/window
    const pdfOutputUrl = doc.output('bloburl');
    window.open(pdfOutputUrl, '_blank');
};
