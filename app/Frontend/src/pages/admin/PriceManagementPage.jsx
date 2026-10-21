import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "../../components/layout/AdminLayout.css";
import { priceConfigApi } from "../../api/priceConfigApi.js";
import { businessHourApi } from "../../api/businessHourApi.js";
const courtTypes = {
  STANDARD_OUTDOOR: "Tiêu chuẩn ngoài trời",
  STANDARD_INDOOR: "Tiêu chuẩn trong nhà",
  VIP_INDOOR: "VIP trong nhà",
};

const priceFormatter = new Intl.NumberFormat("vi-VN");
const typeOrder = Object.keys(courtTypes);
const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

const emptyPriceForm = {
  courtType: "",
  priceNormalHour: "",
  pricePeakHour: "",
};

export default function PriceManagementPage() {
  const {
    priceConfigs,
    setPriceConfigs,
    businessHourConfig,
    setBusinessHourConfig,
  } = useOutletContext();

  const [isPending, setIsPending] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [priceForm, setPriceForm] = useState(emptyPriceForm);
  const [hoursForm, setHoursForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const priceDialogRef = useRef(null);
  const hoursDialogRef = useRef(null);

  const visiblePrices = [...priceConfigs].sort(
    (a, b) => typeOrder.indexOf(a.courtType) - typeOrder.indexOf(b.courtType),
  );

  const openPriceForm = (config) => {
    setEditingPriceId(config.id);
    setPriceForm({
      courtType: config.courtType,
      priceNormalHour: String(config.priceNormalHour),
      pricePeakHour: String(config.pricePeakHour),
    });
    setFormError("");
    priceDialogRef.current.showModal();
  };

  const openHoursForm = () => {
    setHoursForm({ ...businessHourConfig });
    setFormError("");
    hoursDialogRef.current.showModal();
  };

  const updatePriceForm = (field, value) => {
    setPriceForm((previous) => ({ ...previous, [field]: value }));
    setFormError("");
  };

  const updateHoursForm = (field, value) => {
    setHoursForm((previous) => ({ ...previous, [field]: value }));
    setFormError("");
  };

  const handlePriceSubmit = async (event) => {
    event.preventDefault();
    if (isPending || editingPriceId === null) return;

    const priceNormalHour = Number(priceForm.priceNormalHour);
    const pricePeakHour = Number(priceForm.pricePeakHour);

    if (!Number.isSafeInteger(priceNormalHour) || priceNormalHour <= 0
      || !Number.isSafeInteger(pricePeakHour) || pricePeakHour <= 0) {
      setFormError("Giá thường và giá cao điểm phải là số nguyên dương.");
      return;
    }

    setIsPending(true);
    try {
      const savedConfig = await priceConfigApi.update({
        courtType: priceForm.courtType,
        priceNormalHour,
        pricePeakHour,
      });

      setPriceConfigs((previous) => previous.map((item) =>
        item.id === savedConfig.id ? savedConfig : item,
      ));
      setNotice(`Đã cập nhật giá ${courtTypes[savedConfig.courtType]}.`);
      priceDialogRef.current.close();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleHoursSubmit = async (event) => {
    event.preventDefault();
    if (isPending || !hoursForm) return;

    setIsPending(true);
    try {
      const savedConfig = await businessHourApi.update(hoursForm);
      setBusinessHourConfig(savedConfig);
      setNotice("Đã cập nhật giờ hoạt động và giờ cao điểm.");
      hoursDialogRef.current.close();
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
          <p className="admin-page-description">
            Thiết lập giá thường, giá cao điểm và khung giờ dùng chung cho toàn hệ thống.
          </p>
        </div>
      </header>

      <p role="status" className="admin-notice">{notice}</p>

      {businessHourConfig && (
        <section className="business-hours-card" aria-labelledby="business-hours-title">
          <div>
            <h2 id="business-hours-title">Khung giờ áp dụng chung</h2>
            <p>Thay đổi ở đây sẽ ảnh hưởng đến lịch trống và cách tính giá của mọi loại sân.</p>
          </div>
          <dl className="business-hours-values">
            <div>
              <dt>Giờ hoạt động</dt>
              <dd>{businessHourConfig.openingTime} – {businessHourConfig.closingTime}</dd>
            </div>
            <div>
              <dt>Giờ cao điểm</dt>
              <dd>{businessHourConfig.peakStartTime} – {businessHourConfig.peakEndTime}</dd>
            </div>
          </dl>
          <button disabled={isPending} type="button" className="admin-action-button price-edit-button" onClick={openHoursForm}>
            Sửa khung giờ
          </button>
        </section>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table price-table" aria-label="Bảng giá theo loại sân">
          <thead>
            <tr>
              <th scope="col">Loại sân</th>
              <th scope="col">Giá giờ thường</th>
              <th scope="col">Giá giờ cao điểm</th>
              <th scope="col"><span className="admin-visually-hidden">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {visiblePrices.length === 0 ? (
              <tr><td colSpan={4} className="price-empty">Chưa có dữ liệu bảng giá.</td></tr>
            ) : visiblePrices.map((config) => (
              <tr key={config.id}>
                <td>{courtTypes[config.courtType]}</td>
                <td>{priceFormatter.format(config.priceNormalHour)}đ/giờ</td>
                <td>{priceFormatter.format(config.pricePeakHour)}đ/giờ</td>
                <td>
                  <div className="admin-table-actions">
                    <button
                      disabled={isPending}
                      type="button"
                      className="admin-action-button price-edit-button"
                      aria-label={`Sửa giá ${courtTypes[config.courtType]}`}
                      onClick={() => openPriceForm(config)}
                    >
                      Sửa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog
        ref={priceDialogRef}
        className="price-dialog"
        aria-labelledby="price-form-title"
        onCancel={(event) => { if (isPending) event.preventDefault(); }}
        onClose={() => { setEditingPriceId(null); setPriceForm(emptyPriceForm); setFormError(""); }}
      >
        <form onSubmit={handlePriceSubmit} noValidate className="price-form">
          <h2 id="price-form-title" className="price-dialog-title">Cập nhật giá sân</h2>
          <label className="price-form-field" htmlFor="price-form-type">
            Loại sân
            <input id="price-form-type" className="price-form-input" value={courtTypes[priceForm.courtType] ?? ""} readOnly />
          </label>
          <label className="price-form-field" htmlFor="price-normal-hour">
            Giá giờ thường (đồng/giờ)
            <input disabled={isPending} id="price-normal-hour" type="number" required min="1" step="1" className="price-form-input" value={priceForm.priceNormalHour} onChange={(event) => updatePriceForm("priceNormalHour", event.target.value)} />
          </label>
          <label className="price-form-field" htmlFor="price-peak-hour">
            Giá giờ cao điểm (đồng/giờ)
            <input disabled={isPending} id="price-peak-hour" type="number" required min="1" step="1" className="price-form-input" value={priceForm.pricePeakHour} onChange={(event) => updatePriceForm("pricePeakHour", event.target.value)} />
          </label>
          {formError && <p role="alert" className="price-form-error">{formError}</p>}
          <footer className="price-dialog-actions">
            <button disabled={isPending} type="button" className="price-dialog-button" onClick={() => priceDialogRef.current.close()}>Đóng</button>
            <button disabled={isPending} type="submit" className="price-dialog-button price-dialog-button--primary">{isPending ? "Đang lưu…" : "Lưu thay đổi"}</button>
          </footer>
        </form>
      </dialog>

      <dialog
        ref={hoursDialogRef}
        className="price-dialog"
        aria-labelledby="hours-form-title"
        onCancel={(event) => { if (isPending) event.preventDefault(); }}
        onClose={() => { setHoursForm(null); setFormError(""); }}
      >
        <form onSubmit={handleHoursSubmit} noValidate className="price-form">
          <h2 id="hours-form-title" className="price-dialog-title">Cập nhật khung giờ</h2>
          <div className="price-time-fields">
            <TimeField id="opening-time" label="Giờ mở cửa" value={hoursForm?.openingTime ?? ""} disabled={isPending} onChange={(value) => updateHoursForm("openingTime", value)} />
            <TimeField id="closing-time" label="Giờ đóng cửa" value={hoursForm?.closingTime ?? ""} disabled={isPending} onChange={(value) => updateHoursForm("closingTime", value)} />
            <TimeField id="peak-start-time" label="Bắt đầu cao điểm" value={hoursForm?.peakStartTime ?? ""} disabled={isPending} onChange={(value) => updateHoursForm("peakStartTime", value)} />
            <TimeField id="peak-end-time" label="Kết thúc cao điểm" value={hoursForm?.peakEndTime ?? ""} disabled={isPending} onChange={(value) => updateHoursForm("peakEndTime", value)} />
          </div>
          {formError && <p role="alert" className="price-form-error">{formError}</p>}
          <footer className="price-dialog-actions">
            <button disabled={isPending} type="button" className="price-dialog-button" onClick={() => hoursDialogRef.current.close()}>Đóng</button>
            <button disabled={isPending} type="submit" className="price-dialog-button price-dialog-button--primary">{isPending ? "Đang lưu…" : "Lưu thay đổi"}</button>
          </footer>
        </form>
      </dialog>
    </section>
  );
}

function TimeField({ id, label, value, disabled, onChange }) {
  return (
    <label className="price-form-field" htmlFor={id}>
      {label}
      <select disabled={disabled} id={id} required className="price-form-input" value={value} onChange={(event) => onChange(event.target.value)}>
        {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
      </select>
    </label>
  );
}
