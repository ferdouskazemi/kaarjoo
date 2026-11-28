# START HERE: how to give this package to your coding AI

(Persian guide first, English instructions for the AI below.)

## راهنمای فارسی

### ۱. فایل‌ها را در مخزن بگذارید
فایل ZIP را باز کنید و پوشه‌ها را این‌طور در مخزن Kaarjoo کپی کنید:

```
kaarjoo/
└── docs/
    ├── review/
    │   ├── START-HERE.md
    │   ├── code-review.md
    │   └── implementation-prompt.md
    └── design/
        ├── v2/   ← محتوای mockups/v2
        ├── v3/   ← محتوای mockups/v3  (اصلی‌ترین)
        └── fonts/ ← محتوای mockups/fonts
```

بعد commit کنید (`git add docs && git commit -m "docs: add review and v3 design"`). این‌طوری Gemini همه‌چیز را مستقیم از داخل پروژه می‌خواند و لازم نیست چیزی را دستی بچسبانید.

### ۲. ترتیب کار با Gemini
هر مرحله را در **یک جلسه‌ی جدید** شروع کنید:

| جلسه | چه بفرستید |
|------|------------|
| ۱ | پرامپت ۰ + پرامپت ۱ (رفع مشکلات بحرانی) |
| ۲ | پرامپت ۰ + پرامپت ۱۰ (بخش ۱: دو باگ) |
| ۳ | پرامپت ۰ + پرامپت ۲ |
| ۴ | پرامپت ۰ + پرامپت ۳ |
| ۵ | پرامپت ۰ + پرامپت ۴ |
| ۶ | پرامپت ۰ + پرامپت ۵ |
| ۷ | پرامپت ۰ + پرامپت ۶ |
| ۸ | پرامپت ۰ + پرامپت flash-rive + پرامپت ۷ |
| ۹ | پرامپت ۰ + پرامپت flash-rive + پرامپت ۱۰ (بقیه) + پرامپت ۱۱ |
| ۱۰ | پرامپت ۰ + پرامپت ۹ |

اگر پرامپت ۱ تا ۹ را قبلاً اجرا کرده‌اید (کامیت‌های اخیر نشان می‌دهد بخش زیادی‌اش انجام شده)، از جلسه‌ی ۲ شروع کنید و بعد مستقیم به جلسه‌ی ۹ بروید.

### ۳. نکته‌ها برای بهترین کیفیت
- **یک مرحله در هر جلسه.** چند پرامپت بزرگ را با هم ندهید؛ کیفیت پایین می‌آید.
- **اول برنامه، بعد کد.** پرامپت ۰ از Gemini می‌خواهد اول برنامه‌اش را بگوید. آن را بخوانید و بعد بگویید «ادامه بده».
- **عکس بخواهید.** برای هر صفحه، اسکرین‌شات برنامه‌ی واقعی را کنار ماکاپ بخواهید. اگر فرق داشت، همان دو عکس را برگردانید و بگویید «دقیقاً مثل ماکاپ».
- **از فایل HTML استفاده کند.** فایل `docs/design/v3/all-screens.html` اندازه‌ها، رنگ‌ها و متن‌های دقیق را دارد؛ به Gemini بگویید آن را باز کند، نه فقط عکس‌ها را.
- **حالت بالاترین دقت.** اگر Gemini گزینه‌ای مثل «thinking» یا «deep» دارد، روشن کنید.
- **بعد از هر مرحله** چک‌لیست فارسی ته فایل پرامپت را خودتان امتحان کنید.

---

## Instructions for the coding AI (English)

You are working in the Kaarjoo repo. The review and the target design are in:
- `docs/review/code-review.md`: the engineering review (Persian, with file:line references).
- `docs/review/implementation-prompt.md`: Prompt 0 (session rules) and Prompts 1–11, plus the flash-rive add-on.
- `docs/design/v3/`: the target design. `00-overview.png` shows all 22 screens; `01-…22-*.png` are the
  screens; `all-screens.html` + `_base.css` + `_extra.css` are the exact source (sizes, colors, copy);
  `screen-map.md` maps every current view/section to its new place.
- `docs/design/v2/`: earlier simplified flow (screens 05, 06, 07, 11, 20, 22 come from here) and motion rules.

Always: read Prompt 0 first and follow it; open the HTML source, not only the PNGs; build one prompt
per session; prove each acceptance item with commands, test output and side-by-side screenshots
(real app vs mockup) before saying anything is done.
