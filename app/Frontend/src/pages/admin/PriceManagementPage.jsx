import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import "../../components/layout/AdminLayout.css";
import { adminApi } from "../../api/adminApi.js";

// Hiển thị cùng tên tiếng Việt với màn Quản lý sân; giữ nguyên enum gửi API.
const courtTypes = {
  STANDARD_OUTDOOR: "Tiêu chuẩn ngoài trời",
  STANDARD_INDOOR: "Tiêu chuẩn trong nhà",
  VIP_INDOOR: "VIP trong nhà",
};
const priceFormatter = new Intl.NumberFormat("vi-VN");
const emptyForm = { courtType: "STANDARD_OUTDOOR", startTime: "", endTime: "", pricePerHour: "", isPeakHour: false };
// Giờ sân là giờ địa phương Việt Nam, lưu HH:mm và không đổi qua UTC.
// Dùng select thay input time để luôn hiện 24 giờ, không phụ thuộc AM/PM của máy.
const timePattern = /^([01]\d|2[0-3]):(00|30)$/;
const timeOptions = Array.from({ length: 48 }, (_, index) =>
  `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 === 0 ? "00" : "30"}`
);

export default function PriceManagementPage() {
  const { priceConfigs, setPriceConfigs } = useOutletContext();
  const [isPending, setIsPending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const formDialogRef = useRef(null);
  const formRef = useRef(null);

  // Mỗi bản ghi là một dòng: 3 loại sân × 2 khung giờ = 6 dòng dữ liệu mẫu.
  // Sao chép trước khi sắp xếp để không thay đổi state dùng chung với màn Court.
  const typeOrder = Object.keys(courtTypes);
  const visiblePrices = [...priceConfigs].sort((a, b) =>
    typeOrder.indexOf(a.courtType) - typeOrder.indexOf(b.courtType) ||
    a.startTime.localeCompare(b.startTime)
  );

  const updateForm = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormError("");
  };

  // Chỉ sửa bản ghi đã có; loại sân giữ nguyên để không chuyển nhầm khung giá.
  const openForm = (config) => {
    setEditingId(config.priceConfigId);
    setForm({
      courtType: config.courtType,
      startTime: config.startTime,
      endTime: config.endTime,
      pricePerHour: String(config.pricePerHour),
      // Giữ cố định nhóm giá của dòng đang sửa để mỗi loại sân vẫn có đủ hai nhóm giá.
      isPeakHour: config.isPeakHour,
    });
    setFormError("");
    formDialogRef.current.showModal();
    formRef.current.elements.namedItem("pricePerHour").focus();
  };

  const showError = (message, field) => {
    setFormError(message);
    formRef.current.elements.namedItem(field).focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isPending || editingId === null) return;
    if (!Object.hasOwn(courtTypes, form.courtType)) {
      showError("Vui lòng chọn loại sân hợp lệ.", "courtType");
      return;
    }
    if (!timePattern.test(form.startTime)) {
      showError("Vui lòng chọn giờ bắt đầu theo mốc 30 phút.", "startTime");
      return;
    }
    if (!timePattern.test(form.endTime)) {
      showError("Vui lòng chọn giờ kết thúc theo mốc 30 phút.", "endTime");
      return;
    }
    if (form.endTime <= form.startTime) {
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

    // Cập nhật đúng một khung giá qua API mock hiện có; Court đọc cùng state.
    setIsPending(true);
    try {
      const input = { ...form, pricePerHour };
      const savedConfig = await adminApi.updatePriceConfig(editingId, input);
      setPriceConfigs((previous) =>
        previous.map((item) => item.priceConfigId === savedConfig.priceConfigId ? savedConfig : item)
      );
      setNotice(`Đã cập nhật giá ${courtTypes[savedConfig.courtType]}, khung giờ ${savedConfig.startTime} - ${savedConfig.endTime}.`);
      formDialogRef.current.close();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="price-page" aria-labelledby="price-page-title">
      <header className="admin-page-header price-page-header">
        <div>
          <h1 id="price-page-title" className="admin-page-title">Cấu hình giá sân</h1>
          <p className="admin-page-description">Thiết lập giá theo khung giờ cho từng loại sân</p>
        </div>
      </header>

      <p role="status" className="admin-notice">{notice}</p>

      <div className="admin-table-wrapper">
        <table className="admin-table price-table" aria-label="Bảng giá sân theo khung giờ">
          <thead>
            <tr>
              <th scope="col">Khung giờ</th>
              <th scope="col">Loại</th>
              <th scope="col">Giá cơ bản</th>
              <th scope="col">Giá giờ cao điểm</th>
              <th scope="col"><span className="admin-visually-hidden">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {visiblePrices.length === 0 ? (
              <tr><td colSpan={5} className="price-empty">Chưa có dữ liệu bảng giá.</td></tr>
            ) : visiblePrices.map((config) => (
              <tr key={config.priceConfigId}>
                <td>{config.startTime} - {config.endTime}</td>
                <td>{courtTypes[config.courtType]}</td>
                {/* Mỗi khung giờ chỉ thuộc một nhóm giá; cột còn lại hiển thị dấu —. */}
                <td>{config.isPeakHour ? <span className="price-unavailable" aria-label="Không áp dụng">—</span>
                  : `${priceFormatter.format(config.pricePerHour)}đ/giờ`}</td>
                <td>{config.isPeakHour ? `${priceFormatter.format(config.pricePerHour)}đ/giờ`
                  : <span className="price-unavailable" aria-label="Không áp dụng">—</span>}</td>
                <td>
                  <div className="admin-table-actions">
                    <button disabled={isPending} type="button" className="admin-action-button price-edit-button"
                      aria-label={`Sửa giá ${courtTypes[config.courtType]}, ${config.startTime} - ${config.endTime}`}
                      onClick={() => openForm(config)}><Pencil size={16} aria-hidden="true" />Sửa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog ref={formDialogRef} className="price-dialog" aria-labelledby="price-form-title"
        onCancel={(event) => { if (isPending) event.preventDefault(); }}
        onClose={() => { setEditingId(null); setForm(emptyForm); setFormError(""); }}>
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="price-form">
          <h2 id="price-form-title" className="price-dialog-title">Sửa khung giá</h2>
          <label className="price-form-field" htmlFor="price-form-type">Loại
            <input id="price-form-type" name="courtType" className="price-form-input"
              value={courtTypes[form.courtType]} readOnly />
          </label>
          <div className="price-time-fields">
            <label className="price-form-field" htmlFor="price-start-time">Giờ bắt đầu
              <select disabled={isPending} id="price-start-time" name="startTime" required
                className="price-form-input" value={form.startTime}
                onChange={(event) => updateForm("startTime", event.target.value)}>
                <option value="" disabled>Chọn giờ</option>
                {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
              </select>
            </label>
            <label className="price-form-field" htmlFor="price-end-time">Giờ kết thúc
              <select disabled={isPending} id="price-end-time" name="endTime" required
                className="price-form-input" value={form.endTime}
                onChange={(event) => updateForm("endTime", event.target.value)}>
                <option value="" disabled>Chọn giờ</option>
                {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
              </select>
            </label>
          </div>
          <label className="price-form-field" htmlFor="price-per-hour">{form.isPeakHour ? "Giá giờ cao điểm (đồng/giờ)" : "Giá cơ bản (đồng/giờ)"}
            <input disabled={isPending} id="price-per-hour" name="pricePerHour" type="number" required min="1" max="9999999999" step="1"
              className="price-form-input" value={form.pricePerHour} placeholder="Ví dụ: 100000"
              onChange={(event) => updateForm("pricePerHour", event.target.value)} />
          </label>
          {formError && <p role="alert" className="price-form-error">{formError}</p>}
          <footer className="price-dialog-actions">
            <button disabled={isPending} type="button" className="price-dialog-button" onClick={() => formDialogRef.current.close()}>Đóng</button>
            <button disabled={isPending} aria-busy={isPending} type="submit" className="price-dialog-button price-dialog-button--primary">
              {isPending ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </footer>
        </form>
      </dialog>

    </section>
  );
}
