import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "../../AdminLayout.css";

const courtTypes = {
  STANDARD_OUTDOOR: "Standard_Outdoor",
  STANDARD_INDOOR: "Standard_Indoor",
  VIP_INDOOR: "VIP_Indoor",
};
const priceFormatter = new Intl.NumberFormat("vi-VN");
const emptyForm = { courtType: "STANDARD_OUTDOOR", startTime: "", endTime: "", pricePerHour: "", isPeakHour: false };
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function PriceManagementPage() {
  const { priceConfigs, setPriceConfigs, allocatePriceConfigId } = useOutletContext();
  const [selectedType, setSelectedType] = useState("STANDARD_OUTDOOR");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [priceToDelete, setPriceToDelete] = useState(null);
  const formDialogRef = useRef(null);
  const formRef = useRef(null);
  const deleteDialogRef = useRef(null);
  const deleteCloseRef = useRef(null);
  const addButtonRef = useRef(null);

  const visiblePrices = priceConfigs
    .filter((config) => config.courtType === selectedType)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const updateForm = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormError("");
  };

  const openForm = (config = null) => {
    setEditingId(config?.priceConfigId ?? null);
    setForm(config ? {
      courtType: config.courtType,
      startTime: config.startTime,
      endTime: config.endTime,
      pricePerHour: String(config.pricePerHour),
      isPeakHour: config.isPeakHour,
    } : { ...emptyForm, courtType: selectedType });
    setFormError("");
    formDialogRef.current.showModal();
    formRef.current.elements.namedItem("startTime").focus();
  };

  const showError = (message, field) => {
    setFormError(message);
    formRef.current.elements.namedItem(field).focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!Object.hasOwn(courtTypes, form.courtType)) {
      showError("Vui lòng chọn loại sân hợp lệ.", "courtType");
      return;
    }
    if (!timePattern.test(form.startTime)) {
      showError("Vui lòng nhập giờ bắt đầu hợp lệ.", "startTime");
      return;
    }
    if (!timePattern.test(form.endTime) || form.endTime <= form.startTime) {
      showError("Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.", "endTime");
      return;
    }
    const pricePerHour = Number(form.pricePerHour);
    if (!form.pricePerHour.trim() || !Number.isSafeInteger(pricePerHour) || pricePerHour <= 0 || pricePerHour > 9999999999) {
      showError("Giá mỗi giờ phải là số nguyên từ 1 đến 9.999.999.999 đồng.", "pricePerHour");
      return;
    }
    // Hai khung giờ liền nhau được phép; cùng loại sân thì không được chồng lấn.
    const overlapping = priceConfigs.some((config) =>
      config.priceConfigId !== editingId && config.courtType === form.courtType &&
      form.startTime < config.endTime && form.endTime > config.startTime
    );
    if (overlapping) {
      showError("Khung giờ bị trùng với một khung giá của loại sân này.", "startTime");
      return;
    }

    const config = { ...form, pricePerHour, priceConfigId: editingId ?? allocatePriceConfigId() };
    setPriceConfigs((previous) => editingId === null
      ? [...previous, config]
      : previous.map((item) => item.priceConfigId === editingId ? config : item)
    );
    setSelectedType(form.courtType);
    setNotice(`Đã ${editingId === null ? "thêm" : "cập nhật"} khung giá ${form.startTime} - ${form.endTime}.`);
    formDialogRef.current.close();
  };

  const openDeleteDialog = (config) => {
    setPriceToDelete(config);
    deleteDialogRef.current.showModal();
    deleteCloseRef.current.focus();
  };

  const handleDelete = () => {
    if (!priceToDelete) return;
    setPriceConfigs((previous) => previous.filter((config) => config.priceConfigId !== priceToDelete.priceConfigId));
    setNotice(`Đã xóa khung giá ${priceToDelete.startTime} - ${priceToDelete.endTime}.`);
    deleteDialogRef.current.close();
    addButtonRef.current.focus();
  };

  return (
    <section className="price-page" aria-labelledby="price-page-title">
      <header className="admin-page-header price-page-header">
        <div>
          <h1 id="price-page-title" className="admin-page-title">Cấu hình giá sân</h1>
          <p className="admin-page-description">Thiết lập giá theo khung giờ cho từng loại sân</p>
        </div>
        <div className="price-toolbar">
          <label htmlFor="price-type-filter" className="admin-visually-hidden">Lọc theo loại sân</label>
          <select id="price-type-filter" className="price-type-filter" value={selectedType}
            onChange={(event) => { setSelectedType(event.target.value); setNotice(""); }}>
            {Object.entries(courtTypes).map(([value, label]) => (
              <option key={value} value={value}>Loại: {label}</option>
            ))}
          </select>
          <button ref={addButtonRef} type="button" className="admin-primary-button price-add-button"
            onClick={() => openForm()}>+ Thêm khung giá</button>
        </div>
      </header>

      <p role="status" className="admin-notice price-notice">{notice}</p>

      <div className="admin-table-wrapper">
        <table className="admin-table price-table" aria-label={`Bảng giá ${courtTypes[selectedType]}`}>
          <thead>
            <tr>
              <th scope="col">Khung giờ</th>
              <th scope="col">Giá / Giờ</th>
              <th scope="col">Giờ cao điểm</th>
              <th scope="col"><span className="admin-visually-hidden">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {visiblePrices.length === 0 ? (
              <tr><td colSpan={4} className="price-empty">Chưa có khung giá. Chọn “Thêm khung giá” để tạo mới.</td></tr>
            ) : visiblePrices.map((config) => (
              <tr key={config.priceConfigId}>
                <td>{config.startTime} - {config.endTime}</td>
                <td>{priceFormatter.format(config.pricePerHour)}đ</td>
                <td><span className={`price-peak-badge price-peak-badge--${config.isPeakHour ? "true" : "false"}`}>
                  {config.isPeakHour ? "True" : "False"}
                </span></td>
                <td>
                  <div className="admin-table-actions">
                    <button type="button" className="admin-action-button admin-action-button--delete"
                      aria-label={`Xóa khung giá ${config.startTime} - ${config.endTime}`}
                      onClick={() => openDeleteDialog(config)}>Xóa</button>
                    <button type="button" className="admin-action-button"
                      aria-label={`Sửa khung giá ${config.startTime} - ${config.endTime}`}
                      onClick={() => openForm(config)}>Sửa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog ref={formDialogRef} className="price-dialog" aria-labelledby="price-form-title"
        onClose={() => { setEditingId(null); setForm(emptyForm); setFormError(""); }}>
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="price-form">
          <h2 id="price-form-title" className="price-dialog-title">
            {editingId === null ? "Thêm khung giá" : "Sửa khung giá"}
          </h2>
          <label className="price-form-field" htmlFor="price-form-type">Loại sân
            <select id="price-form-type" name="courtType" className="price-form-input" value={form.courtType}
              onChange={(event) => updateForm("courtType", event.target.value)}>
              {Object.entries(courtTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="price-time-fields">
            <label className="price-form-field" htmlFor="price-start-time">Giờ bắt đầu
              <input id="price-start-time" name="startTime" type="time" required step="60"
                className="price-form-input" value={form.startTime}
                onChange={(event) => updateForm("startTime", event.target.value)} />
            </label>
            <label className="price-form-field" htmlFor="price-end-time">Giờ kết thúc
              <input id="price-end-time" name="endTime" type="time" required step="60"
                className="price-form-input" value={form.endTime}
                onChange={(event) => updateForm("endTime", event.target.value)} />
            </label>
          </div>
          <label className="price-form-field" htmlFor="price-per-hour">Giá / Giờ (đồng)
            <input id="price-per-hour" name="pricePerHour" type="number" required min="1" max="9999999999" step="1"
              className="price-form-input" value={form.pricePerHour} placeholder="Ví dụ: 100000"
              onChange={(event) => updateForm("pricePerHour", event.target.value)} />
          </label>
          <label className="price-peak-field" htmlFor="price-is-peak">
            <input id="price-is-peak" name="isPeakHour" type="checkbox" checked={form.isPeakHour}
              onChange={(event) => updateForm("isPeakHour", event.target.checked)} />
            Giờ cao điểm
          </label>
          {formError && <p role="alert" className="price-form-error">{formError}</p>}
          <footer className="price-dialog-actions">
            <button type="button" className="price-dialog-button" onClick={() => formDialogRef.current.close()}>Đóng</button>
            <button type="submit" className="price-dialog-button price-dialog-button--primary">
              {editingId === null ? "Thêm khung giá" : "Lưu thay đổi"}
            </button>
          </footer>
        </form>
      </dialog>

      <dialog ref={deleteDialogRef} className="price-dialog" aria-labelledby="price-delete-title"
        aria-describedby="price-delete-description" onClose={() => setPriceToDelete(null)}>
        <h2 id="price-delete-title" className="price-dialog-title">Xóa khung giá</h2>
        <p id="price-delete-description" className="price-delete-description">Bạn có chắc chắn muốn xóa khung giá này?</p>
        {priceToDelete && <dl className="price-delete-details">
          <div><dt>Loại sân</dt><dd>{courtTypes[priceToDelete.courtType]}</dd></div>
          <div><dt>Khung giờ</dt><dd>{priceToDelete.startTime} - {priceToDelete.endTime}</dd></div>
          <div><dt>Giá / Giờ</dt><dd>{priceFormatter.format(priceToDelete.pricePerHour)}đ</dd></div>
          <div><dt>Giờ cao điểm</dt><dd>{priceToDelete.isPeakHour ? "True" : "False"}</dd></div>
        </dl>}
        <footer className="price-dialog-actions">
          <button ref={deleteCloseRef} type="button" className="price-dialog-button"
            onClick={() => deleteDialogRef.current.close()}>Đóng</button>
          <button type="button" className="price-dialog-button price-dialog-button--delete"
            disabled={!priceToDelete} onClick={handleDelete}>Xóa</button>
        </footer>
      </dialog>
    </section>
  );
}
