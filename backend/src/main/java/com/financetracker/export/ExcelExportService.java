package com.financetracker.export;

import com.financetracker.entity.Transaction;
import com.financetracker.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * Excel export service — generates a .xlsx file from transactions
 */
@Service
@RequiredArgsConstructor
public class ExcelExportService {

    private final TransactionRepository transactionRepository;

    public byte[] exportTransactions() throws IOException {
        List<Transaction> transactions = transactionRepository.findAllByOrderByDateDesc();

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Transactions");

            // Styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);
            CellStyle incomeStyle = createColorStyle(workbook, IndexedColors.LIGHT_GREEN.getIndex());
            CellStyle expenseStyle = createColorStyle(workbook, IndexedColors.ROSE.getIndex());
            CellStyle dateStyle = createDateStyle(workbook);

            // Title row
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Finance Tracker — Transactions Export");
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleStyle.setFont(titleFont);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 7));

            // Header row
            String[] headers = {"ID", "Date", "Type", "Category", "Description", "Notes", "Amount", "Currency"};
            Row headerRow = sheet.createRow(2);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 3;
            for (Transaction t : transactions) {
                Row row = sheet.createRow(rowNum++);

                row.createCell(0).setCellValue(t.getId());
                Cell dateCell = row.createCell(1);
                dateCell.setCellValue(t.getDate().toString());
                dateCell.setCellStyle(dateStyle);

                Cell typeCell = row.createCell(2);
                typeCell.setCellValue(t.getType().name());
                typeCell.setCellStyle(t.getType().name().equals("INCOME") ? incomeStyle : expenseStyle);

                row.createCell(3).setCellValue(t.getCategory() != null ? t.getCategory().getName() : "—");
                row.createCell(4).setCellValue(t.getDescription());
                row.createCell(5).setCellValue(t.getNotes() != null ? t.getNotes() : "");

                Cell amountCell = row.createCell(6);
                amountCell.setCellValue(t.getAmount().doubleValue());
                amountCell.setCellStyle(currencyStyle);

                row.createCell(7).setCellValue("DZD");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            workbook.write(output);
            return output.toByteArray();
        }
    }

    private CellStyle createHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        DataFormat format = wb.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0.00"));
        return style;
    }

    private CellStyle createColorStyle(Workbook wb, short color) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(color);
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createDateStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        DataFormat format = wb.createDataFormat();
        style.setDataFormat(format.getFormat("yyyy-mm-dd"));
        return style;
    }
}
