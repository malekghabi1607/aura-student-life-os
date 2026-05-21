import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CurrencyProvider } from './context/CurrencyContext';
import { AuthProvider } from './context/AuthContext';
import { StudentProvider } from './context/StudentContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

// Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CheckEmailPage from './pages/CheckEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Finance pages
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import CategoriesPage from './pages/CategoriesPage';
import StatisticsPage from './pages/StatisticsPage';

// Student pages
import StudentDashboard from './pages/StudentDashboard';
import AIAssistantPage from './pages/AIAssistantPage';
import StudyPage from './pages/StudyPage';
import FitnessPage from './pages/FitnessPage';
import GoalsPage from './pages/GoalsPage';
import PlanningPage from './pages/PlanningPage';
import NotesPage from './pages/NotesPage';
import HabitsPage from './pages/HabitsPage';
import ReadingsPage from './pages/ReadingsPage';
import LanguagesPage from './pages/LanguagesPage';

const toastStyle = {
  style: {
    background: '#1e1e32',
    color: '#f1f5f9',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    fontSize: '0.88rem',
    fontFamily: "'Inter', sans-serif",
  },
  success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
  error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
};

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <StudentProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/check-email" element={<CheckEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <div className="app-layout">
                    <Sidebar />
                    <main className="main-content">
                      <Routes>
                        {/* Finance */}
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/transactions" element={<TransactionsPage />} />
                        <Route path="/categories" element={<CategoriesPage />} />
                        <Route path="/statistics" element={<StatisticsPage />} />
                        {/* StudentOS */}
                        <Route path="/dashboard" element={<StudentDashboard />} />
                        <Route path="/ai" element={<AIAssistantPage />} />
                        <Route path="/study" element={<StudyPage />} />
                        <Route path="/fitness" element={<FitnessPage />} />
                        <Route path="/goals" element={<GoalsPage />} />
                        <Route path="/planning" element={<PlanningPage />} />
                        <Route path="/notes" element={<NotesPage />} />
                        <Route path="/habits" element={<HabitsPage />} />
                        <Route path="/readings" element={<ReadingsPage />} />
                        <Route path="/languages" element={<LanguagesPage />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </main>
                  </div>
                </ProtectedRoute>
              } />
            </Routes>
            <Toaster position="bottom-right" toastOptions={{ duration: 3000, ...toastStyle }} />
          </Router>
        </StudentProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
