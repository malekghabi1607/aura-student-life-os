package com.financetracker.controller;

import com.financetracker.dto.DashboardStats;
import com.financetracker.export.ExcelExportService;
import com.financetracker.export.PdfExportService;
import com.financetracker.service.StatisticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
@Tag(name = "Statistics & Export", description = "Dashboard statistics and data export endpoints")
@SuppressWarnings("null")
public class StatisticsController {

    private final StatisticsService statisticsService;
    private final ExcelExportService excelExportService;
    private final PdfExportService pdfExportService;

    @GetMapping("/dashboard")
    @Operation(summary = "Get full dashboard statistics")
    public ResponseEntity<DashboardStats> getDashboard() {
        return ResponseEntity.ok(statisticsService.getDashboardStats());
    }

    @GetMapping("/export/excel")
    @Operation(summary = "Export the authenticated user's transactions to Excel (.xlsx)")
    public ResponseEntity<byte[]> exportExcel() throws IOException {
        byte[] data = excelExportService.exportTransactions();
        String filename = "transactions-" + LocalDate.now() + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @GetMapping("/export/pdf")
    @Operation(summary = "Export the authenticated user's transactions to PDF")
    public ResponseEntity<byte[]> exportPdf() throws IOException {
        byte[] data = pdfExportService.exportTransactions();
        String filename = "transactions-" + LocalDate.now() + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }
}
