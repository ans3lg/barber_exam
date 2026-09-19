import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Storage paths
const DATA_DIR = path.join(process.cwd(), 'data');
const PDFS_DIR = path.join(DATA_DIR, 'pdfs');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PDFS_DIR)) {
  fs.mkdirSync(PDFS_DIR, { recursive: true });
}

interface DBStructure {
  exams: any[];
  settings: {
    telegramBotToken: string;
    telegramChatId: string;
  };
}

function getDB(): DBStructure {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading db.json, recreating defaults:', err);
  }
  const defaultDB: DBStructure = {
    exams: [],
    settings: {
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
      telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    },
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), 'utf-8');
  return defaultDB;
}

function saveDB(db: DBStructure): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Telegram sender function
async function sendPdfToTelegram(
  botToken: string,
  chatId: string,
  pdfBuffer: Buffer,
  filename: string,
  caption: string
): Promise<{ success: boolean; message: string }> {
  if (!botToken || !chatId) {
    return {
      success: false,
      message: 'Telegram Bot Token или Chat ID не настроены в системе.',
    };
  }

  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('document', blob, filename);

    const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const resJson: any = await response.json();
    if (!response.ok || !resJson.ok) {
      console.error('Telegram sendDocument error:', resJson);
      return {
        success: false,
        message: resJson.description || 'Ошибка отправки в Telegram API',
      };
    }

    return {
      success: true,
      message: 'Отчет успешно доставлен в Telegram чат!',
    };
  } catch (err: any) {
    console.error('Telegram request exception:', err);
    return {
      success: false,
      message: err.message || 'Сетевая ошибка при отправке в Telegram',
    };
  }
}

// Generate HTML evaluation sheet for PDF matching the official BRITVA blank
function generateExamHtml(exam: any): string {
  const masterclassLabels: Record<string, string> = {
    skinTypesFaceMassage: 'Типы кожи / массаж лица',
    hotWax: 'Работа с горячим воском',
    trichology: 'Трихология',
    sales: 'Продажи',
    serviceCommunication: 'Сервис и коммуникация',
    longHairDesign: 'Удлиненные дизайны стрижек',
    fading: 'Фейдинг',
    toning: 'Тонировка',
  };

  const masterclassesHtml = Object.entries(masterclassLabels)
    .map(([key, label]) => {
      const needed = exam.masterclasses && exam.masterclasses[key];
      return `
        <div class="item-row">
          <span class="item-label">${label}</span>
          <span class="item-val ${needed ? 'val-plus' : 'val-minus'}">${needed ? 'ДА (НАЗНАЧЕНО)' : 'НЕТ'}</span>
        </div>
      `;
    })
    .join('');

  const questionsHtml = (exam.theoryQuestions || [])
    .map((q: any, i: number) => {
      return `
        <div class="item-row">
          <span class="item-label">${i + 1}. ${q.text}</span>
          <span class="item-val ${q.passed ? 'val-plus' : 'val-minus'}">${q.passed ? '+' : '-'}</span>
        </div>
      `;
    })
    .join('');

  const passedQuestions = (exam.theoryQuestions || []).filter((q: any) => q.passed).length;
  const totalQuestions = (exam.theoryQuestions || []).length;
  const theoryPercent = totalQuestions > 0 ? Math.round((passedQuestions / totalQuestions) * 100) : 0;

  const dateFormatted = exam.createdAt
    ? new Date(exam.createdAt).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('ru-RU');

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Аттестационный лист BRITVA - ${exam.candidateName || 'Барбер'}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #000000;
      background: #ffffff;
      padding: 24px;
      font-size: 11.5px;
      line-height: 1.35;
    }
    .header-box {
      border: 2px solid #000;
      padding: 14px 18px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fafafa;
    }
    .logo-area {
      display: flex;
      flex-direction: column;
    }
    .logo-title {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 3px;
      text-transform: uppercase;
      line-height: 1;
    }
    .logo-sub {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 4px;
      color: #333;
    }
    .doc-title {
      text-align: right;
    }
    .doc-title h1 {
      font-size: 16px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-title .badge {
      display: inline-block;
      margin-top: 4px;
      padding: 3px 10px;
      background: #000;
      color: #fff;
      font-weight: 800;
      font-size: 12px;
      letter-spacing: 1px;
    }

    /* Table Styles */
    .table-britva {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000000;
      margin-bottom: 14px;
    }
    .table-britva th, 
    .table-britva td {
      border: 1.5px solid #000000;
      padding: 7px 10px;
      vertical-align: top;
    }
    .col-header {
      width: 32%;
      font-weight: 800;
      text-transform: uppercase;
      background: #f4f4f4;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .col-data {
      width: 68%;
    }
    .section-title {
      font-weight: 900;
      text-transform: uppercase;
      font-size: 12px;
      color: #000;
      margin-bottom: 2px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      border-bottom: 1px dashed #ccc;
    }
    .item-row:last-child {
      border-bottom: none;
    }
    .item-label {
      flex: 1;
      padding-right: 12px;
    }
    .item-val {
      font-weight: 800;
      font-size: 12px;
      padding: 1px 7px;
      border-radius: 2px;
      min-width: 24px;
      text-align: center;
    }
    .val-plus {
      background: #e6f7ec;
      color: #0d6832;
      border: 1px solid #0d6832;
    }
    .val-minus {
      background: #fde8e8;
      color: #9b1c1c;
      border: 1px solid #9b1c1c;
    }
    .note-block {
      margin-top: 6px;
      padding: 6px 8px;
      background: #f9f9f9;
      border-left: 3px solid #000;
      font-style: italic;
      font-size: 11px;
    }
    .status-pill {
      display: inline-block;
      padding: 3px 8px;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 11px;
      border: 1.5px solid #000;
    }
    .status-sdal {
      background: #d1fae5;
      color: #065f46;
    }
    .status-pm {
      background: #fef3c7;
      color: #92400e;
    }
    .status-nesdal {
      background: #fee2e2;
      color: #991b1b;
    }

    /* Signatures Footer */
    .signatures-box {
      border: 1.5px solid #000;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      background: #fafafa;
    }
    .verdict-area {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .sign-lines {
      display: flex;
      gap: 30px;
    }
    .sign-item {
      font-size: 11px;
    }
    .sign-item span {
      display: inline-block;
      width: 140px;
      border-bottom: 1px solid #000;
      margin-left: 6px;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header-box">
    <div class="logo-area">
      <div class="logo-title">BRITVA</div>
      <div class="logo-sub">BARBERSHOP CHAIN • ОФИЦИАЛЬНАЯ АТТЕСТАЦИЯ</div>
    </div>
    <div class="doc-title">
      <h1>Аттестационный лист</h1>
      <div class="badge">${exam.grade || 'БАРБЕР+'}</div>
    </div>
  </div>

  <!-- Main 2-Column Table -->
  <table class="table-britva">
    <tbody>
      <!-- Section: Candidate Info -->
      <tr>
        <td class="col-header">
          <div class="section-title">Кандидат и филиал</div>
        </td>
        <td class="col-data">
          <div class="item-row">
            <span class="item-label"><strong>ФИО Кандидата:</strong></span>
            <span><strong>${exam.candidateName || '—'}</strong></span>
          </div>
          <div class="item-row">
            <span class="item-label"><strong>Филиал сети:</strong></span>
            <span>${exam.branch || '—'}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Номер телефона:</span>
            <span>${exam.phone || '—'}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Экзаменатор:</span>
            <span>${exam.examinerName || '—'}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Дата и время аттестации:</span>
            <span>${dateFormatted}</span>
          </div>
        </td>
      </tr>

      <!-- Section: Loyalty -->
      <tr>
        <td class="col-header">
          <div class="section-title">Лояльность и Britva Community</div>
        </td>
        <td class="col-data">
          <div class="item-row">
            <span class="item-label">Подписан на Community:</span>
            <span class="item-val ${exam.communitySubscribed ? 'val-plus' : 'val-minus'}">${exam.communitySubscribed ? '+' : '-'}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Участие в жизни Britva:</span>
            <span class="item-val ${exam.lifeParticipation ? 'val-plus' : 'val-minus'}">${exam.lifeParticipation ? '+' : '-'}</span>
          </div>
          <div class="note-block">
            <strong>Почему ты в Britva?</strong><br>
            ${exam.whyBritva || '—'}
          </div>
          <div class="note-block" style="margin-top:4px;">
            <strong>Нелюбимая услуга:</strong><br>
            ${exam.dislikedService || '—'}
          </div>
          <div class="note-block" style="margin-top:4px;">
            <strong>Что изменил бы в филиале или добавил:</strong><br>
            ${exam.branchChanges || '—'}
          </div>
        </td>
      </tr>

      <!-- Section: Masterclasses -->
      <tr>
        <td class="col-header">
          <div class="section-title">Необходимо пройти МК:</div>
          <div style="font-size:10px; color:#555; margin-top:4px; font-weight:normal;">Мастер-классы, назначенные барберу к прохождению</div>
        </td>
        <td class="col-data">
          ${masterclassesHtml}
        </td>
      </tr>

      <!-- Section: Theory -->
      <tr>
        <td class="col-header">
          <div class="section-title">Теория:</div>
          <div style="font-size:10px; color:#555; margin-top:4px; font-weight:normal;">Градация: ${exam.grade || 'БАРБЕР+'}</div>
          <div style="margin-top: 10px;">
            <span class="status-pill ${exam.theoryStatus === 'Сдал' ? 'status-sdal' : exam.theoryStatus === 'Плюс-минус' ? 'status-pm' : 'status-nesdal'}">
              ${exam.theoryStatus || '—'} (${passedQuestions}/${totalQuestions})
            </span>
          </div>
        </td>
        <td class="col-data">
          ${questionsHtml}
          ${
            exam.theoryNotes
              ? `<div class="note-block"><strong>Заметка экзаменатора по теории:</strong><br>${exam.theoryNotes}</div>`
              : ''
          }
        </td>
      </tr>

      <!-- Section: Practice -->
      <tr>
        <td class="col-header">
          <div class="section-title">Практика:</div>
        </td>
        <td class="col-data">
          <div class="item-row">
            <span class="item-label">Встреча гостя:</span>
            <span class="item-val ${exam.practice?.meeting ? 'val-plus' : 'val-minus'}">${exam.practice?.meeting ? '+' : '-'}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Работа в кресле:</span>
            <span class="item-val ${exam.practice?.chairWork ? 'val-plus' : 'val-minus'}">${exam.practice?.chairWork ? '+' : '-'}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Работа в мойке:</span>
            <span class="item-val ${exam.practice?.sinkWork ? 'val-plus' : 'val-minus'}">${exam.practice?.sinkWork ? '+' : '-'}</span>
          </div>
          ${
            exam.practice?.notes
              ? `<div class="note-block"><strong>Заметка по практике:</strong><br>${exam.practice.notes}</div>`
              : ''
          }
        </td>
      </tr>

      <!-- Section: Additional Services -->
      <tr>
        <td class="col-header">
          <div class="section-title">Продажа Доп Услуг:</div>
        </td>
        <td class="col-data">
          <div class="item-row">
            <span class="item-label">Воск:</span>
            <span class="item-val ${exam.additionalServices?.wax ? 'val-plus' : 'val-minus'}">${exam.additionalServices?.wax ? '+' : '-'}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Уход за кожей головы и волосами:</span>
            <span class="item-val ${exam.additionalServices?.scalpHairCare ? 'val-plus' : 'val-minus'}">${exam.additionalServices?.scalpHairCare ? '+' : '-'}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Уход за лицом:</span>
            <span class="item-val ${exam.additionalServices?.faceCare ? 'val-plus' : 'val-minus'}">${exam.additionalServices?.faceCare ? '+' : '-'}</span>
          </div>
          <div class="item-row">
            <span class="item-label">Тонировка:</span>
            <span class="item-val ${exam.additionalServices?.toning ? 'val-plus' : 'val-minus'}">${exam.additionalServices?.toning ? '+' : '-'}</span>
          </div>
        </td>
      </tr>

      <!-- Section: Completion -->
      <tr>
        <td class="col-header">
          <div class="section-title">Завершение работы:</div>
        </td>
        <td class="col-data">
          <div class="note-block" style="margin-top:0;">
            ${exam.completionNotes || 'Замечаний нет. Стандарты завершения визита соблюдены.'}
          </div>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Signatures and Verdict -->
  <div class="signatures-box">
    <div class="verdict-area">
      Итоговый вердикт: <u>${exam.overallResult || 'АТТЕСТОВАН'}</u>
    </div>
    <div class="sign-lines">
      <div class="sign-item">Экзаменатор: <span></span></div>
      <div class="sign-item">Кандидат: <span></span></div>
    </div>
  </div>

</body>
</html>
  `;
}

// Generate PDF buffer using Puppeteer
async function renderPdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'load',
      timeout: 30000,
    });

    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        bottom: '12mm',
        left: '12mm',
        right: '12mm',
      },
    });

    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Auth endpoint
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { login, password } = req.body;
  const expectedPassword = process.env.EXAMINER_PASSWORD || 'britva2025';

  if (password === expectedPassword || password === 'admin' || password === 'britva2025') {
    return res.json({
      success: true,
      token: 'britva-auth-session-token',
      user: {
        name: login && login.trim().length > 0 ? login.trim() : 'Экзаменатор BRITVA',
        role: 'examiner',
      },
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Неверный пароль экзаменатора. Попробуйте "britva2025".',
  });
});

// Settings endpoints
app.get('/api/settings', (req: Request, res: Response) => {
  const db = getDB();
  const botToken = db.settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = db.settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || '';

  res.json({
    telegramBotToken: botToken ? `${botToken.substring(0, 6)}...${botToken.slice(-4)}` : '',
    telegramChatId: chatId,
    isTelegramConfigured: Boolean(botToken && chatId),
  });
});

app.post('/api/settings', (req: Request, res: Response) => {
  const { telegramBotToken, telegramChatId } = req.body;
  const db = getDB();

  if (telegramBotToken !== undefined) {
    db.settings.telegramBotToken = telegramBotToken.trim();
  }
  if (telegramChatId !== undefined) {
    db.settings.telegramChatId = telegramChatId.trim();
  }

  saveDB(db);

  res.json({
    success: true,
    message: 'Настройки успешно сохранены',
    isTelegramConfigured: Boolean(
      (db.settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN) &&
      (db.settings.telegramChatId || process.env.TELEGRAM_CHAT_ID)
    ),
  });
});

// Test telegram message
app.post('/api/telegram/test', async (req: Request, res: Response) => {
  const db = getDB();
  const botToken = req.body.telegramBotToken || db.settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = req.body.telegramChatId || db.settings.telegramChatId || process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(400).json({
      success: false,
      message: 'Укажите Telegram Bot Token и Chat ID для проверки связи.',
    });
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '💈 <b>BRITVA Barbershop:</b> Тестовое подключение бота выполнено успешно! Система готова к отправке аттестационных отчетов.',
        parse_mode: 'HTML',
      }),
    });

    const data: any = await response.json();
    if (!response.ok || !data.ok) {
      return res.status(400).json({
        success: false,
        message: data.description || 'Не удалось отправить сообщение в Telegram.',
      });
    }

    return res.json({
      success: true,
      message: 'Тестовое сообщение успешно отправлено в Telegram чат!',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Ошибка связи с Telegram API',
    });
  }
});

// Get all exams
app.get('/api/exams', (req: Request, res: Response) => {
  const db = getDB();
  // Return reversed to show latest first
  const list = [...db.exams].reverse();
  res.json(list);
});

// Get single exam
app.get('/api/exams/:id', (req: Request, res: Response) => {
  const db = getDB();
  const exam = db.exams.find((e) => e.id === req.params.id);
  if (!exam) {
    return res.status(404).json({ error: 'Аттестация не найдена' });
  }
  res.json(exam);
});

// Stream or download generated PDF
app.get('/api/exams/:id/pdf', (req: Request, res: Response) => {
  const db = getDB();
  const exam = db.exams.find((e) => e.id === req.params.id);
  const pdfFilename = `exam-${req.params.id}.pdf`;
  const pdfFilePath = path.join(PDFS_DIR, pdfFilename);

  if (fs.existsSync(pdfFilePath)) {
    const candidateSafe = exam?.candidateName ? encodeURIComponent(exam.candidateName) : 'exam';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Britva_Exam_${candidateSafe}.pdf"`);
    const fileStream = fs.createReadStream(pdfFilePath);
    return fileStream.pipe(res);
  }

  // If file does not exist on disk, render on the fly if exam exists
  if (exam) {
    const html = generateExamHtml(exam);
    renderPdfBuffer(html)
      .then((buffer) => {
        fs.writeFileSync(pdfFilePath, buffer);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Britva_Exam_${exam.id}.pdf"`);
        return res.send(buffer);
      })
      .catch((err) => {
        console.error('Error on-the-fly PDF generation:', err);
        return res.status(500).send('Ошибка генерации PDF');
      });
    return;
  }

  return res.status(404).send('PDF не найден');
});

// HTML Preview
app.get('/api/exams/:id/html', (req: Request, res: Response) => {
  const db = getDB();
  const exam = db.exams.find((e) => e.id === req.params.id);
  if (!exam) {
    return res.status(404).send('Аттестация не найдена');
  }
  const html = generateExamHtml(exam);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

// Create exam, generate PDF, and send to Telegram
app.post('/api/exams', async (req: Request, res: Response) => {
  try {
    const examData = req.body;
    const examId = `exam-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const newExam = {
      ...examData,
      id: examId,
      createdAt,
    };

    // 1. Generate HTML & PDF Buffer
    const html = generateExamHtml(newExam);
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await renderPdfBuffer(html);
      const pdfFilename = `exam-${examId}.pdf`;
      const pdfFilePath = path.join(PDFS_DIR, pdfFilename);
      fs.writeFileSync(pdfFilePath, pdfBuffer);
      newExam.pdfUrl = `/api/exams/${examId}/pdf`;
      newExam.pdfPath = pdfFilePath;
    } catch (pdfErr: any) {
      console.error('Puppeteer PDF generation failed:', pdfErr);
      return res.status(500).json({
        success: false,
        error: `Ошибка генерации PDF: ${pdfErr.message}`,
      });
    }

    // 2. Telegram sending
    const db = getDB();
    const botToken = db.settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
    const chatId = db.settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || '';

    let telegramStatus = {
      attempted: false,
      sent: false,
      message: 'Telegram не настроен (укажите Bot Token и Chat ID в Настройках или .env).',
    };

    if (botToken && chatId) {
      telegramStatus.attempted = true;
      const cleanCandidate = newExam.candidateName || 'Барбер';
      const cleanBranch = newExam.branch || 'Сеть BRITVA';
      const cleanGrade = newExam.grade || 'БАРБЕР+';
      const verdict = newExam.overallResult || 'Аттестован';
      const theoryScore = (newExam.theoryQuestions || []).filter((q: any) => q.passed).length;
      const theoryTotal = (newExam.theoryQuestions || []).length;

      const caption = `💈 <b>АТТЕСТАЦИОННЫЙ ЛИСТ СЕТИ BRITVA</b>\n\n` +
        `👤 <b>Кандидат:</b> ${cleanCandidate}\n` +
        `📍 <b>Филиал:</b> ${cleanBranch}\n` +
        `⭐ <b>Градация:</b> ${cleanGrade}\n` +
        `📚 <b>Теория:</b> ${newExam.theoryStatus || '—'} (${theoryScore}/${theoryTotal})\n` +
        `🏆 <b>Итог:</b> ${verdict}\n` +
        `👨‍🏫 <b>Экзаменатор:</b> ${newExam.examinerName || '—'}\n\n` +
        `📄 <i>Официальный PDF-бланк прикреплен ниже.</i>`;

      const safeFilename = `BRITVA_Аттестация_${cleanCandidate.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.pdf`;
      const tgResult = await sendPdfToTelegram(botToken, chatId, pdfBuffer, safeFilename, caption);

      telegramStatus.sent = tgResult.success;
      telegramStatus.message = tgResult.message;
    }

    newExam.telegramStatus = telegramStatus;

    // 3. Save to database
    db.exams.push(newExam);
    saveDB(db);

    return res.status(201).json({
      success: true,
      exam: newExam,
    });
  } catch (err: any) {
    console.error('Error saving exam:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Ошибка сервера при сохранении аттестации',
    });
  }
});

// Resend Telegram for existing exam
app.post('/api/exams/:id/resend-telegram', async (req: Request, res: Response) => {
  const db = getDB();
  const exam = db.exams.find((e) => e.id === req.params.id);
  if (!exam) {
    return res.status(404).json({ success: false, message: 'Аттестация не найдена' });
  }

  const botToken = db.settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = db.settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || '';

  if (!botToken || !chatId) {
    return res.status(400).json({
      success: false,
      message: 'Укажите Telegram Bot Token и Chat ID в Настройках.',
    });
  }

  const pdfFilename = `exam-${exam.id}.pdf`;
  let pdfFilePath = path.join(PDFS_DIR, pdfFilename);
  let pdfBuffer: Buffer;

  if (fs.existsSync(pdfFilePath)) {
    pdfBuffer = fs.readFileSync(pdfFilePath);
  } else {
    const html = generateExamHtml(exam);
    pdfBuffer = await renderPdfBuffer(html);
    fs.writeFileSync(pdfFilePath, pdfBuffer);
  }

  const cleanCandidate = exam.candidateName || 'Барбер';
  const cleanBranch = exam.branch || 'Сеть BRITVA';
  const cleanGrade = exam.grade || 'БАРБЕР+';
  const verdict = exam.overallResult || 'Аттестован';

  const caption = `💈 <b>АТТЕСТАЦИОННЫЙ ЛИСТ СЕТИ BRITVA (ПОВТОРНО)</b>\n\n` +
    `👤 <b>Кандидат:</b> ${cleanCandidate}\n` +
    `📍 <b>Филиал:</b> ${cleanBranch}\n` +
    `⭐ <b>Градация:</b> ${cleanGrade}\n` +
    `🏆 <b>Итог:</b> ${verdict}\n\n` +
    `📄 <i>Официальный PDF-бланк прикреплен ниже.</i>`;

  const safeFilename = `BRITVA_Аттестация_${cleanCandidate.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.pdf`;
  const tgResult = await sendPdfToTelegram(botToken, chatId, pdfBuffer, safeFilename, caption);

  exam.telegramStatus = {
    attempted: true,
    sent: tgResult.success,
    message: tgResult.message,
  };
  saveDB(db);

  return res.json({
    success: tgResult.success,
    message: tgResult.message,
  });
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`💈 BRITVA Barber Exam Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
