import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';

const emptyForm = { fullName: '', phoneNumber: '', email: '' };

const FIELDS = [
  { key: 'fullName', label: 'Tên khách', placeholder: 'Tên khách', type: 'text', autoComplete: 'name' },
  { key: 'phoneNumber', label: 'Số điện thoại', placeholder: '0909 xxx xxxx', type: 'tel', autoComplete: 'tel' },
  { key: 'email', label: 'Email', placeholder: 'Hello@gmail.com', type: 'email', autoComplete: 'email' },
];

const validate = (form) => {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Vui lòng nhập tên khách';
  const phone = form.phoneNumber.replace(/\D/g, '');
  if (!phone) errors.phoneNumber = 'Vui lòng nhập số điện thoại';
  else if (!/^0\d{9}$/.test(phone)) errors.phoneNumber = 'SĐT gồm 10 số, bắt đầu bằng 0';
  if (!form.email.trim()) errors.email = 'Vui lòng nhập email';
  else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Email không hợp lệ';
  return errors;
};

/**
 * Popup "Khách mới" ở màn hình tạo booking tại quầy.
 * Chỉ lo phần UI + validate; việc lưu do onSubmit (hiện là mock) xử lý.
 *  - onSubmit(form): Promise, throw Error(message) nếu lưu thất bại
 */
export default function NewCustomerModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef(null);

  // Mở popup: reset form + focus ô đầu tiên
  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setErrors({});
    setSubmitError('');
    const timer = setTimeout(() => firstInputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  // Esc để đóng + khóa cuộn trang phía sau
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape' && !submitting) onClose(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.replace(/\D/g, ''),
        email: form.email.trim(),
      });
    } catch (err) {
      setSubmitError(err.message || 'Không thêm được khách, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-customer-title"
        className="relative w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          disabled={submitting}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={18} />
        </button>

        <h2 id="new-customer-title" className="m-0 mb-5 text-2xl font-bold text-gray-900">Khách mới</h2>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {FIELDS.map((field, index) => (
            <div key={field.key}>
              <label htmlFor={`new-customer-${field.key}`} className="mb-1.5 block text-xs font-bold text-gray-600">
                {field.label} <span className="text-red-500">*</span>
              </label>
              <input
                id={`new-customer-${field.key}`}
                ref={index === 0 ? firstInputRef : undefined}
                type={field.type}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                aria-invalid={Boolean(errors[field.key])}
                className={`h-11 w-full rounded-xl border bg-white px-4 text-sm text-gray-800 outline-none transition-colors focus:border-[#00C475] ${
                  errors[field.key] ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors[field.key] && <p className="m-0 mt-1 text-[12px] text-red-500">{errors[field.key]}</p>}
            </div>
          ))}

          {submitError && (
            <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 items-center gap-1.5 rounded-xl bg-[#1E7F5C] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#186B4D] disabled:opacity-60"
            >
              <Plus size={16} /> {submitting ? 'Đang thêm...' : 'Thêm khách'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-11 rounded-xl border border-gray-300 bg-white px-5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Đóng
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
