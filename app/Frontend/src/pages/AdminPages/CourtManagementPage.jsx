import { useRef, useState } from "react";
import { CircleX, FileText } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import "../../AdminLayout.css";

// Giữ giá trị enum theo contract, nhưng hiển thị tên loại sân bằng tiếng Việt.
const courtTypeLabels = {
  STANDARD_OUTDOOR: "Tiêu chuẩn ngoài trời",
  STANDARD_INDOOR: "Tiêu chuẩn trong nhà",
  VIP_INDOOR: "VIP trong nhà",
};

// Đổi enum trạng thái thành nhãn và class màu tương ứng trong AdminLayout.css.
const statusStyles = {
  ACTIVE: { label: "Hoạt động", className: "court-status--active" },
  MAINTENANCE: { label: "Bảo trì", className: "court-status--maintenance" },
  CLOSED: { label: "Đóng", className: "court-status--closed" },
};

const priceFormatter = new Intl.NumberFormat("vi-VN");

// Một loại sân có thể có nhiều khung giờ: bỏ mức giá trùng và sắp xếp tăng dần.
function getPrices(priceConfigs, courtType, isPeakHour) {
  return [...new Set(
    priceConfigs
      .filter((config) =>
        config.courtType === courtType && config.isPeakHour === isPeakHour
      )
      .map((config) => config.pricePerHour)
  )].sort((a, b) => a - b);
}

// Hiển thị đủ các mức giá tìm được, hoặc thông báo khi chưa cấu hình giá.
function formatPriceLabel(priceConfigs, courtType, isPeakHour) {
  const prices = getPrices(priceConfigs, courtType, isPeakHour);
  if (!prices.length) return "Chưa có giá";
  return `${prices.map((price) => priceFormatter.format(price)).join(" / ")}đ/Giờ`;
}

export default function CourtManagementPage() {
  // Layout giữ danh sách và ID mock để dữ liệu không mất khi chuyển menu.
  // Các thao tác hiện chỉ cập nhật state, chưa lưu vào database.
  const { courts, setCourts, allocateCourtId, priceConfigs } = useOutletContext();
  const getPriceLabel = (courtType, isPeakHour) => formatPriceLabel(priceConfigs, courtType, isPeakHour);
  // null: đang thêm sân; có courtId: đang sửa sân tương ứng.
  const [editingCourtId, setEditingCourtId] = useState(null);
  // Khi thêm sân, mặc định Hoạt động; khi sửa sẽ lấy trạng thái hiện tại của sân.
  const [form, setForm] = useState({
    name: "", courtType: "STANDARD_OUTDOOR", status: "ACTIVE",
  });
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  // Sân đang chờ xác nhận xóa; mở popup chưa làm thay đổi danh sách.
  const [courtToDelete, setCourtToDelete] = useState(null);
  // Ref dùng để mở/đóng dialog và đưa con trỏ vào ô tên sân.
  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);
  const deleteDialogRef = useRef(null);
  const deleteCloseButtonRef = useRef(null);
  const addCourtButtonRef = useRef(null);

  // Dùng chung một form: không truyền sân thì tạo mới, truyền sân thì điền dữ liệu để sửa.
  const openCourtForm = (court = null) => {
    setEditingCourtId(court?.courtId ?? null);
    setForm({
      name: court?.name ?? "",
      courtType: court?.courtType ?? "STANDARD_OUTDOOR",
      status: court?.status ?? "ACTIVE",
    });
    setFormError("");
    dialogRef.current.showModal();
    nameInputRef.current.focus();
  };

  // onClose gọi hàm này khi lưu, bấm Đóng hoặc đóng dialog bằng phím Escape.
  const resetForm = () => {
    setEditingCourtId(null);
    setForm({ name: "", courtType: "STANDARD_OUTDOOR", status: "ACTIVE" });
    setFormError("");
  };

  // Kiểm tra form trước khi mô phỏng thao tác thêm/sửa dữ liệu.
  const handleSubmit = (event) => {
    event.preventDefault();
    const name = form.name.trim();

    if (!name) {
      setFormError("Vui lòng nhập tên sân.");
      nameInputRef.current.focus();
      return;
    }
    if (!Object.hasOwn(courtTypeLabels, form.courtType)) {
      setFormError("Vui lòng chọn loại sân hợp lệ.");
      return;
    }
    if (!Object.hasOwn(statusStyles, form.status)) {
      setFormError("Vui lòng chọn trạng thái hợp lệ.");
      return;
    }

    // Request thêm/sửa sân chỉ gồm name và courtType.
    // Trạng thái thuộc API đổi trạng thái riêng; bản mock lưu cùng khi bấm Thêm/Lưu.
    const requestBody = { name, courtType: form.courtType };
    // Tạm dùng giá thường thấp nhất làm referencePrice cho bản ghi mock.
    const referencePrice = getPrices(priceConfigs, requestBody.courtType, false)[0] ?? 0;

    if (editingCourtId !== null) {
      // Cập nhật thông tin và trạng thái của đúng sân, giữ nguyên ID, ảnh và mô tả.
      setCourts((prev) => prev.map((court) =>
        court.courtId === editingCourtId
          ? { ...court, ...requestBody, status: form.status, referencePrice }
          : court
      ));
      setNotice(`Đã cập nhật ${name}.`);
    } else {
      // Mô phỏng tạo sân: tự cấp ID và lưu trạng thái người dùng đã chọn trong form.
      const newCourt = {
        courtId: allocateCourtId(),
        ...requestBody,
        status: form.status,
        referencePrice,
        imageUrl: "",
        description: "",
      };
      setCourts((prev) => [...prev, newCourt]);
      setNotice(`Đã thêm ${name}.`);
    }
    dialogRef.current.close();
  };

  // Chọn sân rồi mở dialog thông tin. Ưu tiên focus nút Đóng để tránh xóa nhầm.
  const openDeleteDialog = (court) => {
    setCourtToDelete(court);
    deleteDialogRef.current.showModal();
    deleteCloseButtonRef.current.focus();
  };

  // Chỉ nút Xóa trong popup mới gọi hàm này. Đóng/Escape chỉ đóng popup.
  // Đây là thao tác mock: chưa gọi backend hoặc xóa dữ liệu trong database.
  const handleDelete = () => {
    if (!courtToDelete) return;

    // Tạo mảng mới loại bỏ đúng sân theo courtId, không sửa trực tiếp mảng state.
    setCourts((prev) => prev.filter((item) => item.courtId !== courtToDelete.courtId));
    setNotice(`Đã xóa ${courtToDelete.name}.`);
    deleteDialogRef.current.close();
    // Nút mở popup sắp bị xóa khỏi bảng, nên trả focus về một nút còn tồn tại.
    addCourtButtonRef.current.focus();
  };

  // Ẩn = CLOSED, kích hoạt = ACTIVE. Vẫn giữ dòng trong bảng quản lý để kích hoạt lại.
  const handleChangeStatus = (court, newStatus) => {
    setCourts((prev) => prev.map((item) =>
      item.courtId === court.courtId ? { ...item, status: newStatus } : item
    ));
    setNotice(newStatus === "CLOSED"
      ? `Đã ẩn ${court.name}.`
      : `Đã kích hoạt ${court.name}.`
    );
  };

  return (
    <>
      {/* Sidebar và khung main được cung cấp bởi AdminLayout dùng chung. */}
        <header className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Quản lý sân</h1>
            <p className="admin-page-description">
              Quản lý thông tin và trạng thái vận hành của từng sân
            </p>
          </div>
          <button ref={addCourtButtonRef} type="button" className="admin-primary-button"
            onClick={() => openCourtForm()}>
            + Thêm sân
          </button>
        </header>

        {/* Phản hồi sau thao tác; role="status" giúp trình đọc màn hình thông báo. */}
        <p role="status" className="admin-notice">
          {notice}
        </p>

        {/* Bảng luôn đọc từ state, nên cập nhật ngay sau khi thêm/sửa/xóa/đổi trạng thái. */}
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
                const status = statusStyles[court.status];
                const isClosed = court.status === "CLOSED";
                return (
                  <tr key={court.courtId}>
                    <td>{court.name}</td>
                    <td>{courtTypeLabels[court.courtType]}</td>
                    <td>{getPriceLabel(court.courtType, false)}</td>
                    <td>{getPriceLabel(court.courtType, true)}</td>
                    <td>
                      <span className={`court-status ${status.className}`}>{status.label}</span>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button type="button"
                          aria-label={`Xóa ${court.name}`}
                          onClick={() => openDeleteDialog(court)}
                          className="admin-action-button admin-action-button--delete">
                          Xóa
                        </button>
                        <button type="button" aria-label={`Sửa ${court.name}`}
                          className="admin-action-button" onClick={() => openCourtForm(court)}>
                          Sửa
                        </button>
                        <button type="button"
                          aria-label={`${isClosed ? "Kích hoạt" : "Ẩn"} ${court.name}`}
                          className={`admin-action-button${isClosed ? " admin-action-button--activate" : ""}`}
                          onClick={() => handleChangeStatus(court, isClosed ? "ACTIVE" : "CLOSED")}>
                          {isClosed ? "Kích hoạt" : "Ẩn"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dialog riêng cho xác nhận xóa. onClose xóa lựa chọn cả khi bấm Escape. */}
        <dialog
          ref={deleteDialogRef}
          className="court-delete-dialog"
          aria-labelledby="court-delete-title"
          aria-describedby="court-delete-description"
          onClose={() => setCourtToDelete(null)}
        >
          <header className="court-delete-header">
            <CircleX className="court-delete-icon" size={56} strokeWidth={2.2} aria-hidden="true" />
            <div>
              <h2 id="court-delete-title">Xóa Sân</h2>
              <p id="court-delete-description">Bạn có chắc chắn muốn xóa sân này?</p>
            </div>
          </header>

          {courtToDelete && (
            <section className="court-delete-info" aria-labelledby="court-delete-info-title">
              <h3 id="court-delete-info-title">
                <FileText size={24} strokeWidth={1.5} aria-hidden="true" />
                Thông tin sân
              </h3>
              <div className="court-delete-card">
                <h4>{courtToDelete.name}</h4>
                <p className="court-delete-type">Loại: {courtTypeLabels[courtToDelete.courtType]}</p>
                <dl className="court-delete-prices">
                  <div>
                    <dt>Giá cơ bản:</dt>
                    <dd>{getPriceLabel(courtToDelete.courtType, false)}</dd>
                  </div>
                  <div>
                    <dt>Giá giờ cao điểm:</dt>
                    <dd>{getPriceLabel(courtToDelete.courtType, true)}</dd>
                  </div>
                </dl>
                <div className="court-delete-status">
                  <span>Trạng thái:</span>
                  <span className={`court-status ${statusStyles[courtToDelete.status].className}`}>
                    {statusStyles[courtToDelete.status].label}
                  </span>
                </div>
              </div>
            </section>
          )}

          <footer className="court-delete-actions">
            <button type="button" className="court-delete-confirm"
              disabled={!courtToDelete} onClick={handleDelete}>
              Xóa
            </button>
            <button ref={deleteCloseButtonRef} type="button" className="court-delete-close"
              onClick={() => deleteDialogRef.current.close()}>
              Đóng
            </button>
          </footer>
        </dialog>

        {/* Form dùng chung cho thêm/sửa; đóng dialog sẽ reset dữ liệu form. */}
        <dialog ref={dialogRef} aria-labelledby="court-form-title"
          aria-describedby="court-form-description"
          className="court-form-dialog" onClose={resetForm}>
          <form onSubmit={handleSubmit} noValidate className="court-form">
            <header className="court-form-header">
              <h2 id="court-form-title" className="court-form-title">
                {editingCourtId === null ? "Thêm sân mới" : "Sửa thông tin sân"}
              </h2>
              <p id="court-form-description" className="court-form-description">
                Nhập tên, chọn loại sân và trạng thái để {editingCourtId === null ? "thêm sân mới" : "cập nhật thông tin"}.
              </p>
            </header>

            <label htmlFor="court-name" className="court-form-field">
              Tên sân
              <input ref={nameInputRef} id="court-name" name="name" type="text"
                required value={form.name} placeholder="Ví dụ: Sân 04"
                className="court-form-input" aria-invalid={Boolean(formError)}
                aria-describedby={formError ? "court-form-error" : undefined}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                  setFormError("");
                }} />
            </label>

            <label htmlFor="court-type" className="court-form-field">
              Loại sân
              <select id="court-type" name="courtType" value={form.courtType}
                className="court-form-input" required
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, courtType: event.target.value }));
                  setFormError("");
                }}>
                {Object.entries(courtTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            {/* Thêm và sửa dùng chung lựa chọn trạng thái; chỉ lưu khi gửi form. */}
            <label htmlFor="court-status" className="court-form-field">
              Trạng thái
              <select id="court-status" name="status" value={form.status}
                className="court-form-input" required
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, status: event.target.value }));
                  setFormError("");
                }}>
                {Object.entries(statusStyles).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            {/* Giá chỉ hiển thị theo loại sân, không phải trường nhập của request thêm/sửa. */}
            <section className="court-form-price-note" aria-labelledby="court-form-price-title">
              <h3 id="court-form-price-title" className="court-form-price-title">Giá theo loại sân</h3>
              <dl className="court-form-prices">
                <div>
                  <dt>Giá cơ bản</dt>
                  <dd>{getPriceLabel(form.courtType, false)}</dd>
                </div>
                <div>
                  <dt>Giá giờ cao điểm</dt>
                  <dd>{getPriceLabel(form.courtType, true)}</dd>
                </div>
              </dl>
            </section>

            {formError && <p id="court-form-error" role="alert" className="court-form-error">{formError}</p>}

            {/* Nút riêng của popup có cùng kích thước, không dùng kích thước nút nhỏ trong bảng. */}
            <footer className="court-form-actions">
              <button type="button" className="court-form-button court-form-button--secondary"
                onClick={() => dialogRef.current.close()}>
                Đóng
              </button>
              <button type="submit" className="court-form-button court-form-button--primary">
                {editingCourtId === null ? "+ Thêm sân" : "Lưu thay đổi"}
              </button>
            </footer>
          </form>
        </dialog>
    </>
  );
}
