import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import "./booking.css";

const formatDate = (date) => date.split("-").reverse().join("/");
// Giữ cách tính lịch của BookingHistory: ISO/UTC, tuần bắt đầu từ thứ Hai.
const calendarDate = (iso) => new Date(`${iso}T00:00:00Z`);
const toCalendarISO = (date) => [
  String(date.getUTCFullYear()).padStart(4, "0"),
  String(date.getUTCMonth() + 1).padStart(2, "0"),
  String(date.getUTCDate()).padStart(2, "0"),
].join("-");
const shiftMonth = (month, amount) => {
  const date = calendarDate(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return toCalendarISO(date).slice(0, 7);
};
const getCalendarWeeks = (month) => {
  if (!month) return [];
  const first = calendarDate(`${month}-01`);
  const offset = (first.getUTCDay() + 6) % 7;
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  const length = Math.ceil((offset + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: length / 7 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = calendarDate(`${month}-01`);
      date.setUTCDate(1 - offset + week * 7 + day);
      return { iso: toCalendarISO(date), day: date.getUTCDate(),
        outside: date.getUTCMonth() !== first.getUTCMonth(),
        disabled: date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999 };
    })
  );
};
const todayInVietnam = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

// Lịch từ BookingHistory, dùng chung cho lịch sử khách hàng và tra cứu nhân viên.
// Chọn ngày chỉ sửa bản nháp; onChange chỉ chạy khi Áp dụng hoặc xóa khoảng ngày.
export default function DateRangePicker({ ref, className = "", startDate = "", endDate = "", isOpen, onOpen, onClose, onChange }) {
  const instanceId = useId();
  const [draftDateRange, setDraftDateRange] = useState({ startDate: "", endDate: "" });
  const [calendarMonth, setCalendarMonth] = useState("");
  const [focusedCalendarDate, setFocusedCalendarDate] = useState("");
  const datePickerRef = useRef(null);
  const dateTriggerRef = useRef(null);
  const calendarGridRef = useRef(null);
  const calendarFocusRequested = useRef(false);
  const calendarWeeks = getCalendarWeeks(calendarMonth);
  const calendarTitle = calendarMonth ? `Tháng ${Number(calendarMonth.slice(5))}, ${calendarMonth.slice(0, 4)}` : "";

  const close = () => { onClose(); dateTriggerRef.current?.focus(); };
  useImperativeHandle(ref, () => ({ close }));

  const openDatePicker = () => {
    if (isOpen) { close(); return; }
    const initialDate = startDate || todayInVietnam();
    setDraftDateRange({ startDate, endDate });
    setCalendarMonth(initialDate.slice(0, 7));
    setFocusedCalendarDate(initialDate);
    calendarFocusRequested.current = true;
    onOpen();
  };
  const selectCalendarDate = (iso) => {
    setDraftDateRange((previous) => {
      if (!previous.startDate || previous.endDate) return { startDate: iso, endDate: "" };
      return iso < previous.startDate ? { startDate: iso, endDate: previous.startDate }
        : { startDate: previous.startDate, endDate: iso };
    });
    setFocusedCalendarDate(iso);
  };
  const navigateMonth = (amount) => {
    const month = shiftMonth(calendarMonth, amount);
    setCalendarMonth(month);
    setFocusedCalendarDate(`${month}-01`);
  };
  const applyDateRange = () => {
    if (!draftDateRange.startDate || !draftDateRange.endDate) return;
    onChange({ ...draftDateRange }); close();
  };
  const clearDateRange = () => {
    const emptyRange = { startDate: "", endDate: "" };
    setDraftDateRange(emptyRange); onChange(emptyRange); close();
  };
  const handleCalendarKey = (event, iso) => {
    const date = calendarDate(iso);
    const offset = (date.getUTCDay() + 6) % 7;
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
      Home: -offset, End: 6 - offset };
    if (Object.hasOwn(steps, event.key)) date.setUTCDate(date.getUTCDate() + steps[event.key]);
    else if (event.key === "PageUp" || event.key === "PageDown") {
      const day = date.getUTCDate();
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() + (event.key === "PageUp" ? -1 : 1));
      const last = new Date(date);
      last.setUTCMonth(last.getUTCMonth() + 1);
      last.setUTCDate(0);
      date.setUTCDate(Math.min(day, last.getUTCDate()));
    } else return;
    event.preventDefault();
    if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return;
    const target = toCalendarISO(date);
    calendarFocusRequested.current = true;
    setCalendarMonth(target.slice(0, 7)); setFocusedCalendarDate(target);
  };

  useEffect(() => {
    if (!isOpen) return;
    const dismiss = (event) => { if (!datePickerRef.current?.contains(event.target)) onClose(); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [isOpen, onClose]);
  useEffect(() => {
    if (!isOpen || !calendarFocusRequested.current) return;
    calendarGridRef.current?.querySelector(`[data-date="${focusedCalendarDate}"]`)?.focus();
    calendarFocusRequested.current = false;
  }, [isOpen, calendarMonth, focusedCalendarDate]);

  return <div ref={datePickerRef} className={`booking-date-picker ${className}`} onKeyDown={(event) => {
    if (event.key === "Escape" && isOpen) { event.preventDefault(); event.stopPropagation(); close(); }
  }}>
    <button ref={dateTriggerRef} type="button" className="booking-history-date-range"
      aria-label="Chọn khoảng ngày" aria-expanded={isOpen} aria-controls={`${instanceId}-range-calendar`}
      aria-haspopup="dialog" onClick={openDatePicker}>
      <CalendarDays size={18} aria-hidden="true" />
      <span>{startDate ? formatDate(startDate) : "dd/mm/yyyy"}</span><span aria-hidden="true">–</span>
      <span>{endDate ? formatDate(endDate) : "dd/mm/yyyy"}</span>
    </button>
    {startDate && <button type="button" className="booking-date-clear" aria-label="Xóa khoảng ngày" onClick={clearDateRange}><X size={14} aria-hidden="true" /></button>}
    {isOpen && <div id={`${instanceId}-range-calendar`} role="dialog" aria-label="Chọn khoảng ngày" className="booking-calendar-popover">
      <header className="booking-calendar-header">
        <button type="button" aria-label="Tháng trước" disabled={calendarMonth === "0001-01"} onClick={() => navigateMonth(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <strong aria-live="polite">{calendarTitle}</strong>
        <button type="button" aria-label="Tháng sau" disabled={calendarMonth === "9999-12"} onClick={() => navigateMonth(1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </header>
      <table ref={calendarGridRef} className="booking-calendar-grid" aria-label={calendarTitle}>
        <thead><tr>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <th key={day} scope="col">{day}</th>)}</tr></thead>
        <tbody>{calendarWeeks.map((week) => <tr key={week[0].iso}>{week.map((day) => {
          const isStart = day.iso === draftDateRange.startDate;
          const isEnd = day.iso === draftDateRange.endDate;
          const inRange = draftDateRange.startDate && draftDateRange.endDate && day.iso >= draftDateRange.startDate && day.iso <= draftDateRange.endDate;
          const classes = ["booking-calendar-day", day.outside && "booking-calendar-day--outside",
            inRange && "booking-calendar-day--range", isStart && "booking-calendar-day--start",
            isEnd && "booking-calendar-day--end", (isStart || isEnd) && "booking-calendar-day--selected"].filter(Boolean).join(" ");
          return <td key={day.iso} className={classes}><button type="button" data-date={day.iso}
            aria-label={`Chọn ngày ${formatDate(day.iso)}`} aria-pressed={isStart || isEnd} disabled={day.disabled}
            tabIndex={focusedCalendarDate === day.iso ? 0 : -1} onFocus={() => setFocusedCalendarDate(day.iso)}
            onKeyDown={(event) => handleCalendarKey(event, day.iso)} onClick={() => selectCalendarDate(day.iso)}><span>{day.day}</span></button></td>;
        })}</tr>)}</tbody>
      </table>
      <p className="booking-visually-hidden" role="status">{draftDateRange.endDate ? `Đã chọn ${formatDate(draftDateRange.startDate)} đến ${formatDate(draftDateRange.endDate)}.`
        : draftDateRange.startDate ? "Chọn ngày kết thúc." : "Chọn ngày bắt đầu."}</p>
      <button type="button" className="booking-calendar-apply" disabled={!draftDateRange.startDate || !draftDateRange.endDate} onClick={applyDateRange}>Áp dụng</button>
    </div>}
  </div>;
}
