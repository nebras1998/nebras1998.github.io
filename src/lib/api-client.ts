// src/lib/api-client.ts
// عميل fetch مشترك للصفحات: يستدعي مسارات الخادم `/api/...` بدل SDK المتصفح.
// عند فشل الطلب يستخرج رسالة الخطأ العربية من جسم الاستجابة `{ error: string }`
// ويرميها كـ Error ليستخدمها الكاشف (toast) الموجود في الصفحة كما هو.

export async function apiFetch<T = Record<string, unknown>>(
  url: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown } = {}
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  let body = options.body;
  if (
    !isFormData &&
    body !== undefined &&
    body !== null &&
    typeof body === 'object' &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(body)
  ) {
    body = JSON.stringify(body);
  }
  const res = await fetch(url, {
    ...(options as RequestInit),
    body: body as BodyInit,
    headers: isFormData
      ? { ...(options.headers ?? {}) }
      : { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });

  if (!res.ok) {
    let message = 'حدث خطأ غير متوقع';
    try {
      const data = (await res.json()) as { error?: unknown };
      if (typeof data?.error === 'string' && data.error.trim() !== '') {
        message = data.error;
      }
    } catch {
      // leave the generic message
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}