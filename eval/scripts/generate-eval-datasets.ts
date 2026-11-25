import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { chromium } from 'playwright-core';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell } from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVAL_DIR = path.resolve(__dirname, '..');
const RESUMES_DIR = path.join(EVAL_DIR, 'resumes');
const MATCHING_DIR = path.join(EVAL_DIR, 'matching');
const TRUTH_DIR = path.join(EVAL_DIR, 'truthfulness');

function findBrowser(): string {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ].filter(Boolean) as string[];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chrome/Edge executable not found for generating PDF/PNG eval fixtures');
  return found;
}

function createZip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const locals: Buffer[] = [];
  const cds: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf-8');
    const comp = deflateRawSync(e.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(e.data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    locals.push(lh, nameBuf, comp);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    cds.push(cd, nameBuf);
    offset += lh.length + nameBuf.length + comp.length;
  }
  const cdBuf = Buffer.concat(cds);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cdBuf, eocd]);
}

function toRtfUnicode(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (ch === '\n') out += '\\par\n';
    else if (ch === '\\' || ch === '{' || ch === '}') out += '\\' + ch;
    else if (code < 128) out += ch;
    else out += `\\u${code}?`;
  }
  return out;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface SyntheticResumeSpec {
  id: string;
  format: 'pdf' | 'docx' | 'odt' | 'rtf' | 'png' | 'scanned-pdf' | 'txt';
  layout: 'one-col' | 'two-col' | 'table' | 'linkedin' | 'europass' | 'scanned';
  language: 'en' | 'fa' | 'mixed';
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  experiences: Array<{ title: string; company: string; startDate: string; endDate?: string; isCurrent: boolean; bullet: string }>;
  education: Array<{ institution: string; degree: string; fieldOfStudy: string; startDate: string; endDate: string }>;
  skills: string[];
}

const SPECS: SyntheticResumeSpec[] = [
  // Already have 01 (.txt FA), 02 (.txt EN), 03 (.txt mixed). We add 04..32 across real PDF, DOCX, ODT, RTF, PNG, Scanned PDF.
  {
    id: 'resume_04_en_pdf_onecol',
    format: 'pdf',
    layout: 'one-col',
    language: 'en',
    fullName: 'Layla Haidari',
    headline: 'Senior Frontend Engineer',
    email: 'layla.haidari@example.com',
    phone: '+93 79 221 4401',
    location: 'Kabul, Afghanistan',
    experiences: [
      { title: 'Senior Frontend Engineer', company: 'SilkRoad Digital', startDate: '2022', isCurrent: true, bullet: 'Built React and TypeScript design systems serving 400k monthly users.' },
      { title: 'Frontend Developer', company: 'Bactria Labs', startDate: '2019', endDate: '2022', isCurrent: false, bullet: 'Migrated legacy dashboards to Next.js and Tailwind CSS.' },
    ],
    education: [{ institution: 'Kabul Polytechnic University', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Engineering', startDate: '2015', endDate: '2019' }],
    skills: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'GraphQL', 'Git'],
  },
  {
    id: 'resume_05_en_pdf_twocol',
    format: 'pdf',
    layout: 'two-col',
    language: 'en',
    fullName: 'Omar Farooq',
    headline: 'DevOps & Cloud Architect',
    email: 'omar.farooq@example.org',
    phone: '+49 176 4102 9981',
    location: 'Berlin, Germany',
    experiences: [
      { title: 'Lead DevOps Engineer', company: 'NordCloud GmbH', startDate: '2021', isCurrent: true, bullet: 'Managed multi-region Kubernetes clusters with Terraform and AWS.' },
      { title: 'Site Reliability Engineer', company: 'EuroPay Systems', startDate: '2018', endDate: '2021', isCurrent: false, bullet: 'Automated CI/CD pipelines and cut incident recovery time by 45%.' },
    ],
    education: [{ institution: 'TU Berlin', degree: 'Master of Science', fieldOfStudy: 'Distributed Systems', startDate: '2016', endDate: '2018' }],
    skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'Linux', 'Go', 'CI/CD'],
  },
  {
    id: 'resume_06_en_pdf_linkedin',
    format: 'pdf',
    layout: 'linkedin',
    language: 'en',
    fullName: 'Nadia Safi',
    headline: 'Data Scientist & ML Engineer',
    email: 'nadia.safi@example.net',
    phone: '+1 415 890 3312',
    location: 'San Jose, CA',
    experiences: [
      { title: 'Senior ML Engineer', company: 'VectorGrid AI', startDate: '2021', isCurrent: true, bullet: 'Trained multilingual embedding models in PyTorch and deployed ONNX inference.' },
      { title: 'Data Scientist', company: 'ClearBank Analytics', startDate: '2019', endDate: '2021', isCurrent: false, bullet: 'Developed fraud detection models in Python and SQL.' },
    ],
    education: [{ institution: 'San Jose State University', degree: 'Master of Science', fieldOfStudy: 'Data Science', startDate: '2017', endDate: '2019' }],
    skills: ['Python', 'PyTorch', 'SQL', 'PostgreSQL', 'Docker', 'AWS'],
  },
  {
    id: 'resume_07_en_pdf_europass',
    format: 'pdf',
    layout: 'europass',
    language: 'en',
    fullName: 'Tariq Rahimi',
    headline: 'Cybersecurity Analyst',
    email: 'tariq.rahimi@example.eu',
    phone: '+31 6 4412 8820',
    location: 'Rotterdam, Netherlands',
    experiences: [
      { title: 'Senior Security Engineer', company: 'ShieldNet Europe', startDate: '2020', isCurrent: true, bullet: 'Conducted penetration testing and hardened Kubernetes zero-trust policies.' },
    ],
    education: [{ institution: 'Delft University of Technology', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Science', startDate: '2016', endDate: '2020' }],
    skills: ['Cybersecurity', 'Linux', 'Python', 'Docker', 'Kubernetes', 'Go'],
  },
  {
    id: 'resume_08_en_pdf_table',
    format: 'pdf',
    layout: 'table',
    language: 'en',
    fullName: 'Maryam Azizi',
    headline: 'QA Automation Lead',
    email: 'maryam.azizi@example.com',
    phone: '+971 50 321 7744',
    location: 'Dubai, UAE',
    experiences: [
      { title: 'QA Automation Lead', company: 'Oasis FinTech', startDate: '2021', isCurrent: true, bullet: 'Engineered end-to-end Playwright and Vitest test suites across 12 services.' },
      { title: 'QA Engineer', company: 'GulfCommerce', startDate: '2018', endDate: '2021', isCurrent: false, bullet: 'Built API contract tests and CI regression gates.' },
    ],
    education: [{ institution: 'American University of Sharjah', degree: 'Bachelor of Engineering', fieldOfStudy: 'Software Engineering', startDate: '2014', endDate: '2018' }],
    skills: ['TypeScript', 'Playwright', 'Vitest', 'CI/CD', 'Docker', 'SQL'],
  },
  {
    id: 'resume_09_fa_pdf_onecol',
    format: 'pdf',
    layout: 'one-col',
    language: 'fa',
    fullName: 'بهرام توسلی',
    headline: 'مهندس ارشد بک‌اند',
    email: 'bahram.tavasoli@example.ir',
    phone: '+98 912 440 8821',
    location: 'تهران، ایران',
    experiences: [
      { title: 'مهندس ارشد بک‌اند', company: 'پردازش ابری پارس', startDate: '1400', isCurrent: true, bullet: 'طراحی میکروسرویس‌های پرترافیک با Go و PostgreSQL' },
      { title: 'توسعه‌دهنده نرم‌افزار', company: 'نگار سیستم', startDate: '1397', endDate: '1400', isCurrent: false, bullet: 'پیاده‌سازی APIهای مالی با Node.js و Redis' },
    ],
    education: [{ institution: 'دانشگاه صنعتی شریف', degree: 'کارشناسی ارشد', fieldOfStudy: 'مهندسی کامپیوتر', startDate: '1395', endDate: '1397' }],
    skills: ['Go', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes'],
  },
  {
    id: 'resume_10_fa_pdf_twocol',
    format: 'pdf',
    layout: 'two-col',
    language: 'fa',
    fullName: 'شبنم نوری',
    headline: 'توسعه‌دهنده فرانت‌اند',
    email: 'shabnam.noori@example.af',
    phone: '+93 78 511 2090',
    location: 'هرات، افغانستان',
    experiences: [
      { title: 'توسعه‌دهنده ارشد React', company: 'آینده‌نگار وب', startDate: '1401', isCurrent: true, bullet: 'توسعه رابط‌های کاربری دوزبانه راست‌به‌چپ با React و TypeScript' },
    ],
    education: [{ institution: 'دانشگاه هرات', degree: 'کارشناسی', fieldOfStudy: 'علوم کامپیوتر', startDate: '1396', endDate: '1400' }],
    skills: ['React', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Git'],
  },
  {
    id: 'resume_11_fa_pdf_table',
    format: 'pdf',
    layout: 'table',
    language: 'fa',
    fullName: 'کیوان مجیدی',
    headline: 'تحلیل‌گر داده',
    email: 'keyvan.majidi@example.com',
    phone: '+98 935 771 3104',
    location: 'شیراز، ایران',
    experiences: [
      { title: 'تحلیل‌گر ارشد داده', company: 'داده‌کاوان جنوب', startDate: '1399', isCurrent: true, bullet: 'ساخت داشبوردهای تحلیلی و پایپ‌لاین SQL با Python' },
    ],
    education: [{ institution: 'دانشگاه شیراز', degree: 'کارشناسی', fieldOfStudy: 'آمار و علوم داده', startDate: '1394', endDate: '1398' }],
    skills: ['Python', 'SQL', 'PostgreSQL', 'Git', 'Docker'],
  },
  {
    id: 'resume_12_mixed_pdf_onecol',
    format: 'pdf',
    layout: 'one-col',
    language: 'mixed',
    fullName: 'سحر امینی',
    headline: 'Fullstack & Mobile Engineer',
    email: 'sahar.amini@example.com',
    phone: '+93 77 310 9980',
    location: 'Mazar-e-Sharif / کابل',
    experiences: [
      { title: 'Fullstack Engineer', company: 'Kabul FinTech', startDate: '2021', isCurrent: true, bullet: 'توسعه اپلیکیشن پرداخت با React، Node.js و TypeScript' },
    ],
    education: [{ institution: 'دانشگاه بلخ', degree: 'کارشناسی', fieldOfStudy: 'مهندسی نرم‌افزار', startDate: '2016', endDate: '2020' }],
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
  },
  {
    id: 'resume_13_mixed_pdf_linkedin',
    format: 'pdf',
    layout: 'linkedin',
    language: 'mixed',
    fullName: 'آرش خالقی',
    headline: 'Rust & Systems Developer',
    email: 'arash.khaleghi@example.dev',
    phone: '+98 912 602 4419',
    location: 'تهران / Remote',
    experiences: [
      { title: 'Rust Systems Engineer', company: 'Tauri Core Partners', startDate: '2022', isCurrent: true, bullet: 'ساخت اپلیکیشن‌های دسکتاپ با Rust، Tauri و SQLite' },
    ],
    education: [{ institution: 'دانشگاه تهران', degree: 'کارشناسی ارشد', fieldOfStudy: 'معماری سیستم‌ها', startDate: '2018', endDate: '2021' }],
    skills: ['Rust', 'TypeScript', 'SQLite', 'Linux', 'Docker', 'Git'],
  },
  // DOCX files (14..22)
  {
    id: 'resume_14_en_docx_onecol',
    format: 'docx',
    layout: 'one-col',
    language: 'en',
    fullName: 'David Okafor',
    headline: 'Staff Backend Engineer',
    email: 'david.okafor@example.com',
    phone: '+44 7700 900123',
    location: 'London, UK',
    experiences: [
      { title: 'Staff Backend Engineer', company: 'Thames Ledger', startDate: '2020', isCurrent: true, bullet: 'Led payments core services in Go, Kafka, and PostgreSQL.' },
      { title: 'Software Engineer', company: 'FinBridge UK', startDate: '2017', endDate: '2020', isCurrent: false, bullet: 'Built internal settlement APIs using Python and AWS.' },
    ],
    education: [{ institution: 'University of Manchester', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Science', startDate: '2013', endDate: '2017' }],
    skills: ['Go', 'Python', 'PostgreSQL', 'Apache Kafka', 'AWS', 'Docker'],
  },
  {
    id: 'resume_15_en_docx_table',
    format: 'docx',
    layout: 'table',
    language: 'en',
    fullName: 'Elena Popescu',
    headline: 'Mobile Engineer (Flutter / Kotlin)',
    email: 'elena.popescu@example.ro',
    phone: '+40 722 331 990',
    location: 'Bucharest, Romania',
    experiences: [
      { title: 'Senior Mobile Engineer', company: 'Carpathian Apps', startDate: '2021', isCurrent: true, bullet: 'Published cross-platform mobile banking apps using Flutter and Kotlin.' },
    ],
    education: [{ institution: 'Politehnica University of Bucharest', degree: 'Bachelor of Engineering', fieldOfStudy: 'Computer Science', startDate: '2016', endDate: '2020' }],
    skills: ['Flutter', 'Kotlin', 'TypeScript', 'REST APIs', 'Git'],
  },
  {
    id: 'resume_16_fa_docx_onecol',
    format: 'docx',
    layout: 'one-col',
    language: 'fa',
    fullName: 'مهسا شریفی',
    headline: 'مدیر محصول فنی',
    email: 'mahsa.sharifi@example.com',
    phone: '+98 912 318 7750',
    location: 'تهران، ایران',
    experiences: [
      { title: 'مدیر محصول فنی', company: 'رایان هم‌افزا', startDate: '1400', isCurrent: true, bullet: 'هدایت نقشه راه پلتفرم ابری و همکاری با تیم‌های React و Go' },
    ],
    education: [{ institution: 'دانشگاه صنعتی امیرکبیر', degree: 'کارشناسی', fieldOfStudy: 'مهندسی صنایع', startDate: '1393', endDate: '1397' }],
    skills: ['SQL', 'Git', 'REST APIs', 'Agile', 'Figma'],
  },
  {
    id: 'resume_17_fa_docx_table',
    format: 'docx',
    layout: 'table',
    language: 'fa',
    fullName: 'حامد یوسفی',
    headline: 'مهندس دوآپس و زیرساخت',
    email: 'hamed.yousefi@example.af',
    phone: '+93 70 812 3340',
    location: 'کابل، افغانستان',
    experiences: [
      { title: 'مهندس دوآپس', company: 'کابل کلود', startDate: '1399', isCurrent: true, bullet: 'استقرار کلاسترهای Kubernetes و مانیتورینگ سرویس‌های Linux' },
    ],
    education: [{ institution: 'دانشگاه کابل', degree: 'کارشناسی', fieldOfStudy: 'فناوری اطلاعات', startDate: '1394', endDate: '1398' }],
    skills: ['Linux', 'Docker', 'Kubernetes', 'CI/CD', 'Python'],
  },
  {
    id: 'resume_18_mixed_docx_onecol',
    format: 'docx',
    layout: 'one-col',
    language: 'mixed',
    fullName: 'پویا رضوانی',
    headline: 'Senior Fullstack Engineer',
    email: 'pouya.rezvani@example.com',
    phone: '+93 79 901 2211',
    location: 'Herat / Remote',
    experiences: [
      { title: 'Senior Fullstack Engineer', company: 'Pamir Tech', startDate: '2021', isCurrent: true, bullet: 'طراحی و توسعه سامانه‌های مالی با Node.js، React و PostgreSQL' },
    ],
    education: [{ institution: 'Herat University', degree: 'Bachelor of Science', fieldOfStudy: 'Software Engineering', startDate: '2016', endDate: '2020' }],
    skills: ['Node.js', 'React', 'TypeScript', 'PostgreSQL', 'Docker'],
  },
  {
    id: 'resume_19_en_docx_europass',
    format: 'docx',
    layout: 'europass',
    language: 'en',
    fullName: 'Marco Bellini',
    headline: 'Backend Java & Spring Engineer',
    email: 'marco.bellini@example.it',
    phone: '+39 347 110 8822',
    location: 'Milan, Italy',
    experiences: [
      { title: 'Java Backend Engineer', company: 'Milano Cloud Srl', startDate: '2020', isCurrent: true, bullet: 'Maintained distributed billing services in Java, PostgreSQL, and Kafka.' },
    ],
    education: [{ institution: 'Politecnico di Milano', degree: 'Master of Science', fieldOfStudy: 'Computer Engineering', startDate: '2018', endDate: '2020' }],
    skills: ['Java', 'PostgreSQL', 'Apache Kafka', 'Docker', 'Git'],
  },
  {
    id: 'resume_20_en_docx_linkedin',
    format: 'docx',
    layout: 'linkedin',
    language: 'en',
    fullName: 'Grace Kim',
    headline: 'Frontend Design Engineer',
    email: 'grace.kim@example.com',
    phone: '+1 206 551 7742',
    location: 'Seattle, WA',
    experiences: [
      { title: 'Design Systems Engineer', company: 'Pacific UI Studio', startDate: '2022', isCurrent: true, bullet: 'Authored accessible React components and Playwright visual regression tests.' },
    ],
    education: [{ institution: 'University of Washington', degree: 'Bachelor of Arts', fieldOfStudy: 'Human Centered Design', startDate: '2017', endDate: '2021' }],
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Playwright', 'Figma'],
  },
  // ODT files (21..24)
  {
    id: 'resume_21_en_odt_onecol',
    format: 'odt',
    layout: 'one-col',
    language: 'en',
    fullName: 'Henrik Lindholm',
    headline: 'Linux Kernel & Rust Developer',
    email: 'henrik.lindholm@example.se',
    phone: '+46 70 441 9023',
    location: 'Stockholm, Sweden',
    experiences: [
      { title: 'Systems Engineer', company: 'Nordic Silicon AB', startDate: '2020', isCurrent: true, bullet: 'Implemented low-latency storage drivers in Rust and C++ on Linux.' },
    ],
    education: [{ institution: 'KTH Royal Institute of Technology', degree: 'Master of Science', fieldOfStudy: 'Embedded Systems', startDate: '2015', endDate: '2019' }],
    skills: ['Rust', 'Linux', 'Docker', 'Git', 'Python'],
  },
  {
    id: 'resume_22_fa_odt_onecol',
    format: 'odt',
    layout: 'one-col',
    language: 'fa',
    fullName: 'زهرا محمدی',
    headline: 'مهندس یادگیری ماشین',
    email: 'zahra.mohammadi@example.ir',
    phone: '+98 913 501 6640',
    location: 'اصفهان، ایران',
    experiences: [
      { title: 'مهندس یادگیری ماشین', company: 'هوش مصنوعی زاینده', startDate: '1400', isCurrent: true, bullet: 'پیاده‌سازی مدل‌های پردازش زبان فارسی با Python و PyTorch' },
    ],
    education: [{ institution: 'دانشگاه صنعتی اصفهان', degree: 'کارشناسی ارشد', fieldOfStudy: 'هوش مصنوعی', startDate: '1397', endDate: '1399' }],
    skills: ['Python', 'PyTorch', 'SQL', 'Docker', 'Git'],
  },
  {
    id: 'resume_23_mixed_odt_onecol',
    format: 'odt',
    layout: 'one-col',
    language: 'mixed',
    fullName: 'نوید باقری',
    headline: 'Cloud & Kubernetes Specialist',
    email: 'navid.bagheri@example.com',
    phone: '+93 78 902 1145',
    location: 'کابل / Dubai',
    experiences: [
      { title: 'Cloud Infrastructure Engineer', company: 'Aria Cloud Hub', startDate: '2021', isCurrent: true, bullet: 'مدیریت زیرساخت ابری با AWS، Terraform و Kubernetes' },
    ],
    education: [{ institution: 'Kabul University', degree: 'Bachelor of Science', fieldOfStudy: 'Network Engineering', startDate: '2016', endDate: '2020' }],
    skills: ['AWS', 'Terraform', 'Kubernetes', 'Docker', 'Linux'],
  },
  // RTF files (24..27)
  {
    id: 'resume_24_en_rtf_onecol',
    format: 'rtf',
    layout: 'one-col',
    language: 'en',
    fullName: 'Clara Moreau',
    headline: 'Fullstack TypeScript Engineer',
    email: 'clara.moreau@example.fr',
    phone: '+33 6 12 44 89 01',
    location: 'Lyon, France',
    experiences: [
      { title: 'Senior TypeScript Developer', company: 'Rhone SaaS', startDate: '2021', isCurrent: true, bullet: 'Built offline-first web applications with React, SQLite, and Node.js.' },
    ],
    education: [{ institution: 'INSA Lyon', degree: 'Master of Engineering', fieldOfStudy: 'Informatics', startDate: '2015', endDate: '2020' }],
    skills: ['TypeScript', 'React', 'Node.js', 'SQLite', 'Docker'],
  },
  {
    id: 'resume_25_fa_rtf_onecol',
    format: 'rtf',
    layout: 'one-col',
    language: 'fa',
    fullName: 'امیرحسین جلالی',
    headline: 'توسعه‌دهنده پایتون',
    email: 'amir.jalali@example.com',
    phone: '+98 912 880 5512',
    location: 'مشهد، ایران',
    experiences: [
      { title: 'توسعه‌دهنده ارشد پایتون', company: 'شرق نرم‌افزار', startDate: '1399', isCurrent: true, bullet: 'طراحی سرویس‌های وب و ETL با Python و PostgreSQL' },
    ],
    education: [{ institution: 'دانشگاه فردوسی مشهد', degree: 'کارشناسی', fieldOfStudy: 'مهندسی نرم‌افزار', startDate: '1394', endDate: '1398' }],
    skills: ['Python', 'PostgreSQL', 'Docker', 'Redis', 'Git'],
  },
  {
    id: 'resume_26_mixed_rtf_onecol',
    format: 'rtf',
    layout: 'one-col',
    language: 'mixed',
    fullName: 'سهراب فقیری',
    headline: 'Android & Kotlin Developer',
    email: 'sohrab.faqiri@example.af',
    phone: '+93 79 441 8870',
    location: 'کابل، افغانستان',
    experiences: [
      { title: 'Android Developer', company: 'Payam Mobile', startDate: '2020', isCurrent: true, bullet: 'ساخت اپلیکیشن موبایل بانکی با Kotlin و REST APIs' },
    ],
    education: [{ institution: 'دانشگاه کاردان', degree: 'کارشناسی', fieldOfStudy: 'علوم کامپیوتر', startDate: '2015', endDate: '2019' }],
    skills: ['Kotlin', 'REST APIs', 'Git', 'SQLite', 'Java'],
  },
  // High-quality PNG & Scanned-PDF (OCR tesseract.js tested end-to-end!) (27..32)
  {
    id: 'resume_27_en_png_scanned',
    format: 'png',
    layout: 'scanned',
    language: 'en',
    fullName: 'Yusuf Qasimi',
    headline: 'Backend Go Engineer',
    email: 'yusuf.qasimi@example.com',
    phone: '+93 70 441 9011',
    location: 'Kabul, Afghanistan',
    experiences: [
      { title: 'Backend Engineer', company: 'Hindukush Systems', startDate: '2021', isCurrent: true, bullet: 'Engineered resilient REST APIs using Go, Docker, and PostgreSQL.' },
    ],
    education: [{ institution: 'Kabul University', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Science', startDate: '2016', endDate: '2020' }],
    skills: ['Go', 'Docker', 'PostgreSQL', 'REST APIs', 'Git'],
  },
  {
    id: 'resume_28_en_png_twocol',
    format: 'png',
    layout: 'scanned',
    language: 'en',
    fullName: 'Nora Lindqvist',
    headline: 'Frontend React Specialist',
    email: 'nora.lindqvist@example.no',
    phone: '+47 901 22 440',
    location: 'Oslo, Norway',
    experiences: [
      { title: 'Senior React Developer', company: 'Fjord Digital', startDate: '2020', isCurrent: true, bullet: 'Shipped accessible design systems with TypeScript, React, and Playwright.' },
    ],
    education: [{ institution: 'University of Oslo', degree: 'Bachelor of Science', fieldOfStudy: 'Informatics', startDate: '2016', endDate: '2019' }],
    skills: ['React', 'TypeScript', 'Playwright', 'Tailwind CSS', 'Git'],
  },
  {
    id: 'resume_29_fa_png_scanned',
    format: 'png',
    layout: 'scanned',
    language: 'fa',
    fullName: 'رویا سلطانی',
    headline: 'برنامه‌نویس بک‌اند',
    email: 'roya.soltani@example.com',
    phone: '+98 912 710 3399',
    location: 'تهران، ایران',
    experiences: [
      { title: 'برنامه‌نویس بک‌اند', company: 'آوا سیستم', startDate: '1400', isCurrent: true, bullet: 'توسعه سرویس‌های Node.js و PostgreSQL' },
    ],
    education: [{ institution: 'دانشگاه علم و صنعت', degree: 'کارشناسی', fieldOfStudy: 'مهندسی کامپیوتر', startDate: '1395', endDate: '1399' }],
    skills: ['Node.js', 'PostgreSQL', 'Docker', 'Git'],
  },
  {
    id: 'resume_30_en_scanned_pdf',
    format: 'scanned-pdf',
    layout: 'scanned',
    language: 'en',
    fullName: 'Daniel Mensah',
    headline: 'Data & Platform Engineer',
    email: 'daniel.mensah@example.org',
    phone: '+44 7711 552209',
    location: 'Bristol, UK',
    experiences: [
      { title: 'Platform Engineer', company: 'WestGrid Data', startDate: '2021', isCurrent: true, bullet: 'Operated Spark pipelines on Kubernetes with Python and SQL.' },
    ],
    education: [{ institution: 'University of Bristol', degree: 'Bachelor of Science', fieldOfStudy: 'Data Engineering', startDate: '2017', endDate: '2020' }],
    skills: ['Python', 'SQL', 'Kubernetes', 'Docker', 'AWS'],
  },
  {
    id: 'resume_31_mixed_scanned_pdf',
    format: 'scanned-pdf',
    layout: 'scanned',
    language: 'mixed',
    fullName: 'کمیل هاشمی',
    headline: 'DevOps & Python Developer',
    email: 'komeil.hashemi@example.com',
    phone: '+93 79 301 5502',
    location: 'کابل / Remote',
    experiences: [
      { title: 'DevOps Engineer', company: 'Bamiyan Cloud', startDate: '2022', isCurrent: true, bullet: 'اتوماسیون CI/CD با Docker، Linux و Python' },
    ],
    education: [{ institution: 'Kabul Polytechnic University', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Engineering', startDate: '2017', endDate: '2021' }],
    skills: ['Docker', 'Linux', 'Python', 'CI/CD', 'Git'],
  },
  {
    id: 'resume_32_en_pdf_humanitarian',
    format: 'pdf',
    layout: 'one-col',
    language: 'en',
    fullName: 'Zainab Karimi',
    headline: 'Humanitarian Information Management Specialist',
    email: 'zainab.karimi@example.org',
    phone: '+93 70 612 9088',
    location: 'Kabul, Afghanistan',
    experiences: [
      { title: 'Information Management Officer', company: 'Global Relief Mission', startDate: '2021', isCurrent: true, bullet: 'Built KoboToolbox data pipelines in Python and PostgreSQL for 14 provinces.' },
      { title: 'GIS & Data Analyst', company: 'Pamir Aid Network', startDate: '2018', endDate: '2021', isCurrent: false, bullet: 'Automated SQL reporting dashboards and field validation scripts.' },
    ],
    education: [{ institution: 'Kabul University', degree: 'Bachelor of Science', fieldOfStudy: 'Information Systems', startDate: '2014', endDate: '2018' }],
    skills: ['Python', 'SQL', 'PostgreSQL', 'Git', 'REST APIs'],
  },
];

function buildResumeHtml(spec: SyntheticResumeSpec): string {
  const dir = spec.language === 'fa' ? 'rtl' : 'ltr';
  const labels = spec.language === 'fa'
    ? { summary: 'خلاصه حرفه‌ای', experience: 'سوابق شغلی', education: 'تحصیلات', skills: 'مهارت‌ها' }
    : { summary: 'Professional Summary', experience: 'Work Experience', education: 'Education', skills: 'Skills' };

  const expHtml = spec.experiences
    .map(
      (e) => `
      <div style="margin-bottom:12px;">
        <div style="font-weight:700;">${e.company} - ${e.title}</div>
        <div style="color:#475569;font-size:13px;">${e.startDate} - ${e.isCurrent ? (spec.language === 'fa' ? 'اکنون' : 'Present') : e.endDate}</div>
        <div style="margin-top:4px;">• ${e.bullet}</div>
      </div>`
    )
    .join('\n');

  const eduHtml = spec.education
    .map(
      (ed) => `
      <div style="margin-bottom:8px;">
        <div style="font-weight:700;">${ed.institution}</div>
        <div>${ed.degree} in ${ed.fieldOfStudy}</div>
        <div style="color:#475569;font-size:13px;">${ed.startDate} to ${ed.endDate}</div>
      </div>`
    )
    .join('\n');

  if (spec.layout === 'two-col') {
    return `<!doctype html><html dir="${dir}"><body style="font-family:Arial,'Segoe UI',Tahoma,sans-serif;margin:0;padding:28px;color:#0f172a;background:#fff;">
      <div style="display:flex;gap:28px;">
        <aside style="width:32%;border-inline-end:2px solid #cbd5e1;padding-inline-end:18px;">
          <h1 style="margin:0 0 6px 0;font-size:22px;">${spec.fullName}</h1>
          <div style="font-size:14px;color:#334155;margin-bottom:14px;">${spec.headline}</div>
          <div>Email: ${spec.email}</div>
          <div>Phone: ${spec.phone}</div>
          <div>Location: ${spec.location}</div>
          <h3 style="margin-top:20px;border-bottom:1px solid #cbd5e1;">${labels.skills}</h3>
          <div>${spec.skills.join(', ')}</div>
        </aside>
        <main style="width:68%;">
          <h3 style="margin-top:0;border-bottom:1px solid #cbd5e1;">${labels.experience}</h3>
          ${expHtml}
          <h3 style="margin-top:18px;border-bottom:1px solid #cbd5e1;">${labels.education}</h3>
          ${eduHtml}
        </main>
      </div></body></html>`;
  }

  if (spec.layout === 'table') {
    return `<!doctype html><html dir="${dir}"><body style="font-family:Arial,'Segoe UI',Tahoma,sans-serif;margin:0;padding:28px;color:#0f172a;background:#fff;">
      <h1 style="margin:0;">${spec.fullName}</h1>
      <div>${spec.headline} | Email: ${spec.email} | Phone: ${spec.phone} | Location: ${spec.location}</div>
      <h3 style="margin-top:18px;">${labels.experience}</h3>
      <table border="1" cellspacing="0" cellpadding="8" style="width:100%;border-collapse:collapse;">
        ${spec.experiences.map((e) => `<tr><td>${e.company} - ${e.title}</td><td>${e.startDate} to ${e.isCurrent ? 'Present' : e.endDate}</td><td>${e.bullet}</td></tr>`).join('')}
      </table>
      <h3 style="margin-top:18px;">${labels.education}</h3>
      ${eduHtml}
      <h3 style="margin-top:18px;">${labels.skills}</h3>
      <div>${spec.skills.join(', ')}</div>
    </body></html>`;
  }

  return `<!doctype html><html dir="${dir}"><body style="font-family:Arial,'Segoe UI',Tahoma,sans-serif;margin:0;padding:32px;color:#0f172a;background:#fff;line-height:1.5;font-size:${spec.layout === 'scanned' ? '20px' : '14px'};">
    <h1 style="margin:0 0 4px 0;font-size:${spec.layout === 'scanned' ? '30px' : '24px'};">${spec.fullName}</h1>
    <div>${spec.headline}</div>
    <div>Email: ${spec.email}</div>
    <div>Phone: ${spec.phone}</div>
    <div>Location: ${spec.location}</div>
    <h2 style="margin-top:18px;border-bottom:1px solid #94a3b8;">${labels.experience}</h2>
    ${expHtml}
    <h2 style="margin-top:18px;border-bottom:1px solid #94a3b8;">${labels.education}</h2>
    ${eduHtml}
    <h2 style="margin-top:18px;border-bottom:1px solid #94a3b8;">${labels.skills}</h2>
    <div>${spec.skills.join(', ')}</div>
  </body></html>`;
}

function buildGoldenJson(spec: SyntheticResumeSpec) {
  return {
    id: `golden_${spec.id}`,
    format: spec.format,
    layout: spec.layout,
    language: spec.language,
    contact: {
      fullName: spec.fullName,
      email: spec.email,
      phone: spec.phone,
      location: spec.location,
    },
    experiences: spec.experiences.map((e, i) => ({
      id: `${spec.id}_exp_${i + 1}`,
      title: e.title,
      company: e.company,
      startDate: e.startDate,
      ...(e.endDate ? { endDate: e.endDate } : {}),
      isCurrent: e.isCurrent,
      achievements: [e.bullet],
    })),
    education: spec.education.map((ed, i) => ({
      id: `${spec.id}_edu_${i + 1}`,
      institution: ed.institution,
      degree: ed.degree,
      fieldOfStudy: ed.fieldOfStudy,
      startDate: ed.startDate,
      endDate: ed.endDate,
    })),
    skills: spec.skills.map((name, i) => ({ id: `${spec.id}_sk_${i + 1}`, name })),
  };
}

async function generateResumes() {
  const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });

    for (const spec of SPECS) {
      const goldenPath = path.join(RESUMES_DIR, `${spec.id}.json`);
      fs.writeFileSync(goldenPath, JSON.stringify(buildGoldenJson(spec), null, 2), 'utf-8');

      const labels = spec.language === 'fa'
        ? { experience: 'سوابق شغلی', education: 'تحصیلات', skills: 'مهارت‌ها', present: 'اکنون' }
        : { experience: 'Experience', education: 'Education', skills: 'Skills', present: 'Present' };

      if (spec.format === 'pdf') {
        await page.setContent(buildResumeHtml(spec), { waitUntil: 'load' });
        await page.pdf({ path: path.join(RESUMES_DIR, `${spec.id}.pdf`), format: 'A4', printBackground: true });
      } else if (spec.format === 'png') {
        await page.setContent(buildResumeHtml(spec), { waitUntil: 'load' });
        await page.screenshot({ path: path.join(RESUMES_DIR, `${spec.id}.png`), fullPage: true });
      } else if (spec.format === 'scanned-pdf') {
        await page.setContent(buildResumeHtml(spec), { waitUntil: 'load' });
        const pngBuf = await page.screenshot({ fullPage: true });
        const b64 = pngBuf.toString('base64');
        await page.setContent(`<html><body style="margin:0;padding:0;"><img src="data:image/png;base64,${b64}" style="width:100%;display:block;"/></body></html>`, { waitUntil: 'load' });
        await page.pdf({ path: path.join(RESUMES_DIR, `${spec.id}.pdf`), format: 'A4', printBackground: true });
      } else if (spec.format === 'docx') {
        const children: Array<Paragraph | Table> = [
          new Paragraph({ text: spec.fullName, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun(`${spec.headline}\nEmail: ${spec.email}\nPhone: ${spec.phone}\nLocation: ${spec.location}`)] }),
          new Paragraph({ text: `Email: ${spec.email}` }),
          new Paragraph({ text: `Phone: ${spec.phone}` }),
          new Paragraph({ text: labels.experience, heading: HeadingLevel.HEADING_2 }),
        ];

        if (spec.layout === 'table') {
          children.push(
            new Table({
              rows: spec.experiences.map(
                (e) =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph(`${e.company} - ${e.title}`)] }),
                      new TableCell({ children: [new Paragraph(`${e.startDate} to ${e.isCurrent ? labels.present : e.endDate}`)] }),
                      new TableCell({ children: [new Paragraph(e.bullet)] }),
                    ],
                  })
              ),
            })
          );
        } else {
          for (const e of spec.experiences) {
            children.push(
              new Paragraph({ text: `${e.company} - ${e.title}` }),
              new Paragraph({ text: `${e.startDate} to ${e.isCurrent ? labels.present : e.endDate}` }),
              new Paragraph({ text: `• ${e.bullet}` })
            );
          }
        }

        children.push(new Paragraph({ text: labels.education, heading: HeadingLevel.HEADING_2 }));
        for (const ed of spec.education) {
          children.push(
            new Paragraph({ text: ed.institution }),
            new Paragraph({ text: `${ed.degree} in ${ed.fieldOfStudy}` }),
            new Paragraph({ text: `${ed.startDate} to ${ed.endDate}` })
          );
        }
        children.push(new Paragraph({ text: labels.skills, heading: HeadingLevel.HEADING_2 }));
        children.push(new Paragraph({ text: spec.skills.join(', ') }));

        const doc = new Document({ sections: [{ children }] });
        const docBuf = await Packer.toBuffer(doc);
        fs.writeFileSync(path.join(RESUMES_DIR, `${spec.id}.docx`), docBuf);
      } else if (spec.format === 'odt') {
        const paragraphs = [
          `<text:h>${escapeXml(spec.fullName)}</text:h>`,
          `<text:p>${escapeXml(spec.headline)}</text:p>`,
          `<text:p>Email: ${escapeXml(spec.email)}</text:p>`,
          `<text:p>Phone: ${escapeXml(spec.phone)}</text:p>`,
          `<text:p>Location: ${escapeXml(spec.location)}</text:p>`,
          `<text:h>${escapeXml(labels.experience)}</text:h>`,
          ...spec.experiences.flatMap((e) => [
            `<text:p>${escapeXml(`${e.company} - ${e.title}`)}</text:p>`,
            `<text:p>${escapeXml(`${e.startDate} to ${e.isCurrent ? labels.present : e.endDate}`)}</text:p>`,
            `<text:p>${escapeXml(`• ${e.bullet}`)}</text:p>`,
          ]),
          `<text:h>${escapeXml(labels.education)}</text:h>`,
          ...spec.education.flatMap((ed) => [
            `<text:p>${escapeXml(ed.institution)}</text:p>`,
            `<text:p>${escapeXml(`${ed.degree} in ${ed.fieldOfStudy}`)}</text:p>`,
            `<text:p>${escapeXml(`${ed.startDate} to ${ed.endDate}`)}</text:p>`,
          ]),
          `<text:h>${escapeXml(labels.skills)}</text:h>`,
          `<text:p>${escapeXml(spec.skills.join(', '))}</text:p>`,
        ].join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:body><office:text>${paragraphs}</office:text></office:body>
</office:document-content>`;
        fs.writeFileSync(path.join(RESUMES_DIR, `${spec.id}.odt`), createZip([{ name: 'content.xml', data: Buffer.from(xml, 'utf-8') }]));
      } else if (spec.format === 'rtf') {
        const plain = [
          spec.fullName,
          spec.headline,
          `Email: ${spec.email}`,
          `Phone: ${spec.phone}`,
          `Location: ${spec.location}`,
          '',
          labels.experience,
          ...spec.experiences.flatMap((e) => [
            `${e.company} - ${e.title}`,
            `${e.startDate} to ${e.isCurrent ? labels.present : e.endDate}`,
            `• ${e.bullet}`,
          ]),
          '',
          labels.education,
          ...spec.education.flatMap((ed) => [ed.institution, `${ed.degree} in ${ed.fieldOfStudy}`, `${ed.startDate} to ${ed.endDate}`]),
          '',
          labels.skills,
          spec.skills.join(', '),
        ].join('\n');
        const rtf = `{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}\\pard\\fs22 ${toRtfUnicode(plain)}}`;
        fs.writeFileSync(path.join(RESUMES_DIR, `${spec.id}.rtf`), rtf, 'utf-8');
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`Generated ${SPECS.length} multi-format resume fixtures (total 32 with existing 01-03).`);
}

function generateMatchingDataset() {
  const archetypes = [
    { id: 'backend_go', name: 'Farhad Rostami', titles: ['Senior Backend Engineer', 'Staff Software Engineer'], skills: ['Go', 'TypeScript', 'PostgreSQL', 'Docker', 'Kubernetes', 'Apache Kafka'], remote: ['remote'], minSalary: 140000, roleTag: 'backend_go' },
    { id: 'frontend_react', name: 'Layla Haidari', titles: ['Senior Frontend Engineer', 'Design Systems Engineer'], skills: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'Playwright', 'GraphQL'], remote: ['remote', 'hybrid'], minSalary: 110000, roleTag: 'frontend_react' },
    { id: 'rust_systems', name: 'Arash Khaleghi', titles: ['Rust Systems Engineer', 'Desktop Platform Engineer'], skills: ['Rust', 'Tauri', 'SQLite', 'TypeScript', 'Linux', 'Docker'], remote: ['remote'], minSalary: 130000, roleTag: 'rust_systems' },
    { id: 'ml_pytorch', name: 'Nadia Safi', titles: ['Senior ML Engineer', 'NLP Engineer'], skills: ['Python', 'PyTorch', 'NLP', 'SQL', 'Docker', 'AWS'], remote: ['remote', 'hybrid'], minSalary: 140000, roleTag: 'ml_pytorch' },
    { id: 'devops_k8s', name: 'Omar Farooq', titles: ['Lead DevOps Engineer', 'Site Reliability Engineer'], skills: ['Kubernetes', 'Terraform', 'AWS', 'Docker', 'Linux', 'CI/CD'], remote: ['remote'], minSalary: 125000, roleTag: 'devops_k8s' },
    { id: 'qa_playwright', name: 'Maryam Azizi', titles: ['QA Automation Lead', 'SDET'], skills: ['Playwright', 'TypeScript', 'Vitest', 'CI/CD', 'Docker', 'SQL'], remote: ['remote', 'hybrid'], minSalary: 95000, roleTag: 'qa_playwright' },
    { id: 'mobile_flutter', name: 'Elena Popescu', titles: ['Senior Mobile Engineer', 'Flutter Developer'], skills: ['Flutter', 'Kotlin', 'Dart', 'REST APIs', 'Git', 'SQLite'], remote: ['remote'], minSalary: 100000, roleTag: 'mobile_flutter' },
    { id: 'security_eng', name: 'Tariq Rahimi', titles: ['Security Engineer', 'AppSec Specialist'], skills: ['Cybersecurity', 'Linux', 'Python', 'Kubernetes', 'Go', 'Terraform'], remote: ['remote', 'hybrid'], minSalary: 120000, roleTag: 'security_eng' },
    { id: 'data_eng', name: 'Daniel Mensah', titles: ['Data Platform Engineer', 'Analytics Engineer'], skills: ['Python', 'SQL', 'PostgreSQL', 'Apache Kafka', 'AWS', 'Docker'], remote: ['remote'], minSalary: 115000, roleTag: 'data_eng' },
    { id: 'fullstack_node', name: 'Pouya Rezvani', titles: ['Senior Fullstack Engineer', 'Node.js Developer'], skills: ['Node.js', 'TypeScript', 'React', 'PostgreSQL', 'Redis', 'Docker'], remote: ['remote', 'onsite'], minSalary: 90000, roleTag: 'fullstack_node' },
    { id: 'ngo_im_kabul', name: 'Zainab Karimi', titles: ['Information Management Officer', 'Humanitarian Data Analyst'], skills: ['Python', 'SQL', 'PostgreSQL', 'KoboToolbox', 'GIS', 'REST APIs'], remote: ['onsite', 'hybrid'], minSalary: 36000, roleTag: 'ngo_im_kabul' },
    { id: 'backend_java', name: 'Marco Bellini', titles: ['Java Backend Engineer', 'Distributed Systems Developer'], skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Apache Kafka', 'Docker', 'Kubernetes'], remote: ['remote', 'hybrid'], minSalary: 105000, roleTag: 'backend_java' },
  ];

  // 26 diverse jobs -> 12 * 26 = 312 profile-job pairs
  const jobCatalog: Array<{ id: string; tag: string; title: string; company: string; remoteType: 'remote' | 'hybrid' | 'onsite'; salaryMin: number; salaryMax: number; skills: string[]; desc: string; excludedFor?: string }> = [
    { id: 'j01', tag: 'backend_go', title: 'Staff Backend Engineer - Payments', company: 'Stripe', remoteType: 'remote', salaryMin: 180000, salaryMax: 240000, skills: ['Go', 'PostgreSQL', 'Apache Kafka', 'Kubernetes', 'Docker'], desc: 'Build distributed payments APIs in Go and PostgreSQL with Kafka event streaming.' },
    { id: 'j02', tag: 'backend_go', title: 'Senior Backend Engineer - Distributed Core', company: 'Spotify', remoteType: 'remote', salaryMin: 155000, salaryMax: 205000, skills: ['Go', 'PostgreSQL', 'Docker', 'Kubernetes'], desc: 'Design scalable microservices in Go running on Kubernetes.' },
    { id: 'j03', tag: 'frontend_react', title: 'Senior Frontend Engineer - Design Systems', company: 'Linear', remoteType: 'remote', salaryMin: 150000, salaryMax: 195000, skills: ['TypeScript', 'React', 'Tailwind CSS', 'Playwright'], desc: 'Craft fast UI design systems in React, TypeScript, and Tailwind CSS.' },
    { id: 'j04', tag: 'frontend_react', title: 'Frontend Developer - Web Apps', company: 'Vercel', remoteType: 'hybrid', salaryMin: 135000, salaryMax: 175000, skills: ['React', 'Next.js', 'TypeScript', 'GraphQL'], desc: 'Ship responsive dashboards using Next.js, React, and TypeScript.' },
    { id: 'j05', tag: 'rust_systems', title: 'Rust Systems & Desktop Engineer', company: 'Proton', remoteType: 'remote', salaryMin: 150000, salaryMax: 190000, skills: ['Rust', 'Tauri', 'SQLite', 'TypeScript', 'Linux'], desc: 'Build local-first encrypted desktop apps in Rust, Tauri, and SQLite.' },
    { id: 'j06', tag: 'rust_systems', title: 'Systems Software Engineer (Rust)', company: 'Cloudflare', remoteType: 'remote', salaryMin: 165000, salaryMax: 215000, skills: ['Rust', 'Linux', 'Docker', 'TypeScript'], desc: 'Implement high-throughput edge proxies and daemons in Rust on Linux.' },
    { id: 'j07', tag: 'ml_pytorch', title: 'Senior ML Engineer - Multilingual NLP', company: 'Hugging Face', remoteType: 'remote', salaryMin: 170000, salaryMax: 220000, skills: ['Python', 'PyTorch', 'NLP', 'Docker', 'AWS'], desc: 'Train open-weights multilingual language and embedding models in PyTorch.' },
    { id: 'j08', tag: 'ml_pytorch', title: 'Applied NLP Research Engineer', company: 'Cohere', remoteType: 'hybrid', salaryMin: 160000, salaryMax: 205000, skills: ['Python', 'PyTorch', 'NLP', 'SQL'], desc: 'Evaluate retrieval and ranking transformers in Python and PyTorch.' },
    { id: 'j09', tag: 'devops_k8s', title: 'Lead DevOps / SRE Engineer', company: 'GitLab', remoteType: 'remote', salaryMin: 150000, salaryMax: 195000, skills: ['Kubernetes', 'Terraform', 'AWS', 'Linux', 'CI/CD'], desc: 'Automate global Kubernetes infrastructure with Terraform and CI/CD pipelines.' },
    { id: 'j10', tag: 'devops_k8s', title: 'Senior Site Reliability Engineer', company: 'Grafana Labs', remoteType: 'remote', salaryMin: 145000, salaryMax: 185000, skills: ['Kubernetes', 'Docker', 'Linux', 'AWS', 'Terraform'], desc: 'Manage observability platforms and cloud clusters across AWS and Kubernetes.' },
    { id: 'j11', tag: 'qa_playwright', title: 'QA Automation Lead (Playwright)', company: 'Supabase', remoteType: 'remote', salaryMin: 115000, salaryMax: 145000, skills: ['Playwright', 'TypeScript', 'Vitest', 'CI/CD', 'Docker'], desc: 'Own end-to-end Playwright UI automation and Vitest regression gates.' },
    { id: 'j12', tag: 'qa_playwright', title: 'Senior SDET - Quality Infrastructure', company: 'Postman', remoteType: 'hybrid', salaryMin: 110000, salaryMax: 140000, skills: ['Playwright', 'TypeScript', 'CI/CD', 'SQL'], desc: 'Scale automated integration test harnesses in TypeScript and Playwright.' },
    { id: 'j13', tag: 'mobile_flutter', title: 'Senior Flutter Mobile Engineer', company: 'Wise', remoteType: 'remote', salaryMin: 120000, salaryMax: 155000, skills: ['Flutter', 'Dart', 'Kotlin', 'REST APIs', 'SQLite'], desc: 'Build offline-resilient remittance apps in Flutter, Kotlin, and SQLite.' },
    { id: 'j14', tag: 'mobile_flutter', title: 'Mobile Engineer (Flutter / Kotlin)', company: 'Revolut', remoteType: 'remote', salaryMin: 115000, salaryMax: 150000, skills: ['Flutter', 'Kotlin', 'REST APIs', 'Git'], desc: 'Deliver consumer fintech mobile features in Flutter and Kotlin.' },
    { id: 'j15', tag: 'security_eng', title: 'Senior Application Security Engineer', company: 'Snyk', remoteType: 'remote', salaryMin: 150000, salaryMax: 190000, skills: ['Cybersecurity', 'Linux', 'Python', 'Kubernetes', 'Go'], desc: 'Lead threat modeling, penetration testing, and cloud container security.' },
    { id: 'j16', tag: 'security_eng', title: 'Cloud Infrastructure Security Specialist', company: 'Tailscale', remoteType: 'remote', salaryMin: 145000, salaryMax: 185000, skills: ['Cybersecurity', 'Linux', 'Go', 'Terraform'], desc: 'Audit zero-trust networking and automate security compliance checks.' },
    { id: 'j17', tag: 'data_eng', title: 'Senior Data Platform Engineer', company: 'Databricks', remoteType: 'remote', salaryMin: 155000, salaryMax: 200000, skills: ['Python', 'SQL', 'PostgreSQL', 'Apache Kafka', 'AWS'], desc: 'Operate real-time Kafka ingestion and SQL warehousing pipelines in Python.' },
    { id: 'j18', tag: 'data_eng', title: 'Analytics & ETL Engineer', company: 'dbt Labs', remoteType: 'remote', salaryMin: 135000, salaryMax: 170000, skills: ['Python', 'SQL', 'PostgreSQL', 'Docker'], desc: 'Design clean analytical data models with SQL, PostgreSQL, and Python.' },
    { id: 'j19', tag: 'fullstack_node', title: 'Senior Fullstack Engineer (Node + React)', company: 'Cal.com', remoteType: 'remote', salaryMin: 115000, salaryMax: 150000, skills: ['Node.js', 'TypeScript', 'React', 'PostgreSQL', 'Redis'], desc: 'Develop end-to-end scheduling APIs and UI with Node.js, React, and PostgreSQL.' },
    { id: 'j20', tag: 'fullstack_node', title: 'Fullstack Product Engineer', company: 'Retool', remoteType: 'onsite', salaryMin: 130000, salaryMax: 170000, skills: ['Node.js', 'TypeScript', 'React', 'PostgreSQL', 'Docker'], desc: 'Build interactive developer workflows in React, Node.js, and TypeScript.' },
    { id: 'j21', tag: 'ngo_im_kabul', title: 'Information Management Officer (Afghanistan)', company: 'UNDP / ReliefWeb', remoteType: 'onsite', salaryMin: 48000, salaryMax: 65000, skills: ['Python', 'SQL', 'PostgreSQL', 'KoboToolbox', 'GIS'], desc: 'Manage humanitarian survey pipelines, KoboToolbox, and GIS databases in Kabul.' },
    { id: 'j22', tag: 'ngo_im_kabul', title: 'Humanitarian Data & IM Specialist', company: 'ACBAR Partner NGO', remoteType: 'hybrid', salaryMin: 42000, salaryMax: 58000, skills: ['Python', 'SQL', 'KoboToolbox', 'GIS', 'REST APIs'], desc: 'Coordinate regional NGO data validation using SQL, GIS, and Python.' },
    { id: 'j23', tag: 'backend_java', title: 'Senior Java & Kafka Engineer', company: 'Adyen', remoteType: 'hybrid', salaryMin: 135000, salaryMax: 175000, skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Apache Kafka', 'Docker'], desc: 'Engineer high-availability settlement services in Java, Spring Boot, and Kafka.' },
    { id: 'j24', tag: 'backend_java', title: 'Backend Java Distributed Systems Engineer', company: 'Klarna', remoteType: 'remote', salaryMin: 130000, salaryMax: 165000, skills: ['Java', 'Spring Boot', 'Kubernetes', 'PostgreSQL', 'Apache Kafka'], desc: 'Scale financial ledgers in Java, Kafka, PostgreSQL, and Kubernetes.' },
    { id: 'j25', tag: 'excluded_hardfilter', title: 'Staff Software Engineer - Blocked Co', company: 'BadCorp', remoteType: 'remote', salaryMin: 250000, salaryMax: 300000, skills: ['Go', 'TypeScript', 'Rust', 'Python'], desc: 'Generalist engineering role at BadCorp.' },
    { id: 'j26', tag: 'irrelevant_low_salary', title: 'Part-Time IT Helpdesk Intern', company: 'LocalShop', remoteType: 'onsite', salaryMin: 18000, salaryMax: 24000, skills: ['Microsoft Excel', 'Helpdesk'], desc: 'Reset office passwords and maintain printers onsite only.' },
  ];

  const relatedTags: Record<string, string[]> = {
    backend_go: ['fullstack_node', 'devops_k8s', 'backend_java'],
    frontend_react: ['fullstack_node', 'qa_playwright'],
    rust_systems: ['backend_go', 'security_eng'],
    ml_pytorch: ['data_eng'],
    devops_k8s: ['security_eng', 'backend_go'],
    qa_playwright: ['frontend_react'],
    mobile_flutter: ['frontend_react'],
    security_eng: ['devops_k8s', 'rust_systems'],
    data_eng: ['ml_pytorch', 'ngo_im_kabul'],
    fullstack_node: ['frontend_react', 'backend_go'],
    ngo_im_kabul: ['data_eng'],
    backend_java: ['backend_go', 'data_eng'],
  };

  const testCases = archetypes.map((arch, idx) => {
    const profile = {
      id: `eval_cand_${idx + 1}`,
      version: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      contact: { fullName: arch.name, email: `${arch.id}@example.com` },
      targetTitles: arch.titles,
      skills: arch.skills.map((s, si) => ({ id: `${arch.id}_s_${si}`, name: s })),
      experiences: [
        {
          id: `${arch.id}_exp_1`,
          title: arch.titles[0],
          company: 'Verified Previous Co',
          startDate: '2020-01-01',
          isCurrent: true,
          description: `Built production systems with ${arch.skills.join(', ')}`,
          achievements: [`Delivered high reliability systems using ${arch.skills.slice(0, 3).join(', ')}`],
          skillsUsed: arch.skills,
        },
      ],
      education: [],
      languages: [],
      certifications: [],
      workAuthorization: ['Remote Worldwide'],
      preferences: {
        targetTitles: arch.titles,
        seniorityLevels: ['senior'],
        locations: [],
        remoteTypes: arch.remote,
        workAuthorizationCountries: ['Remote Worldwide'],
        visaSponsorshipRequired: false,
        excludedCompanies: ['BadCorp'],
        minSalary: arch.minSalary,
        salaryCurrency: 'USD',
      },
    };

    const jobs = jobCatalog.map((j) => {
      const exactMatch = j.tag === arch.roleTag;
      const related = (relatedTags[arch.roleTag] || []).includes(j.tag);
      const isExcluded = j.company === 'BadCorp';
      const remoteMismatch = !arch.remote.includes(j.remoteType);
      const salaryTooLow = j.salaryMax < arch.minSalary;

      let relevanceGrade: 0 | 1 | 2 | 3 = 0;
      if (!isExcluded && !remoteMismatch && !salaryTooLow) {
        if (exactMatch) relevanceGrade = 3;
        else if (related) relevanceGrade = 2;
      } else if (exactMatch && !isExcluded) {
        relevanceGrade = 1;
      }

      return {
        id: `${arch.id}_${j.id}`,
        title: j.title,
        company: j.company,
        remoteType: j.remoteType,
        salary: { min: j.salaryMin, max: j.salaryMax, currency: 'USD', period: 'year' },
        descriptionMarkdown: j.desc,
        requirements: j.skills,
        canonicalUrl: `https://boards.greenhouse.io/eval/jobs/${j.id}`,
        applyUrl: `https://boards.greenhouse.io/eval/jobs/${j.id}`,
        sourceId: 'greenhouse',
        sourceName: 'Greenhouse',
        atsType: 'greenhouse',
        contentHash: `hash_${j.id}`,
        relevanceGrade,
        groundTruth: relevanceGrade >= 2 ? 'relevant' : 'irrelevant',
      };
    });

    return { id: arch.id, profile, jobs };
  });

  fs.mkdirSync(MATCHING_DIR, { recursive: true });
  fs.writeFileSync(path.join(MATCHING_DIR, 'labeled_pairs.json'), JSON.stringify({ testCases }, null, 2), 'utf-8');
  console.log(`Generated ${testCases.length} candidate profiles x ${jobCatalog.length} jobs = ${testCases.length * jobCatalog.length} labeled matching pairs.`);
}

function generateTruthfulnessCases() {
  fs.mkdirSync(TRUTH_DIR, { recursive: true });

  const enProfile = {
    id: 'truth_prof_en',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    contact: { fullName: 'Ahmad Karimi', email: 'ahmad@example.com', phone: '+93791234567', location: 'Kabul' },
    targetTitles: ['Backend Software Engineer'],
    experiences: [
      {
        id: 'e1',
        title: 'Backend Software Engineer',
        company: 'AfghanTech Solutions',
        startDate: '2021-01-01',
        endDate: '2024-06-01',
        isCurrent: false,
        achievements: ['Engineered PostgreSQL databases handling 50k requests daily', 'Built Go microservices with Docker'],
        skillsUsed: ['Go', 'PostgreSQL', 'Docker'],
      },
    ],
    education: [{ id: 'edu1', degree: 'Bachelor of Computer Science', institution: 'Kabul University', startDate: '2016-09-01', endDate: '2020-07-01' }],
    skills: [{ id: 's1', name: 'Go' }, { id: 's2', name: 'PostgreSQL' }, { id: 's3', name: 'Docker' }, { id: 's4', name: 'Git' }],
    languages: [],
    certifications: [],
    workAuthorization: ['Remote'],
  };

  const faProfile = {
    id: 'truth_prof_fa',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    contact: { fullName: 'سارا کاظمی', email: 'sara@example.com', phone: '+989123456789', location: 'تهران' },
    targetTitles: ['توسعه‌دهنده فرانت‌اند'],
    experiences: [
      {
        id: 'ef1',
        title: 'توسعه‌دهنده فرانت‌اند',
        company: 'داده‌پردازان آریا',
        startDate: '1399-01-01',
        endDate: '1402-12-01',
        isCurrent: false,
        achievements: ['طراحی رابط کاربری با React و TypeScript'],
        skillsUsed: ['React', 'TypeScript'],
      },
    ],
    education: [{ id: 'eduf1', degree: 'کارشناسی', institution: 'دانشگاه تهران', startDate: '1394', endDate: '1398' }],
    skills: [{ id: 'sf1', name: 'React' }, { id: 'sf2', name: 'TypeScript' }, { id: 'sf3', name: 'Tailwind CSS' }],
    languages: [],
    certifications: [],
    workAuthorization: ['Remote'],
  };

  const makeTailored = (
    p: typeof enProfile,
    overrides: {
      summary?: string;
      experiences?: any[];
      education?: any[];
      skills?: string[];
    }
  ) => ({
    summary: overrides.summary ?? p.experiences[0].achievements[0],
    experiences: (overrides.experiences ?? p.experiences).map((e) => ({
      ...e,
      tailoredAchievements: e.tailoredAchievements ?? e.achievements ?? [],
    })),
    education: overrides.education ?? p.education,
    skillCategories: [{ categoryName: 'Core', skills: overrides.skills ?? p.skills.map((s) => s.name) }],
  });

  const cases: Array<Record<string, unknown>> = [];

  const fakeCompanies = ['Stripe', 'Google', 'Meta', 'OpenAI', 'Databricks', 'اسنپ', 'دیجی‌کالا', 'کافه بازار'];
  fakeCompanies.forEach((company, idx) => {
    const isFa = idx >= 5;
    const p = isFa ? faProfile : enProfile;
    cases.push({
      id: `adv_company_${idx + 1}`,
      category: 'fabricated_company',
      language: isFa ? 'fa' : 'en',
      profile: p,
      tailoredResume: makeTailored(p, { experiences: [{ ...p.experiences[0], company }] }),
      expectedRejected: true,
    });
  });

  const fakeTitles = ['Principal CTO', 'VP of Engineering', 'Staff AI Architect', 'Distinguished Engineer', 'مدیر فنی کل', 'معمار ارشد سیستم', 'Lead Rocket Scientist', 'Chief Security Officer'];
  fakeTitles.forEach((title, idx) => {
    const isFa = idx === 4 || idx === 5;
    const p = isFa ? faProfile : enProfile;
    cases.push({
      id: `adv_title_${idx + 1}`,
      category: 'fabricated_title',
      language: isFa ? 'fa' : 'en',
      profile: p,
      tailoredResume: makeTailored(p, { summary: 'Experienced engineer', experiences: [{ ...p.experiences[0], title }] }),
      expectedRejected: true,
    });
  });

  const fakeDates = ['2014-01-01', '2015-05-01', '2012-01-01', '2010-03-01', '1392-01-01', '1390-06-01', '2008-01-01', '2026-01-01'];
  fakeDates.forEach((startDate, idx) => {
    const isFa = idx === 4 || idx === 5;
    const p = isFa ? faProfile : enProfile;
    cases.push({
      id: `adv_date_${idx + 1}`,
      category: 'fabricated_date',
      language: isFa ? 'fa' : 'en',
      profile: p,
      tailoredResume: makeTailored(p, { summary: 'Experienced engineer', experiences: [{ ...p.experiences[0], startDate }] }),
      expectedRejected: true,
    });
  });

  const fakeSkills = ['Kubernetes', 'Solidity', 'CUDA', 'Haskell', 'Terraform', 'Elasticsearch', 'Flutter', 'Ruby on Rails'];
  fakeSkills.forEach((skill, idx) => {
    const p = idx % 2 === 0 ? enProfile : faProfile;
    cases.push({
      id: `adv_skill_${idx + 1}`,
      category: 'fabricated_skill',
      language: idx % 2 === 0 ? 'en' : 'fa',
      profile: p,
      tailoredResume: makeTailored(p, { summary: 'Engineer', skills: [...p.skills.map((s) => s.name), skill] }),
      expectedRejected: true,
    });
  });

  const fakeSchools = ['Stanford University', 'MIT', 'Harvard University', 'Oxford University', 'دانشگاه صنعتی شریف', 'دانشگاه امیرکبیر', 'ETH Zurich', 'Cambridge University'];
  fakeSchools.forEach((institution, idx) => {
    const isFa = idx === 4 || idx === 5;
    const p = isFa ? faProfile : enProfile;
    cases.push({
      id: `adv_edu_${idx + 1}`,
      category: 'fabricated_education',
      language: isFa ? 'fa' : 'en',
      profile: p,
      tailoredResume: makeTailored(p, { summary: 'Engineer', education: [{ ...p.education[0], institution }] }),
      expectedRejected: true,
    });
  });

  const metricAttacks = [
    { lang: 'en', text: 'I bring 12+ years of experience building cloud platforms at Google.' },
    { lang: 'en', text: 'Previously led a 15-year distributed systems organization and boosted revenue by 99%.' },
    { lang: 'en', text: 'Hold a PhD from MIT with 10 years of experience in Kubernetes production.' },
    { lang: 'en', text: 'Over 8 years of experience in Go enterprise teams delivering 250k users.' },
    { lang: 'fa', text: 'دارای ۱۲ سال سابقه کار تخصصی و مدرک دکتری از دانشگاه هاروارد هستم.' },
    { lang: 'fa', text: 'بیش از ۱۰ سال تجربه کار در شرکت گوگل با افزایش ۸۰% درآمد داشته‌ام.' },
    { lang: 'fa', text: '۹ سال سابقه برنامه‌نویسی در کافه بازار و اسنپ با افزایش ۳۰۰k کاربر.' },
    { lang: 'en', text: 'With 9 years of experience at OpenAI training Rust compilers.' },
  ];
  metricAttacks.forEach((atk, idx) => {
    const p = atk.lang === 'fa' ? faProfile : enProfile;
    cases.push({
      id: `adv_claim_${idx + 1}`,
      category: 'inflated_years_or_claim_text',
      language: atk.lang,
      profile: p,
      claimText: atk.text,
      expectedRejected: true,
    });
  });

  // 8 Clean Valid Controls (must pass without false positive!)
  for (let i = 0; i < 8; i++) {
    const isFa = i % 2 === 1;
    const p = isFa ? faProfile : enProfile;
    cases.push({
      id: `valid_control_${i + 1}`,
      category: 'valid_control',
      language: isFa ? 'fa' : 'en',
      profile: p,
      tailoredResume: makeTailored(p, {}),
      claimText: isFa
        ? `سارا کاظمی هستم، توسعه‌دهنده فرانت‌اند در داده‌پردازان آریا با مهارت React و TypeScript.`
        : `Ahmad Karimi worked at AfghanTech Solutions using Go, PostgreSQL, and Docker after studying at Kabul University.`,
      expectedRejected: false,
    });
  }

  fs.writeFileSync(path.join(TRUTH_DIR, 'adversarial_cases.json'), JSON.stringify({ cases }, null, 2), 'utf-8');
  console.log(`Generated ${cases.length} adversarial truthfulness test cases (48 attacks + 8 clean controls).`);
}

async function main() {
  await generateResumes();
  generateMatchingDataset();
  generateTruthfulnessCases();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
