import { useMemo, useRef, useState } from "react";
import { Package, Pencil, Plus, Search } from "lucide-react";
import { mockBookingServices } from "../../mocks/apiContract.js";

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
  // Khởi tạo từ fixture dùng cho luồng nhân viên; thay đổi hiện chỉ nằm trong state frontend.
  const [services, setServices] = useState(() => structuredClone(mockBookingServices));
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const dialogRef = useRef(null);

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
    dialogRef.current?.showModal();
  };

  const saveService = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const unitPrice = Number(form.unitPrice);

    if (!name) {
      setFormError("Vui lòng nhập tên dịch vụ.");
      return;
    }
    if (!form.unitPrice.trim() || !Number.isFinite(unitPrice) || unitPrice < 0) {
      setFormError("Giá dịch vụ phải là số không âm.");
      return;
    }

    if (editingService) {
      setServices((items) => items.map((item) => item.serviceId === editingService.serviceId
        ? { ...item, name, category: form.category, unitPrice }
        : item));
      setNotice(`Đã cập nhật dịch vụ ${name}.`);
    } else {
      // ID mới được tạo trong frontend để phục vụ màn demo, chưa ghi lên backend.
      const serviceId = Math.max(0, ...services.map((item) => item.serviceId)) + 1;
      setServices((items) => [...items, { serviceId, name, category: form.category, unitPrice, status: "ACTIVE" }]);
      setNotice(`Đã thêm dịch vụ ${name}.`);
    }

    dialogRef.current?.close();
  };

  const toggleAvailability = (service) => {
    const nextStatus = service.status === "ACTIVE" ? "OUT_OF_STOCK" : "ACTIVE";
    setServices((items) => items.map((item) => item.serviceId === service.serviceId
      ? { ...item, status: nextStatus }
      : item));
    setNotice(nextStatus === "ACTIVE" ? `Đã mở bán ${service.name}.` : `Đã đánh dấu ${service.name} hết hàng.`);
  };

  return (
    <section className="service-page" aria-labelledby="service-page-title">
      <header className="admin-page-header service-page-header">
        <div>
          <h1 id="service-page-title" className="admin-page-title">Quản lý dịch vụ</h1>
          <p className="admin-page-description">Cập nhật dịch vụ đi kèm và tình trạng kinh doanh.</p>
        </div>
        <button type="button" className="admin-primary-button service-add-button" onClick={() => openForm()}>
          <Plus size={19} aria-hidden="true" /> Thêm dịch vụ
        </button>
      </header>

      {notice && <p className="service-notice" role="status">{notice}</p>}

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
            {filteredServices.map((service) => {
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
                      <button type="button" className="service-edit-button" onClick={() => openForm(service)}>
                        <Pencil size={15} aria-hidden="true" /> Sửa
                      </button>
                      <button type="button" className={`service-stock-button${isAvailable ? " service-stock-button--empty" : " service-stock-button--active"}`}
                        onClick={() => toggleAvailability(service)}>
                        {isAvailable ? "Đánh dấu hết" : "Mở bán"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredServices.length === 0 && (
              <tr><td colSpan={5} className="service-empty">Không tìm thấy dịch vụ phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <dialog ref={dialogRef} className="service-dialog" aria-labelledby="service-dialog-title"
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
            <input id="service-name" autoFocus maxLength={100} value={form.name} placeholder="Ví dụ: Nước suối"
              onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setFormError(""); }} />
          </label>

          <div className="service-form-grid">
            <label className="service-form-field" htmlFor="service-category">
              Danh mục
              <select id="service-category" value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="service-form-field" htmlFor="service-price">
              Đơn giá (₫)
              <input id="service-price" type="number" min="0" step="1000" inputMode="numeric" value={form.unitPrice}
                placeholder="0" onChange={(event) => { setForm((current) => ({ ...current, unitPrice: event.target.value })); setFormError(""); }} />
            </label>
          </div>

          {formError && <p className="service-form-error" role="alert">{formError}</p>}
          <footer className="service-form-actions">
            <button type="button" className="service-form-button service-form-button--secondary" onClick={() => dialogRef.current?.close()}>Hủy</button>
            <button type="submit" className="service-form-button service-form-button--primary">
              {editingService ? "Lưu thay đổi" : "Thêm dịch vụ"}
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
}
