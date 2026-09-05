# تقييم الحقول الحرة بتنسيق JSON

> توثيق فقط — **لا إجراءات تطبيقية**. لا يتم تغيير أي مخطط في Appwrite ولا داخل `src/types/index.ts`.
> يوثّق هذا الملف الحقول المخزّنة كنصوص JSON داخل المجموعات، ومواضع كتابتها/قراءتها، وتقدير الحجم، والحاجة للفهرسة، مع مقترحات (خيارات فقط) مستقبلية.

## خلاصة تنفيذية

- توجد **8 حقول** مخزّنة كسلاسل JSON موزّعة على 5 مجموعات (reports, tests, invoices, bookings, employees) إضافة إلى `specificationProfiles` في مجموعة `standardtests`.
- **لا يوجد أي `Query.equal`/`Query.search`/`Query.contains` على أي من هذه الحقول** — جميع الفلاتر في الكود تتم على سمات قياسية (معرّفات، أرقام، عناوين بريد، أسماء).
- أسلوب القراءة في كل موقع يستخدم بارسات متسامحة (تعيد `[]`/`{}`/`null` عند البيانات التالفة) فتتحمل الصفحات البيانات المكسورة دون انهيار.
- **لا حاجة لأي فهرسة على هذه الحقول حالياً** لأنها لا تُستعلم عنها إطلاقاً.
- أكبر حقل من حيث الحجم هو `Report.snapshotData` (لقطة كاملة للتقرير) ويُدخل في بصمة SHA-256 لمنع التلاعب، لذا يجب الحفاظ على **استقرار ترتيب المفاتيح** عند أي إعادة تسلسل مستقبلاً.

## جدول الحقول

| المجموعة | الحقل | الشكل المخزن | يُكتب في | يُقرأ في | استعلام؟ | النقاط المحتملة |
|---|---|---|---|---|---|---|
| reports | `snapshotData` | سلسلة JSON لـ `ReportSnapshot` | `dashboard/tests/[id]/page.tsx:101` عبر `createReportDraft` | `dashboard/reports/page.tsx:121`، `dashboard/reports/[id]/page.tsx:60`، `api/reports/[id]/pdf/route.ts:143` عبر `parseReportSnapshot` + يُستخدم في `computeReportHash` (SHA-256) | لا | عقدة التضخيم (أسماء/عناوين مكررة)؛ حساسة للتلاعب |
| tests | `resultFields` | سلسلة JSON لـ `array ResultFieldDef` (`serializeResultFields`) | `dashboard/tests/new/page.tsx:171`، `dashboard/tests/[id]/edit/page.tsx:186`، `components/catalog/StandardTestEditor.tsx:156` | `parseResultFields` في `report-snapshot.ts:57`، `tests/[id]:133`، `tests/page.tsx:116`، `technician/tests/[id]:97` | لا | يُحفظ نسخة على كل فحص (تضخيم) |
| tests | `resultFieldsValues` | سلسلة JSON لكائن `{ [fieldKey]: value }` | `technician/tests/[id]/page.tsx:190`، `dashboard/tests/new:200`، `dashboard/tests/[id]/edit:213` | `parseRecord` في `report-snapshot.ts:59`؛ `evaluateCompliance` (`test-config.ts:173`) | لا | مفاتيح عائمة؛ لا نمط ثابت |
| tests | `appliedStandard` | سلسلة JSON لـ `SpecificationProfile` (`serializeAppliedStandard`) | `dashboard/tests/new:172`، `dashboard/tests/[id]/edit:187` | `parseAppliedStandard` في `report-snapshot.ts:58`، `technician/tests/[id]:98`، صفحة `tests/new` و`tests/[id]/edit` | لا | نسخ مكررة من نفس الملف على كل فحص |
| tests | `result7Days` / `result28Days` / `results` | سلسلة JSON لـ `number[]` | `technician/tests/[id]:167-200`، `dashboard/tests/new:180-210`، `dashboard/tests/[id]/edit:194-222` | `parseNumberArray` في `report-snapshot.ts:67-75` | لا | قيم رقمية؛ يمكن استخدام أنواع صفوف أصلية لو تطلّب الأمر |
| invoices | `items` | سلسلة JSON لـ `InvoiceItem[]` (أسعار + كميات) | `dashboard/finance/invoices/new/page.tsx:153` | `dashboard/finance/invoices/[id]/page.tsx:154-155` (JSON.parse مع fallback للقراءة المباشرة) | لا | بيانات مالية؛ لا تُستعلم؛ تُعرض فقط |
| bookings | `requestedTests` | سلسلة JSON لـ `string[]` (أسماء فحوصات) | `dashboard/bookings/new/page.tsx:103`، `api/portal/book/route.ts:213` | غير مقروء في واجهة بعد الآن (الكتابة فقط؛ الوجهة تقرأ الدالة في `portal/book` لبناء جسم قبل التخزين) | لا | حدود `20` عنصراً مفروضة في `api/portal/book` |
| employees | `documentIds` | سلسلة JSON لـ `string[]` (معرّفات ملفات) | `dashboard/hr/employees/new/page.tsx:121`، `dashboard/hr/employees/[id]/edit/page.tsx:144` | `dashboard/hr/employees/[id]/page.tsx:41` (JSON.parse داخل try/catch) ومثيلها في edit | لا | معرّفات فقط؛ لا بيانات حساسة إضافية |
| standardtests | `specificationProfiles` | سلسلة JSON لـ `SpecificationProfile[]` (`serializeSpecificationProfiles`) | `components/catalog/StandardTestEditor.tsx:157` | `parseSpecificationProfiles` في `StandardTestEditor.tsx:93`، `tests/new:149`، `tests/[id]/edit:126-152` | لا | بيانات تكوين مرجعية |

## تفصيل `Report.snapshotData` (الأهم)

- **الشكل**: `JSON.stringify(snapshot)` حيث `snapshot` ناتج `buildReportSnapshot(test, sample?, client?, project?)` — كائن مسطح بسيط من `ReportSnapshot` يحوي حقول نصية/رقمية فقط (لا تواريخ/توابع).
- **مسار الكتابة**: عند إنشاء مسودة التقرير في `dashboard/tests/[id]/page.tsx:95-101`.
- **مسار القراءة**: صفحات العرض والطباعة عبر `parseReportSnapshot` الذي يتحقق من الشكل (`testName` نص + `resultRows` مصفوفة) ويعيد `null` إن لم يطابق.
- **المسؤولية الحسابية**: `resultType` يحدد شكل `resultRows`؛ كل ما يُعرض في التقرير/PDF يُستخرج من هذه اللقطة وليس من بيانات الفحص الحية — أي تغيير في الفحص بعد الاعتماد يظهر **دون** تعارض لأن PDF يعتمد اللقطة.
- **البصمة**: `computeReportHash` ينشئ SHA-256 من `JSON.stringify(snapshot) + reportNumber + reviewedAt` ويُخزَّن `reportHash` — لذلك:استقرار ترتيب مفاتيح كائن `ReportSnapshot` عند أي إعادة تسلسل أو أي عزل للحقول مستقبلاً أمر بالغ الأهمية كيّ لا تكسر بصمات التقرير المعتمدة.

## تقدير الحجم والتضخم

- `snapshotData` لكل تقرير: ~1–8KB (نتائج + بيان العميل + الموقع + الملاحظات). مع 10 آلاف تقرير = ~10–80MB عبر المستند الواحد (مقبول لمنصات Appwrite الحالية؛ حد المستند النصي أعلى بكثير).
- `resultFields`/`appliedStandard` تُنسخ على **كل فحص** حتى لو تشابهت مع أصلها في `standardtests` — أثقل عمود مرشح للاستبدال بمرجع `standardTestId` (خيار فقط).
- `requestedTests` محدودة بـ20 عنصراً بالفعل.
- `documentIds` صغيرة (معرّفات قصيرة).

## ملاحظات التجزئة

- بارسات متسامحة: `parseNumberArray`/`parseRecord`/`parseResultFields`/`parseAppliedStandard`/`parseReportSnapshot` تعيد قيم افتراضية آمنة عند `JSON.parse` الفاشل — يُنصح بعدم تغيير هذا السلوك عند أي إصلاح مستقبلي.
- الحقول المخزَّنة في `types/index.ts` موصوفة بأنواع `string` اختيارية مع تعليق يوضح محتواها (مثل `resultFieldsValues?: string; // JSON object { [fieldKey]: value }`).
- `Invoice.items` في النوع معرف كنوع متسع `InvoiceItem[]` لكنه يُخزن/يُقرأ كسلسلة؛ الاختلاف قائم منذ البداية ولا يؤثر على التشغيل (تُعالج القراءة بـ fallback).

## خيارات مستقبلية (لم تُنفَّذ — مقترحات لمناقشتها)

1. **الإبقاء على الوضع الحالي (سلاسل JSON بدون فهرسة)** — لا ميزة وظيفية مفقودة لأنها غير مستعلَمة؛ الخيار الأقل تكلفة ومخاطرة (يُوصى به حالياً).
2. **ترحيل `resultFields`/`appliedStandard` إلى مرجع `standardTestId`** — يتطلب مخططاً إضافياً أو سمة مرجعية على `tests`، يقلل التضخم، ويكسر معنى «اللقطة» إن طُبق على التقرير (ممنوع على `snapshotData`).
3. **نوع `json`/`array` أصلي في Appwrite** (إن كان إصدار Appwrite يدعمه) لكن فقط لـ `resultFieldsValues`/`result7Days`/`requestedTests`/`documentIds` غير الحساسة — مع إعادة كتابة البارسات وتطابعها لإبقاء سلوك القراءة متوافقاً مع المواقع الحالية.
4. **فصل `snapshotData` عن `reports` إلى مستند فرعي `report_snapshots`** إذا بلغ حجم الأرشيف حداً مزعجاً للنسخ الاحتياطي — لكن ذلك يكسر رابط `getReportByTestId` الحالي المرتبط بمرجع واحد، لذا يتطلب تعديل خدمة (`services/reports.ts`) وليس مجرد إضافة عمود.
5. **إضافة حقول محسوبة** (مثل `totalResultsCount` أو `hasComplianceIssue`) تُستعلَم عليها فعلاً لاحقاً — بحيث تُنشأ الفهرسة فقط على هذه الحقول الثانوية ولا تشمل الـ JSON الكامل.
6. **توحيد حدود القراءة**: منح `verify` route `Query.select` قائمة بيضاء للحقول (موجود فعلاً) وتوسيعها لأي وصول خادمي جديد يقرأ `reports`.

## نطاق الخروج

- لا يتضمن هذا التقييم تغييراً في مخطط Appwrite، ولا تعديل `src/types/index.ts`، ولا إعادة كتابة `src/lib/services/*.ts`، ولا ترحيل أي بيانات.