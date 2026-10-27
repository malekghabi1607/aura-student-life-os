package com.financetracker.export;

import com.financetracker.dto.TransactionResponse;
import com.financetracker.enums.TransactionType;
import com.financetracker.service.TransactionService;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

/**
 * PDF export service — generates a formatted PDF report from transactions
 */
@Service
@RequiredArgsConstructor
public class PdfExportService {

    private final TransactionService transactionService;

    public byte[] exportTransactions() throws IOException {
        List<TransactionResponse> transactions = transactionService.findAll();

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(output);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);

        PdfFont bold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);

        DeviceRgb primaryColor = new DeviceRgb(30, 58, 138);   // dark blue
        DeviceRgb incomeColor = new DeviceRgb(22, 163, 74);    // green
        DeviceRgb expenseColor = new DeviceRgb(220, 38, 38);   // red

        // Title
        Paragraph title = new Paragraph("Finance Tracker — Transaction Report")
                .setFont(bold)
                .setFontSize(20)
                .setFontColor(primaryColor)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(5);
        document.add(title);

        Paragraph subtitle = new Paragraph("Generated on: " + java.time.LocalDate.now())
                .setFont(regular)
                .setFontSize(10)
                .setFontColor(ColorConstants.GRAY)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(20);
        document.add(subtitle);

        // Summary
        BigDecimal totalIncome = transactions.stream()
                .filter(t -> t.getType() == TransactionType.INCOME)
                .map(TransactionResponse::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalExpense = transactions.stream()
                .filter(t -> t.getType() == TransactionType.EXPENSE)
                .map(TransactionResponse::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Table summaryTable = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1}))
                .useAllAvailableWidth()
                .setMarginBottom(20);

        addSummaryCell(summaryTable, "Total Income", totalIncome.toString() + " DZD", incomeColor, bold);
        addSummaryCell(summaryTable, "Total Expenses", totalExpense.toString() + " DZD", expenseColor, bold);
        addSummaryCell(summaryTable, "Balance",
                totalIncome.subtract(totalExpense).toString() + " DZD", primaryColor, bold);
        document.add(summaryTable);

        // Transactions table
        float[] colWidths = {0.5f, 1.2f, 1f, 1.5f, 2.5f, 1.5f};
        Table table = new Table(UnitValue.createPercentArray(colWidths)).useAllAvailableWidth();

        // Table headers
        String[] headers = {"#", "Date", "Type", "Category", "Description", "Amount"};
        for (String header : headers) {
            table.addHeaderCell(new Cell()
                    .add(new Paragraph(header).setFont(bold).setFontSize(9).setFontColor(ColorConstants.WHITE))
                    .setBackgroundColor(primaryColor)
                    .setTextAlignment(TextAlignment.CENTER));
        }

        // Table rows
        boolean alternate = false;
        for (TransactionResponse t : transactions) {
            DeviceRgb rowBg = alternate ? new DeviceRgb(245, 247, 250) : new DeviceRgb(255, 255, 255);
            DeviceRgb typeColor = t.getType() == TransactionType.INCOME ? incomeColor : expenseColor;

            table.addCell(new Cell().add(new Paragraph(String.valueOf(t.getId())).setFont(regular).setFontSize(8)).setBackgroundColor(rowBg));
            table.addCell(new Cell().add(new Paragraph(t.getDate().toString()).setFont(regular).setFontSize(8)).setBackgroundColor(rowBg));
            table.addCell(new Cell().add(new Paragraph(t.getType().name()).setFont(bold).setFontSize(8).setFontColor(typeColor)).setBackgroundColor(rowBg));
            table.addCell(new Cell().add(new Paragraph(t.getCategoryName() != null ? t.getCategoryName() : "—").setFont(regular).setFontSize(8)).setBackgroundColor(rowBg));
            table.addCell(new Cell().add(new Paragraph(t.getDescription()).setFont(regular).setFontSize(8)).setBackgroundColor(rowBg));
            table.addCell(new Cell().add(new Paragraph(t.getAmount().toString()).setFont(bold).setFontSize(8).setFontColor(typeColor)).setBackgroundColor(rowBg).setTextAlignment(TextAlignment.RIGHT));

            alternate = !alternate;
        }

        document.add(table);
        document.close();
        return output.toByteArray();
    }

    private void addSummaryCell(Table table, String label, String value, DeviceRgb color, PdfFont boldFont) {
        Cell cell = new Cell()
                .add(new Paragraph(label).setFontSize(9).setFontColor(ColorConstants.GRAY))
                .add(new Paragraph(value).setFont(boldFont).setFontSize(13).setFontColor(color))
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(10)
                .setBackgroundColor(new DeviceRgb(248, 250, 252));
        table.addCell(cell);
    }
}
