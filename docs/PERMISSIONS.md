# Appwrite Permissions Register

> سجل الوصول الفعلي (تم التحقق منه مباشرةً عبر Appwrite REST API في 2026-09-12)
> وليس تقديرًا من الكود. أي تغيير في صلاحيات Console يجعل هذا الجدول قديمًا؛ يُعاد
> التحقق منه بعد كل تعديل. النقطة العامة الوحيدة المتبقية محصورة في مساري خادم بمفتاح API.

## الوضع بعد تدقيق الأمان (2026-09-12)

### الحالة قبل الإصلاح
- **كل** المجموعات (21) كان `$permissions = [read/create/update/delete("any")]` و
  `documentSecurity: false` — أي أن أي شخص بلا تسجيل دخول يستطيع قراءة **كل** البيانات
  (بما فيها تقارير معتمد تحوي `snapshotData`، وإيميل الموظفين) وكتابة/تعديل/حذف أي مستند.
  (استثناء: `vehicletrips` كانت `users` فقط، و`sampletypes`/`standardtests` كانت
  `users` **و** `any`.) نفس الوضع لـ REPORTS bucket (تخزين ملفات PDF).
- **تحقق عملي**: استدعاءات مجهولة خلال التدقيق أعادت 200 لقراءة كل المجموعات،
  و201/200/204 لإنشاء/تعديل/حذف مجهول في `services` (تصعيد كامل للبيانات).
- بُكرة `REPORTS_BUCKET_ID` نفسها كانت `read/create/update/delete("any")`.

### الإصلاح المطبَّق (سكربت تلقائي + تحقق لاحق)
- جميع المجموعات الـ 21 + بُكرة التخزين أصبحت:
  `$permissions = [read("users"), create("users"), update("users"), delete("users")]`.
- **لا** يوجد أي `read("any")`/`write("any")` في أي مجموعة أو بكرة حاليًا.
- **تحقق بعد الإصلاح**: قراءة مجهولة لكل المجموعات = 401، قراءة مستند واحد = 404،
  إنشاء مجهول = 401؛ وقراءة مجهولة/كتابة لمستند تقرير أو تجاوز = 401.
- الوصول العام المنطقي الوحيد المتبقي يمر عبر مساري خادم بمفتاح `APPWRITE_API_KEY`
  وبنطاق حقول محدود (انظر أدناه).

### Current state per collection (متحقَّق)
كل المجموعات تطبّق `read/create/update/delete("users")` و `documentSecurity: false`.
`documentSecurity: false` مقصود هنا لأنه لا يوجد تفصيل على مستوى المستند؛ التقييد
كله على مستوى المجموعة. `indexes` مفعّلة فقط في `reports` (key على
testId/reportNumber/status/$createdAt + fulltext على reportNumber).

| Collection | $permissions (فعلي) | الوصول العام | ملاحظات |
| --- | --- | --- | --- |
| clients | users كاملة | لا | بيانات عميل (هواتف) — تقرأ من الخادم بجلسة المستخدم في dashboard-stats. |
| projects | users كاملة | لا | آخذ رقم ذاتي من الخادم في helpers؛ محليًا لا يوجد فهرس unique بعد. |
| samples | users كاملة | لا | — |
| tests | users كاملة | لا | آَخذ رقم ذاتي؛ لا يوجد فهرس unique بعد. |
| equipment | users كاملة | لا | — |
| services | users كاملة | لا | مجموعة بلا وظائف في الكود؛ متاحة للقراءة/الحذف من لوحة النسخ الاحتياطي عبر الخادم. |
| invoices | users كاملة | لا | بيانات مالية. |
| payments | users كاملة | لا | بيانات مالية. |
| employees | users كاملة | لا | **لا تخزّن** `salary`/`nationalId` في Appwrite (مهارات فقط في TypeScript interface)؛ يُخزَّن employeeNumber/name/jobTitle/department/phone/role/email وغيرها. |
| attendance | users كاملة | لا | — |
| leaverequests | users كاملة | لا | — |
| overtime | users كاملة | لا | — |
| vehicles | users كاملة | لا | — |
| vehicletrips | users كاملة | لا | كانت users-only حتى قبل التدقيق. |
| expenses | users كاملة | لا | بيانات مالية. |
| sampletypes | users كاملة | لا | تُقرأ من عموم للعرض عبر `/api/portal/catalog` (خادم بمفتاح API، حقول name/الفئة فقط). |
| standardtests | users كاملة | لا | تُقرأ عبر `/api/portal/catalog` (no، name/sampleTypeId/resultType فقط). |
| notifications | users كاملة | لا | — |
| bookings | users كاملة | لا | الإنشاء العام **من الخادم فقط** عبر `/api/portal/book` بمفتاح API (انظر أدناه). |
| reporttemplates | users كاملة | لا | — |
| reports | users كاملة | لا | التحقق العام **من الخادم فقط** عبر `/api/reports/verify` بمفتاح API مع `Query.select` لحقول جزئية. |
| REPORTS_BUCKET_ID (storage) | users كاملة | لا | ملفات PDF؛ قراءة تدفق PDF من الخادم بجلسة المستخدم في pdf route. |

## مدخلات الوصول العامة المتبقية (خادم فقط، بمفتاح API)

تعمل بمفتاح `APPWRITE_API_KEY` على الخادم (لا يمكن لأي زائر استخدامه) وبنطاق ضيق:

1. **`GET /api/portal/catalog`** — تصفح الحجز أونلاين (بدون تسجيل دخول):
   يعيد فقط `{ sampleTypes: [{ $id, name }], tests: [{ $id, sampleTypeId, name }] }`.
   لا يعيد أي بيانات حساسة، ومحدَّد المعدل (rate-limited) ويشترط مفتاح API للخادم.
2. **`POST /api/portal/book`** — إنشاء حجز أونلاين: يكتب مستند `bookings` بمفتاح API.
   يعيد رقم الحجز فقط؛ لا قراءة لبيانات أخرى. مقيَّد المعدل.
3. **`GET /api/reports/verify`** — تحقق عمومي من تقرير معتمد عبر QR:
   بمفتاح API و`Query.select` لحقول محدودة فقط (reportNumber/reportHash/status/… ).
   يتطلب `hash` سداسي 64-حرف مطابق لـ`reportHash` المخزن، وإلا `{ verified: false }`.

لا يوجد أي مسار Be/Direct سوى ما سبق؛ **كل** القراءات المكتوبة من المتصفح تتطلب
جلسة مستخدم مسجّل (كما هي صلاحيات `users`).

## حماية لوحة النسخ الاحتياطي (بعد النقل إلى الخادم)

صفحة `dashboard/backup` **لا تتعامل مباشرة** مع Appwrite بعد الآن (كانت سابقًا تحذ
وتحذف من المتصفح بصلاحيات جلسة المستخدم). الآن جميع العمليات المؤثرة تمر بمسارات خادم:

- **`GET /api/admin/backup/export`** — تصدير zip (قاعدة بيانات + ملفات storage) بمفتاح API
  (وهو كلمة مرور الخادم، لا تصل للمتصفح) مع فحص الدور `مدير/إداري` (401 لغيرهم) وتحديد معدل.
- **`POST /api/admin/backup/restore`** — استعادة من zip محمَّل (حذف ثم إنشاء من جديد)
  بمفتاح API + فحص الدور + حد حجم 200MB + تحديد معدل.
- **`POST /api/admin/backup/reset`** — حذف شامل (بيانات + ملفات) **فقط** عند إدخال
  عبارة `حذف كل البيانات` **وعلى الخادم** (لا في الواجهة فقط)، وفحص الدور، وفحص
  Origin (CSRF) وتحديد معدل صارم (2/ساعة).

## تحذيرات متبقية للإدارة (أولويات)

1. **`projects` / `tests` / `bookings` / `reports.reportNumber`** — الأرقام الذاتية
   سلسلة نصية تُولَّد في الخادم/العميل ولا يوجد فهرس `unique` لمنع التكرار همجيًا.
   توصية: إنشاء فهارس `unique` قبل الإطلاق، ثم التحقق من عدم وجود تكرارات
   (الفحص الحالي: تكرارات = 0 في projects/tests/reports؛ bookings فارغ).
2. **Attr types**: `tests.averageResult` عدد عشري أما قيمة النص العربي (نوع/وحدة)
   تُخزَّن كسلاسل نصوص؛ أي أن أي تحقق «range» على رقمي حاليًا غير مدعوم لأنواع النص.
3. **بيانات مالية (invoices/payments/expenses)** — قراءة/كتابة كاملة من المتصفح
   لأي مستخدم مسجّل بصلاحية الوصول للوحة (مدير/إداري). لا يوجد فصل أدوار أدق من
   «مدير/إداري/فني» في تطبيق اليوم.
4. **`documentSecurity: false`** — الاختيار المتعمد حاليًا (لا تفصيل على مستوى
   المستند). إذا ظهرت لاحقًا حاجة لعزل مستندات «فني» عن «مدير» فستحتاج تفعيلها
   ومراجعة آلية منح $permissions في كل إنشاء.
5. **مفتاح `APPWRITE_API_KEY`** هو أكبر سهم تفويض في النظام (قدرة كاملة على
   Database + Storage). يجب ألا يُسرب أبدًا (`.env` غير متعقَّب)، ويُدور دوريًا،
   وأي مسار خادم جديد يستخدمه يجب أن يصرّح بالحقول/المجموعات التي يحتاجها فقط.