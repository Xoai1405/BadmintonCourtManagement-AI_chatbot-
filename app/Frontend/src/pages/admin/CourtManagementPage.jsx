import { useRef, useState } from "react";
import { CircleX, FileText } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import "../../components/layout/AdminLayout.css";
import { adminApi } from "../../api/adminApi.js";
import { courtTypeCodes } from "../../mocks/apiContract.js";

// Sân dùng chung tên loại bằng tiếng Việt với dữ liệu khách hàng.
const courtTypeLabels = {
  "Sân tiêu chuẩn ngoài trời": "Tiêu chuẩn ngoài trời",
  "Sân tiêu chuẩn trong nhà": "Tiêu chuẩn trong nhà",
  "Sân VIP trong nhà": "VIP trong nhà",
};

// Trạng thái dùng tiếng Việt như dữ liệu sân chung.
const statusStyles = {
  "Hoạt động": { label: "Hoạt động", className: "court-status--active" },
  "Bảo trì": { label: "Bảo trì", className: "court-status--maintenance" },
  "Đóng": { label: "Đóng", className: "court-status--closed" },
};

const priceFormatter = new Intl.NumberFormat("vi-VN");

// V3 có đúng một cấu hình giá cho mỗi loại sân.
function getPrices(priceConfigs, courtType, isPeakHour) {
  const config = priceConfigs.find(
    (item) => item.courtType === courtTypeCodes[courtType],
  );
  if (!config) return [];
  return [isPeakHour ? config.pricePeakHour : config.priceNormalHour];
}

// Hiển thị đủ các mức giá tìm được, hoặc thông báo khi chưa cấu hình giá.
function formatPriceLabel(priceConfigs, courtType, isPeakHour) {
  const prices = getPrices(priceConfigs, courtType, isPeakHour);
  if (!prices.length) return "Chưa có giá";
  return `${prices.map((price) => priceFormatter.format(price)).join(" / ")}đ/Giờ`;
}

export default function CourtManagementPage() {
  // Chỉ cập nhật bảng sau khi mock API hoàn tất; dữ liệu chưa lưu vào database.
  const { courts, setCourts, priceConfigs } = useOutletContext();
  const [isPending, setIsPending] = useState(false);
  const [requestError, setRequestError] = useState("");
  const getPriceLabel = (courtType, isPeakHour) => formatPriceLabel(priceConfigs, courtType, isPeakHour);
  // null: đang thêm sân; có id: đang sửa sân tương ứng.
  const [editingCourtId, setEditingCourtId] = useState(null);
  // Khi thêm sân, mặc định Hoạt động; khi sửa sẽ lấy trạng thái hiện tại của sân.
  const [form, setForm] = useState({
    name: "", type: "Sân tiêu chuẩn ngoài trời", status: "Hoạt động",
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
    setRequestError("");
    setEditingCourtId(court?.id ?? null);
    setForm({
      name: court?.name ?? "",
      type: court?.type ?? "Sân tiêu chuẩn ngoài trời",
      status: court?.status ?? "Hoạt động",
    });
    setFormError("");
    dialogRef.current.showModal();
    nameInputRef.current.focus();
  };

  // onClose gọi hàm này khi lưu, bấm Đóng hoặc đóng dialog bằng phím Escape.
  const resetForm = () => {
    setEditingCourtId(null);
    setForm({ name: "", type: "Sân tiêu chuẩn ngoài trời", status: "Hoạt động" });
    setFormError("");
  };

  // Kiểm tra form trước khi mô phỏng thao tác thêm/sửa dữ liệu.
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isPending) return;
    const name = form.name.trim();

    if (!name) {
      setFormError("Vui lòng nhập tên sân.");
      nameInputRef.current.focus();
      return;
    }
    if (!Object.hasOwn(courtTypeLabels, form.type)) {
      setFormError("Vui lòng chọn loại sân hợp lệ.");
      return;
    }
    if (!Object.hasOwn(statusStyles, form.status)) {
      setFormError("Vui lòng chọn trạng thái hợp lệ.");
      return;
    }

    // Mock API tự cấp ID khi thêm và giữ ảnh/mô tả khi sửa sân.
    setIsPending(true);
    setRequestError("");
    try {
      const input = { name, type: form.type, status: form.status };
      const savedCourt = editingCourtId === null
        ? await adminApi.createCourt(input)
        : await adminApi.updateCourt(editingCourtId, input);
      setCourts((previous) => editingCourtId === null
        ? [...previous, savedCourt]
        : previous.map((court) => court.id === savedCourt.id ? savedCourt : court)
      );
      setNotice(`Đã ${editingCourtId === null ? "thêm" : "cập nhật"} ${name}.`);
      dialogRef.current.close();
    } catch (error) {
      // Giữ popup mở để người dùng sửa lại khi request thất bại.
      setFormError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  // Chọn sân rồi mở dialog thông tin. Ưu tiên focus nút Đóng để tránh xóa nhầm.
  const openDeleteDialog = (court) => {
    setRequestError("");
    setCourtToDelete(court);
    deleteDialogRef.current.showModal();
    deleteCloseButtonRef.current.focus();
  };

  // Chỉ xóa khỏi bảng sau khi mock API xác nhận thành công.
  const handleDelete = async () => {
    if (!courtToDelete || isPending) return;
    setIsPending(true);
    setRequestError("");
    try {
      await adminApi.deleteCourt(courtToDelete.id);
      setCourts((previous) => previous.filter((court) => court.id !== courtToDelete.id));
      setNotice(`Đã xóa ${courtToDelete.name}.`);
      deleteDialogRef.current.close();
      // Đợi nút hết disabled rồi trả focus về nút còn tồn tại trong trang.
      requestAnimationFrame(() => addCourtButtonRef.current?.focus());
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  // Gọi thao tác đổi trạng thái riêng: ẩn = Đóng, kích hoạt = Hoạt động.
  const handleChangeStatus = async (court, newStatus) => {
    if (isPending) return;
    setIsPending(true);
    setRequestError("");
    try {
      const updatedCourt = await adminApi.changeCourtStatus(court.id, newStatus);
      setCourts((previous) => previous.map((item) => item.id === court.id ? updatedCourt : item));
      setNotice(newStatus === "Đóng" ? `Đã ẩn ${court.name}.` : `Đã kích hoạt ${court.name}.`);
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setIsPending(false);
    }
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
          <button disabled={isPending} ref={addCourtButtonRef} type="button" className="admin-primary-button"
            onClick={() => openCourtForm()}>
            + Thêm sân
          </button>
        </header>

        {/* Phản hồi sau thao tác; role="status" giúp trình đọc màn hình thông báo. */}
        <p role="status" className="admin-notice">
          {notice}
        </p>

        {requestError && <p role="alert" className="court-form-error">{requestError}</p>}

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
                const isClosed = court.status === "Đóng";
                return (
                  <tr key={court.id}>
                    <td>{court.name}</td>
                    <td>{courtTypeLabels[court.type]}</td>
                    <td>{getPriceLabel(court.type, false)}</td>
                    <td>{getPriceLabel(court.type, true)}</td>
                    <td>
                      <span className={`court-status ${status.className}`}>{status.label}</span>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button disabled={isPending} type="button"
                          aria-label={`Xóa ${court.name}`}
                          onClick={() => openDeleteDialog(court)}
                          className="admin-action-button admin-action-button--delete">
                          Xóa
                        </button>
                        <button disabled={isPending} type="button" aria-label={`Sửa ${court.name}`}
                          className="admin-action-button" onClick={() => openCourtForm(court)}>
                          Sửa
                        </button>
                        <button disabled={isPending} type="button"
                          aria-label={`${isClosed ? "Kích hoạt" : "Ẩn"} ${court.name}`}
                          className={`admin-action-button${isClosed ? " admin-action-button--activate" : ""}`}
                          onClick={() => handleChangeStatus(court, isClosed ? "Hoạt động" : "Đóng")}>
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
                <p className="court-delete-type">Loại: {courtTypeLabels[courtToDelete.type]}</p>
                <dl className="court-delete-prices">
                  <div>
                    <dt>Giá cơ bản:</dt>
                    <dd>{getPriceLabel(courtToDelete.type, false)}</dd>
                  </div>
                  <div>
                    <dt>Giá giờ cao điểm:</dt>
                    <dd>{getPriceLabel(courtToDelete.type, true)}</dd>
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

          {requestError && <p role="alert" className="court-form-error">{requestError}</p>}
          <footer className="court-delete-actions">
            <button disabled={isPending || !courtToDelete} type="button" className="court-delete-confirm"
              aria-busy={isPending} onClick={handleDelete}>
              Xóa
            </button>
            <button disabled={isPending} ref={deleteCloseButtonRef} type="button" className="court-delete-close"
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
              <select id="court-type" name="type" value={form.type}
                className="court-form-input" required
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, type: event.target.value }));
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
                  <dd>{getPriceLabel(form.type, false)}</dd>
                </div>
                <div>
                  <dt>Giá giờ cao điểm</dt>
                  <dd>{getPriceLabel(form.type, true)}</dd>
                </div>
              </dl>
            </section>

            {formError && <p id="court-form-error" role="alert" className="court-form-error">{formError}</p>}

            {/* Nút riêng của popup có cùng kích thước, không dùng kích thước nút nhỏ trong bảng. */}
            <footer className="court-form-actions">
              <button disabled={isPending} type="button" className="court-form-button court-form-button--secondary"
                onClick={() => dialogRef.current.close()}>
                Đóng
              </button>
              <button disabled={isPending} type="submit" className="court-form-button court-form-button--primary">
                {editingCourtId === null ? "+ Thêm sân" : "Lưu thay đổi"}
              </button>
            </footer>
          </form>
        </dialog>
    </>
  );
}
