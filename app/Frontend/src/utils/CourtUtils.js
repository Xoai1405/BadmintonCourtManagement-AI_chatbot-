//Helper chuyển courtType thành text
const COURT_TYPE_LABELS = {
  STANDARD_OUTDOOR: "Sân tiêu chuẩn ngoài trời",
  STANDARD_INDOOR: "Sân tiêu chuẩn trong nhà",
  VIP_INDOOR: "Sân VIP trong nhà",
};



export function getCourtTypeLabel(courtType) {
  return COURT_TYPE_LABELS[courtType] ?? "Chưa xác định";
}
