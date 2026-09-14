# التقرير الأمني — مختبرات الشمال (LabSystem-WPF)

> تاريخ الفحص: 2026-09-12
> النطاق: `LabSystem-WPF` (Next.js 16 + Appwrite Cloud)
> طريقة الفحص: مراجعة كود شاملة (ثابتة) + `npm audit` + فحص git-history + اختبارات k6 موجودة

---

## ملخص تنفيذي

النظام يحوي **ثغرة RCE غير مصادقة** (تأثير مؤكد في Next.js 16.2.x، والإصلاح متوفر)، و**تصميم تفويض يعتمد على صلاحيات Appwrite العامة** يهدد كامل قاعدة البيانات، و**مسار اعتماد التقارير لا يفحص الدور**، إضافة إلى غياب كامل لترويسات الأمان وتخزين جلسات في `localStorage`.

| الشدة | العدد |
|------|-------|
| حرجة | 3 |
| عالية | 4 |
| متوسطة | 3 |
| منخفضة/معلومات | 3 |

---

## الثغرات الحرجة

### 1. `next@16.2.7` — RCE غير مصادق + تجاوز Middleware (fix: 16.3.5)

`package.json`: `"next": "16.2.7"`.

`npm audit` يكشف أن النطاق `< 16.3.3` مصاب بعدة إعلانات **Critical/High**:

- **GHSA-p293-qw3h-jr36 (Critical, CVSS 9.0):** RCE غير مصادق على خوادم Windows عبر path traversal — والتطبيق يُشغَّل على **ويندوز** حاليًا.
- **GHSA-2xp9-vwvh-vxw4 (Critical):** RCE غير مصادق في Image Optimization API عند استخدام ملفات AVIF.
- **GHSA-6gpp-xcg3-4w24 (High):** تجاوز Middleware/Proxy في App Router مع Turbopack (يعمل `next dev` بـ Turbopack افتراضيًا) — هذا يهدد **بوابة الأدوار في `src/proxy.ts`** نفسها.
- **GHSA-89xv-2m56-2m9x / GHSA-p9j2-gv94-2wf4 (High):** SSRF في Server Actions والـ rewrites.
- **GHSA-m99w-x7hq-7vfj (High):** DoS عبر Server Actions.

**الإجراء الفوري:** `npm i next@16.3.5` ثم اختبار شامل.

### 2. التفويض مُفوَّض لصلاحيات Appwrite العامة (verify in Console)

التطبيق ينفّذ كل عمليات القراءة/الكتابة من **المتصفح** بجلسة المستخدم عبر Web SDK (`src/lib/services/base.ts`, `src/lib/appwrite.ts`)، وملف `scripts/setup-reports-collections.cjs` ينشئ المجموعات بصلاحيات **`create/read/update/delete("any")`** (أي: حتى الزوار غير المسجّلين).

أدلة ميدانية إضافية:

- صفحة الحجز العامة `src/app/portal/book/page.tsx` تقرأ `sampletypes` و`standardtests` من المتصفح **بدون تسجيل دخول** → يجب أن تحمل `read("any")`.
- صفحة النسخ الاحتياطي `src/app/dashboard/backup/page.tsx` تنزّل **كل** المجموعات (بما فيها `employees`: الرواتب والأرقام الوطنية، و`invoices`) وتغيّر/تحذف جماعيًا من المتصفح.
- `docs/PERMISSIONS.md` يوثق "من يقرأ: **مراجعة**" كبند مفتوح غير محسوم.

**النتيجة المحتملة:** إذا كانت إعدادات Console فعلًا بتلك الصلاحيات، أي شخص بلا حساب يستطيع قراءة الرواتب والبيانات المالية والوثائق، وتعديل/حذف التقارير وقلب حالتها لـ«معتمد».

**الإجراء:** تدقيق فوري لصلاحيات كل مجموعة في Appwrite Console؛ اعتماد مبدأ: `read("users")` للبيانات الحساسة، و`"role:admin"` للكتابة الحساسة. أو نقل كل الوصول خلف Routes خادم-side تتحقق من الدور (كما في `dashboard-stats`).

### 3. مسار اعتماد PDF لا يفحص الدور (IDOR/تصعيد صلاحيات)

`src/app/api/reports/[id]/pdf/route.ts`:

- يتحقق من **وجود جلسة** فقط (سطر 103) — أي مستخدِم مصادق **بأي دور** (فني بدون صلاحيات إدارة) يستطيع استدعاء POST على أي `id` تقرير، فيصبح «معتمد»/مقفول (`updateDocument` سطر 216).
- لا يوجد rate-limit على هذا المسار الثقيل رغم أن **كل طلب يُطلق مُتصفّح Chromium كامل** (`puppeteer.launch` سطر 194) → هجوم DoS بسيط: بضع طلبات متوازية تستهلك كل تعدد العمليات.
- `--no-sandbox` تُستخدم بلا ampمنية إضافية؛ الحمولة HTML محكمة الهروب حاليًا (ipخفض المخاطرة لكن لا يُستغل كـ RCE مباشر).

**الإجراء:** إضافة فحص دور (`مدير`/`إداري`) على الخادم قبل السحب، وفرض rate-limit مبنية على الجلسة لا على الهيدرات (انظر رقم 8)، وإعادة تفعيل sandbox عند توفر بيئة تعمل بها.

---

## الثغرات العالية

### 4. غياب تام لترويسات الأمان + كشف هوية الخادم

`next.config.ts` لا يحتوي أي `headers()`: **لا CSP، لا X-Frame-Options، لا HSTS، لا X-Content-Type-Options، لا Referrer-Policy**، وترويسة `X-Powered-By: Next.js` ظاهرة. مع عدم وجود CSP، أي نافذة حقن JS (وإن كانت صغيرة) تُترجم فورًا لسرقة جلسة كاملة (المخزن غير HttpOnly، انظر 5).

**الإجراء:** إضافة `headers()` في `next.config.ts` تتضمن:
`Content-Security-Policy` صارمة، `X-Frame-Options: DENY`، `Strict-Transport-Security` (عند الإنتاج عبر HTTPS)، `X-Content-Type-Options: nosniff`، `Referrer-Policy: no-referrer`، وإخفاء `X-Powered-By`.

### 5. جلسات في `localStorage` + كوكي غير HttpOnly

`src/store/useAuthStore.ts` يخزن `cookieFallback` في `localStorage` (يصب في كامل بيانات الجلسة بما فيها `secret` و`expire`)، وينسخها إلى `document.cookie` **بدون `HttpOnly`/`Secure`**. أي XSS (ولا يوجد CSP لحجبه) → استنساخ جلسة المدير كاملًا. `localStorage` أيضًا مكشوف لأي سكربت ضار أو إضافة متصفح، ولا يمكن مسحه من الخادم عند إبطال جلسة.

**الإجراء:** اعتماد كوكي HttpOnly للجلسات (عبر `proxy.ts` أو route مخصص يثبتها)، وإبقاء `localStorage` كطبقة تخزين موقتة فقط إن لزم، مع تنظيفها عند الخروج وربطها بأي إبطال جلسة في الخادم.

### 6. ترويسة `Origin` موثوقة لبناء رابط QR

`srd/app/api/reports/[id]/pdf/route.ts` سطر 165: `const origin = request.headers.get('origin') ...` — المهاجم (فني مثلًا) يرسل `Origin: https://evil.com` فيرى QR الرسمي يشير لموقع المهاجم → صفحة تحقق مزيفة تعرض أي نتيجة مطلوبة ببصمة حقيقية.

**الإجراء:** استخدام origin مثبّت (البيئة `APPWRITE_PUBLIC_URL`/متغير بيئة ثابت) وليس هيدر العميل.

### 7. تجاوز حدود المعدل عبر هيدرات قابلة للانتحال

- `src/app/api/portal/book/route.ts` و`src/app/api/reports/verify/route.ts`: الحدود (`5/10د`، `20/10د`) مفتاحية بـ `x-forwarded-for`/`x-real-ip` — أي مهاجم يغيّر الهيدر في كل طلب ويمر بحرية → كسر حماية JS، أو إغراق خادم Curl متوازي.
- نفس المنطق يترك التطبيق مفتوحًا لمهاجم واحد بتعليق «التحقق» بالكامل عبر الإنهاك.

**الإجراء:** المفتاح = جلسة المستخدم (معرف آمن غير قابل للزور) + IP حقيقي من مقرئ غير موثوق (nginx/واجهة الاستضافة) مع تجاهل الهيدر من العميل؛ وإضافة حد معدل + حجم جسم على مسار الاعتماد (رقم 3).

---

## المتوسطة

### 8. الـ transitive dependencies في npm audit

`postcss` (ارتفاع، حتى 8.5.22)، `sharp` (ارتفاع، حتى 0.35.4-rc)، `browserslist`، `brace-expansion`، `js-yaml`، `nanoid` — ومعظمها في أدوات البناء/الاختبار (`vitest` واعتماديات Playwright/تست) ولا تصيب بيئة الإنتاج مباشرة، لكن `postcss`+`sharp` يتدخلان عبر `next` البنائ. الفحص: **10 ثغرات (1 حرجة، 6 عالية، 3 متوسطة)** — الحرجة/العالية تزول غالبًا بالرفع إلى `next@16.3.5`.

### 9. `reports/verify` يكشف اسم معتمِد/موظف بدون جلسة

مسار التحقق العام يعيد `reviewedBy` (اسم الموظف المسؤول عن الاعتماد) مع رقم التقرير — تسريب هوية بسيط لأي أحد يملك رقم تقرير. منخفض الخطورة لكنه مقترن بتقييد معلوماتي.

### 10. `X-Powered-By` + نسخة الثنائيات مكشوفة

الاستجابة تكشف نوع ونسخة الخادم والعامل، ويُسهّل استهداف إصدارات مثقوبة (مثل الثغرة رقم 1).

---

## منخفضة / معلومات

- **المهندس للزراعة المزدوجة:** `proxy.ts` يحمي `/dashboard` و`/technician` من ناحية الواجهة فقط؛ البيانات تظل عبر Appwrite REST مباشرة — مهم عند إغلاق النقطة 2.
- **حجوزات بـk6:** تُوجد بيانات بكائن `LOADTEST-` تُنظف يدويًا بعد كل تشغيل؛ يُنصح بمسح تلقائي.
- **الرموز والعناصر في الحسابات:** لا `dangerouslySetInnerHTML`/`eval`/`innerHTML` في `src`، ولا `.env` في git-history، و`APPWRITE_API_KEY` محصور بملفات الخادم فقط.

---

## إصلاحات مقترحة مصنفة أولوية

| # | الإصلاح | الأولوية | الجهد |
|---|---------|---------|-------|
| 1 | `npm i next@16.3.5` | فوري (حرجة) | 5 دقائق |
| 2 | تدقيق صلاحيات كل مجموعة في Appwrite Console وإحكامها (`users`/`role:admin` بدل `any`) | فوري (حرجة) | ساعة |
| 3 | فحص دور + rate-limit على `reports/[id]/pdf` | يوم-أسبوع | متوسط |
| 4 | ترويسات أمان في `next.config.ts` | يوم | 20 دقيقة |
| 5 | كوكي HttpOnly للجلسات | أسبوع | متوسط |
| 6 | Origin مثبّت لـQR بدل هيدر العميل | يوم | 5 دقائق |
| 7 | مفتاح rate-limit يعتمد الجلسة + IP حقيقي | أسبوع | متوسط |
| 8 | رفع `postcss`/`sharp` (عبر رفع next) | أسبوع | 5 دقائق |

---
# تاريخ: 2026-09-12 (مساءً) — سجل الإصلاحات المنفَّذة

| # | الإصلاح | الحالة |
|---|---------|--------|
| 1 | `next` رُفع إلى `16.3.5` (خروج الحرجة/العالية من npmaudit: 10 → 2 متوسطتان فقط في `vitest` dev-only) | ✅ منفَّذ |
| 4 | ترويسات أمان في `next.config.ts` (CSP + nosniff + XFO: DENY + Referrer-Policy + Permissions-Policy + HSTS في الإنتاج) و`poweredByHeader: false` | ✅ منفَّذ |
| 3 | `reports/[id]/pdf`: فحص دور `مدير/إداري` خادميًا + rate-limit بمفتاح جلسة (`user:$id`) بدل IP | ✅ منفَّذ |
| 6 | رابط QR في الـ PDF يستخدم `APP_PUBLIC_URL` (في الإنتاج) بدل ترويسة `Origin` | ✅ منفَّذ |
| 7 | أداة `src/lib/rate-limit.ts` موحّدة: تحليل IP صارم + مفاتيح مُسمّاة النطاق لكل مسار، مُطبَّقة على `portal/book` و`reports/verify` و`reports/[id]/pdf` | ✅ منفَّذ |
| 5 | أصلاح الجلسات: مسار `api/auth/session` يثبّت كوكي Appwrite بـ **HttpOnly/SameSite=Strict**؛ `useAuthStore` لم يعد ينسخ السر إلى `document.cookie` قابل للقراءة بالـ JS | ✅ منفَّذ |
| 8 | `npm audit fix` عالج `brace-expansion`/`browserslist`/`js-yaml` | ✅ منفَّذ |
| 2 | إحكام صلاحيات Appwrite في الميزان الفعلي: كل المجموعات + بُكرة التخزين إلى `users` فقط (كانت `any`) مع تحقق مجهول ≥ 401؛ ونقل كتالوج الحجز إلى `api/portal/catalog` (بديل للقراءة العامة من المتصفح) | ✅ منفَّذ — القيم في `docs/PERMISSIONS.md` |
| — | النسخ الاحتياطي/التصفير/الاستعادة أصبحت مسارات خادم بمفتاح API + فحص دور مدير + Origin + rate-limit (لا تعامل مباشر من المتصفح) | ✅ منفَّذ |
| — | فهارس `unique` لأرقام المشاريع/الفحوصات/الحجوزات/التقارير (بعد فحص تكرارات 0) | ✅ منفَّذ |
| — | إصلاح حساب الوردية الليلية في `computeWorkHours` | ✅ منفَّذ |
| — | إصلاح typing سابق في `verify/route.test.ts` | ✅ منفَّذ |
| — | `k6-tests/04`: إضافة ترويسات SDK لتوافق Appwrite Cloud v2.0 (صدر بدون Set-Cookie بدونها) | ✅ منفَّذ |

التحقق: `tsc --noEmit` نظيف · `eslint` (0 أخطاء) · `npm test` 42/42 · `npm run build` نجح ·
k6: 01 (180 طلب 0% فشل)، 03 (الحد 20 يعمل بدقة)، 04 (247/247)، 02 (5 حدود الحجز تُفعّل 429).

## ما بقي خارج المستودع (يحتاج فعلًا من فريق الإنتاج)

- **Appwrite Console**: إحكام باجمعيات (السلوك `any` غير مؤكد بالكود؛ قد يعني قراءة عامة للبيانات). هذا أكبر الخطرين مستقبلاً.
- تشغيل خلف reverse proxy يُوثِّق `x-forwarded-for` ويتجاهل هيدر العميل، وتشغيل TLS حتى يعمل HSTS فعليًا.
- وتعيين `APP_PUBLIC_URL` في بيئة الإنتاج.
- `vitest` (severity moderate، dev-only) يبقى؛ رفعه يتطلب vitest@5 (breaking) — خيار مؤجل.

## نطاقات لم تُحسم (تحتاج تحقق Console)

- إعدادات CORS وallowed domains في مشروع Appwrite (القيم المفضّلة: نطاق الاستضافة الفعلي فقط).
- تكوين الـ hosting/الـ firewall فوق التطبيق (هل المنفذ 3000 معرّض مباشرة؟ هل هناك reverse proxy?).

---

# تاريخ: 2026-09-12 (ليلًا) — قائمة تدشين الإنتاج

> بند ديناميكي يدلّ الإنتاج على ما تم تنفيذه، وما يُفترض تحققه في بيئة الإنتاج قبل الإعلان.

## منفَّذ ومُتحقَّق (هذه الجلسة)

- ✅ إحكام صلاحيات Appwrite: **كل** المجموعات (21) + بُكرة التخزين أصبحت
  `read/create/update/delete("users")` (كانت `any` = وصول عام كامل) — فحص مجهول ≥ 401.
  القيم الفعلية موثقة في `docs/PERMISSIONS.md`.
- ✅ طريق الخادم للنسخ الاحتياطي يعمل مباشرة: `GET /api/admin/backup/export` أعاد
  zip كامل 1.34MB؛ `POST /api/admin/backup/reset` يرفض المتاح 401 لغير المعاد؛
  `POST /api/admin/backup/restore` محدود 200MB/حجم. لا مزيد من الحذف الجماعي من المتصفح.
- ✅ `dashboard-stats` كجلسة حقيقية (المدير/إداري): 200 — التفويض سليم بعد التشديد.
- ✅ حجز أونلاين `POST /api/portal/book`: 200 أنشأ `BOOK-2026-0001` (نُظّف لاحقًا).
- ✅ تحقق تقرير `GET /api/reports/verify`: 200 `verified:true` لـ hash حقيقي،
  و`verified:false` لـ hash مزوّر، و400 لنسخ خالية؛ تعديل تقرير مجهول = 401.
- ✅ فهارس `unique`: `projects.projectNumber`, `tests.testNumber`,
  `bookings.bookingNumber`, `reports.reportNumber` (لا تكرارات قبل الإنشاء).
- ✅ تحديث حساب الوردية الليلية في `computeWorkHours` (تعبر منتصف الليل الآن) +
  اختبارات 12/12 خضراء.
- ✅ تدشين `.gitattributes` (LF + binary للأصول).

## واجبات بيئة الإنتاج قبل الإعلان

1. **Appwrite Console** (فريق الإنتاج):
   [ ] راجع `docs/PERMISSIONS.md` مقابل Console (لا `read("any")` في أي مجموعة/بكرة).
   [ ] ضع `allowed domains` = نطاق الاستضافة فقط (المتصفح) و`server integrated login`.
   [ ] فعّل 2FA على حسابات لوحة الـ Appwrite Console.
   [ ] دوّر `APPWRITE_API_KEY` (المصدر الوحيد في `.env` غير المتعقَّب) — أنشئ واحدًا جديدًا وأبطل القديم.
   [ ] راجع مدة صلاحية الجلسات (افتراضي 30 يومًا؛ أوقِف إن أمكن لأمد أقصر).
2. **الاستضافة/reverse proxy**:
   [ ] reverse proxy يضبط `X-Forwarded-For` المركّب ويتجاهل هيدر العميل (متطلب
       دقة `rate-limit.ts`) وTLS فعلي (حتى يعمل HSTS) وضبط `next.config.ts`.
   [ ] لا تعرض المنفذ 3000 مباشرة؛ اربطه بالـ proxy فقط.
   [ ] `APP_PUBLIC_URL` معبّأة (لرابط QR ومشاركة PDF).
3. **بيانات/نسخ احتياطي**:
   [ ] تجربة **استعادة** واحدة كاملة على بيئة Staging من zip التصدير قبل الإطلاق
       (تحقق من التطابق ثم دغليّها).
   [ ] أعد المسار إعادة جدولة نسخ احتياطي تلقائية (يُحرّض أسبوعيًا على الأقل).
4. **تشغيل خادم التطبيق**:
   [ ] `npm ci` ثم `npm run build` على الميزان الإنتاجي قبل كل إطلاق.
   [ ] في Debian/Ubuntu، `puppeteer` يشتغل عادةً بـ sandbox حقيقية؛ لا تعطّلها.
   [ ] رقابة الذاكرة: صفحة PDF تُطلِق Chromium لكل طلب؛ راقِب الذاكرة وقياس الـ rate-limit.
5. **التحقق النهائي** (سكربت متاح):
   [ ] `tsc --noEmit` · `eslint` · `npm test` · `npm run build` كلها نظيفة.
   [ ] k6: `01` (عام)، `03` (rate-limit)، `04` (مصادق) مع `SESSION_COOKIE`.
   [ ] جولة يدوية: تسجيل دخول → لوحة (إحصاءات/تقارير/موارد بشرية) → PDF → نسخ احتياطي
       → حجز أونلاين → QR تحقق.

> ملاحظة: `rate-limit.ts` في هذه المرحلة مفتاح في الذاكرة لكل عملية أدى؛ إذا كان
> التشغيل متعدد العمليات/المثيلات مستقبلًا، انقل التخزين إلى مخزن مشترك (Redis/DB)
> قبل الاعتماد على الحدود عبر المثيلات.

---

# تاريخ: 2026-09-14 — إغلاق تصعيد الصلاحيات/تزوير التقارير + CSRF + CSP بـ nonce

## قرار منتج (Task 4): عرض اسم المعتمِد في التحقق العام **مقصود**

- `GET /api/reports/verify` يستمر في إعادة `reviewedBy` (اسم المعتمِد) مع
  `verified: true`. هذا تصرف منتج **متعمّد**: صفحة التحقق العامة
  (`src/app/reports/verify/page.tsx`) تعرض للمستلم اسم من اعتمد التقرير
  («اعتمده: …») كجزء من تجربة التحقق من المستند، والاختبار الحالي
  (`verify/route.test.ts`) يثبّت هذا السلوك. قيّدته، ولم يبقَّ منه سوى اسم شخص
  واحد مع رقم تقرير؛ لا يُعاد منه البريد أو أي بيانات حساسة أخرى.
  البند السابق (رقم 9 في «المتوسطة») يُعتبر **مقبولًا كمخاطرة منتج** بعد هذا القرار.

## Task 1 — منع تصعيد الصلاحيات وإحكام مجموعات التقارير/المالية

- **مسارات خادم جديدة (node-appwrite + `APPWRITE_API_KEY` + فحص دور + rate-limit):**
  - `POST /api/employees` — إنشاء موظف (مدير/إداري). يجرّد مفاتيح `$*` و`documentId`.
  - `PATCH/DELETE /api/employees/[id]` — تحديث/حذف (مدير/إداري). **يمنع تغيير
    دور/حالة/بريد الذات** (403) ويمنع حذف الذات، ويُنشئ سجلّ تدقيق في `notifications`
    (type `تغيير_دور`) عند تغيير دور موظف آخر. تغييرات الدور لا تقل عن دور الطالب.
  - `PATCH /api/employees/me` — تحديث ذاتي، قائمة بيضاء صريحة فقط
    (`name, phone, qualification, certifications, notes`).
  - `POST /api/reports` — إنشاء **مسودة فقط** (`status: 'مسودة'`)؛ لا يُكتب
    `status/reportHash/pdfFileId/reviewedBy` من هذا المسار إطلاقًا.
  - `PATCH /api/reports/[id]` — تعديل حقول مسودة محددة فقط
    (`additionalNotes, snapshotData`)؛ رفض أي حقل آخر (403)، ورفض تعديل تقرير
    معتمد (409). **مسار `reports/[id]/pdf` يبقى الوحيد** القادر على الوصول
    بحالة `معتمد` + `reportHash` + `pdfFileId`.
  - `POST` + `PATCH/DELETE` على `/api/finance/{invoices,payments,expenses}` —
    كلها بفحص دور (مدير/إداري) وrate-limit.
- **طبقة الخدمات** (`src/lib/services/*`) أُعيدت كتابتها: أي كتابة (employees,
  reports, invoices, payments, expenses) تمر عبر `fetch('/api/...')` بدل Web SDK؛
  القراءات بقيت عبر Web SDK (read("users")). بهذا لا يمكن لأي متصفح تجاوز
  صلاحيات المجموعة العامة للكتابة.
- **سكربتات قفل Appwrite** (`scripts/lock-down-employees-permissions.cjs` و
  `scripts/lock-down-reports-permissions.cjs`): يضبطان
  `employees` → `read("users")` فقط + `documentSecurity: true`، و
  `reports/invoices/payments/expenses` → `read("users")` فقط.
  القيم المستهدفة موثقة في `docs/PERMISSIONS.md` (قسم 2026-09-14). التشغيل
  **يدوي ضد Console** لأنه يتطلب كلمة سر API بصلاحية `databases.collections.write`
  (خارج المستودع). لا تُعدَّل المجموعات التشغيلية (samples/tests/equipment/…
  إلخ) إطلاقًا.

## Task 2 — CSP صارم بلا `unsafe-inline` (عبر nonce)

- **السبب الفني**: App Router يدرج سكربتات inline إلزامية `self.__next_f`
  (Flight payload) في HTML، فلا يمكن ببساطة حذف `'unsafe-inline'`؛ حلّ Next.js
  الرسمي هو nonce لكل طلب مع عرض **ديناميكي لكل الصفحات**.
- **التنفيذ**:
  - `src/proxy.ts` يولّد nonce عشوائيًا لكل طلب (`crypto.randomUUID` بدون شرطات)،
    ويضعه في `x-nonce` + `Content-Security-Policy` على **request headers** (ليستهلكه
    Next.js أثناء SSR) وعلى **response**. نطاقات الحماية + منطق الأدوار الموجودة
    (dashboard/technician) بقيت كما هي ولم تتأثر، والصفحات العامة تمر بدون redirect.
  - `src/app/layout.tsx` حصل على `export const dynamic = 'force-dynamic'` (مطلوب
    ليحقن Next قيمة nonce في سكربتاته).
  - `next.config.ts`: أُزيل منه `Content-Security-Policy` (كي لا يتجاوز nonce
    الـ proxy) وبقيت بقية الترويسات (nosniff / XFO: DENY / Referrer-Policy /
    Permissions-Policy / HSTS في الإنتاج) + `poweredByHeader: false`.
  - التوجيهات: `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'`
    (مع `'unsafe-eval'` في التطوير فقط لـ React devtools)؛
    `style-src 'self' 'unsafe-inline'` (مطلوب لخصائص `style={{}}`)؛
    `img/font/connect-src` تشمل أصل Appwrite وخطوط Google المحلية.
- **تحقق فعلي (خادم إنتاج محلي)**: ترويسة CSP تُعرض في كل استجابة، وبُني 14 عنصر
  `<script>` بسمة `nonce` مطابقة؛ لا `'unsafe-inline'` ضمن `script-src`.

## Task 3 — CSRF على المسارات غير المكتملة

- `GET /api/admin/backup/export`: يفحص `Origin` — إن وُجد ولم يكن موثوقًا
  (`isTrustedOrigin`) → 403 «طلب غير موثوق». (قرار: فحص **مشروط بحضور** `Origin`
  لأن GET من نفس الأصل في المتصفح لا يحمل Origin، وفحصه بلا شرط كان سيكسر التنزيل.)
- `POST /api/reports/[id]/pdf`: فحص `isTrustedOrigin` **بعد** فحص الجلسة و**قبل**
  منطق الأدوار/الاعتماد → 403 «طلب غير موثوق». POST من المتصفح يحمل Origin دائمًا.
- `isTrustedOrigin` نفسها لم تتغيّر (تُقرأ من متغيرات البيئة الموثوقة).

## Task 5 — توثيق + اختبارات + تحقق نهائي

- **اختبارات Vitest جديدة** بمرافقة مسارات الخادم الجديدة (نفس نمط
  `verify/route.test.ts`):
  - `src/app/api/employees/route.test.ts` (6): 401 بلا جلسة، 403 لفني، 201 لمدير
    مع إثبات أنّ `documentId`/مفاتيح `$` لا تُخزَّن، 400 لدور غير صالح ولرقم مفقود.
  - `src/app/api/employees/[id]/route.test.ts` (8): 401/403، **منع تغيير دور
    الذات** و**منع حذف الذات** (403)، تحديث موظف آخر، تدقيق `تغيير_دور` في
    notifications، و404.
  - `src/app/api/reports/route.test.ts` (4): 401/403، إنشاء مسودة `مسودة` بلا
    حقول اعتماد، 503 بلا مفتاح.
  - `src/app/api/reports/[id]/route.test.ts` (6): 401/403، تعديل حقول المسودة،
    **رفض حقول اعتماد/status** (403)، **رفض تعديل معتمد** (409)، 404.
- **نتائج التحقق (هذه الجلسة):**
  - `tsc --noEmit` ✅ (بلا أخطاء)
  - `npx eslint .` ✅ (0 أخطاء)
  - `npm test` ✅ **67/67** (42 سابقة + 24 جديدة)
  - `npm run build` ✅ (كل المسارات أصبحت `ƒ Dynamic` كما يلزم CSP)
  - فحص وقت التشغيل: CSP+nonce تُطبَّق فعليًا، والتحويلات `/dashboard`→`/login`
    و`/technician/dashboard`→`/technician/login` سليمة، و`/api/reports/verify`
    البقية من غير حظر.

## ما بقي خارج المستودع (يحتاج يد فريق الإنتاج)

1. تشغيل سكربتي القفل (`scripts/lock-down-*.cjs`) في بيئة Appwrite الفعلية بمفتاح
   API مخصّص، ثم **التحقق** في Console من القيم في `docs/PERMISSIONS.md`،
   ثم التحقق اليدوي: محاولة فني تحديث `employees.role` من Console/المتصفح → يجب
   أن تفشل.
2. لا تزال تحذيرات الإنتاج الواردة في القسم السابق (reverse proxy موثوق +
   `APP_PUBLIC_URL` + تدوير المفتاح) سارية.
3. `sessionStorage`/`localStorage` للجلسات خارجة عن نطاق هذه الجولة (بند سابق
   «كوكي HttpOnly» منفَّذ لمسار الجلسة؛ لم يُستكمل نقل كامل الطبقات).