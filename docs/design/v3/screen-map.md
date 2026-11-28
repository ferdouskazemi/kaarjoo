# کارجو: نقشه‌ی کامل صفحه‌ها (طراحی v3)

این نقشه از روی کد فعلی (کامیت `8b802e5`) ساخته شده است: ۶ صفحه‌ی اصلی، ۱۶ کامپوننت و حدود ۴۰۰ متن رابط کاربری. همه‌ی بخش‌ها حفظ شده‌اند، فقط جایشان عوض شده است. چیزهای روزمره جلوی چشم‌اند و بقیه یک کلیک دورتر.

**ساختار جدید:** فقط ۳ بخش در نوار کناری: **امروز · شغل‌ها · درخواست‌ها**. بقیه زیر منوی عکس پروفایل (پایین نوار) یا با ⌘K.

## فهرست ماکاپ‌ها

| # | فایل | صفحه |
|---|------|------|
| 00 | `00-overview.png` | نمای کلی همه‌ی صفحه‌ها |
| 01 | `01-welcome-upload.png` | شروع: آپلود رزومه |
| 02 | `02-reading-resume.png` | در حال خواندن رزومه (پیشرفت واقعی + اسکنر flash-rive) |
| 03 | `03-check-profile.png` | بررسی پروفایل (مرحله‌ی ۲ از ۳) |
| 04 | `04-preferences.png` | دنبال چه کاری هستید؟ (مرحله‌ی ۳ از ۳) |
| 05 | `05-today.png` | امروز |
| 06 | `06-activity-drawer.png` | کشوی کارهای پس‌زمینه |
| 07 | `07-jobs-for-you.png` | شغل‌ها: برای شما (یکی‌یکی) |
| 08 | `08-jobs-all-and-detail.png` | شغل‌ها: همه‌ی شغل‌ها + جزئیات |
| 09 | `09-jobs-sources.png` | شغل‌ها: منابع، شرکت‌های دنبال‌شده، دایرکتوری، افزودن شرکت |
| 10 | `10-prepare-application.png` | آماده‌سازی درخواست (رزومه، نامه، سؤال‌ها) |
| 11 | `11-ready-to-send.png` | آماده‌ی ارسال؟ |
| 12 | `12-applications.png` | درخواست‌ها (فهرست) |
| 13 | `13-sent-application.png` | یک درخواست ارسال‌شده |
| 14 | `14-insights.png` | درخواست‌ها: آمار |
| 15 | `15-answers.png` | بانک پاسخ |
| 16 | `16-settings-general.png` | تنظیمات: عمومی و قابلیت‌های هوشمند |
| 17 | `17-settings-applying-data.png` | تنظیمات: ارسال درخواست، داده و حریم خصوصی، به‌روزرسانی |
| 18 | `18-menu-and-search.png` | منوی پروفایل و جست‌وجوی سریع |
| 19 | `19-empty-and-problem-states.png` | حالت‌های خالی و مشکل |
| 20 | `20-today-fa.png` | امروز (فارسی) |
| 21 | `21-applications-fa.png` | درخواست‌ها (فارسی) |
| 22 | `22-motion-and-states.png` | انیمیشن و حالت‌ها |

منبع HTML: `all-screens.html` (۰۱–۰۴، ۰۸–۱۰، ۱۲–۱۹، ۲۱) و `../v2/simple-flow.html` (۰۵–۰۷، ۱۱، ۲۰، ۲۲).

## قدیم ← جدید (همه‌ی بخش‌های کد فعلی)

| کد فعلی | بخش | جای جدید |
|---------|-----|----------|
| `HomeView` | Welcome، badge «LOCAL-FIRST ATS»، توضیح تبلیغاتی | حذف. فقط یک خط «حریم خصوصی» در صفحه‌ی ۰۱ |
| `HomeView` | ۴ کارت آمار (Weekly، Avg score، Interview rate، Privacy) | ۱۴ آمار |
| `HomeView` | کارت پروفایل، Action Needed، Review Ready، Submitted | ۰۵ امروز: یک کارت «قدم بعدی» + دو کارت کوچک |
| `HomeView` | جدول Application Tracker | ۱۲ درخواست‌ها |
| `ProfileView` | آپلود، Load Golden Profile | ۰۱ (نمونه‌ی ساختگی به تنظیمات ← Sample data رفت) |
| `ProfileView` | ۴ مرحله‌ی استخراج (انیمیشن ساختگی) | ۰۲ با مراحل واقعی موتور |
| `ProfileView` | Stepper، IssuesFixCard | ۰۳ بالای صفحه (مشکلات اول) |
| `ProfileView` | Candidate Identity، Contact، Links | ۰۳ کارت تماس |
| `ProfileView` | Summary، Experience، Education، Skills | ۰۳ کارت‌های جدا، ویرایش درجا |
| `ProfileView` | Source Document Viewer، Raw Text، Provenance | ۰۳ لینک «این از کجا آمده؟» که صفحه‌ی اصلی را در یک پنل باز می‌کند |
| `ProfileView` | Clear Profile، Upload Another، Confirm Only، Start Exploring | «Use a different file» + یک دکمه‌ی Continue. پاک کردن به تنظیمات رفت |
| `PreferencesPanel` | همه‌ی فیلدها | ۰۴ (هنگام شروع) و منوی پروفایل ← What I’m looking for |
| `JobsView` | فهرست، فیلترها، Sync Live Feed | ۰۸ همه‌ی شغل‌ها (۳ فیلتر + Refresh) |
| `JobsView` / `JobCard` | امتیاز، مهارت‌های جور و ناجور | ۰۷ برای شما و ۰۸ |
| `JobDetailDrawer` | توضیحات، الزامات، امتیاز، بازخورد | ۰۸ پنل کناری، «Not for me» با انتخاب دلیل |
| `CompanyBoardsModal` / Monitored / Directory / Import URL | | ۰۹ منابع |
| `TailoredDocumentsModal` | قالب، bullets، نامه، سؤال‌ها، راستی‌آزمایی، PDF/DOCX | ۱۰ آماده‌سازی (قالب و دانلود در منوی ⋯) |
| `QueueView` | صف، عکس مرورگر، چک‌لیست، Approve & Submit | ۱۱ آماده‌ی ارسال + ۱۲ گروه «نیاز به شما / آماده» |
| `ApplicationsView` / `KanbanBoard` / `ApplicationsTableView` | | ۱۲ (List / Board) و Export CSV |
| `ApplicationDetailDrawer` | مدارک، اسکرین‌شات، یادداشت، مصاحبه، Timeline | ۱۳ |
| `DashboardKpisWidget` | Top missing skills، ATS distribution | ۱۴ |
| (جدید) | بانک پاسخ | ۱۵ |
| `SettingsView` | Appearance، Language | ۱۶ General |
| `SettingsView` | Local AI، Hardware tier، Models | ۱۶ Smart features |
| `SettingsView` | Browser automation، Headless | ۱۷ Applying («همیشه قبل از ارسال بپرس» قفل روشن) |
| `SettingsView` | SQLite، Backup، Wipe، Demo mode | ۱۷ Data & privacy |
| `SettingsView` | Updates، Directory manifest | ۱۷ Updates |
| `SettingsView` | Node engine، IPC، مسیر DB | About ← Technical details (پنهان) |
| `AutoPipelineBar` | | ۰۶ دکمه‌ی کوچک گوشه + کشو |
| `TitleBar` chips (Engine Connected، STANDARD، 100% LOCAL) | | حذف؛ فقط وضعیت ساده در دکمه‌ی گوشه |
| `Sidebar` (۶ مورد + جست‌وجو + زبان + تم) | | نوار ۳ آیکونی + منوی پروفایل (۱۸) |
| `CommandPalette` | | ۱۸ |
| Empty/loading/error | | ۱۹ |
