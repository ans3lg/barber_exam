export type GradeType = 'Барбер+' | 'ТОП+';

export type TheoryStatus = 'Сдал' | 'Плюс-минус' | 'Не сдал';

export type OverallResult = 'Аттестован' | 'Условно аттестован' | 'Не аттестован';

export interface TheoryQuestion {
  id: string;
  text: string;
  passed: boolean;
}

export interface MasterClassesState {
  skinTypesFaceMassage: boolean; // Типы кожи/массаж лица
  hotWax: boolean; // Работа с горячим воском
  trichology: boolean; // Трихология
  sales: boolean; // Продажи
  serviceCommunication: boolean; // Сервис и коммуникация
  longHairDesign: boolean; // Удлиненные дизайны стрижек
  fading: boolean; // Фейдинг
  toning: boolean; // Тонировка
}

export interface PracticeState {
  meeting: boolean; // Встреча (+ / -)
  chairWork: boolean; // Работа в кресле (+ / -)
  sinkWork: boolean; // Работа в мойке (+ / -)
  notes: string; // Заметка по практике
}

export interface AdditionalServicesState {
  wax: boolean; // Воск (+ / -)
  scalpHairCare: boolean; // Уход за кожей головы и волосами (+ / -)
  faceCare: boolean; // Уход за лицом (+ / -)
  toning: boolean; // Тонировка (+ / -)
}

export interface ExamData {
  id?: string;
  createdAt?: string;
  examinerName: string;
  // Step 1
  candidateName: string;
  branch: string;
  phone: string;
  grade: GradeType;
  whyBritva: string;
  communitySubscribed: boolean;
  lifeParticipation: boolean;
  dislikedService: string;
  branchChanges: string;
  // Step 2
  masterclasses: MasterClassesState;
  // Step 3
  theoryQuestions: TheoryQuestion[];
  theoryStatus: TheoryStatus;
  theoryNotes: string;
  // Step 4
  practice: PracticeState;
  additionalServices: AdditionalServicesState;
  completionNotes: string;
  // Step 5
  overallResult: OverallResult;
  // Metadata
  pdfUrl?: string;
  pdfPath?: string;
  telegramStatus?: {
    attempted: boolean;
    sent: boolean;
    message: string;
  };
}

export interface AppSettings {
  telegramBotToken: string;
  telegramChatId: string;
  examinerPassword?: string;
  isTelegramConfigured: boolean;
}
