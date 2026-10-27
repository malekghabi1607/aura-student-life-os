package com.financetracker.export;

import com.financetracker.controller.StatisticsController;
import com.financetracker.entity.Transaction;
import com.financetracker.entity.User;
import com.financetracker.enums.TransactionType;
import com.financetracker.repository.CategoryRepository;
import com.financetracker.repository.TransactionRepository;
import com.financetracker.repository.UserRepository;
import com.financetracker.service.TransactionService;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Real controllers, export generators and transaction service; no application DB is used.
class ExportIsolationTest {
    private final TransactionRepository transactions = mock(TransactionRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final TransactionService service = new TransactionService(
            transactions, mock(CategoryRepository.class), users);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new StatisticsController(
            null, new ExcelExportService(service), new PdfExportService(service))).build();

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    private void prepareUsers() {
        for (long id = 1; id <= 2; id++) {
            User user = new User();
            user.setId(id);
            user.setEmail("user" + id + "@test.local");
            when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
            Transaction tx = Transaction.builder().id(id).userId(id)
                    .description("PRIVATE_USER_" + id).notes("SECRET_NOTE_" + id)
                    .amount(new BigDecimal(id == 1 ? "123.45" : "987.65"))
                    .date(LocalDate.of(2026, 1, 1)).type(TransactionType.INCOME).build();
            when(transactions.findByUserIdOrderByDateDesc(id)).thenReturn(List.of(tx));
        }
    }

    private void login(long id) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("user" + id + "@test.local", null, List.of()));
    }

    @Test
    void excelContainsOnlyAuthenticatedUsersRowsEvenWithForeignUserParameter() throws Exception {
        prepareUsers();
        for (long id = 1; id <= 2; id++) {
            login(id);
            byte[] bytes = mvc.perform(get("/api/statistics/export/excel")
                            .param("userId", String.valueOf(3 - id)))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
            try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
                var sheet = workbook.getSheetAt(0);
                assertThat(sheet.getLastRowNum()).isEqualTo(3);
                assertThat(sheet.getRow(3).getCell(4).getStringCellValue()).isEqualTo("PRIVATE_USER_" + id);
                assertThat(sheet.getRow(3).getCell(5).getStringCellValue()).isEqualTo("SECRET_NOTE_" + id);
                assertThat(sheet.getRow(3).getCell(6).getNumericCellValue()).isEqualTo(id == 1 ? 123.45 : 987.65);
            }
        }
        verify(transactions).findByUserIdOrderByDateDesc(1L);
        verify(transactions).findByUserIdOrderByDateDesc(2L);
        verifyNoMoreInteractions(transactions);
    }

    @Test
    void pdfContainsOnlyAuthenticatedUsersRowsAndTotals() throws Exception {
        prepareUsers();
        for (long id = 1; id <= 2; id++) {
            login(id);
            byte[] bytes = mvc.perform(get("/api/statistics/export/pdf")
                            .param("userId", String.valueOf(3 - id)))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
            try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(bytes)))) {
                StringBuilder text = new StringBuilder();
                for (int page = 1; page <= pdf.getNumberOfPages(); page++) {
                    text.append(PdfTextExtractor.getTextFromPage(pdf.getPage(page)));
                }
                assertThat(text.toString()).contains("PRIVATE_USER_" + id)
                        .doesNotContain("PRIVATE_USER_" + (3 - id))
                        .contains(id == 1 ? "123.45 DZD" : "987.65 DZD")
                        .doesNotContain(id == 1 ? "987.65" : "123.45");
            }
        }
        verify(transactions).findByUserIdOrderByDateDesc(1L);
        verify(transactions).findByUserIdOrderByDateDesc(2L);
        verifyNoMoreInteractions(transactions);
    }

    @Test
    void emptyAccountExportsNoOtherAccountsTransactions() throws Exception {
        User user = new User();
        user.setId(2L);
        when(users.findByEmail("user2@test.local")).thenReturn(Optional.of(user));
        when(transactions.findByUserIdOrderByDateDesc(2L)).thenReturn(List.of());
        login(2L);
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(
                new ExcelExportService(service).exportTransactions()))) {
            assertThat(workbook.getSheetAt(0).getLastRowNum()).isEqualTo(2);
        }
        verify(transactions).findByUserIdOrderByDateDesc(2L);
        verifyNoMoreInteractions(transactions);
    }
}
