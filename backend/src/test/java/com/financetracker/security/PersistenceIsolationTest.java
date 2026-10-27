package com.financetracker.security;

import com.financetracker.controller.StatisticsController;
import com.financetracker.dto.TransactionRequest;
import com.financetracker.entity.Category;
import com.financetracker.entity.Transaction;
import com.financetracker.entity.User;
import com.financetracker.enums.TransactionType;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.export.ExcelExportService;
import com.financetracker.export.PdfExportService;
import com.financetracker.repository.CategoryRepository;
import com.financetracker.repository.TransactionRepository;
import com.financetracker.repository.UserRepository;
import com.financetracker.service.TransactionService;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// A JPA slice excludes application runners (including DataSeeder). The datasource is
// forcibly replaced by a unique, disposable H2 database; application PostgreSQL is never used.
@org.springframework.test.context.ActiveProfiles("test")
@DataJpaTest(properties = {
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Import({TransactionService.class, ExcelExportService.class, PdfExportService.class})
class PersistenceIsolationTest {
    @Autowired private UserRepository users;
    @Autowired private CategoryRepository categories;
    @Autowired private TransactionRepository transactions;
    @Autowired private TransactionService service;
    @Autowired private ExcelExportService excel;
    @Autowired private PdfExportService pdf;

    private final User[] accounts = new User[3];
    private final Category[] ownedCategories = new Category[2];
    private final Transaction[] ownedTransactions = new Transaction[2];
    private MockMvc mvc;

    @BeforeEach
    void prepareAccounts() {
        for (int i = 0; i < 3; i++) {
            accounts[i] = users.saveAndFlush(User.builder().name("User " + i)
                    .email("user" + i + "@isolation.test").password("unused-test-password")
                    .enabled(true).build());
        }
        for (int i = 0; i < 2; i++) {
            ownedCategories[i] = categories.saveAndFlush(Category.builder()
                    .name("PRIVATE_CATEGORY_" + i).userId(accounts[i].getId()).build());
            ownedTransactions[i] = transactions.saveAndFlush(Transaction.builder()
                    .userId(accounts[i].getId()).category(ownedCategories[i])
                    .description("PRIVATE_TRANSACTION_" + i).notes("PRIVATE_NOTE_" + i)
                    .amount(new BigDecimal(i == 0 ? "123.45" : "987.65"))
                    .date(LocalDate.of(2026, 1, 1)).type(TransactionType.INCOME).build());
        }
        mvc = MockMvcBuilders.standaloneSetup(new StatisticsController(null, excel, pdf)).build();
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    private void login(int index) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                accounts[index].getEmail(), null, List.of()));
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1})
    void excelUsesPersistedTransactionsOfAuthenticatedUserOnly(int index) throws Exception {
        login(index);
        byte[] content = mvc.perform(get("/api/statistics/export/excel")
                        .param("userId", accounts[1 - index].getId().toString()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            var sheet = workbook.getSheetAt(0);
            assertThat(sheet.getLastRowNum()).isEqualTo(3);
            assertThat(sheet.getRow(3).getCell(3).getStringCellValue()).isEqualTo("PRIVATE_CATEGORY_" + index);
            assertThat(sheet.getRow(3).getCell(4).getStringCellValue()).isEqualTo("PRIVATE_TRANSACTION_" + index);
            assertThat(sheet.getRow(3).getCell(5).getStringCellValue()).isEqualTo("PRIVATE_NOTE_" + index);
            assertThat(sheet.getRow(3).getCell(6).getNumericCellValue()).isEqualTo(index == 0 ? 123.45 : 987.65);
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2})
    void pdfUsesPersistedTransactionsAndTotalsOfAuthenticatedUserOnly(int index) throws Exception {
        login(index);
        byte[] content = mvc.perform(get("/api/statistics/export/pdf")
                        .param("userId", accounts[index == 0 ? 1 : 0].getId().toString()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        try (PdfDocument document = new PdfDocument(new PdfReader(new ByteArrayInputStream(content)))) {
            StringBuilder text = new StringBuilder();
            for (int page = 1; page <= document.getNumberOfPages(); page++) {
                text.append(PdfTextExtractor.getTextFromPage(document.getPage(page)));
            }
            if (index == 2) {
                assertThat(text.toString()).doesNotContain("PRIVATE_TRANSACTION_", "PRIVATE_CATEGORY_", "123.45", "987.65")
                        .contains("0 DZD");
            } else {
                assertThat(text.toString()).contains("PRIVATE_TRANSACTION_" + index, "PRIVATE_CATEGORY_" + index)
                        .doesNotContain("PRIVATE_TRANSACTION_" + (1 - index), "PRIVATE_CATEGORY_" + (1 - index))
                        .contains(index == 0 ? "123.45 DZD" : "987.65 DZD")
                        .doesNotContain(index == 0 ? "987.65" : "123.45");
            }
        }
    }

    private TransactionRequest request(Category category) {
        TransactionRequest request = new TransactionRequest();
        request.setDescription("Test transaction");
        request.setAmount(BigDecimal.TEN);
        request.setType(TransactionType.EXPENSE);
        request.setDate(LocalDate.of(2026, 1, 1));
        request.setCategoryId(category.getId());
        return request;
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1})
    void foreignCategoryIsRejectedOnCreateAndUpdate(int index) {
        login(index);
        Category foreign = ownedCategories[1 - index];
        assertThat(categories.findByIdAndUserId(foreign.getId(), accounts[index].getId())).isEmpty();
        assertThatThrownBy(() -> service.create(request(foreign))).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.update(ownedTransactions[index].getId(), request(foreign)))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThat(transactions.count()).isEqualTo(2);
        assertThat(ownedTransactions[index].getCategory().getId()).isEqualTo(ownedCategories[index].getId());
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1})
    void ownCategoryStillWorksOnCreateAndUpdate(int index) {
        login(index);
        var created = service.create(request(ownedCategories[index]));
        var updated = service.update(ownedTransactions[index].getId(), request(ownedCategories[index]));
        transactions.flush();
        assertThat(transactions.findById(created.getId()).orElseThrow().getUserId()).isEqualTo(accounts[index].getId());
        assertThat(updated.getCategoryId()).isEqualTo(ownedCategories[index].getId());
        assertThat(service.findAll()).hasSize(2);
    }
}
