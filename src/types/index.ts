/**
 * src/types/index.ts
 * تعريفات الأنواع المركزية لنظام LIMS
 * تُستخدم بدلاً من `: any` في جميع أنحاء المشروع
 */

// ===== نموذج الموظف =====
export interface Employee {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  email: string;
  phone?: string;
  role: 'فني' | 'مدير' | 'إداري';
  employeeNumber: string;
  jobTitle?: string;
  position?: string;
  department?: string;
  hireDate?: string;
  salary?: number;
  nationalId?: string;
  address?: string;
  qualification?: string;
  certifications?: string;
  status?: string;
  notes?: string;
  documentIds?: string;
  isActive?: boolean;
}

// ===== نموذج العميل =====
export interface Client {
  $id: string;
  $createdAt: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  type?: string;
  taxId?: string;
  taxNumber?: string;
  notes?: string;
}

// ===== نموذج المشروع =====
export interface Project {
  $id: string;
  $createdAt: string;
  projectNumber: string;
  name: string;
  clientId: string;
  status: 'نشط' | 'مكتمل' | 'متوقف';
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  contractor?: string;
  consultant?: string;
  notes?: string;
}

// ===== نموذج العينة =====
export interface Sample {
  $id: string;
  $createdAt: string;
  sampleNumber: string;
  projectId?: string;
  clientId?: string;
  clientName?: string;
  projectName?: string;
  type: string;
  location?: string;
  receivedDate?: string;
  samplingDate?: string;
  preparationDate?: string;
  deliveryDate?: string;
  samplerId?: string;
  preparerId?: string;
  transporterId?: string;
  test7DaysDate?: string;
  test28DaysDate?: string;
  status: string;
  notes?: string;
}

// ===== نموذج الفحص =====
export interface Test {
  $id: string;
  $createdAt: string;
  testNumber: string;
  testName: string;
  sampleId?: string;
  sampleNumber?: string;
  projectId?: string;
  clientId?: string;
  specification?: string;
  assignedTo?: string;
  status: 'قيد الانتظار' | 'تحت الفحص' | 'مكتمل' | 'مرفوض';
  result?: string;
  results?: string;
  averageResult?: number;
  result7Days?: string;
  result28Days?: string;
  average7Days?: number;
  average28Days?: number;
  test7Date?: string;
  test28Date?: string;
  unit?: string;
  reportFileId?: string;
  notes?: string;
  completedAt?: string;
  // Professionalized samples & tests fields (all stored as JSON strings):
  resultType?: 'single' | 'dual_age' | 'multi_no_age' | 'multi_field';
  resultFields?: string; // JSON array of ResultFieldDef, copied from the standard test
  resultFieldsValues?: string; // JSON object { [fieldKey]: value }
  appliedStandard?: string; // JSON of the selected SpecificationProfile
  complianceStatus?: 'مطابق' | 'غير مطابق';
}

// ===== نموذج الفاتورة =====
export interface Invoice {
  $id: string;
  $createdAt: string;
  invoiceNumber: string;
  clientId: string;
  projectId?: string;
  issueDate: string;
  dueDate?: string;
  total: number;
  subtotal?: number;
  tax?: number;
  paidAmount?: number;
  remainingAmount?: number;
  status: 'مسودة' | 'صادرة' | 'مدفوعة' | 'ملغاة' | 'متأخرة';
  notes?: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  testId: string;
  testName: string;
  unit?: string;
  specification?: string;
  price: number;
  quantity: number;
  total: number;
}

// ===== نموذج الدفعة =====
export interface Payment {
  $id: string;
  $createdAt: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method?: 'نقدي' | 'شيك' | 'تحويل بنكي' | 'بطاقة';
  reference?: string;
  notes?: string;
}

// ===== نموذج المصروف =====
export interface Expense {
  $id: string;
  $createdAt: string;
  expenseNumber: string;
  type: 'سولار' | 'صيانة' | 'شراء مواد' | 'رواتب' | 'إيجار' | 'أخرى';
  amount: number;
  date: string;
  vendorId?: string;
  vendor?: string;
  vehicleId?: string;
  description?: string;
  receiptUrl?: string;
  approvedBy?: string;
  paymentMethod?: string;
  notes?: string;
}

// ===== نموذج الحضور =====
export interface AttendanceRecord {
  $id: string;
  $createdAt: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'حاضر' | 'غائب' | 'متأخر' | 'إجازة';
  approved?: boolean;
  notes?: string;
}

// ===== نموذج طلب الإجازة =====
export interface LeaveRequest {
  $id: string;
  $createdAt: string;
  employeeId: string;
  type: 'سنوية' | 'مرضية' | 'طارئة' | 'بدون راتب';
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'معلق' | 'موافق' | 'مرفوض';
  approvedBy?: string;
}

// ===== نموذج العمل الإضافي =====
export interface OvertimeRecord {
  $id: string;
  $createdAt: string;
  employeeId: string;
  date: string;
  hours: number;
  reason?: string;
  approved?: boolean;
  approvedBy?: string;
}

// ===== نموذج التنبيه =====
export interface Notification {
  $id: string;
  $createdAt: string;
  employeeId?: string;
  employeeName?: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  link?: string;
}

// ===== نموذج الجهاز =====
export interface Equipment {
  $id: string;
  $createdAt: string;
  name: string;
  serialNumber?: string;
  model?: string;
  status: 'نشط' | 'يعمل' | 'صيانة' | 'قيد الصيانة' | 'متوقف' | 'خارج الخدمة';
  calibrationDate?: string;
  nextCalibrationDate?: string;
  purchaseDate?: string;
  maintenanceDate?: string;
  location?: string;
  notes?: string;
}

// ===== نموذج الحجز =====
export interface Booking {
  $id: string;
  $createdAt: string;
  bookingNumber: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  sampleType?: string;
  preferredDate?: string;
  projectName?: string;
  status: 'معلق' | 'مقبول' | 'مرفوض' | 'مكتمل' | 'ملغى';
  source?: 'مباشر' | 'موقع' | 'هاتف';
  notes?: string;
}

// ===== قالب التقرير =====
export interface ReportTemplate {
  $id: string;
  $createdAt: string;
  labName: string;
  labNameEn?: string;
  logoFileId?: string;
  addressLine?: string;
  phone?: string;
  email?: string;
  accreditationText?: string;
  footerText?: string;
  signatureLabel?: string;
  primaryColor?: string;
  showQrCode: boolean;
}

// ===== لقطة بيانات التقرير (تُلتقط عند إنشاء المسودة ولا تتغير) =====
export interface ReportSnapshot {
  testName: string;
  testNumber: string;
  standard?: string;
  sampleNumber?: string;
  sampleType?: string;
  clientName?: string;
  projectName?: string;
  completedAt?: string;
  resultType: 'single' | 'dual_age' | 'multi_no_age' | 'multi_field';
  resultRows: { label: string; value: string; unit?: string }[];
  appliedStandardName?: string;
  complianceStatus?: 'مطابق' | 'غير مطابق';
  technicianName?: string;
}

// ===== التقرير =====
export interface Report {
  $id: string;
  $createdAt: string;
  testId: string;
  reportNumber: string;
  status: 'مسودة' | 'معتمد';
  snapshotData: string;
  additionalNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reportHash?: string;
  pdfFileId?: string;
}

// ===== إحصائيات لوحة التحكم (محسوبة على الخادم) =====
export interface DashboardStats {
  totalRevenue: number;
  samplesByType: { name: string; value: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  compliance: {
    nonCompliantTests: number;
    dueComplianceSamples: number;
  };
  generatedAt: string;
}

// ===== أنواع مساعدة =====
export type PaginatedResult<T> = {
  documents: T[];
  total: number;
};

export type AppwriteError = {
  code: number;
  message: string;
  type: string;
};
