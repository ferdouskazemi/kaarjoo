import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListTodo } from 'lucide-react';

export const QueueView: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">{t('nav.queue')}</h1>
        <p className="text-sm text-slate-400 mt-1">
          صف بررسی درخواست‌ها: در حالت پیش‌فرض (Review Mode)، قبل از ثبت نهایی، فرم تکمیل‌شده و پاسخ‌ها به تأیید شما می‌رسد.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-12 text-center flex flex-col items-center justify-center">
        <ListTodo className="w-10 h-10 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">صف ارسال خالی است</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          مشاغلی که برای ارسال تأیید می‌کنید، در این بخش آماده بررسی نهایی فرم‌ها قرار خواهند گرفت.
        </p>
      </div>
    </div>
  );
};
