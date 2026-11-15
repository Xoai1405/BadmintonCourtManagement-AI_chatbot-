import { useEffect, useRef, useState } from "react";
import { adminApi } from "../../api/adminApi.js";

const emptyForm = { minMonths: "", discountPercent: "" };

export default function DiscountManagementPage() {
  const [discounts, setDiscounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    adminApi.getDiscountConfigs()
      .then((items) => { if (!cancelled) setDiscounts(items); })
      .catch((error) => { if (!cancelled) setRequestError(error.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const sortedDiscounts = [...discounts].sort((a, b) => a.minMonths - b.minMonths);

  const openCreateForm = () => {
    setEditingDiscount(null);
    setForm(emptyForm);
    setFormError("");
    dialogRef.current?.showModal();
  };

  const openEditForm = (discount) => {
    setEditingDiscount(discount);
    setForm({ minMonths: String(discount.minMonths), discountPercent: String(discount.discountPercent) });
    setFormError("");
    dialogRef.current?.showModal();
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  };

  const saveDiscount = async (event) => {
    event.preventDefault();
    const minMonths = Number(form.minMonths);
    const discountPercent = Number(form.discountPercent);
    if (!form.minMonths.trim() || !Number.isInteger(minMonths) || minMonths < 1) {
      setFormError("Số tháng tối thiểu phải là số nguyên từ 1 trở lên.");
      return;
    }
    if (!form.discountPercent.trim() || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      setFormError("Phần trăm chiết khấu phải từ 0% đến 100%.");
      return;
    }

    setIsPending(true);
    setFormError("");
    setRequestError("");
    setNotice("");
    try {
      const payload = {
        minMonths,
        discountPercent,
        status: editingDiscount?.status ?? "ACTIVE",
      };
      const saved = editingDiscount
        ? await adminApi.updateDiscountConfig(editingDiscount.id, payload)
        : await adminApi.createDiscountConfig(payload);
      setDiscounts((items) => editingDiscount
        ? items.map((item) => item.id === saved.id ? saved : item)
        : [...items, saved]);
      setNotice(editingDiscount ? "Đã cập nhật mức chiết khấu." : "Đã thêm mức chiết khấu.");
      dialogRef.current?.close();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  const deleteDiscount = async (discount) => {
    if (isPending || !window.confirm(`Xóa mức chiết khấu từ ${discount.minMonths} tháng?`)) return;
    setIsPending(true);
    setRequestError("");
    setNotice("");
    try {
      await adminApi.deleteDiscountConfig(discount.id);
      setDiscounts((items) => items.filter((item) => item.id !== discount.id));
      setNotice("Đã xóa mức chiết khấu.");
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  const toggleDiscount = async (discount) => {
    if (isPending) return;
    setIsPending(true);
    setRequestError("");
    setNotice("");
    const status = discount.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const updated = await adminApi.updateDiscountConfig(discount.id, { ...discount, status });
      setDiscounts((items) => items.map((item) => item.id === updated.id ? updated : item));
      setNotice(status === "ACTIVE" ? "Đã mở khóa mức chiết khấu." : "Đã khóa mức chiết khấu.");
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="discount-page" aria-labelledby="discount-page-title">
      <header className="admin-page-header discount-page-header">
        <div>
          <h1 id="discount-page-title" className="admin-page-title">Cấu hình chiết khấu lịch cố định</h1>
          <p className="admin-page-description">Áp dụng theo độ dài chu kỳ đăng ký</p>
        </div>
        <button disabled={isPending} type="button" className="admin-primary-button discount-add-button" onClick={openCreateForm}>
          <span aria-hidden="true">＋</span> Thêm mức chiết khấu
        </button>
      </header>

      {(notice || requestError) && (
        <p role={requestError ? "alert" : "status"} className={requestError ? "discount-alert discount-alert--error" : "discount-alert"}>
          {requestError || notice}
        </p>
      )}

      <div className="admin-table-wrapper discount-table-wrapper">
        <table className="admin-table discount-table" aria-label="Cấu hình chiết khấu lịch cố định">
          <thead>
            <tr>
              <th scope="col">Điều kiện</th>
              <th scope="col">% Chiết khấu</th>
              <th scope="col">Trạng thái</th>
              <th scope="col"><span className="admin-visually-hidden">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {sortedDiscounts.map((discount) => {
              const isActive = discount.status === "ACTIVE";
              return (
                <tr key={discount.id}>
                  <td><span className="discount-condition">≥ {discount.minMonths} tháng</span></td>
                  <td><span className="discount-percent-value">{Number(discount.discountPercent)}%</span></td>
                  <td>
                    <span className={`discount-status${isActive ? " discount-status--active" : " discount-status--locked"}`}>
                      <span aria-hidden="true" className="discount-status-dot" />{isActive ? "Active" : "Locked"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions discount-actions">
                      <button disabled={isPending} type="button" className="admin-action-button admin-action-button--delete"
                        aria-label={`Xóa mức chiết khấu từ ${discount.minMonths} tháng`} onClick={() => deleteDiscount(discount)}>
                        Xóa
                      </button>
                      <button disabled={isPending} type="button" className="admin-action-button discount-edit-button"
                        aria-label={`Sửa mức chiết khấu từ ${discount.minMonths} tháng`} onClick={() => openEditForm(discount)}>
                        Sửa
                      </button>
                      <button disabled={isPending} type="button"
                        className={`admin-action-button ${isActive ? "discount-lock-button" : "admin-action-button--activate"}`}
                        onClick={() => toggleDiscount(discount)}>
                        {isActive ? "Khóa" : "Mở khóa"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && sortedDiscounts.length === 0 && !requestError && (
              <tr><td colSpan={4} className="discount-empty">Chưa có mức chiết khấu. Hãy thêm mức đầu tiên.</td></tr>
            )}
            {isLoading && <tr><td colSpan={4} className="discount-empty" role="status">Đang tải mức chiết khấu…</td></tr>}
          </tbody>
        </table>
      </div>

      <dialog ref={dialogRef} className="discount-dialog" aria-labelledby="discount-form-title"
        onCancel={(event) => { if (isPending) event.preventDefault(); }}
        onClose={() => { setEditingDiscount(null); setForm(emptyForm); setFormError(""); }}>
        <form className="discount-form" onSubmit={saveDiscount} noValidate>
          <h2 id="discount-form-title">{editingDiscount ? "Sửa mức chiết khấu" : "Thêm mức chiết khấu"}</h2>
          <label className="discount-form-field" htmlFor="discount-min-months">
            Số tháng tối thiểu
            <input disabled={isPending} id="discount-min-months" type="number" min="1" step="1" required autoFocus
              value={form.minMonths} onChange={(event) => updateForm("minMonths", event.target.value)} />
          </label>
          <label className="discount-form-field" htmlFor="discount-percent">
            Phần trăm chiết khấu
            <div className="discount-percent-input">
              <input disabled={isPending} id="discount-percent" type="number" min="0" max="100" step="0.01" required
                value={form.discountPercent} onChange={(event) => updateForm("discountPercent", event.target.value)} />
              <span>%</span>
            </div>
          </label>
          {formError && <p role="alert" className="discount-form-error">{formError}</p>}
          <footer className="discount-dialog-actions">
            <button disabled={isPending} type="button" className="discount-dialog-button" onClick={() => dialogRef.current?.close()}>Đóng</button>
            <button disabled={isPending} type="submit" className="discount-dialog-button discount-dialog-button--primary">
              {isPending ? "Đang lưu…" : editingDiscount ? "Lưu thay đổi" : "Thêm mức"}
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
}
