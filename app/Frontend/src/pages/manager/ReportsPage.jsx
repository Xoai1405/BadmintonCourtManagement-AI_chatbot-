import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Clock3,
  Coins,
  Info,
  PieChart,
  Store,
  Trophy,
  UsersRound,
} from "lucide-react";
import { mockReportData } from "../../mocks/apiContract.js";
import DateRangePicker from "../../components/booking/DateRangePicker.jsx";

const heatColor = (value) => {
  if (value >= 80) return "#087c4b";
  if (value >= 60) return "#20b878";
  if (value >= 40) return "#67d69f";
  if (value >= 20) return "#a8ebc8";
  return "#d9f5e6";
};

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function ReportCard({ icon: Icon, title, className = "", children }) {
  return (
    <section className={`report-card ${className}`}>
      <h2 className="report-card-title">
        <Icon size={20} strokeWidth={2.4} aria-hidden="true" />
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

function RevenueChart({ period }) {
  const { labels, values } = mockReportData.revenueByPeriod[period];
  const maxValue = Math.ceil(Math.max(...values) / 20) * 20;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 540 : 52 + (index * 488) / (values.length - 1);
    const y = 164 - (value / maxValue) * 132;
    return { x, y, value, label: labels[index] };
  });
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = `52,164 ${line} 540,164`;

  return (
    <div className="report-chart-wrap">
      <svg className="report-line-chart" viewBox="0 0 570 205" role="img" aria-label={`Doanh thu theo ${period.toLocaleLowerCase("vi-VN")}`}>
        <defs>
          <linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2db77a" stopOpacity=".23" />
            <stop offset="100%" stopColor="#2db77a" stopOpacity=".025" />
          </linearGradient>
        </defs>
        {[32, 65, 98, 131, 164].map((y, index) => (
          <g key={y}>
            <line x1="48" x2="550" y1={y} y2={y} className="report-chart-grid" />
            <text x="39" y={y + 4} textAnchor="end" className="report-chart-axis">{`${maxValue - index * (maxValue / 4)}M`}</text>
          </g>
        ))}
        <polygon points={area} fill="url(#revenue-area)" />
        <polyline points={line} fill="none" className="report-chart-line" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4.5" className="report-chart-point" />
            <text x={point.x} y="190" textAnchor="middle" className="report-chart-label">{point.label}</text>
          </g>
        ))}
      </svg>
      <div className="report-chart-caption">Đơn vị: triệu đồng</div>
    </div>
  );
}

export default function ReportsPage() {
  const { periods, kpis, bookingStatuses, revenueSources, occupancy, topCourts } = mockReportData;
  const { weekDays, timeSlots, values: heatmap } = mockReportData.heatmap;
  const [period, setPeriod] = useState("Tháng");
  const [startDate, setStartDate] = useState(mockReportData.defaultDateRange.start);
  const [endDate, setEndDate] = useState(mockReportData.defaultDateRange.end);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const totals = useMemo(() => bookingStatuses.reduce((sum, item) => sum + item.count, 0), []);
  const bookingGradient = useMemo(() => {
    let position = 0;
    return bookingStatuses.map((item) => {
      const next = position + (item.count / totals) * 100;
      const segment = `${item.color} ${position}% ${next}%`;
      position = next;
      return segment;
    }).join(", ");
  }, [totals]);
  const sourceTotal = revenueSources.reduce((sum, item) => sum + item.amount, 0);
  const sourceGradient = revenueSources.reduce((segments, item) => {
    const start = segments.position;
    const end = start + (item.amount / sourceTotal) * 100;
    segments.parts.push(`${item.color} ${start}% ${end}%`);
    segments.position = end;
    return segments;
  }, { parts: [], position: 0 }).parts.join(", ");
  const formatMoney = (amount) => `${amount.toLocaleString("vi-VN")} ₫`;
  const formatPercent = (value) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

  return (
    <section className="reports-page" aria-labelledby="reports-title">
      <header className="reports-header">
        <div>
          <h1 id="reports-title" className="admin-page-title">Báo cáo &amp; Thống kê</h1>
          <p className="admin-page-description">Tổng quan hoạt động đặt sân và kinh doanh của SmashFlow</p>
        </div>
        <div className="reports-controls">
          <DateRangePicker
            className="reports-date-picker"
            startDate={startDate}
            endDate={endDate}
            isOpen={isDatePickerOpen}
            onOpen={() => setIsDatePickerOpen(true)}
            onClose={() => setIsDatePickerOpen(false)}
            onChange={({ startDate: nextStartDate, endDate: nextEndDate }) => {
              setStartDate(nextStartDate);
              setEndDate(nextEndDate);
            }}
          />
        </div>
      </header>
      <div className="reports-date-summary" aria-live="polite">
        Khoảng thời gian: {formatDate(startDate)} – {formatDate(endDate)}
      </div>

      <div className="report-kpis" aria-label="Chỉ số tổng quan">
        <article className="report-kpi report-kpi--revenue">
          <span className="report-kpi-icon"><Coins size={22} aria-hidden="true" /></span>
          <div className="report-kpi-content"><span className="report-kpi-label">Tổng doanh thu</span><strong>{formatMoney(kpis.revenue)}</strong><small><b>↑ {formatPercent(kpis.revenueChangePercent)}</b> so với kỳ trước</small></div>
          <svg className="report-sparkline" viewBox="0 0 90 42" aria-hidden="true"><path d="M2 35 17 28 29 31 43 18 56 23 69 9 88 4" /></svg>
        </article>
        <article className="report-kpi report-kpi--bookings">
          <span className="report-kpi-icon"><CalendarDays size={22} aria-hidden="true" /></span>
          <div className="report-kpi-content"><span className="report-kpi-label">Tổng lượt đặt sân</span><strong>{kpis.bookingCount.toLocaleString("vi-VN")}</strong><small><b>↑ {formatPercent(kpis.bookingChangePercent)}</b> so với kỳ trước</small></div>
          <svg className="report-sparkline" viewBox="0 0 90 42" aria-hidden="true"><path d="M2 35 15 26 28 30 40 18 52 23 65 11 77 14 88 4" /></svg>
        </article>
        <article className="report-kpi report-kpi--customers">
          <span className="report-kpi-icon"><UsersRound size={22} aria-hidden="true" /></span>
          <div className="report-kpi-content"><span className="report-kpi-label">Khách hàng mới</span><strong>{kpis.newCustomerCount.toLocaleString("vi-VN")}</strong><small><b>↑ {formatPercent(kpis.newCustomerChangePercent)}</b> so với kỳ trước</small></div>
          <svg className="report-sparkline" viewBox="0 0 90 42" aria-hidden="true"><path d="M2 35 15 29 27 31 40 17 53 22 67 9 77 13 88 4" /></svg>
        </article>
        <article className="report-kpi report-kpi--occupancy">
          <span className="report-kpi-icon"><ChartNoAxesColumnIncreasing size={22} aria-hidden="true" /></span>
          <div className="report-kpi-content"><span className="report-kpi-label">Tỷ lệ lấp đầy sân</span><strong>{formatPercent(kpis.occupancyPercent)}</strong><small><b>↑ {formatPercent(kpis.occupancyChangePercent)}</b> so với kỳ trước</small></div>
          <svg className="report-sparkline" viewBox="0 0 90 42" aria-hidden="true"><path d="M2 35 15 30 28 25 41 29 54 16 68 19 78 8 88 4" /></svg>
        </article>
      </div>

      <div className="reports-grid reports-grid--charts">
        <ReportCard icon={ChartNoAxesColumnIncreasing} title="Doanh thu theo thời gian" className="report-revenue-card">
          <div className="report-card-toolbar" role="group" aria-label="Khoảng tổng hợp doanh thu">
            {periods.map((item) => <button key={item} type="button" aria-pressed={period === item} className={period === item ? "is-selected" : ""} onClick={() => setPeriod(item)}>{item}</button>)}
          </div>
          <RevenueChart period={period} />
        </ReportCard>

        <ReportCard icon={PieChart} title="Lượt đặt sân theo trạng thái" className="report-status-card">
          <div className="report-donut-layout">
            <div className="report-donut" style={{ "--donut-gradient": `conic-gradient(${bookingGradient})` }} role="img" aria-label={`${kpis.bookingCount.toLocaleString("vi-VN")} lượt đặt sân theo trạng thái`}>
              <div><strong>{kpis.bookingCount.toLocaleString("vi-VN")}</strong><span>Booking</span></div>
            </div>
            <ul className="report-legend">
              {bookingStatuses.map((item) => <li key={item.label}><span className="report-legend-swatch" style={{ backgroundColor: item.color }} /><span className="report-legend-name">{item.label}</span><strong>{item.count.toLocaleString("vi-VN")} <small>({(item.count / totals * 100).toFixed(1).replace(".", ",")}%)</small></strong></li>)}
            </ul>
          </div>
        </ReportCard>

        <ReportCard icon={Store} title="Doanh thu theo nguồn" className="report-source-card">
          <div className="report-source-content">
            <div className="report-donut report-source-donut" style={{ "--donut-gradient": `conic-gradient(${sourceGradient})` }} role="img" aria-label={`Tổng doanh thu ${formatMoney(kpis.revenue)}`}>
              <div><strong>{(kpis.revenue / 1000000).toLocaleString("vi-VN")}M</strong><span>Tổng doanh thu</span></div>
            </div>
            <ul className="report-legend report-source-legend">
              {revenueSources.map((source) => <li key={source.label}><span className="report-legend-swatch" style={{ backgroundColor: source.color }} /><span className="report-legend-name">{source.label}<strong>{formatMoney(source.amount)} <small>({formatPercent(source.amount / sourceTotal * 100)})</small></strong></span></li>)}
            </ul>
          </div>
        </ReportCard>
      </div>

      <div className="reports-grid reports-grid--details">
        <ReportCard icon={ChartNoAxesColumnIncreasing} title="Tỷ lệ lấp đầy sân" className="report-occupancy-card">
          <div className="report-occupancy-content">
            <div className="report-occupancy-value">{formatPercent(kpis.occupancyPercent)}</div>
            <div className="report-occupancy-divider" />
            <div className="report-occupancy-stats">
              <div><CalendarDays size={20} aria-hidden="true" /><span>Tổng thời gian đã đặt<strong>{occupancy.bookedHours.toLocaleString("vi-VN")} giờ</strong></span></div>
              <div><Clock3 size={20} aria-hidden="true" /><span>Tổng thời gian khai thác<strong>{occupancy.availableHours.toLocaleString("vi-VN")} giờ</strong></span></div>
            </div>
          </div>
          <div className="report-progress" role="img" aria-label={`Tỷ lệ lấp đầy ${formatPercent(kpis.occupancyPercent)}`}><span style={{ width: `${kpis.occupancyPercent}%` }} /></div>
        </ReportCard>

        <ReportCard icon={Trophy} title="Top sân được đặt nhiều nhất" className="report-ranking-card">
          <div className="report-table-scroll">
            <table className="report-ranking-table">
              <thead><tr><th scope="col">#</th><th scope="col">Sân</th><th scope="col">Lượt đặt</th><th scope="col">Thời gian sử dụng</th><th scope="col">Tỷ lệ lấp đầy</th></tr></thead>
              <tbody>{topCourts.map((court, index) => <tr key={court.name}><td>{index + 1}</td><td><strong>{court.name}</strong></td><td>{court.bookings}</td><td>{court.hours} giờ</td><td><div className="report-rank-fill"><span>{court.fillPercent}%</span><i><b style={{ width: `${court.fillPercent}%` }} /></i></div></td></tr>)}</tbody>
            </table>
          </div>
        </ReportCard>
      </div>

      <ReportCard icon={CalendarDays} title="Mức độ lấp đầy sân theo khung giờ" className="report-heatmap-card">
        <div className="report-heatmap-layout">
          <div className="report-heatmap-scroll">
            <table className="report-heatmap-table" aria-label="Mức độ lấp đầy theo ngày trong tuần và khung giờ">
              <thead><tr><th scope="col"><span className="admin-visually-hidden">Ngày</span></th>{timeSlots.map((slot) => <th scope="col" key={slot}>{slot}</th>)}</tr></thead>
              <tbody>{heatmap.map((row, rowIndex) => <tr key={weekDays[rowIndex]}><th scope="row">{weekDays[rowIndex]}</th>{row.map((value, slotIndex) => <td key={`${weekDays[rowIndex]}-${slotIndex}`}><span style={{ backgroundColor: heatColor(value) }} title={`${weekDays[rowIndex]} ${timeSlots[slotIndex]}: ${value}%`} aria-label={`${value}%`} /></td>)}</tr>)}</tbody>
            </table>
          </div>
          <ul className="report-heat-legend" aria-label="Chú giải tỷ lệ lấp đầy">
            <li><i style={{ background: "#087c4b" }} />≥ 80% (Rất cao)</li>
            <li><i style={{ background: "#20b878" }} />60% – 79% (Cao)</li>
            <li><i style={{ background: "#67d69f" }} />40% – 59% (Trung bình)</li>
            <li><i style={{ background: "#a8ebc8" }} />20% – 39% (Thấp)</li>
            <li><i style={{ background: "#d9f5e6" }} />&lt; 20% (Rất thấp)</li>
          </ul>
        </div>
        <p className="report-heatmap-note"><Info size={14} aria-hidden="true" /> Màu sắc thể hiện tỷ lệ thời gian đã đặt trên tổng thời gian khai thác.</p>
      </ReportCard>
    </section>
  );
}
