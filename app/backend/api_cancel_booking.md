# API hủy booking lẻ và hủy một buổi trong lịch cố định

Tài liệu này tóm tắt phần backend được thay đổi trên nhánh `feat/be/cancel-booking`. Phạm vi gồm hủy booking lẻ và hủy **một buổi** thuộc lịch cố định; API hủy toàn gói đã có từ trước và vẫn là thao tác riêng.

## Phần 1 — Quy ước chung

### 1.1. Base URL và versioning

Quy ước API của dự án: `https://<domain>/api/v1`. Các path bắt đầu bằng `/bookings`, `/staff/bookings` hoặc `/staff/recurring-bookings` trong tài liệu này được tính từ gốc `/api/v1`. Ví dụ `PATCH /bookings/{bookingId}/cancel` là `PATCH /api/v1/bookings/{bookingId}/cancel`.

**Ngoại lệ hiện tại:** controller lịch cố định dành cho khách vẫn dùng gốc `/api/recurring-bookings`. Vì vậy API khách hủy một buổi thực tế là `PATCH /api/recurring-bookings/{packageId}/sessions/{bookingId}/cancel`, **không phải** `/api/v1/recurring-bookings/...`. Cần thống nhất versioning ở một thay đổi riêng trước khi client chuyển sang path `/api/v1`.

### 1.2. Tên endpoint và ID

- Resource dùng danh từ số nhiều, chữ thường, gạch ngang: `/bookings`, `/recurring-bookings`.
- Hủy là hành động gắn sub-path `PATCH .../cancel`.
- `bookingId` và `packageId` là `Long` (số nguyên), lấy từ ID booking và ID gói trong response hiện có.

### 1.3. Response REST thuần

Hủy thành công trả `200 OK` và **resource đã cập nhật trực tiếp**, không bọc `success`, `data` hoặc `message`. Hai API booking lẻ trả DTO chi tiết tương ứng của khách hoặc nhân viên. Hai API hủy buổi trả chi tiết gói cùng danh sách buổi đã cập nhật. Lỗi nghiệp vụ trả mã HTTP phù hợp; xem mục 3.3.

### 1.4. JWT và phân quyền

Gửi `Authorization: Bearer <token>` cho cả bốn API. Role dùng `CUSTOMER` (A1), `STAFF` (A2), `MANAGER` (A3). Route của khách chỉ cho `CUSTOMER`; route `/staff/...` cho `STAFF` và `MANAGER`. Ngoài role, backend còn kiểm tra khách là chủ booking hoặc chủ gói.

Theo **mã hiện tại**, JWT chứa `sub` (email hoặc số điện thoại), `iat`, `exp`; `userId`, `role`, `fullName` được nạp từ tài khoản khi xác thực token. Payload có sẵn các claim `userId`, `role`, `fullName` như quy ước đề xuất chưa được triển khai trong nhánh này.

## Phần 2 — Những gì đã thay đổi

| API | Quyền | Response `200 OK` |
| --- | --- | --- |
| `PATCH /bookings/{bookingId}/cancel` | `CUSTOMER`, chủ booking lẻ | `BookingDetailResponse` |
| `PATCH /staff/bookings/{bookingId}/cancel` | `STAFF`, `MANAGER` | `StaffBookingResponse` |
| `PATCH /api/recurring-bookings/{packageId}/sessions/{bookingId}/cancel` | `CUSTOMER`, chủ gói; **path đầy đủ ngoài gốc `/api/v1`** | `RecurringBookingDetailResponse` |
| `PATCH /staff/recurring-bookings/{packageId}/sessions/{bookingId}/cancel` | `STAFF`, `MANAGER` | `RecurringBookingDetailResponse` |

Body chung, `Content-Type: application/json`:

```json
{ "reason": "Khách thay đổi kế hoạch" }
```

`reason` bắt buộc; backend cắt khoảng trắng đầu/cuối rồi yêu cầu độ dài từ 1 đến 500 ký tự. Response booking lẻ có `bookingStatus`, `paymentStatus`, `cancelReason`, `cancelledAt`, `expireAt`. Response gói có `status`, `totalAmount`, `sessions`; mỗi phần tử `sessions` nay có thêm `cancelReason` và `cancelledAt`. Đây là các trường cần đối chiếu sau khi hủy; response thực tế còn các trường chi tiết khác của DTO.

### 2.1. Quy tắc trạng thái và tiền

- Chỉ booking hoặc buổi ở `PENDING` hoặc `CONFIRMED` được hủy. Booking `SETTLED` bị chặn; `CHECKED_IN`, `COMPLETED`, `NO_SHOW`, `CANCELLED` cũng không thể hủy lại.
- Khách phải hủy **ít nhất 2 giờ trước giờ bắt đầu** theo múi giờ `Asia/Ho_Chi_Minh`. Nhân viên và Quản lý không áp dụng mốc 2 giờ.
- API booking lẻ không nhận buổi thuộc gói. API hủy buổi yêu cầu đúng cặp `packageId`–`bookingId` và gói còn `ACTIVE`.
- Khi hủy, backend đặt `bookingStatus=CANCELLED`, lưu `cancelReason` và `cancelledAt`, xóa `expireAt`. `paymentStatus=PAID`, `paidAt`, phương thức và người xác nhận thanh toán được giữ nguyên; API **không thực hiện hoặc ghi nhận hoàn tiền**.
- Hủy một buổi không đổi các buổi khác và không đổi `totalAmount` của gói. Nếu mọi buổi đều đã ở `COMPLETED`, `NO_SHOW` hoặc `CANCELLED`, gói chuyển thành `COMPLETED`.
- Luồng báo thanh toán và xác nhận tiền gói bỏ qua buổi đã hủy. Job hết hạn kiểm tra lại dữ liệu sau khi khóa để không ghi đè lý do hủy thủ công do kết quả truy vấn cũ.

### 2.2. Giao dịch và đồng thời

Thao tác hủy chạy trong transaction và dùng khóa ghi trên booking; hủy buổi khóa gói trước rồi khóa buổi. Điều này giúp hai yêu cầu hủy hoặc thao tác thanh toán/xác nhận cùng thời điểm kiểm tra trạng thái mới nhất trước khi cập nhật.

## Phần 3 — Mã lỗi

| Mã | Trường hợp tiêu biểu | Body hiện tại |
| --- | --- | --- |
| `400` | Thiếu/rỗng `reason`, hoặc dài hơn 500 ký tự sau khi cắt khoảng trắng | `{"message":"..."}` |
| `401` | Thiếu JWT hoặc token không hợp lệ | `{"message":"..."}` |
| `403` | Role không được phép gọi route | Do Spring Security trả về |
| `404` | Booking/gói không tồn tại, khách không sở hữu, hoặc buổi không thuộc gói được chỉ định | Chuỗi thông báo thuần từ `ResourceNotFoundException` |
| `409` | Trạng thái không cho phép hủy, gói không còn `ACTIVE`, booking đã kết toán, hoặc khách hủy quá mốc 2 giờ | `{"message":"..."}` |

## Phần 4 — Hướng dẫn kiểm thử

### 4.1. Chuẩn bị

1. Chạy backend và kết nối cơ sở dữ liệu test. Ví dụ dưới đây giả sử backend chạy tại `http://localhost:8080`; đổi host/port nếu khác.
2. Trong Postman, tạo Environment và khai báo các biến `baseUrl = http://localhost:8080/api/v1`, `legacyBaseUrl = http://localhost:8080/api`, `customerToken`, `staffToken`, `managerToken`, `singleId`, `packageId`, `sessionId`. Điền ID bằng số nguyên của dữ liệu test; lưu token ở giá trị chỉ dùng cục bộ, không đưa token thật vào file xuất hoặc Git.
3. Lấy JWT của từng role qua `POST {{baseUrl}}/auth/login`, body raw JSON gồm `emailOrPhoneNumber` và `password`; copy trường `token` trong response vào biến tương ứng. Có thể lấy ID từ `GET {{baseUrl}}/bookings/me`, `GET {{baseUrl}}/staff/bookings` và `GET {{legacyBaseUrl}}/recurring-bookings/{{packageId}}`.
4. Chuẩn bị booking lẻ và gói `ACTIVE` có buổi `PENDING` hoặc `CONFIRMED`, bắt đầu sau thời điểm test hơn 2 giờ. Với booking `PAID`, ghi lại `paymentStatus`, `paidAt`, `paymentMethod` và người xác nhận trước khi hủy. Dùng dữ liệu test riêng vì thao tác hủy thay đổi trạng thái trong database.

### 4.2. Gọi bốn API

Trong Postman, tạo bốn request sau. Ở tab **Authorization**, chọn **Bearer Token** và nhập đúng biến `{{customerToken}}`, `{{staffToken}}` hoặc `{{managerToken}}` (không thêm chữ `Bearer` vào giá trị biến). Ở tab **Body**, chọn **raw → JSON** và nhập `{"reason":"Khách thay đổi kế hoạch"}`.

| Request | URL | Token |
| --- | --- | --- |
| Khách hủy booking lẻ | `PATCH {{baseUrl}}/bookings/{{singleId}}/cancel` | `{{customerToken}}` |
| Nhân viên hủy booking lẻ | `PATCH {{baseUrl}}/staff/bookings/{{singleId}}/cancel` | `{{staffToken}}` |
| Khách hủy một buổi trong gói | `PATCH {{legacyBaseUrl}}/recurring-bookings/{{packageId}}/sessions/{{sessionId}}/cancel` | `{{customerToken}}` |
| Quản lý hủy một buổi trong gói | `PATCH {{baseUrl}}/staff/recurring-bookings/{{packageId}}/sessions/{{sessionId}}/cancel` | `{{managerToken}}` |

Dùng **booking/buổi khác nhau** cho mỗi request thành công, vì gửi lại yêu cầu hủy cho cùng ID sẽ trả `409`. Route khách hủy buổi đang dùng `{{legacyBaseUrl}}`, chưa có `/v1`.

Kỳ vọng `200 OK`: đúng buổi chuyển `CANCELLED`, `cancelReason` là lý do đã cắt khoảng trắng, `cancelledAt` có giá trị, `expireAt` của booking lẻ là `null`. Các buổi khác và `totalAmount` gói giữ nguyên; booking đã `PAID` vẫn `PAID`.

### 4.3. Kiểm tra lỗi và ranh giới

| Ca test | Kỳ vọng |
| --- | --- |
| Trong Postman chọn **No Auth**; đổi sang token sai role | `401`; `403` |
| Khách hủy lịch của người khác; sai `packageId`–`bookingId` | `404`; `404` |
| Sửa raw JSON thành `{"reason":"   "}`; nhập lý do quá 500 ký tự | `400`; `400` |
| Bấm **Send** lần hai cho booking đã `CANCELLED`; thử ID ở `CHECKED_IN`/`COMPLETED`/`NO_SHOW`/`SETTLED` | `409` |
| Khách hủy sát giờ dưới 2 tiếng; đúng mốc 2 tiếng | `409`; `200` |
| Nhân viên hủy booking `PENDING`/`CONFIRMED` sát giờ | `200` nếu các điều kiện khác hợp lệ |
| Hủy buổi cuối cùng chưa kết thúc trong gói `ACTIVE` | Gói thành `COMPLETED` |
| Hủy buổi rồi báo/xác nhận thanh toán gói | Buổi đã hủy không bị đổi lại thành `PAID` hoặc `CONFIRMED` |

Ở mỗi request, xem **Status** và tab **Body** của Postman. Với ca `200`, mở lại chi tiết booking/gói để đối chiếu dữ liệu đã lưu; với ca lỗi, đối chiếu mã HTTP trước rồi đọc thông báo trả về. Các test backend trên nhánh đã có 19 ca đạt, nhưng kết quả Postman trên môi trường của bạn cần được kiểm tra riêng.
