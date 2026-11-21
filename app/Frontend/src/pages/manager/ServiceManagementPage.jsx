import { useEffect, useMemo, useRef, useState } from "react";
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { serviceApi } from "../../api/serviceApi.js";

const emptyForm = { name: "", category: "DRINK", unitPrice: "" };

const categoryLabels = {
  DRINK: "Đồ uống",
  RACKET_RENTAL: "Thuê vợt",
  OTHER: "Khác",
};

const formatPrice = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export default function ServiceManagementPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const dialogRef = useRef(null);
  const deleteDialogRef = useRef(null);
  const [deletingService, setDeletingService] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;
    serviceApi.getAllServices()
      .then((data) => { if (active) { setServices(data); setLoadError(""); } })
      .catch((error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const reloadServices = async () => {
    setLoading(true);
    setLoadError("");
    try {
      setServices(await serviceApi.getAllServices());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("vi-VN");
    return services.filter((service) => {
      const matchesName = service.name.toLocaleLowerCase("vi-VN").includes(normalizedSearch);
      const matchesCategory = categoryFilter === "ALL" || service.category === categoryFilter;
      return matchesName && matchesCategory;
    });
  }, [services, search, categoryFilter]);

  const availableCount = services.filter((service) => service.status === "ACTIVE").length;
  const outOfStockCount = services.length - availableCount;

  // Dùng chung dialog cho thao tác thêm mới và chỉnh sửa dịch vụ.
  const openForm = (service = null) => {
    setEditingService(service);
    setForm(service
      ? { name: service.name, category: service.category, unitPrice: String(service.unitPrice) }
      : emptyForm);
    setFormError("");
    setActionError("");
    dialogRef.current?.showModal();
  };

  const saveService = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const priceText = form.unitPrice.trim();
    const unitPrice = Number(priceText);

    if (!name || name.length > 100) {
      setFormError("Tên dịch vụ phải có từ 1 đến 100 ký tự.");
      return;
    }
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(priceText) || !Number.isFinite(unitPrice)) {
      setFormError("Giá phải không âm, tối đa 10 chữ số phần nguyên và 2 chữ số thập phân.");
      return;
    }

    setBusy(true);
    setFormError("");
    try {
      const payload = { name, category: form.category, unitPrice };
      if (editingService) {
        const updated = await serviceApi.updateService(editingService.serviceId, payload);
        setServices((items) => items.map((item) => item.serviceId === updated.serviceId ? updated : item));
        setNotice(`Đã cập nhật dịch vụ ${updated.name}.`);
      } else {
        const created = await serviceApi.createService(payload);
        setServices((items) => [...items, created]);
        setNotice(`Đã thêm dịch vụ ${created.name}.`);
      }
      dialogRef.current?.close();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleAvailability = async (service) => {
    const nextStatus = service.status === "ACTIVE" ? "OUT_OF_STOCK" : "ACTIVE";
    setBusy(true);
    setActionError("");
    try {
      const updated = await serviceApi.setServiceStatus(service.serviceId, nextStatus);
      setServices((items) => items.map((item) => item.serviceId === updated.serviceId ? updated : item));
      setNotice(nextStatus === "ACTIVE" ? `Đã mở bán ${service.name}.` : `Đã đánh dấu ${service.name} hết hàng.`);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const openDeleteDialog = (service) => {
    setDeletingService(service);
    setDeleteError("");
    setActionError("");
    deleteDialogRef.current?.showModal();
  };

  const deleteService = async () => {
    if (!deletingService || busy) return;
    setBusy(true);
    setDeleteError("");
    try {
      await serviceApi.deleteService(deletingService.serviceId);
      setServices((items) => items.filter((item) => item.serviceId !== deletingService.serviceId));
      setNotice(`Đã xóa dịch vụ ${deletingService.name}.`);
      deleteDialogRef.current?.close();
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="service-page" aria-labelledby="service-page-title">
      <header className="admin-page-header service-page-header">
        <div>
          <h1 id="service-page-title" className="admin-page-title">Quản lý dịch vụ</h1>
          <p className="admin-page-description">Cập nhật dịch vụ đi kèm và tình trạng kinh doanh.</p>
        </div>
        <button type="button" className="admin-primary-button service-add-button" onClick={() => openForm()} disabled={busy || loading}>
          <Plus size={19} aria-hidden="true" /> Thêm dịch vụ
        </button>
      </header>

      {notice && <p className="service-notice" role="status">{notice}</p>}
      {actionError && <p className="service-form-error" role="alert">{actionError}</p>}
      {loadError && <p className="service-form-error" role="alert">{loadError} <button type="button" onClick={reloadServices}>Thử lại</button></p>}

      <div className="service-summary" aria-label="Tổng quan dịch vụ">
        <div className="service-summary-card">
          <span className="service-summary-icon service-summary-icon--total"><Package size={19} aria-hidden="true" /></span>
          <span><strong>{services.length}</strong><small>Tổng dịch vụ</small></span>
        </div>
        <div className="service-summary-card">
          <span className="service-status-dot service-status-dot--active" aria-hidden="true" />
          <span><strong>{availableCount}</strong><small>Đang kinh doanh</small></span>
        </div>
        <div className="service-summary-card">
          <span className="service-status-dot service-status-dot--empty" aria-hidden="true" />
          <span><strong>{outOfStockCount}</strong><small>Hết hàng</small></span>
        </div>
      </div>

      <div className="service-toolbar">
        <label className="service-search" htmlFor="service-search">
          <Search size={18} aria-hidden="true" />
          <input id="service-search" type="search" value={search} placeholder="Tìm tên dịch vụ..."
            onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label className="service-category-filter" htmlFor="service-category-filter">
          <span>Danh mục</span>
          <select id="service-category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="ALL">Tất cả</option>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="admin-table-wrapper service-table-wrapper">
        <table className="admin-table service-table" aria-label="Danh sách dịch vụ">
          <thead>
            <tr>
              <th scope="col">Tên dịch vụ</th>
              <th scope="col">Danh mục</th>
              <th scope="col">Đơn giá</th>
              <th scope="col">Tình trạng</th>
              <th scope="col"><span className="admin-visually-hidden">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="service-empty">Đang tải dịch vụ…</td></tr>}
            {!loading && filteredServices.map((service) => {
              const isAvailable = service.status === "ACTIVE";
              return (
                <tr key={service.serviceId}>
                  <td className="service-name-cell">
                    <span className="service-product-icon" aria-hidden="true"><Package size={17} /></span>
                    <strong>{service.name}</strong>
                  </td>
                  <td><span className="service-category-tag">{categoryLabels[service.category] ?? "Khác"}</span></td>
                  <td className="service-price-cell">{formatPrice.format(service.unitPrice)}</td>
                  <td>
                    <span className={`service-status ${isAvailable ? "service-status--active" : "service-status--empty"}`}>
                      <span className="service-status-dot" aria-hidden="true" />
                      {isAvailable ? "Còn hàng" : "Hết hàng"}
                    </span>
                  </td>
                  <td>
                    <div className="service-row-actions">
                      <button type="button" className="service-edit-button" onClick={() => openForm(service)} disabled={busy}>
                        <Pencil size={15} aria-hidden="true" /> Sửa
                      </button>
                      <button type="button" className="service-delete-button" onClick={() => openDeleteDialog(service)} disabled={busy}
                        aria-label={`Xóa dịch vụ ${service.name}`}>
                        <Trash2 size={15} aria-hidden="true" /> Xóa
                      </button>
                      <button type="button" className={`service-stock-button${isAvailable ? " service-stock-button--empty" : " service-stock-button--active"}`}
                        onClick={() => toggleAvailability(service)} disabled={busy}>
                        {isAvailable ? "Đánh dấu hết" : "Mở bán"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filteredServices.length === 0 && (
              <tr><td colSpan={5} className="service-empty">{loadError ? "Không tải được danh sách dịch vụ." : "Không tìm thấy dịch vụ phù hợp."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <dialog ref={dialogRef} className="service-dialog" aria-labelledby="service-dialog-title"
        onCancel={(event) => { if (busy) event.preventDefault(); }}
        onClose={() => { setEditingService(null); setForm(emptyForm); setFormError(""); }}>
        <form className="service-form" onSubmit={saveService} noValidate>
          <div className="service-dialog-heading">
            <span className="service-dialog-icon"><Package size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="service-dialog-title">{editingService ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ mới"}</h2>
              <p>Nhập thông tin dịch vụ để hiển thị trong danh mục.</p>
            </div>
          </div>

          <label className="service-form-field" htmlFor="service-name">
            Tên dịch vụ
            <input id="service-name" autoFocus maxLength={100} value={form.name} placeholder="Ví dụ: Nước suối" disabled={busy}
              onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setFormError(""); }} />
          </label>

          <div className="service-form-grid">
            <label className="service-form-field" htmlFor="service-category">
              Danh mục
              <select id="service-category" value={form.category} disabled={busy}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="service-form-field" htmlFor="service-price">
              Đơn giá (₫)
              <input id="service-price" type="number" min="0" step="0.01" inputMode="decimal" value={form.unitPrice} disabled={busy}
                placeholder="0" onChange={(event) => { setForm((current) => ({ ...current, unitPrice: event.target.value })); setFormError(""); }} />
            </label>
          </div>

          {formError && <p className="service-form-error" role="alert">{formError}</p>}
          <footer className="service-form-actions">
            <button type="button" className="service-form-button service-form-button--secondary" onClick={() => dialogRef.current?.close()} disabled={busy}>Hủy</button>
            <button type="submit" className="service-form-button service-form-button--primary" disabled={busy}>
              {editingService ? "Lưu thay đổi" : "Thêm dịch vụ"}
            </button>
          </footer>
        </form>
      </dialog>
      <dialog ref={deleteDialogRef} className="service-dialog" aria-labelledby="service-delete-title"
        onCancel={(event) => { if (busy) event.preventDefault(); }}
        onClose={() => { setDeletingService(null); setDeleteError(""); }}>
        <div className="service-form">
          <h2 id="service-delete-title">Xóa dịch vụ?</h2>
          <p>Dịch vụ <strong>{deletingService?.name}</strong> sẽ không còn trong danh mục để thêm mới vào booking. Các booking đã có dịch vụ này vẫn giữ nguyên thông tin.</p>
          {deleteError && <p className="service-form-error" role="alert">{deleteError}</p>}
          <div className="service-form-actions">
            <button type="button" className="service-form-button service-form-button--secondary" onClick={() => deleteDialogRef.current?.close()} disabled={busy}>Giữ lại</button>
            <button type="button" className="service-form-button service-delete-confirm" onClick={deleteService} disabled={busy}>Xóa dịch vụ</button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
