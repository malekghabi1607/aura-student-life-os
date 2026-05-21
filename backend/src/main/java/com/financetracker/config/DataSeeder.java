package com.financetracker.config;

import com.financetracker.entity.Category;
import com.financetracker.entity.Transaction;
import com.financetracker.entity.User;
import com.financetracker.enums.TransactionType;
import com.financetracker.repository.CategoryRepository;
import com.financetracker.repository.TransactionRepository;
import com.financetracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class DataSeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        User demoUser = seedDemoUser();
        if (categoryRepository.findByUserId(demoUser.getId()).isEmpty()) {
            seedData(demoUser.getId());
        } else {
            log.info("Data already seeded for demo user, skipping.");
        }
    }

    private User seedDemoUser() {
        return userRepository.findByEmail("demo@finance.app")
                .map(existing -> {
                    if (!existing.isEnabled()) {
                        existing.setEnabled(true);
                        return userRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    User user = User.builder()
                            .email("demo@finance.app")
                            .name("Utilisateur Demo")
                            .password(passwordEncoder.encode("demo123"))
                            .enabled(true)
                            .build();
                    User saved = userRepository.save(user);
                    log.info("Created demo user: demo@finance.app / demo123");
                    return saved;
                });
    }

    private void seedData(Long uid) {
        log.info("Seeding database for user id {}...", uid);

        Category salaire      = cat("Salaire",       "#10b981", "briefcase",     "Revenus salariaux",          uid);
        Category alimentation = cat("Alimentation",  "#f59e0b", "shopping-cart", "Courses et restauration",    uid);
        Category transport    = cat("Transport",     "#3b82f6", "car",           "Carburant, bus, taxi",       uid);
        Category loyer        = cat("Loyer",         "#ef4444", "home",          "Loyer mensuel",              uid);
        Category loisirs      = cat("Loisirs",       "#8b5cf6", "gamepad",       "Sorties, jeux",              uid);
        Category sante        = cat("Santé",         "#ec4899", "heart",         "Médecin, pharmacie",         uid);
        Category freelance    = cat("Freelance",     "#06b6d4", "laptop",        "Revenus freelance",          uid);
        Category factures     = cat("Factures",      "#f97316", "file-text",     "Électricité, eau, internet", uid);

        LocalDate now = LocalDate.now();
        List<Transaction> txs = List.of(
            tx("Salaire Mai",         "45000", TransactionType.INCOME,  now.withDayOfMonth(1),                 salaire,       uid),
            tx("Courses Carrefour",   "8500",  TransactionType.EXPENSE, now.minusDays(2),                      alimentation,  uid),
            tx("Essence",             "4000",  TransactionType.EXPENSE, now.minusDays(3),                      transport,     uid),
            tx("Loyer Mai",           "25000", TransactionType.EXPENSE, now.withDayOfMonth(1),                 loyer,         uid),
            tx("Restaurant",          "3200",  TransactionType.EXPENSE, now.minusDays(5),                      alimentation,  uid),
            tx("Projet freelance",    "15000", TransactionType.INCOME,  now.minusDays(7),                      freelance,     uid),
            tx("Facture internet",    "4500",  TransactionType.EXPENSE, now.minusDays(10),                     factures,      uid),
            tx("Cinéma",              "1500",  TransactionType.EXPENSE, now.minusDays(8),                      loisirs,       uid),
            tx("Pharmacie",           "2800",  TransactionType.EXPENSE, now.minusDays(12),                     sante,         uid),
            tx("Salaire Avril",       "45000", TransactionType.INCOME,  now.minusMonths(1).withDayOfMonth(1),  salaire,       uid),
            tx("Courses",             "9200",  TransactionType.EXPENSE, now.minusMonths(1).withDayOfMonth(5),  alimentation,  uid),
            tx("Loyer Avril",         "25000", TransactionType.EXPENSE, now.minusMonths(1).withDayOfMonth(1),  loyer,         uid),
            tx("Facture électricité", "3800",  TransactionType.EXPENSE, now.minusMonths(1).withDayOfMonth(15), factures,      uid),
            tx("Freelance design",    "20000", TransactionType.INCOME,  now.minusMonths(1).withDayOfMonth(20), freelance,     uid),
            tx("Salaire Mars",        "45000", TransactionType.INCOME,  now.minusMonths(2).withDayOfMonth(1),  salaire,       uid),
            tx("Loyer Mars",          "25000", TransactionType.EXPENSE, now.minusMonths(2).withDayOfMonth(1),  loyer,         uid),
            tx("Courses marché",      "6500",  TransactionType.EXPENSE, now.minusMonths(2).withDayOfMonth(10), alimentation,  uid),
            tx("Taxi",                "1200",  TransactionType.EXPENSE, now.minusMonths(2).withDayOfMonth(12), transport,     uid)
        );
        transactionRepository.saveAll(txs);
        log.info("Seeded 8 categories and {} transactions", txs.size());
    }

    private Category cat(String name, String color, String icon, String desc, Long uid) {
        return categoryRepository.save(Category.builder()
                .name(name).color(color).icon(icon).description(desc).userId(uid).build());
    }

    private Transaction tx(String desc, String amount, TransactionType type, LocalDate date, Category cat, Long uid) {
        return Transaction.builder()
                .description(desc).amount(new BigDecimal(amount))
                .type(type).date(date).category(cat).userId(uid).build();
    }
}
