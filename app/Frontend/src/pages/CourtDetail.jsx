import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { bookingApi } from "../api/bookingApi";
import {
  ArrowLeft,
  MessageCircle,
  Crown,
  FileText,
  Calendar,
} from "lucide-react";

import { courtApi } from "../api/apiCourt";
import Navbar from "../components/Navbar";
import { getCourtImageById } from "../utils/CourtImageById";
import { getCourtTypeLabel } from "../utils/CourtUtils";
//Helper trả chuỗi ngày-tháng-năm
function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
//Helper kiểm tra thời khung giờ quá khứ
function isPastSlot(selectedDate, startTime, now) {
  if (!selectedDate || !now) {
    return false;
  }

  const [year, month, day] = selectedDate.split("-").map(Number);
  const [hour, minute] = startTime.split(":").map(Number);

  const slotStart = new Date(year, month - 1, day, hour, minute, 0);

  return slotStart <= now;
}

//Helper formattime
function formatTime(time) {
  return time.slice(0, 5);
}

export default function CourtDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("");
  const [now, setNow] = useState(null);

  //Cập nhật thời gian mỗi 30s
  useEffect(() => {
    const updateClock = () => {
      const currentTime = new Date();

      setNow(currentTime);

      if (!selectedDate) {
        setSelectedDate(toDateInputValue(currentTime));
      }
    };

    updateClock();

    const intervalId = window.setInterval(updateClock, 30_000);

    return () => window.clearInterval(intervalId);
  }, [selectedDate]);

  const [timeSlots, setTimeSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");

  //Fetch slot mỗi khi đổi sân hoặc ngày
  useEffect(() => {
    if (!id || !selectedDate) {
      return;
    }

    const fetchAvailability = async () => {
      try {
        setSlotLoading(true);
        setSlotError("");

        const data = await courtApi.getAvailability(id, selectedDate);

        setTimeSlots(data.slots);
      } catch (err) {
        setSlotError(err.message || "Không thể tải các khung giờ");
      } finally {
        setSlotLoading(false);
      }
    };

    fetchAvailability();
  }, [id, selectedDate]);
  const [court, setCourt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const toggleSlot = (slot) => {
    if (slot.status === "booked") return;
    if (selectedSlots.includes(slot.id)) {
      setSelectedSlots(selectedSlots.filter((sId) => sId !== slot.id));
    } else {
      setSelectedSlots([...selectedSlots, slot.id]);
    }
  };
 const handleCreateBooking = () => {
    if (!isContinuousSelection) {
      setBookingError("Vui lòng chọn các khung giờ liên tiếp.");
      return;
    }

    const firstSlot = selectedSlotDetails[0];
    const lastSlot = selectedSlotDetails[selectedSlotDetails.length - 1];

    setBookingError("");

    // Chuyển hướng sang trang Confirm và truyền toàn bộ dữ liệu qua State
    navigate(`/court/${id}/confirm`, {
      state: {
        court: court,
        selectedDate: selectedDate,
        selectedSlots: selectedSlotDetails,
        startTime: formatTime(firstSlot.startTime),
        endTime: formatTime(lastSlot.endTime),
        totalPrice: totalAmount
      }
    });
  };
  useEffect(() => {
    const fetchCourt = async () => {
      try {
        const data = await courtApi.getCourt(id);
        setCourt(data);
      } catch (err) {
        setError(err.message || "Không lấy được thông tin sân");
      } finally {
        setLoading(false);
      }
    };

    fetchCourt();
  }, [id]);
  if (loading) {
    return <div className="p-6">Đang tải thông tin sân...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  if (!court) {
    return <div className="p-6">Không tìm thấy sân.</div>;
  }

  const totalAmount = timeSlots
    .filter((slot) => {
      const slotId = `${slot.startTime}-${slot.endTime}`;

      return selectedSlots.includes(slotId);
    })
    .reduce((total, slot) => {
      return total + Number(slot.price) / 2;
    }, 0);

  const selectedSlotDetails = timeSlots
    .filter((slot) => {
      const slotId = `${slot.startTime}-${slot.endTime}`;

      return selectedSlots.includes(slotId);
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const isContinuousSelection =
    selectedSlotDetails.length > 0 &&
    selectedSlotDetails.every((slot, index) => {
      if (index === 0) {
        return true;
      }

      return selectedSlotDetails[index - 1].endTime === slot.startTime;
    });
  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 1. THANH MENU DÙNG CHUNG (Tự động lấy Logo và UI từ file Navbar.jsx) */}
      <Navbar />

      {/* 2. NỘI DUNG TRANG CHI TIẾT SÂN */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[#00C475] font-medium hover:underline mb-6 text-sm"
        >
          <ArrowLeft size={16} /> Quay lại danh sách sân
        </Link>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* CỘT TRÁI */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden sticky top-24">
              <img
                src={getCourtImageById(court)}
                alt={court.name}
                className="w-full h-56 object-cover"
              />
              <div className="p-5">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {court.name}
                  </h2>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-[#00C475]">
                    Hoạt động
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {getCourtTypeLabel(court.courtType)}
                </p>

                <div className="flex items-start gap-2 text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">
                  {court.courtType.toString() === "VIP_INDOOR" ? (
                    <Crown size={20} className="text-yellow-500 shrink-0" />
                  ) : (
                    <FileText size={20} className="text-gray-400 shrink-0" />
                  )}
                  <p>{court.description}</p>
                </div>

                <div>
                  <p className="font-bold text-lg text-[#00C475]">
                    {court.priceNormalHour.toLocaleString()}đ
                    <span className="text-sm text-gray-500 font-normal">
                      /giờ
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">
                    (Giờ cao điểm: {court.pricePeakHour.toLocaleString()}đ/giờ)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI */}
          <div className="w-full lg:w-2/3 bg-gray-50 p-6 rounded-xl">
            <div className="mb-6 inline-block">
              <div className="relative flex items-center bg-white border border-gray-200 rounded-md h-10 w-48">
                <Calendar className="absolute left-3 text-gray-500" size={18} />
                <input
                  type="date"
                  value={selectedDate}
                  min={now ? toDateInputValue(now) : undefined}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                    setSelectedSlots([]);
                  }}
                  className="pl-10 pr-3 py-2 w-full h-full outline-none text-sm text-gray-700 bg-transparent rounded-md"
                />
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Chọn các khung giờ liên tiếp (30 phút/khung)
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8">
              {slotLoading && (
                <p className="mb-4 text-sm text-gray-500">
                  Đang tải khung giờ...
                </p>
              )}

              {slotError && (
                <p className="mb-4 text-sm text-red-500">{slotError}</p>
              )}
              {timeSlots.map((slot) => {
                const slotId = `${slot.startTime}-${slot.endTime}`;

                const isSelected = selectedSlots.includes(slotId);

                // Frontend khóa ngay theo đồng hồ.
                // Backend status vẫn là nguồn dữ liệu chính.
                const isPast =
                  slot.status === "PAST" ||
                  isPastSlot(selectedDate, slot.startTime, now);

                const isUnavailable = isPast || slot.status === "BOOKED";
                let btnClass =
                  "py-2 rounded border text-xs font-medium transition-colors duration-200 ";

                if (isUnavailable) {
                  btnClass +=
                    "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed";
                } else if (isSelected) {
                  btnClass +=
                    "bg-[#00C475] text-white border-[#00C475] shadow-sm";
                } else {
                  btnClass +=
                    "bg-white text-gray-600 border-gray-200 hover:border-[#00C475] hover:text-[#00C475]";
                }

                return (
                  <button
                    key={slotId}
                    onClick={() => {
                      if (!isUnavailable) {
                        toggleSlot({ ...slot, id: slotId });
                      }
                    }}
                    className={btnClass}
                    disabled={isUnavailable}
                  >
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    {slot.isPeak && (
                      <span className="mt-1 block text-[10px] font-semibold text-orange-500">
                        Cao điểm
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-6 text-sm text-gray-500 mb-8 border-b border-gray-200 pb-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded border border-gray-200"></div>{" "}
                Đã đặt
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>{" "}
                Còn trống
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-[#00C475] rounded"></div> Đang chọn
              </div>
            </div>

            <div className="flex justify-between items-center bg-emerald-50/50 p-5 rounded-xl border border-emerald-100/50">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Đã chọn:{" "}
                  <span className="font-bold text-gray-800">
                    {selectedSlots.length} khung
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Tổng tiền:{" "}
                  <span className="text-xl font-bold text-[#00C475]">
                    {totalAmount.toLocaleString()}đ
                  </span>
                </p>
              </div>
              {bookingError && (
                <p className="mb-3 text-sm text-red-500">{bookingError}</p>
              )}

              {bookingMessage && (
                <p className="mb-3 text-sm text-emerald-600">
                  {bookingMessage}
                </p>
              )}
              <button
                type="button"
                onClick={handleCreateBooking}
                disabled={
                  selectedSlots.length === 0 ||
                  !isContinuousSelection ||
                  bookingLoading
                }
                className={`px-8 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                  selectedSlots.length > 0 &&
                  isContinuousSelection &&
                  !bookingLoading
                    ? "bg-[#00C475] text-white shadow-md hover:bg-[#00B068]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {bookingLoading ? "Đang tạo đặt sân..." : "Đặt sân ngay"}
                {!bookingLoading && <span className="text-lg">→</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#00C475] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#00B068] transition-colors">
        <MessageCircle size={28} />
      </button>
    </div>
  );
}
