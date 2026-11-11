
import { useEffect, useRef, useState } from "react";
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

const emptyForm = {
  name: "",
  description: "",
  courtType: "STANDARD_OUTDOOR",
  status: "ACTIVE",
};

const currency = new Intl.NumberFormat("vi-VN");
const DEFAULT_IMAGE = "/images/default-court.webp";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function priceLabel(price) {
  return price == null ? "Chưa có giá" : `${currency.format(price)}đ/Giờ`;
}

export default function CourtManagementPage() {
  const { courts, setCourts } = useOutletContext();

  // Court information dialog
  const [editingCourtId, setEditingCourtId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPending, setIsPending] = useState(false);

  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);
  const courtDescriptionRef = useRef(null);
  const addCourtButtonRef = useRef(null);

  // Court image dialog
  const [imageCourt, setImageCourt] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [imagePending, setImagePending] = useState(false);

  const imageDialogRef = useRef(null);
  const imageInputRef = useRef(null);

  // Create and revoke preview URL
  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(selectedImage);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  // Court information handlers
  const openCourtForm = (court = null) => {
    setRequestError("");
    setFormError("");
    setEditingCourtId(court?.id ?? null);

    setForm(
      court
        ? {
            name: court.name ?? "",
            description: court.description ?? "",
            courtType: court.courtType ?? "STANDARD_OUTDOOR",
            status: court.status ?? "ACTIVE",
          }
        : emptyForm
    );

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
      const payload = {
        name,
        description: form.description.trim(),
        courtType: form.courtType,
        status: form.status,
      };

      const savedCourt =
        editingCourtId === null
          ? await courtApi.createCourt(payload)
          : await courtApi.updateCourt(editingCourtId, payload);

      setCourts((previous) =>
        editingCourtId === null
          ? [...previous, savedCourt]
          : previous.map((court) =>
              court.id === savedCourt.id ? savedCourt : court
            )
      );

      setNotice(
        `Đã ${editingCourtId === null ? "thêm" : "cập nhật"} ${savedCourt.name}.`
      );

      dialogRef.current?.close();
    } catch (error) {
      setFormError(error.message || "Không thể lưu thông tin sân.");
    } finally {
      setIsPending(false);
    }
  };

  // Court image handlers
  const openImageDialog = (court) => {
    setImageCourt(court);
    setSelectedImage(null);
    setImageError("");
    setNotice("");

    imageDialogRef.current?.showModal();
  };

  const resetImageDialog = () => {
    setImageCourt(null);
    setSelectedImage(null);
    setImageError("");
    imagePending && setImagePending(false);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setImageError("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.");
      setSelectedImage(null);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Dung lượng ảnh không được vượt quá 5MB.");
      setSelectedImage(null);
      event.target.value = "";
      return;
    }

    setImageError("");
    setSelectedImage(file);
  };

  const handleUploadImage = async () => {
    if (!imageCourt || !selectedImage || imagePending) return;

    setImagePending(true);
    setImageError("");

    try {
      const updatedCourt = await courtApi.uploadCourtImage(
        imageCourt.id,
        selectedImage
      );

      setCourts((previous) =>
        previous.map((court) =>
          court.id === updatedCourt.id ? updatedCourt : court
        )
      );

      setImageCourt(updatedCourt);
      setSelectedImage(null);
      setNotice(`Đã cập nhật ảnh cho ${updatedCourt.name}.`);

    } catch (error) {
      setImageError(error.message || "Không thể cập nhật ảnh sân.");
    } finally {
      setImagePending(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageCourt || imagePending) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa ảnh của ${imageCourt.name}?`
    );

    if (!confirmed) return;

    setImagePending(true);
    setImageError("");

    try {
      const updatedCourt = await courtApi.deleteCourtImage(
        imageCourt.id
      );

      setCourts((previous) =>
        previous.map((court) =>
          court.id === updatedCourt.id ? updatedCourt : court
        )
      );

      setImageCourt(updatedCourt);
      setSelectedImage(null);
      setNotice(`Đã xóa ảnh của ${updatedCourt.name}.`);

    } catch (error) {
      setImageError(error.message || "Không thể xóa ảnh sân.");
    } finally {
      setImagePending(false);
    }
  };

  return (
    <div className="court-management-page">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý sân</h1>
          <p className="admin-page-description">
            Quản lý thông tin, hình ảnh và trạng thái vận hành của từng sân
          </p>
        </div>

        <button
          ref={addCourtButtonRef}
          disabled={isPending}
          type="button"
          className="admin-primary-button"
          onClick={() => openCourtForm()}
        >
          + Thêm sân
        </button>
      </header>

      <p role="status" className="admin-notice">
        {notice}
      </p>

      {requestError && (
        <p role="alert" className="court-form-error">
          {requestError}
        </p>
      )}

      {/* Court table */}
      <div className="admin-table-wrapper">
        <table className="admin-table court-table">
          <thead>
            <tr>
              <th scope="col">Tên sân</th>
              <th scope="col">Ảnh sân</th>
              <th scope="col">Loại</th>
              <th scope="col">Giá cơ bản</th>
              <th scope="col">Giá giờ cao điểm</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">
                <span className="admin-visually-hidden">
                  Thao tác
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {courts.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  Chưa có sân. Chọn “Thêm sân” để tạo sân mới.
                </td>
              </tr>
            ) : (
              courts.map((court) => {
                const status = statuses[court.status] ?? {
                  label: court.status,
                  className: "",
                };

                return (
                  <tr key={court.id}>
                    <td>{court.name}</td>

                    <td>
                      <img
                        src={court.imageUrl || DEFAULT_IMAGE}
                        alt={`Ảnh ${court.name}`}
                        className="court-management-thumbnail"
                      />
                    </td>

                    <td>
                      {courtTypes[court.courtType] ?? court.courtType}
                    </td>

                    <td>{priceLabel(court.priceNormalHour)}</td>

                    <td>{priceLabel(court.pricePeakHour)}</td>

                    <td>
                      <span className={`court-status ${status.className}`}>
                        {status.label}
                      </span>
                    </td>

                    <td>
                      <div className="admin-table-actions">
                        <button
                          disabled={isPending || imagePending}
                          type="button"
                          className="admin-action-button"
                          onClick={() => openCourtForm(court)}
                        >
                          Sửa
                        </button>

                        <button
                          disabled={isPending || imagePending}
                          type="button"
                          className="admin-action-button"
                          onClick={() => openImageDialog(court)}
                        >
                          Quản lý ảnh
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit court dialog */}
      <dialog
        ref={dialogRef}
        aria-labelledby="court-form-title"
        aria-describedby="court-form-description"
        className="court-form-dialog"
        onClose={resetForm}
      >
        <form onSubmit={handleSubmit} noValidate className="court-form">
          <header className="court-form-header">
            <h2 id="court-form-title" className="court-form-title">
              {editingCourtId === null ? "Thêm sân mới" : "Sửa thông tin sân"}
            </h2>

            <p
              id="court-form-description"
              className="court-form-description"
            >
              Nhập tên, chọn loại sân và trạng thái để{" "}
              {editingCourtId === null
                ? "thêm sân mới"
                : "cập nhật thông tin"}.
            </p>
          </header>

          <label htmlFor="court-name" className="court-form-field">
            Tên sân
            <input
              ref={nameInputRef}
              id="court-name"
              name="name"
              type="text"
              required
              value={form.name}
              placeholder="Ví dụ: Sân 04"
              className="court-form-input"
              aria-invalid={Boolean(formError)}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }));
                setFormError("");
              }}
            />
          </label>

          <label htmlFor="court-description" className="court-form-field">
    Mô tả sân
    <textarea
        id="court-description"
        name="description"
        value={form.description}
        placeholder="Ví dụ: Sân rộng rãi, thoáng mát, có hệ thống chiếu sáng..."
        className="court-form-input"
        rows={3}
        onChange={(event) => {
            setForm((current) => ({
                ...current,
                description: event.target.value,
            }));
        }}
    />
</label>

          <label htmlFor="court-type" className="court-form-field">
            Loại sân
            <select
              id="court-type"
              name="courtType"
              value={form.courtType}
              className="court-form-input"
              required
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  courtType: event.target.value,
                }))
              }
            >
              {Object.entries(courtTypes).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="court-status" className="court-form-field">
            Trạng thái
            <select
              id="court-status"
              name="status"
              value={form.status}
              className="court-form-input"
              required
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              {Object.entries(statuses).map(([value, { label }]) => (
                <option
                  key={value}
                  value={value}
                  disabled={value !== "ACTIVE"}
                >
                  {label}
                </option>
              ))}
            </select>
          </label>

          {formError && (
            <p role="alert" className="court-form-error">
              {formError}
            </p>
          )}

          <footer className="court-form-actions">
            <button
              disabled={isPending}
              type="button"
              className="court-form-button court-form-button--secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Đóng
            </button>

            <button
              disabled={isPending}
              type="submit"
              className="court-form-button court-form-button--primary"
            >
              {isPending
                ? "Đang lưu..."
                : editingCourtId === null
                  ? "+ Thêm sân"
                  : "Lưu thay đổi"}
            </button>
          </footer>
        </form>
      </dialog>

      {/* Court image management dialog */}
      <dialog
        ref={imageDialogRef}
        className="court-image-dialog"
        aria-labelledby="court-image-title"
        onClose={resetImageDialog}
      >
        {imageCourt && (
          <div className="court-image-content">
            <header className="court-image-header">
              <div>
                <h2 id="court-image-title">
                  Quản lý ảnh sân
                </h2>
                <p>{imageCourt.name}</p>
              </div>

              <button
                type="button"
                className="court-image-close"
                aria-label="Đóng"
                onClick={() => imageDialogRef.current?.close()}
              >
                ×
              </button>
            </header>

            <div className="court-image-preview">
              <img
                src={
                  previewUrl ||
                  imageCourt.imageUrl ||
                  DEFAULT_IMAGE
                }
                alt="Ảnh xem trước sân"
              />
              <span>
                {selectedImage
                  ? "Ảnh mới được chọn"
                  : imageCourt.imageUrl
                    ? "Ảnh hiện tại"
                    : "Chưa có ảnh"}
              </span>
            </div>

            <div className="court-image-picker">
              <input
                ref={imageInputRef}
                id="court-image-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handleImageChange}
              />

              <button
                type="button"
                className="court-image-select-button"
                disabled={imagePending}
                onClick={() => imageInputRef.current?.click()}
              >
                Chọn ảnh từ máy tính
              </button>

              <p>
                Hỗ trợ JPG, PNG, WEBP. Dung lượng tối đa 5MB.
              </p>

              {selectedImage && (
                <p className="court-image-file-name">
                  {selectedImage.name}
                </p>
              )}
            </div>

            {imageError && (
              <p role="alert" className="court-form-error">
                {imageError}
              </p>
            )}

            <footer className="court-image-actions">
              <button
                type="button"
                className="court-form-button court-form-button--secondary"
                disabled={imagePending}
                onClick={() => imageDialogRef.current?.close()}
              >
                Đóng
              </button>

              {imageCourt.imageUrl && (
                <button
                  type="button"
                  className="court-image-delete-button"
                  disabled={imagePending}
                  onClick={handleDeleteImage}
                >
                  Xóa ảnh
                </button>
              )}

              <button
                type="button"
                className="court-form-button court-form-button--primary"
                disabled={!selectedImage || imagePending}
                onClick={handleUploadImage}
              >
                {imagePending
                  ? "Đang xử lý..."
                  : "Cập nhật ảnh"}
              </button>
            </footer>
          </div>
        )}
      </dialog>
    </div>
  );
}
