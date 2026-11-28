export type Lang = 'fa' | 'en';

export interface InstallerCopy {
  appName: string;
  versionBadge: string;
  titleWelcome: string;
  subtitleWelcome: string;
  highlights: { title: string; desc: string }[];
  installBtn: string;
  customizePath: string;
  hideOptions: string;
  installLocation: string;
  browse: string;
  desktopShortcut: string;
  launchAfterInstall: string;
  installingTitle: string;
  installingSubtitle: string;
  milestones: {
    extract: string;
    engine: string;
    shortcuts: string;
    verify: string;
  };
  completeTitle: string;
  completeSubtitle: string;
  installedAt: string;
  launchNow: string;
  close: string;
  errorTitle: string;
  retry: string;
  safeNote: string;
}

export const COPY: Record<Lang, InstallerCopy> = {
  fa: {
    appName: 'کارجو',
    versionBadge: 'نسخه ۱.۰.۰ · ویندوز ۶۴ بیتی',
    titleWelcome: 'دستیار هوشمند و محلی جست‌وجوی شغل',
    subtitleWelcome:
      'تمام پردازش رزومه، تطبیق شغل و پیش‌نویس فرم‌ها روی سیستم خودتان انجام می‌شود — بدون ارسال داده به سرورهای ابری.',
    highlights: [
      {
        title: 'هوش مصنوعی ۱۰۰٪ محلی',
        desc: 'تحلیل رزومه و OCR فارسی/انگلیسی بدون نیاز به اینترنت و بدون خروج فایل‌های شما.',
      },
      {
        title: 'کنترل کامل قبل از ارسال',
        desc: 'هیچ درخواستی خودکار ارسال نمی‌شود؛ همه فیلدها را قبل از ثبت نهایی بازبینی می‌کنید.',
      },
      {
        title: 'موتور یکپارچه آماده اجرا',
        desc: 'نصب سریع در مسیر کاربری بدون نیاز به دسترسی ادمین یا ابزارهای جانبی.',
      },
    ],
    installBtn: 'نصب کارجو',
    customizePath: 'تنظیمات مسیر نصب',
    hideOptions: 'بستن تنظیمات',
    installLocation: 'مسیر نصب',
    browse: 'انتخاب پوشه',
    desktopShortcut: 'ساخت میانبر روی دسکتاپ',
    launchAfterInstall: 'اجرای خودکار برنامه پس از پایان نصب',
    installingTitle: 'در حال نصب کارجو روی سیستم شما...',
    installingSubtitle: 'لطفاً تا آماده شدن موتور محلی و فایل‌های برنامه منتظر بمانید.',
    milestones: {
      extract: 'استخراج فایل‌های اصلی برنامه',
      engine: 'پیکربندی موتور هوش مصنوعی محلی',
      shortcuts: 'ثبت میانبرهای ویندوز و منوی استارت',
      verify: 'بررسی نهایی و تایید سلامت اجرا',
    },
    completeTitle: 'نصب با موفقیت انجام شد',
    completeSubtitle: 'کارجو آماده است. می‌توانید همین حالا وارد برنامه شوید و رزومه خود را بارگذاری کنید.',
    installedAt: 'مسیر نصب‌شده',
    launchNow: 'شروع و اجرای کارجو',
    close: 'بستن',
    errorTitle: 'در فرایند نصب خطایی رخ داد',
    retry: 'تلاش مجدد',
    safeNote: 'نصب تمیز و آفلاین · قابل حذف در هر زمان از تنظیمات ویندوز',
  },
  en: {
    appName: 'Kaarjoo',
    versionBadge: 'v1.0.0 · Windows x64',
    titleWelcome: 'Your local-first AI job application studio',
    subtitleWelcome:
      'Resume parsing, job matching, and form drafting run privately on your machine — zero cloud lock-in or silent submissions.',
    highlights: [
      {
        title: '100% Local-First AI',
        desc: 'Offline resume extraction and bilingual OCR keep your personal data on your device.',
      },
      {
        title: 'Review Before Submit',
        desc: 'Nothing is ever submitted automatically. Inspect every read-back field before sending.',
      },
      {
        title: 'Self-Contained Runtime',
        desc: 'Clean per-user installation with bundled local engine — no admin rights required.',
      },
    ],
    installBtn: 'Install Kaarjoo',
    customizePath: 'Customize install options',
    hideOptions: 'Hide options',
    installLocation: 'Install location',
    browse: 'Browse',
    desktopShortcut: 'Create Desktop shortcut',
    launchAfterInstall: 'Launch Kaarjoo when setup finishes',
    installingTitle: 'Installing Kaarjoo...',
    installingSubtitle: 'Staging the desktop application and local AI runtime.',
    milestones: {
      extract: 'Extracting desktop application',
      engine: 'Staging local AI engine runtime',
      shortcuts: 'Registering Windows shortcuts',
      verify: 'Verifying installation integrity',
    },
    completeTitle: 'Kaarjoo is ready',
    completeSubtitle: 'Installation completed cleanly. Launch Kaarjoo to import your resume and start.',
    installedAt: 'Installed at',
    launchNow: 'Launch Kaarjoo',
    close: 'Close',
    errorTitle: 'Installation encountered an error',
    retry: 'Try again',
    safeNote: 'Clean per-user install · Uninstall anytime from Windows Settings',
  },
};
