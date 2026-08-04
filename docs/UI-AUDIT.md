# UI/UX Audit — Al-Shamal LIMS

Scope: 70 pages + 16 shared components. Analysis only — no logic, Appwrite query, or routing changes proposed.
Constrained to UI/UX consistency: primitives, IA/navigation, forms/field layout, states, RTL, and public pages.

## 1. Executive summary — top 5 issues

| # | Issue | Impact |
|---|-------|--------|
| 1 | **Form/input/button styling fragmented across modules** — admin forms use `p-2 rounded` inputs + `label block mb-1` + `py-2` buttons; bookings/portal/technician use `p-3 rounded-xl` + `font-bold` labels + `py-3 rounded-xl font-bold` buttons. Same field type looks different on every module. | ~30 forms |
| 2 | **Shared primitives ignored** — `Card.tsx` (p-5/rounded-xl/border) is bypassed by 48 raw `bg-white p-6 rounded-lg shadow` divs; `EmptyData` used in only 2 spots; `TableSkeleton` in only 7 of 16 list pages; detail pages mix Card/raw-div scaffolding. | ~37 files |
| 3 | **Loading & empty states fragmented** — 9 list pages render a bare `<p>جارٍ التحميل...</p>`; empty states vary in wording and have no icon or action button anywhere. | 16+ pages |
| 4 | **Navigation/IA** — `DashboardLayout` is a flat horizontal scroll-strip of 11 modules, no grouping or section labels, no global search, mobile shows icons with no labels, and module sub-pages (finance/HR) add a second unlabeled hop. | all admin pages |
| 5 | **RTL & vocabulary drift** — bookings calendar is English (`Sun…Sat`, "Today", "+2 more") inside an Arabic RTL app; date formats mix raw ISO with `ar-EG`; HR status vocabulary drifts (موافق/مرفوض/معلق vs معتمد/معلق); finance/expenses primary buttons are red (`bg-danger-solid`). | bookings, HR, finance |

## 2. Systemic findings (fix once, applies everywhere)

| ID | Finding | Evidence | Severity |
|----|---------|----------|----------|
| SYS-1 | Raw container div instead of `Card` | 48 occurrences, ~37 files (`clients/new`, `tests/new`, `equipment/*`, `vehicles/*`, `hr/*`, `backup`, `import-data`, `portal/book`, `technician/*`) | High |
| SYS-2 | Loading state inconsistency: `TableSkeleton` (clients/projects/samples/tests/vehicles/expenses/overtime) vs `<p>جارٍ التحميل...</p>` (invoices, payments, employees, attendance, leaves, bookings, files, notifications, equipment) | `finance/invoices/page.tsx:95`, `finance/payments/page.tsx:191`, `hr/employees/page.tsx:97`, `bookings/page.tsx:511` | Medium |
| SYS-3 | `EmptyData` exists (`لا توجد بيانات`, no icon/CTA) but used only on dashboard (`dashboard/page.tsx:309,453`); all other empties are inline with ~10 different wordings | `src/components/EmptyData.tsx` | Medium |
| SYS-4 | Form scaffolding drift: container widths `max-w-xl`/`2xl`/`3xl`/`4xl`; input `p-2 rounded` vs `p-3 rounded-xl` vs `p-3.5 rounded-xl`; labels plain vs `font-bold`; submit `py-2` vs `py-3 rounded-xl font-bold` | `clients/new:43` vs `bookings/new:111,117` vs `technician/tests/[id]:294,300` | High |
| SYS-5 | Semantic-color misuse: primary actions in red, no-op hovers (`hover:bg-danger-solid` on `bg-danger-solid`, `hover:bg-concrete-200` on `bg-concrete-200`) | `finance/expenses/page.tsx:97`, `hr/employees/new:226`, `technician/attendance:92` | Medium |
| SYS-6 | No inline per-field validation; all errors are submit-time toasts or native `required` | `clients/new`, `employees/new`, `overtime/new` | Medium |
| SYS-7 | Navigation: 11-link flat strip, no grouping/global search, labels hidden on mobile (`hidden sm:inline`) | `src/components/DashboardLayout.tsx:39-109` | Medium-High |
| SYS-8 | Breadcrumb/back inconsistency: present in clients/[id], tests/[id], employees/[id]; absent in samples/[id], projects/[id], vehicles/[id]; native `confirm()`/`alert()` used in backup restore and `clients/[id]/edit:41,60` | — | Low-Medium |
| SYS-9 | Date formatting mix: raw ISO (`2026-08-04`) vs `ar-EG` locale | `files/page.tsx:128`, `notifications/page.tsx:76`, `tests/[id]:48-51` | Low |

## 3. Per-module findings

| Module | Issue | Pages | Severity | Fix type |
|--------|-------|--------|----------|----------|
| Shared | Card/EmptyData/TableSkeleton underused; Pagination chevrons are RTL-correct | `src/components/*` | High | Systemic |
| Dashboard | Most componentized page — the reference pattern | `dashboard/page.tsx` | — | Keep as baseline |
| Clients | Uses Card+Badge in detail (good); edit uses `alert()` for errors | `clients/[id]/edit` | Low | Page |
| Projects | Detail links labeled "تفاصيل" but href to `/edit`; no back breadcrumb | `projects/[id]` | Low | Page |
| Samples | Detail is raw div (not Card); no breadcrumb; 330-line new-form | `samples/[id]`, `samples/new` | Medium | Page |
| Tests | Long 331-line form; dynamic cube/age sections duplicated between admin+technician with slightly different UI | `tests/new`, `tests/[id]/edit`, `technician/tests/[id]` | Medium | Systemic (shared dynamic-result component) |
| Finance | Expenses primary buttons red; invoices+payments lack TableSkeleton; services has **two competing edit mechanisms** (inline row editing + unused `[id]/edit` route) | `finance/expenses/*`, `invoices/page`, `payments/page`, `services/page` | Medium | Systemic + page |
| HR | Status vocabulary drifts (موافق vs معتمد); check-in page lists all employees defaulting to حاضر (accidental-data risk); attendance page duplicates fetch in effect+function | `hr/*` | Medium | Page |
| Equipment | No detail/view page; calibration "قريباً" highlight good; no TableSkeleton | `equipment/*` | Low | Page |
| Vehicles | Admin good (Card, TableSkeleton); technician `new/edit` forms use `p-4 rounded-lg` (drifts from other tech forms) | `technician/vehicles/*` | Low | Page |
| Bookings | **648-line single page** (calendar + stats + table + quick-add + CSV + print); two accept actions (`قبول`/`تعيين كمقبول`) are confusing; calendar is English-in-Arabic (`dir="ltr"`, `Sun…Sat`, "Today", "+2 more") | `bookings/page.tsx`, `bookings/new` | High | Page |
| Files/Notifications | Functional; loading is bare text; no EmptyData | `files/*`, `notifications/*` | Low | Systemic |
| Backup/Import | Power tools; backup restore uses native `confirm()`; import has no template download | `backup/page.tsx`, `import-data/page.tsx` | Low | Page |
| Technician app | Bottom nav + Badge + Card consistent; loading always bare text; scanner good (error+retry, camera-permission handling) | `technician/*` | Low-Medium | Systemic |
| Portal/Login | Public flow consistent; portal step indicator lacks step titles/check-state; technician login good | `portal/book`, `login`, `technician/login` | Low | Page |

## 4. Recommended implementation order

1. Shared primitives: `Card` (align to existing `bg-white p-6 rounded-lg shadow` look or standardize on Card), enhanced `EmptyData` (icon+title+optional CTA), `TableSkeleton` everywhere, a `FormField`/`TextField`/`SelectField` + `SubmitButton` and a standard form-card wrapper.
2. Convert the ~30 forms and ~15 lists/details to the primitives.
3. IA pass: group nav (Finance/HR get labeled sub-sections), add breadcrumbs, optional global search.
4. Booking calendar → Arabic RTL; fix vocabulary/color/date tokens; remove native `confirm`/`alert`.

No logic, data-fetching, or routing changes are required for any of the above.
