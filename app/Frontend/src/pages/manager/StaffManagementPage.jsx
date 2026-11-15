import { useEffect, useRef, useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import { adminApi } from "../../api/adminApi.js";

const emptyForm = { fullName: "", phone: "", email: "" };

export default function StaffManagementPage() {
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    adminApi.getStaffAccounts()
      .then((items) => { if (!cancelled) setStaff(items); })
      .catch((error) => { if (!cancelled) setRequestError(error.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const openCreateForm = () => {
    setEditingStaff(null);
    setForm(emptyForm);
    setFormError("");
    dialogRef.current?.showModal();
  };

  const openEditForm = (account) => {
    setEditingStaff(account);
    setForm({ fullName: account.fullName, phone: account.phone, email: account.email });
    setFormError("");
    dialogRef.current?.showModal();
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  };

  const saveStaff = async (event) => {
    event.preventDefault();
    setIsPending(true);
    setFormError("");
    setRequestError("");
    setNotice("");
    try {
      const payload = { fullName: form.fullName, phone: form.phone, email: form.email };
      const saved = editingStaff
        ? await adminApi.updateStaffAccount(editingStaff.id, payload)
        : await adminApi.createStaffAccount(payload);
      setStaff((items) => editingStaff
        ? items.map((item) => item.id === saved.id ? saved : item)
        : [...items, saved]);
      setNotice(editingStaff ? "Đã cập nhật tài khoản nhân viên." : "Đã tạo tài khoản nhân viên.");
      dialogRef.current?.close();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  const deleteStaff = async (account) => {
    if (isPending || !window.confirm(`Xóa tài khoản của ${account.fullName}?`)) return;
    setIsPending(true);
    setRequestError("");
    setNotice("");
    try {
      await adminApi.deleteStaffAccount(account.id);
      setStaff((items) => items.filter((item) => item.id !== account.id));
      setNotice(`Đã xóa tài khoản của ${account.fullName}.`);
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  const toggleStaffStatus = async (account) => {
    if (isPending) return;
    const status = account.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    setIsPending(true);
    setRequestError("");
    setNotice("");
    try {
      const updated = await adminApi.setStaffAccountStatus(account.id, status);
      setStaff((items) => items.map((item) => item.id === updated.id ? updated : item));
      setNotice(status === "ACTIVE" ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.");
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="staff-page" aria-labelledby="staff-page-title">
      <header className="admin-page-header staff-page-header">
        <div className="staff-heading-group">
          <h1 id="staff-page-title" className="admin-page-title">Quản lý tài khoản nhân viên</h1>
          <p className="staff-page-description">
            <UsersRound size={17} aria-hidden="true" />
            {staff.length} tài khoản
          </p>
        </div>
        <button disabled={isPending} type="button" className="admin-primary-button staff-add-button" onClick={openCreateForm}>
          <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
          Tạo tài khoản nhân viên
        </button>
      </header>

      {(notice || requestError) && (
        <p role={requestError ? "alert" : "status"}
          className={requestError ? "staff-message staff-message--error" : "staff-message"}>
          {requestError || notice}
        </p>
      )}

      <div className="admin-table-wrapper staff-table-wrapper" tabIndex={0} role="region"
        aria-label="Danh sách nhân viên, có thể cuộn ngang">
        <table className="admin-table staff-table">
          <thead>
            <tr>
              <th scope="col">Họ tên</th>
              <th scope="col">SĐT</th>
              <th scope="col">Email</th>
              <th scope="col">Trạng thái</th>
              <th scope="col"><span className="admin-visually-hidden">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((account) => {
              const isActive = account.status === "ACTIVE";
              return (
                <tr key={account.id}>
                  <td className="staff-name-cell">{account.fullName}</td>
                  <td>{account.phone}</td>
                  <td>{account.email}</td>
                  <td>
                    <span className={`staff-status ${isActive ? "staff-status--active" : "staff-status--locked"}`}>
                      <span aria-hidden="true" className="staff-status-dot" />
                      {isActive ? "Active" : "Locked"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions discount-actions">
                      <button disabled={isPending} type="button" className="admin-action-button admin-action-button--delete"
                        aria-label={`Xóa tài khoản ${account.fullName}`} onClick={() => deleteStaff(account)}>
                        Xóa
                      </button>
                      <button disabled={isPending} type="button" className="admin-action-button discount-edit-button"
                        aria-label={`Sửa tài khoản ${account.fullName}`} onClick={() => openEditForm(account)}>
                        Sửa
                      </button>
                      <button disabled={isPending} type="button"
                        className={`admin-action-button ${isActive ? "discount-lock-button" : "admin-action-button--activate"}`}
                        onClick={() => toggleStaffStatus(account)}>
                        {isActive ? "Khóa" : "Mở khóa"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && staff.length === 0 && !requestError && (
              <tr><td colSpan={5} className="staff-empty">Chưa có tài khoản nhân viên. Tạo tài khoản đầu tiên để bắt đầu.</td></tr>
            )}
            {isLoading && <tr><td colSpan={5} className="staff-empty" role="status">Đang tải danh sách nhân viên…</td></tr>}
          </tbody>
        </table>
      </div>

      <dialog ref={dialogRef} className="staff-dialog" aria-labelledby="staff-form-title"
        onCancel={(event) => { if (isPending) event.preventDefault(); }}
        onClose={() => { setEditingStaff(null); setForm(emptyForm); setFormError(""); }}>
        <form className="staff-form" onSubmit={saveStaff} noValidate>
          <div className="staff-dialog-heading">
            <span className="staff-dialog-icon"><UsersRound size={21} aria-hidden="true" /></span>
            <div>
              <h2 id="staff-form-title">{editingStaff ? "Sửa tài khoản nhân viên" : "Tạo tài khoản nhân viên"}</h2>
              <p>Nhập thông tin tài khoản để quản lý nhân viên.</p>
            </div>
          </div>
          <label className="staff-form-field" htmlFor="staff-full-name">
            Họ tên
            <input disabled={isPending} id="staff-full-name" type="text" autoComplete="name" maxLength={100}
              placeholder="Ví dụ: Nguyễn Văn A" required autoFocus value={form.fullName}
              onChange={(event) => updateForm("fullName", event.target.value)} />
          </label>
          <label className="staff-form-field" htmlFor="staff-phone">
            Số điện thoại
            <input disabled={isPending} id="staff-phone" type="tel" autoComplete="tel" maxLength={16}
              placeholder="0909 123 456" required value={form.phone}
              onChange={(event) => updateForm("phone", event.target.value)} />
          </label>
          <label className="staff-form-field" htmlFor="staff-email">
            Email
            <input disabled={isPending} id="staff-email" type="email" autoComplete="email" maxLength={100}
              placeholder="nhanvien@email.com" required value={form.email}
              onChange={(event) => updateForm("email", event.target.value)} />
          </label>
          {formError && <p role="alert" className="staff-form-error">{formError}</p>}
          <footer className="staff-dialog-actions">
            <button disabled={isPending} type="button" className="staff-dialog-button"
              onClick={() => dialogRef.current?.close()}>Hủy</button>
            <button disabled={isPending} type="submit" className="staff-dialog-button staff-dialog-button--primary">
              {isPending ? "Đang lưu…" : editingStaff ? "Lưu thay đổi" : "Tạo tài khoản"}
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
}
