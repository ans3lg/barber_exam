import React, { useState, useEffect } from 'react';
import {
  Scissors,
  CheckCircle2,
  XCircle,
  Award,
  BookOpen,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Download,
  Send,
  ExternalLink,
  History,
  Settings,
  LogOut,
  User,
  Building2,
  Phone,
  HelpCircle,
  FileText,
  AlertCircle,
  Check,
  RefreshCw,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';
import {
  GradeType,
  TheoryStatus,
  OverallResult,
  ExamData,
  AppSettings,
  TheoryQuestion
} from '../types.ts';
import {
  getQuestionsForGrade,
  MASTERCLASS_LABELS
} from '../questionsData.ts';

export default function ExamApp() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('britva_auth') === 'true';
  });
  const [examinerName, setExaminerName] = useState<string>(() => {
    return localStorage.getItem('britva_examiner') || 'Экзаменатор BRITVA';
  });
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // App view navigation
  const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Wizard current step: 1 = Candidate, 2 = Masterclasses, 3 = Theory, 4 = Practice, 5 = Review & Submit
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Candidate & Loyalty
  const [candidateName, setCandidateName] = useState<string>('');
  const [branch, setBranch] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [grade, setGrade] = useState<GradeType>('Барбер+');
  const [whyBritva, setWhyBritva] = useState<string>('');
  const [communitySubscribed, setCommunitySubscribed] = useState<boolean>(true);
  const [lifeParticipation, setLifeParticipation] = useState<boolean>(true);
  const [dislikedService, setDislikedService] = useState<string>('');
  const [branchChanges, setBranchChanges] = useState<string>('');

  // Step 2: Masterclasses (need to undergo)
  const [masterclasses, setMasterclasses] = useState({
    skinTypesFaceMassage: false,
    hotWax: false,
    trichology: false,
    sales: false,
    serviceCommunication: false,
    longHairDesign: false,
    fading: false,
    toning: false,
  });

  // Step 3: Theory
  const [theoryQuestions, setTheoryQuestions] = useState<TheoryQuestion[]>(() =>
    getQuestionsForGrade('Барбер+')
  );
  const [theoryStatus, setTheoryStatus] = useState<TheoryStatus>('Сдал');
  const [theoryStatusManual, setTheoryStatusManual] = useState<boolean>(false);
  const [theoryNotes, setTheoryNotes] = useState<string>('');

  // Step 4: Practice & Additional Services
  const [practice, setPractice] = useState({
    meeting: true,
    chairWork: true,
    sinkWork: true,
    notes: '',
  });

  const [additionalServices, setAdditionalServices] = useState({
    wax: true,
    scalpHairCare: true,
    faceCare: true,
    toning: true,
  });

  const [completionNotes, setCompletionNotes] = useState<string>(
    'Не забывать озвучивать услуги администратору.'
  );

  // Step 5: Overall Result
  const [overallResult, setOverallResult] = useState<OverallResult>('Аттестован');

  // Submission & Result state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedExam, setSubmittedExam] = useState<ExamData | null>(null);
  const [submitError, setSubmitError] = useState<string>('');

  // History & Settings
  const [examsHistory, setExamsHistory] = useState<ExamData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');

  const [settings, setSettings] = useState<AppSettings>({
    telegramBotToken: '',
    telegramChatId: '',
    isTelegramConfigured: false,
  });
  const [settingsForm, setSettingsForm] = useState({
    botToken: '',
    chatId: '',
  });
  const [settingsStatus, setSettingsStatus] = useState<{ message: string; isError?: boolean } | null>(null);
  const [isTestingTelegram, setIsTestingTelegram] = useState<boolean>(false);

  // Load settings and history on start
  useEffect(() => {
    fetchSettings();
    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated]);

  // Update theory questions when grade changes
  const handleGradeChange = (newGrade: GradeType) => {
    setGrade(newGrade);
    setTheoryQuestions(getQuestionsForGrade(newGrade));
    setTheoryStatusManual(false);
  };

  // Recalculate theory status automatically
  useEffect(() => {
    if (!theoryStatusManual && theoryQuestions.length > 0) {
      const passedCount = theoryQuestions.filter((q) => q.passed).length;
      const ratio = passedCount / theoryQuestions.length;
      if (ratio >= 0.75) {
        setTheoryStatus('Сдал');
      } else if (ratio >= 0.45) {
        setTheoryStatus('Плюс-минус');
      } else {
        setTheoryStatus('Не сдал');
      }
    }
  }, [theoryQuestions, theoryStatusManual]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSettingsForm({
          botToken: '',
          chatId: data.telegramChatId || '',
        });
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/exams');
      if (res.ok) {
        const data = await res.json();
        setExamsHistory(data);
      }
    } catch (err) {
      console.error('Failed to load exams history', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: examinerName,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('britva_auth', 'true');
        localStorage.setItem('britva_examiner', data.user?.name || examinerName);
        loadHistory();
      } else {
        setLoginError(data.message || 'Ошибка входа');
      }
    } catch (err: any) {
      setLoginError('Сервер недоступен. Проверьте подключение.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('britva_auth');
  };

  // Toggle theory question
  const toggleTheoryQuestion = (id: string) => {
    setTheoryQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, passed: !q.passed } : q))
    );
  };

  // Toggle masterclass
  const toggleMasterclass = (key: keyof typeof masterclasses) => {
    setMasterclasses((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Quick select all / unselect all masterclasses
  const setAllMasterclasses = (val: boolean) => {
    setMasterclasses({
      skinTypesFaceMassage: val,
      hotWax: val,
      trichology: val,
      sales: val,
      serviceCommunication: val,
      longHairDesign: val,
      fading: val,
      toning: val,
    });
  };

  // Validation
  const validateStep1 = () => {
    if (!candidateName.trim()) {
      alert('Пожалуйста, укажите ФИО кандидата');
      return false;
    }
    if (!branch.trim()) {
      alert('Пожалуйста, укажите филиал');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) {
      return;
    }
    setCurrentStep((prev) => Math.min(5, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset wizard for new exam
  const handleStartNewExam = () => {
    setCandidateName('');
    setBranch('');
    setPhone('');
    setWhyBritva('');
    setCommunitySubscribed(true);
    setLifeParticipation(true);
    setDislikedService('');
    setBranchChanges('');
    setAllMasterclasses(false);
    setTheoryQuestions(getQuestionsForGrade(grade));
    setTheoryStatus('Сдал');
    setTheoryStatusManual(false);
    setTheoryNotes('');
    setPractice({
      meeting: true,
      chairWork: true,
      sinkWork: true,
      notes: '',
    });
    setAdditionalServices({
      wax: true,
      scalpHairCare: true,
      faceCare: true,
      toning: true,
    });
    setCompletionNotes('Не забывать озвучивать услуги администратору.');
    setOverallResult('Аттестован');
    setSubmittedExam(null);
    setCurrentStep(1);
    setActiveTab('wizard');
  };

  // Submit Exam
  const handleSubmitExam = async () => {
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const payload: ExamData = {
      examinerName,
      candidateName: candidateName.trim(),
      branch: branch.trim(),
      phone: phone.trim(),
      grade,
      whyBritva: whyBritva.trim(),
      communitySubscribed,
      lifeParticipation,
      dislikedService: dislikedService.trim(),
      branchChanges: branchChanges.trim(),
      masterclasses,
      theoryQuestions,
      theoryStatus,
      theoryNotes: theoryNotes.trim(),
      practice,
      additionalServices,
      completionNotes: completionNotes.trim(),
      overallResult,
    };

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmittedExam(data.exam);
        loadHistory();
      } else {
        setSubmitError(data.error || 'Не удалось завершить аттестацию');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Ошибка соединения с сервером');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend Telegram
  const handleResendTelegram = async (examId: string) => {
    try {
      const res = await fetch(`/api/exams/${examId}/resend-telegram`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Отчет отправлен в Telegram!');
        loadHistory();
        if (submittedExam && submittedExam.id === examId) {
          setSubmittedExam((prev) =>
            prev
              ? {
                  ...prev,
                  telegramStatus: { attempted: true, sent: true, message: data.message },
                }
              : null
          );
        }
      } else {
        alert(data.message || 'Не удалось отправить в Telegram');
      }
    } catch (err) {
      alert('Ошибка соединения с сервером');
    }
  };

  // Test Telegram Connection
  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setSettingsStatus(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramBotToken: settingsForm.botToken,
          telegramChatId: settingsForm.chatId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettingsStatus({ message: data.message });
      } else {
        setSettingsStatus({ message: data.message || 'Ошибка проверки', isError: true });
      }
    } catch (err: any) {
      setSettingsStatus({ message: err.message || 'Ошибка связи', isError: true });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramBotToken: settingsForm.botToken || undefined,
          telegramChatId: settingsForm.chatId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsStatus({ message: 'Настройки сохранены!' });
        fetchSettings();
        setTimeout(() => setShowSettingsModal(false), 1200);
      }
    } catch (err) {
      setSettingsStatus({ message: 'Ошибка сохранения', isError: true });
    }
  };

  // Filtered history
  const filteredHistory = examsHistory.filter((ex) => {
    const term = historySearch.toLowerCase();
    return (
      ex.candidateName?.toLowerCase().includes(term) ||
      ex.branch?.toLowerCase().includes(term) ||
      ex.grade?.toLowerCase().includes(term)
    );
  });

  const selectedMCcount = Object.values(masterclasses).filter(Boolean).length;
  const passedTheoryCount = theoryQuestions.filter((q) => q.passed).length;

  // ==================== SCREEN 0: LOGIN ====================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f0f11] text-neutral-100 flex flex-col justify-center items-center px-4 py-8">
        <div className="w-full max-w-md bg-[#18181c] border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-neutral-900 border-2 border-amber-500/70 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Scissors className="w-8 h-8 text-amber-400 rotate-45" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase text-white font-mono">
              BRITVA
            </h1>
            <p className="text-xs uppercase tracking-widest text-amber-500 font-bold mt-1">
              Barbershop Chain
            </p>
            <div className="h-px w-20 bg-neutral-700 my-3" />
            <h2 className="text-base font-semibold text-neutral-300">
              Портал аттестации барберов
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Вход для экзаменаторов и старших барберов сети
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Экзаменатор (ФИО / Логин)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="login-examiner-name"
                  type="text"
                  value={examinerName}
                  onChange={(e) => setExaminerName(e.target.value)}
                  placeholder="Иван Смирнов"
                  className="w-full bg-[#111114] border border-neutral-700 focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Пароль доступа
                </label>
                <span className="text-[11px] text-amber-500/80">по умолчанию: britva2025</span>
              </div>
              <input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111114] border border-neutral-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none transition-colors"
                required
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/10 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Войти в систему</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login */}
          <div className="mt-6 pt-5 border-t border-neutral-800 text-center">
            <button
              id="quick-demo-btn"
              type="button"
              onClick={() => {
                setExaminerName('Сергей Ковалев (Топ-Экзаменатор)');
                setLoginPassword('britva2025');
              }}
              className="text-xs text-neutral-400 hover:text-amber-400 transition-colors underline cursor-pointer"
            >
              Вставить демо-данные (пароль: britva2025)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN APPLICATION UI ====================
  return (
    <div className="min-h-screen bg-[#0f0f11] text-neutral-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#141418]/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Logo Brand */}
          <div
            onClick={handleStartNewExam}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-neutral-900 border border-amber-500/80 rounded-lg flex items-center justify-center text-amber-400">
              <Scissors className="w-5 h-5 rotate-45" />
            </div>
            <div>
              <div className="text-base font-black tracking-widest text-white leading-none">
                BRITVA
              </div>
              <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">
                Аттестация
              </div>
            </div>
          </div>

          {/* Quick Actions & Navigation */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              id="header-new-exam-btn"
              onClick={handleStartNewExam}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'wizard'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Новая аттестация</span>
              <span className="sm:hidden">Мастер</span>
            </button>

            <button
              id="header-history-btn"
              onClick={() => {
                setActiveTab('history');
                loadHistory();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Архив ({examsHistory.length})</span>
            </button>

            <button
              id="header-settings-btn"
              onClick={() => setShowSettingsModal(true)}
              title="Настройки Telegram"
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors cursor-pointer relative"
            >
              <Settings className="w-4 h-4" />
              {settings.isTelegramConfigured && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>

            <button
              id="header-logout-btn"
              onClick={handleLogout}
              title="Выйти"
              className="p-1.5 bg-neutral-800 hover:bg-red-950/60 hover:text-red-400 text-neutral-400 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col">
        {activeTab === 'wizard' ? (
          <div className="flex-1 flex flex-col">
            {/* Step Progress Bar & Indicators */}
            <div className="mb-6 bg-[#16161b] border border-neutral-800 rounded-xl p-3 md:p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[11px] font-bold">
                    Шаг {currentStep} из 5
                  </span>
                  <span className="text-white font-medium hidden sm:inline">
                    {currentStep === 1 && 'Кандидат и лояльность'}
                    {currentStep === 2 && 'Необходимо пройти МК'}
                    {currentStep === 3 && `Теоретическая часть (${grade})`}
                    {currentStep === 4 && 'Практика и Доп. услуги'}
                    {currentStep === 5 && 'Итоги и официальный PDF'}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  Кандидат: <strong className="text-white">{candidateName || '—'}</strong>
                </div>
              </div>

              {/* Progress track */}
              <div className="grid grid-cols-5 gap-1.5 md:gap-2">
                {[1, 2, 3, 4, 5].map((stepNum) => (
                  <button
                    key={stepNum}
                    id={`step-nav-${stepNum}`}
                    type="button"
                    onClick={() => {
                      if (stepNum < currentStep || validateStep1()) {
                        setCurrentStep(stepNum);
                      }
                    }}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      stepNum === currentStep
                        ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                        : stepNum < currentStep
                        ? 'bg-emerald-500'
                        : 'bg-neutral-800'
                    }`}
                    title={`Шаг ${stepNum}`}
                  />
                ))}
              </div>

              {/* Step Pills on Desktop */}
              <div className="grid grid-cols-5 gap-1 text-[11px] font-medium text-center mt-2.5 text-neutral-500">
                <span className={currentStep === 1 ? 'text-amber-400 font-bold' : ''}>1. Кандидат</span>
                <span className={currentStep === 2 ? 'text-amber-400 font-bold' : ''}>2. МК ({selectedMCcount})</span>
                <span className={currentStep === 3 ? 'text-amber-400 font-bold' : ''}>3. Теория ({passedTheoryCount}/{theoryQuestions.length})</span>
                <span className={currentStep === 4 ? 'text-amber-400 font-bold' : ''}>4. Практика</span>
                <span className={currentStep === 5 ? 'text-amber-400 font-bold' : ''}>5. PDF Бланк</span>
              </div>
            </div>

            {/* Wizard Steps Content */}
            <div className="flex-1 bg-[#16161b] border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col">
              {/* ================= STEP 1: Candidate & Loyalty ================= */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-amber-400" />
                      Шаг 1. Данные кандидата и корпоративная культура
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">
                      Заполните информацию о барбере и выберите целевую градацию аттестации.
                    </p>
                  </div>

                  {/* Target Grade Selector */}
                  <div className="bg-[#111114] border border-neutral-800 rounded-xl p-4">
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2.5">
                      Повышение до градации:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        id="grade-barber-plus-btn"
                        type="button"
                        onClick={() => handleGradeChange('Барбер+')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                          grade === 'Барбер+'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-base font-black uppercase">БАРБЕР+</span>
                        <span className="text-[11px] text-neutral-400 mt-1">
                          Базовая ступень мастера, уверенный сервис и стрижки
                        </span>
                      </button>

                      <button
                        id="grade-top-plus-btn"
                        type="button"
                        onClick={() => handleGradeChange('ТОП+')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                          grade === 'ТОП+'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-base font-black uppercase">ТОП+</span>
                        <span className="text-[11px] text-neutral-400 mt-1">
                          Высшая категория, наставник, сложная колористика и LTV
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Basic fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Кандидат (ФИО) *
                      </label>
                      <input
                        id="candidate-name-input"
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="Константин Васильев"
                        className="w-full bg-[#111114] border border-neutral-700 focus:border-amber-500 rounded-xl px-3.5 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Филиал сети *
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          id="candidate-branch-input"
                          type="text"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          placeholder="BRITVA Павелецкая"
                          className="w-full bg-[#111114] border border-neutral-700 focus:border-amber-500 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Номер телефона
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          id="candidate-phone-input"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+7 (999) 000-00-00"
                          className="w-full bg-[#111114] border border-neutral-700 focus:border-amber-500 rounded-xl pl-10 pr-3.5 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Loyalty questions & Toggles */}
                  <div className="bg-[#111114] border border-neutral-800 rounded-xl p-4 space-y-4">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Лояльность и сообщество
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Community toggle */}
                      <div className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            Подписан на Community
                          </div>
                          <div className="text-xs text-neutral-400">
                            Telegram-канал и чаты сети BRITVA
                          </div>
                        </div>
                        <button
                          id="community-toggle-btn"
                          type="button"
                          onClick={() => setCommunitySubscribed(!communitySubscribed)}
                          className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer ${
                            communitySubscribed ? 'bg-emerald-600' : 'bg-neutral-700'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full bg-white transition-transform absolute top-1 ${
                              communitySubscribed ? 'right-1' : 'left-1'
                            } flex items-center justify-center text-black font-bold text-xs`}
                          >
                            {communitySubscribed ? '+' : '–'}
                          </div>
                        </button>
                      </div>

                      {/* Life Participation toggle */}
                      <div className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            Участие в жизни Britva
                          </div>
                          <div className="text-xs text-neutral-400">
                            Мероприятия, корпоративы, взаимопомощь
                          </div>
                        </div>
                        <button
                          id="life-participation-toggle-btn"
                          type="button"
                          onClick={() => setLifeParticipation(!lifeParticipation)}
                          className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer ${
                            lifeParticipation ? 'bg-emerald-600' : 'bg-neutral-700'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full bg-white transition-transform absolute top-1 ${
                              lifeParticipation ? 'right-1' : 'left-1'
                            } flex items-center justify-center text-black font-bold text-xs`}
                          >
                            {lifeParticipation ? '+' : '–'}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Textarea fields */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Почему ты в Britva?
                      </label>
                      <textarea
                        id="why-britva-input"
                        rows={2}
                        value={whyBritva}
                        onChange={(e) => setWhyBritva(e.target.value)}
                        placeholder="Ценности сети, атмосфера, возможность профессионального роста..."
                        className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-xl p-3 text-sm text-white placeholder-neutral-600 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Нелюбимая услуга
                        </label>
                        <input
                          id="disliked-service-input"
                          type="text"
                          value={dislikedService}
                          onChange={(e) => setDislikedService(e.target.value)}
                          placeholder="Сложные детские стрижки / долгое бритье"
                          className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Что изменил бы в филиале или добавил
                        </label>
                        <input
                          id="branch-changes-input"
                          type="text"
                          value={branchChanges}
                          onChange={(e) => setBranchChanges(e.target.value)}
                          placeholder="Новый свет над мойкой, больше восков..."
                          className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 2: Masterclasses ================= */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-400" />
                        Шаг 2. Необходимо пройти МК (Мастер-классы)
                      </h2>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Отметьте мастер-классы, которые барберу <strong>НАДО ПРОЙТИ</strong> для дальнейшего роста.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id="mc-select-all-btn"
                        type="button"
                        onClick={() => setAllMasterclasses(true)}
                        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Назначить все
                      </button>
                      <button
                        id="mc-unselect-all-btn"
                        type="button"
                        onClick={() => setAllMasterclasses(false)}
                        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Снять все
                      </button>
                    </div>
                  </div>

                  {/* Summary counter banner */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-neutral-300">
                      Назначено к прохождению:
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        selectedMCcount > 0
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {selectedMCcount} из 8 МК
                    </span>
                  </div>

                  {/* Masterclasses Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(MASTERCLASS_LABELS).map(([key, label]) => {
                      const isChecked = masterclasses[key as keyof typeof masterclasses];
                      return (
                        <div
                          key={key}
                          id={`mc-item-${key}`}
                          onClick={() => toggleMasterclass(key as keyof typeof masterclasses)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isChecked
                              ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/5'
                              : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                                isChecked
                                  ? 'bg-amber-500 text-black font-bold'
                                  : 'border border-neutral-600 text-transparent'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                            <span className={`text-sm font-semibold ${isChecked ? 'text-amber-200' : 'text-neutral-200'}`}>
                              {label}
                            </span>
                          </div>

                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isChecked
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {isChecked ? 'Назначено' : 'Не требуется'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ================= STEP 3: Theory ================= */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-amber-400" />
                          Шаг 3. Теоретическая часть
                        </h2>
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-xs font-black uppercase">
                          {grade}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Нажимайте на вопрос, когда барбер дает правильный развернутый ответ (подсвечивается зеленым).
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-neutral-400">Результат теории:</div>
                      <div className="text-base font-black text-white">
                        {passedTheoryCount} / {theoryQuestions.length} ({Math.round((passedTheoryCount / theoryQuestions.length) * 100)}%)
                      </div>
                    </div>
                  </div>

                  {/* Theory Questions List */}
                  <div className="space-y-2.5">
                    {theoryQuestions.map((q, index) => (
                      <div
                        key={q.id}
                        id={`theory-q-${q.id}`}
                        onClick={() => toggleTheoryQuestion(q.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          q.passed
                            ? 'bg-emerald-950/40 border-emerald-500 shadow-sm shadow-emerald-500/10'
                            : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              q.passed ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className={`text-sm ${q.passed ? 'text-emerald-100 font-medium' : 'text-neutral-300'}`}>
                            {q.text}
                          </span>
                        </div>

                        <div className="shrink-0">
                          <span
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 uppercase transition-all ${
                              q.passed
                                ? 'bg-emerald-500 text-black font-extrabold shadow-md shadow-emerald-500/20'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {q.passed ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-black" />
                                <span>Ответил (+)</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-neutral-500" />
                                <span>Не ответил (–)</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Status & Examiner Theory Note */}
                  <div className="bg-[#111114] border border-neutral-800 rounded-xl p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                          Статус теоретической части (авторасчет):
                        </div>
                        <div className="text-xs text-neutral-500">
                          Порог: ≥75% «Сдал», 45–74% «Плюс-минус», &lt;45% «Не сдал»
                        </div>
                      </div>

                      {/* Status selector buttons */}
                      <div className="flex items-center gap-2">
                        {(['Сдал', 'Плюс-минус', 'Не сдал'] as TheoryStatus[]).map((st) => (
                          <button
                            key={st}
                            id={`theory-status-${st}`}
                            type="button"
                            onClick={() => {
                              setTheoryStatus(st);
                              setTheoryStatusManual(true);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                              theoryStatus === st
                                ? st === 'Сдал'
                                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                                  : st === 'Плюс-минус'
                                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                                  : 'bg-red-500 text-white shadow-md shadow-red-500/20'
                                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-700'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Заметка экзаменатора по теории (пойдет в официальный бланк)
                      </label>
                      <input
                        id="theory-notes-input"
                        type="text"
                        value={theoryNotes}
                        onChange={(e) => setTheoryNotes(e.target.value)}
                        placeholder="Например: просто превосходно, замечательно, глубокое понимание геометрии..."
                        className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 4: Practice & Additional Services ================= */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      Шаг 4. Практика и продажа Доп. услуг
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Оцените поведение барбера при работе с клиентом и технику продажи косметики и доп. сервисов.
                    </p>
                  </div>

                  {/* Section: Practice */}
                  <div className="bg-[#111114] border border-neutral-800 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Практика
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Meeting */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-white">Встреча</div>
                          <div className="text-[11px] text-neutral-400">Приветствие, чай, кофе</div>
                        </div>
                        <button
                          id="practice-meeting-btn"
                          type="button"
                          onClick={() =>
                            setPractice((prev) => ({ ...prev, meeting: !prev.meeting }))
                          }
                          className={`w-11 h-8 rounded-lg font-extrabold text-sm flex items-center justify-center transition-all cursor-pointer ${
                            practice.meeting
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                              : 'bg-red-950/80 text-red-400 border border-red-800'
                          }`}
                        >
                          {practice.meeting ? '+' : '–'}
                        </button>
                      </div>

                      {/* Chair Work */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-white">Работа в кресле</div>
                          <div className="text-[11px] text-neutral-400">Консультация, посадка, стрижка</div>
                        </div>
                        <button
                          id="practice-chair-btn"
                          type="button"
                          onClick={() =>
                            setPractice((prev) => ({ ...prev, chairWork: !prev.chairWork }))
                          }
                          className={`w-11 h-8 rounded-lg font-extrabold text-sm flex items-center justify-center transition-all cursor-pointer ${
                            practice.chairWork
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                              : 'bg-red-950/80 text-red-400 border border-red-800'
                          }`}
                        >
                          {practice.chairWork ? '+' : '–'}
                        </button>
                      </div>

                      {/* Sink Work */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-white">Работа в мойке</div>
                          <div className="text-[11px] text-neutral-400">Температура, массаж головы</div>
                        </div>
                        <button
                          id="practice-sink-btn"
                          type="button"
                          onClick={() =>
                            setPractice((prev) => ({ ...prev, sinkWork: !prev.sinkWork }))
                          }
                          className={`w-11 h-8 rounded-lg font-extrabold text-sm flex items-center justify-center transition-all cursor-pointer ${
                            practice.sinkWork
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                              : 'bg-red-950/80 text-red-400 border border-red-800'
                          }`}
                        >
                          {practice.sinkWork ? '+' : '–'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Заметка по практике
                      </label>
                      <input
                        id="practice-notes-input"
                        type="text"
                        value={practice.notes}
                        onChange={(e) =>
                          setPractice((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Техника отличная, следить за осанкой и положением локтей..."
                        className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Section: Additional Services Sale */}
                  <div className="bg-[#111114] border border-neutral-800 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Продажа Доп. Услуг
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Wax */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Воск</span>
                        <button
                          id="service-wax-btn"
                          type="button"
                          onClick={() =>
                            setAdditionalServices((prev) => ({ ...prev, wax: !prev.wax }))
                          }
                          className={`w-9 h-8 rounded-lg font-extrabold text-sm flex items-center justify-center transition-all cursor-pointer ${
                            additionalServices.wax
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                              : 'bg-red-950/80 text-red-400 border border-red-800'
                          }`}
                        >
                          {additionalServices.wax ? '+' : '–'}
                        </button>
                      </div>

                      {/* Scalp & Hair Care */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Уход за кожей/волосами</span>
                        <button
                          id="service-hair-care-btn"
                          type="button"
                          onClick={() =>
                            setAdditionalServices((prev) => ({
                              ...prev,
                              scalpHairCare: !prev.scalpHairCare,
                            }))
                          }
                          className={`w-9 h-8 rounded-lg font-extrabold text-sm flex items-center justify-center transition-all cursor-pointer ${
                            additionalServices.scalpHairCare
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                              : 'bg-red-950/80 text-red-400 border border-red-800'
                          }`}
                        >
                          {additionalServices.scalpHairCare ? '+' : '–'}
                        </button>
                      </div>

                      {/* Face Care */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Уход за лицом</span>
                        <button
                          id="service-face-care-btn"
                          type="button"
                          onClick={() =>
                            setAdditionalServices((prev) => ({ ...prev, faceCare: !prev.faceCare }))
                          }
                          className={`w-9 h-8 rounded-lg font-extrabold text-sm flex items-center justify-center transition-all cursor-pointer ${
                            additionalServices.faceCare
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                              : 'bg-red-950/80 text-red-400 border border-red-800'
                          }`}
                        >
                          {additionalServices.faceCare ? '+' : '–'}
                        </button>
                      </div>

                      {/* Toning */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Тонировка</span>
                        <button
                          id="service-toning-btn"
                          type="button"
                          onClick={() =>
                            setAdditionalServices((prev) => ({ ...prev, toning: !prev.toning }))
                          }
                          className={`w-9 h-8 rounded-lg font-extrabold text-sm flex items-center justify-center transition-all cursor-pointer ${
                            additionalServices.toning
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                              : 'bg-red-950/80 text-red-400 border border-red-800'
                          }`}
                        >
                          {additionalServices.toning ? '+' : '–'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section: Completion Notes */}
                  <div className="bg-[#111114] border border-neutral-800 rounded-xl p-4">
                    <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                      Завершение работы (примечание для бланка)
                    </label>
                    <textarea
                      id="completion-notes-input"
                      rows={2}
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      placeholder="например: не забывать озвучивать услуги администратору..."
                      className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-xl p-3 text-sm text-white placeholder-neutral-600 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ================= STEP 5: Final Review & Submission ================= */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      Шаг 5. Финал — Итоговый вердикт и генерация PDF
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Проверьте все данные перед формированием официального документа.
                    </p>
                  </div>

                  {submitError && (
                    <div className="p-3.5 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Overall Verdict Selector */}
                  <div className="bg-[#111114] border border-neutral-800 rounded-xl p-4">
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2.5">
                      Итоговое решение аттестационной комиссии:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['Аттестован', 'Условно аттестован', 'Не аттестован'] as OverallResult[]).map((res) => (
                        <button
                          key={res}
                          id={`verdict-btn-${res}`}
                          type="button"
                          onClick={() => setOverallResult(res)}
                          className={`p-3.5 rounded-xl border font-bold text-sm uppercase tracking-wider transition-all cursor-pointer text-center ${
                            overallResult === res
                              ? res === 'Аттестован'
                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                                : res === 'Условно аттестован'
                                ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                                : 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20 scale-[1.02]'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-[#111114] border border-neutral-800 rounded-xl p-4 space-y-3 text-xs">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-neutral-800 pb-2">
                      Сводка аттестационного листа
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-neutral-300">
                      <div>Кандидат: <strong className="text-white block">{candidateName}</strong></div>
                      <div>Филиал: <strong className="text-white block">{branch}</strong></div>
                      <div>Градация: <strong className="text-amber-400 block">{grade}</strong></div>
                      <div>Теория: <strong className="text-white block">{theoryStatus} ({passedTheoryCount}/{theoryQuestions.length})</strong></div>
                    </div>

                    <div className="border-t border-neutral-800 pt-2 flex items-center justify-between text-neutral-400">
                      <span>Назначено МК к прохождению: <strong>{selectedMCcount} из 8</strong></span>
                      <span>Экзаменатор: <strong className="text-white">{examinerName}</strong></span>
                    </div>
                  </div>

                  {/* Submit CTA or Submitted Result */}
                  {!submittedExam ? (
                    <div className="pt-2">
                      <button
                        id="finish-exam-submit-btn"
                        type="button"
                        onClick={handleSubmitExam}
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-base py-4 px-6 rounded-xl transition-all shadow-xl shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Генерация официального PDF через Puppeteer...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            <span>ЗАВЕРШИТЬ ЭКЗАМЕН И СФОРМИРОВАТЬ PDF</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-center gap-2 mt-3 text-xs text-neutral-400">
                        {settings.isTelegramConfigured ? (
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <Send className="w-3.5 h-3.5" />
                            PDF автоматически отправится в Telegram чат
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-400/90">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Telegram не настроен (PDF будет сохранен и доступен для скачивания)
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Success Result Box */
                    <div className="p-6 bg-emerald-950/40 border-2 border-emerald-500/80 rounded-2xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-black font-black shrink-0">
                          <Check className="w-7 h-7 stroke-[3]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-emerald-300 uppercase">
                            Аттестация успешно сохранена!
                          </h3>
                          <p className="text-xs text-neutral-300">
                            Официальный бланк сформирован точь-в-точь по регламенту сети BRITVA.
                          </p>
                        </div>
                      </div>

                      {/* Telegram status */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-sky-400" />
                          <span className="text-neutral-300">Статус Telegram:</span>
                          <span
                            className={`font-semibold ${
                              submittedExam.telegramStatus?.sent
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {submittedExam.telegramStatus?.message || 'Готово'}
                          </span>
                        </div>
                        {submittedExam.id && (
                          <button
                            id="resend-telegram-btn"
                            type="button"
                            onClick={() => handleResendTelegram(submittedExam.id!)}
                            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Отправить еще раз
                          </button>
                        )}
                      </div>

                      {/* Download and view actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <a
                          id="download-pdf-btn"
                          href={`/api/exams/${submittedExam.id}/pdf`}
                          download={`BRITVA_Аттестация_${submittedExam.candidateName}.pdf`}
                          className="p-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all text-sm"
                        >
                          <Download className="w-4 h-4" />
                          <span>Скачать PDF бланк</span>
                        </a>

                        <a
                          id="open-pdf-tab-btn"
                          href={`/api/exams/${submittedExam.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Открыть PDF в новой вкладке</span>
                        </a>
                      </div>

                      <div className="pt-2 text-center">
                        <button
                          id="start-another-exam-btn"
                          type="button"
                          onClick={handleStartNewExam}
                          className="text-xs text-amber-400 hover:underline cursor-pointer font-semibold"
                        >
                          + Провести следующую аттестацию
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Wizard Navigation Buttons (Steps 1..4) */}
              {!submittedExam && (
                <div className="mt-8 pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
                  <button
                    id="wizard-prev-btn"
                    type="button"
                    onClick={handlePrevStep}
                    disabled={currentStep === 1}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      currentStep === 1
                        ? 'opacity-30 cursor-not-allowed text-neutral-500'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Назад</span>
                  </button>

                  <div className="text-xs text-neutral-500 font-medium">
                    Шаг {currentStep} из 5
                  </div>

                  {currentStep < 5 ? (
                    <button
                      id="wizard-next-btn"
                      type="button"
                      onClick={handleNextStep}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 active:scale-[0.98] cursor-pointer"
                    >
                      <span>Далее</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================= HISTORY / ARCHIVE VIEW ================= */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-400" />
                  Архив проведенных аттестаций
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Все сохраненные бланки с возможностью повторной загрузки PDF и отправки в Telegram.
                </p>
              </div>

              <button
                id="refresh-history-btn"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-lg flex items-center gap-1.5 self-start cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                <span>Обновить</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                id="history-search-input"
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Поиск по ФИО кандидата или филиалу..."
                className="w-full bg-[#16161b] border border-neutral-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none"
              />
            </div>

            {/* List of Exams */}
            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center bg-[#16161b] border border-neutral-800 rounded-2xl text-neutral-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40 text-neutral-400" />
                <p className="text-sm font-semibold text-neutral-300">Аттестации не найдены</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Нажмите «Новая аттестация», чтобы провести первый экзамен.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((ex) => {
                  const theoryScore = (ex.theoryQuestions || []).filter((q) => q.passed).length;
                  const theoryTotal = (ex.theoryQuestions || []).length;
                  const dateStr = ex.createdAt
                    ? new Date(ex.createdAt).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';

                  return (
                    <div
                      key={ex.id}
                      className="bg-[#16161b] border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-white">
                            {ex.candidateName}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-black">
                            {ex.grade}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              ex.overallResult === 'Аттестован'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : ex.overallResult === 'Условно аттестован'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {ex.overallResult}
                          </span>
                        </div>

                        <div className="text-xs text-neutral-400 flex items-center gap-3 flex-wrap">
                          <span>Филиал: <strong className="text-neutral-200">{ex.branch}</strong></span>
                          <span>Теория: <strong>{theoryScore}/{theoryTotal} ({ex.theoryStatus})</strong></span>
                          <span>Дата: {dateStr}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <a
                          href={`/api/exams/${ex.id}/pdf`}
                          download={`BRITVA_${ex.candidateName}.pdf`}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Скачать PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>PDF</span>
                        </a>

                        <a
                          href={`/api/exams/${ex.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-lg transition-colors"
                          title="Открыть в новой вкладке"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => handleResendTelegram(ex.id!)}
                          className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-sky-400 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          title="Отправить в Telegram"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">В Telegram</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ================= TELEGRAM SETTINGS MODAL ================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181c] border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                Настройки Telegram Bot API
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Настройте бота для мгновенной отправки готового PDF-бланка руководителю сети BRITVA.
            </p>

            {settingsStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  settingsStatus.isError
                    ? 'bg-red-950/60 border border-red-800 text-red-200'
                    : 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
                }`}
              >
                {settingsStatus.isError ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <Check className="w-4 h-4 shrink-0" />
                )}
                <span>{settingsStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  value={settingsForm.botToken}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, botToken: e.target.value }))
                  }
                  placeholder={
                    settings.telegramBotToken
                      ? `Текущий: ${settings.telegramBotToken}`
                      : '123456789:AAHk... (от @BotFather)'
                  }
                  className="w-full bg-[#111114] border border-neutral-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Telegram Chat ID / Channel ID
                </label>
                <input
                  type="text"
                  value={settingsForm.chatId}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, chatId: e.target.value }))
                  }
                  placeholder="-100123456789 или ID пользователя"
                  className="w-full bg-[#111114] border border-neutral-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-[11px] text-neutral-400 space-y-1">
                <div className="font-semibold text-neutral-300">Как настроить за 1 минуту:</div>
                <div>1. Создайте бота в Telegram через <strong>@BotFather</strong> и скопируйте API Token.</div>
                <div>2. Добавьте бота в ваш чат/группу или напишите ему <code>/start</code>.</div>
                <div>3. Узнайте ваш Chat ID через <strong>@userinfobot</strong> и укажите его выше.</div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-sky-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTestingTelegram ? 'Проверка...' : 'Проверить связь'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-2 bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl hover:bg-neutral-700 cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
