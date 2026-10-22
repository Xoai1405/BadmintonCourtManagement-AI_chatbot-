import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "../../components/layout/AdminLayout.css";
import { courtApi } from "../../api/CourtApi.js";

const courtTypes = {
  STANDARD_OUTDOOR: "Tiêu chuẩn ngoài trời",
  STANDARD_INDOOR: "Tiêu chuẩn trong nhà",
  VIP_INDOOR: "VIP trong nhà",
};

const statuses = {
  ACTIVE: { label: "Hoạt động", className: "court-status--active" },
  MAINTENANCE: { label: "Bảo trì", className: "court-status--maintenance" },
  CLOSED: { label: "Ngưng hoạt động", className: "court-status--closed" },
};

const emptyForm = { name: "", courtType: "STANDARD_OUTDOOR", status: "ACTIVE" };
const currency = new Intl.NumberFormat("vi-VN");

function priceLabel(price) {
  return price == null ? "Chưa có giá" : `${currency.format(price)}đ/Giờ`;
}

export default function CourtManagementPage() {
  const { courts, setCourts } = useOutletContext();
  const [editingCourtId, setEditingCourtId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPending, setIsPending] = useState(false);
  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);
  const addCourtButtonRef = useRef(null);

  const openCourtForm = (court = null) => {
    setRequestError("");
    setFormError("");
    setEditingCourtId(court?.id ?? null);
    setForm(court
      ? { name: court.name ?? "", courtType: court.courtType ?? "STANDARD_OUTDOOR", status: court.status ?? "ACTIVE" }
      : emptyForm);
    dialogRef.current?.showModal();
    requestAnimationFrame(() => nameInputRef.current?.focus());
  };

  const resetForm = () => {
    setEditingCourtId(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isPending) return;

    const name = form.name.trim();
    if (!name) {
      setFormError("Vui lòng nhập tên sân.");
      nameInputRef.current?.focus();
      return;
    }

    setIsPending(true);
    setRequestError("");
    try {
      const payload = { name, courtType: form.courtType, status: form.status };
      const savedCourt = editingCourtId === null
        ? await courtApi.createCourt(payload)
        : await courtApi.updateCourt(editingCourtId, payload);

      setCourts((previous) => editingCourtId === null
        ? [...previous, savedCourt]
        : previous.map((court) => court.id === savedCourt.id ? savedCourt : court));
      setNotice(`Đã ${editingCourtId === null ? "thêm" : "cập nhật"} ${savedCourt.name}.`);
      dialogRef.current?.close();
    } catch (error) {
      setFormError(error.message || "Không thể lưu thông tin sân.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý sân</h1>
          <p className="admin-page-description">Quản lý thông tin và trạng thái vận hành của từng sân</p>
        </div>
        <button ref={addCourtButtonRef} disabled={isPending} type="button" className="admin-primary-button" onClick={() => openCourtForm()}>
          + Thêm sân
        </button>
      </header>

      <p role="status" className="admin-notice">{notice}</p>
      {requestError && <p role="alert" className="court-form-error">{requestError}</p>}

      <div className="admin-table-wrapper">
        <table className="admin-table court-table">
          <thead>
            <tr>
              <th scope="col">Tên sân</th>
              <th scope="col">Loại</th>
              <th scope="col">Giá cơ bản</th>
              <th scope="col">Giá giờ cao điểm</th>
              <th scope="col">Trạng thái</th>
              <th scope="col"><span className="admin-visually-hidden">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {courts.length === 0 ? (
              <tr><td colSpan={6}>Chưa có sân. Chọn “Thêm sân” để tạo sân mới.</td></tr>
            ) : courts.map((court) => {
              const status = statuses[court.status] ?? { label: court.status, className: "" };
              return (
                <tr key={court.id}>
                  <td>{court.name}</td>
                  <td>{courtTypes[court.courtType] ?? court.courtType}</td>
                  <td>{priceLabel(court.priceNormalHour)}</td>
                  <td>{priceLabel(court.pricePeakHour)}</td>
                  <td><span className={`court-status ${status.className}`}>{status.label}</span></td>
                  <td>
                    <div className="admin-table-actions">
                      <button disabled={isPending} type="button" aria-label={`Sửa ${court.name}`} className="admin-action-button" onClick={() => openCourtForm(court)}>
                        Sửa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dialog ref={dialogRef} aria-labelledby="court-form-title" aria-describedby="court-form-description" className="court-form-dialog" onClose={resetForm}>
        <form onSubmit={handleSubmit} noValidate className="court-form">
          <header className="court-form-header">
            <h2 id="court-form-title" className="court-form-title">{editingCourtId === null ? "Thêm sân mới" : "Sửa thông tin sân"}</h2>
            <p id="court-form-description" className="court-form-description">
              Nhập tên, chọn loại sân và trạng thái để {editingCourtId === null ? "thêm sân mới" : "cập nhật thông tin"}.
            </p>
          </header>

          <label htmlFor="court-name" className="court-form-field">
            Tên sân
            <input ref={nameInputRef} id="court-name" name="name" type="text" required value={form.name} placeholder="Ví dụ: Sân 04" className="court-form-input" aria-invalid={Boolean(formError)} aria-describedby={formError ? "court-form-error" : undefined} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setFormError(""); }} />
          </label>

          <label htmlFor="court-type" className="court-form-field">
            Loại sân
            <select id="court-type" name="courtType" value={form.courtType} className="court-form-input" required onChange={(event) => setForm((current) => ({ ...current, courtType: event.target.value }))}>
              {Object.entries(courtTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label htmlFor="court-status" className="court-form-field">
            Trạng thái
            <select id="court-status" name="status" value={form.status} className="court-form-input" required onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              {Object.entries(statuses).map(([value, { label }]) => <option key={value} value={value} disabled={value !== "ACTIVE"}>{label}</option>)}
            </select>
          </label>

          {formError && <p id="court-form-error" role="alert" className="court-form-error">{formError}</p>}

          <footer className="court-form-actions">
            <button disabled={isPending} type="button" className="court-form-button court-form-button--secondary" onClick={() => dialogRef.current?.close()}>Đóng</button>
            <button disabled={isPending} type="submit" className="court-form-button court-form-button--primary">{editingCourtId === null ? "+ Thêm sân" : "Lưu thay đổi"}</button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
