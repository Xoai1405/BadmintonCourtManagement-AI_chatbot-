# Kiểm thử API quản lý dịch vụ và dịch vụ trong booking bằng Postman

Áp dụng cho nhánh `feat/be/service-management-booking-addons`. Các API trả resource trực tiếp, không bọc `data`. Ví dụ dùng `http://localhost:8080`; thay host/port theo backend của bạn. **Chỉ dùng database test** vì thêm, sửa, ẩn dịch vụ và kết toán booking đều ghi dữ liệu thật.

## 1. Chuẩn bị Postman

1. Chạy backend với JDK 25 và PostgreSQL đã áp dụng migration `V11__service_catalog_history.sql`.
2. Tạo Postman Environment với `baseUrl = http://localhost:8080/api/v1`, `managerToken`, `staffToken`, `customerToken`, `serviceId`, `bookingId`. Chỉ lưu token trong môi trường cá nhân; không đưa token thật vào file xuất hoặc Git.
3. Đăng nhập từng role bằng `POST {{baseUrl}}/auth/login`, Body → raw → JSON:

   ```json
   { "emailOrPhoneNumber": "<email-hoặc-số-điện-thoại>", "password": "<mật-khẩu>" }
   ```

   Copy trường `token` từ response vào biến tương ứng. Với các request bên dưới, ở Authorization chọn **Bearer Token** và nhập `{{managerToken}}` hoặc `{{staffToken}}`; không thêm chữ `Bearer` vào giá trị biến.
4. Chuẩn bị một booking test có `bookingStatus=CHECKED_IN`, `paymentStatus=PAID`. Lấy `bookingId` từ `GET {{baseUrl}}/staff/bookings`; dùng `GET {{baseUrl}}/staff/bookings/{{bookingId}}` để ghi lại `courtPrice`, `servicePrice`, `totalAmount`, `services`. Nếu là buổi của gói lịch cố định, gói phải còn `ACTIVE`.

## 2. Kiểm thử danh mục dịch vụ

Các request ghi dữ liệu dùng Bearer `{{managerToken}}`. Với POST/PUT/PATCH, chọn Body → raw → JSON và bảo đảm header `Content-Type: application/json`.

| Bước | Request và body | Kỳ vọng |
| --- | --- | --- |
| Xem danh mục | `GET {{baseUrl}}/services` | `200`, mảng dịch vụ chưa bị ẩn; mỗi phần tử có `serviceId`, `name`, `category`, `unitPrice`, `status`. Token của `STAFF` cũng xem được. |
| Tạo | `POST {{baseUrl}}/services` với body bên dưới | `201`, `status=ACTIVE`. Lưu `serviceId` trả về vào Environment. |
| Sửa | `PUT {{baseUrl}}/services/{{serviceId}}` với body bên dưới | `200`, tên/danh mục/giá mới. |
| Đánh dấu hết hàng | `PATCH {{baseUrl}}/services/{{serviceId}}/status` với `{"status":"OUT_OF_STOCK"}` | `200`; dịch vụ vẫn có trong danh mục nhưng không thêm mới được vào booking. |
| Mở bán lại | Cùng URL, body `{"status":"ACTIVE"}` | `200`; có thể thêm vào booking. |
| Ẩn dịch vụ | `DELETE {{baseUrl}}/services/{{serviceId}}` | `204`, không có body; `GET /services` không còn trả dịch vụ này. **Làm bước này sau các ca thêm vào booking.** |

Body tạo:

```json
{ "name": "Nước suối test", "category": "DRINK", "unitPrice": 10000 }
```

Body sửa:

```json
{ "name": "Nước suối test đã sửa", "category": "DRINK", "unitPrice": 12000 }
```

Giá trị `category`: `DRINK`, `RACKET_RENTAL`, `OTHER`. Giá trị `status`: `ACTIVE`, `OUT_OF_STOCK`. Tên sau khi cắt khoảng trắng phải dài 1–100 ký tự; giá phải không âm và phù hợp `DECIMAL(12,2)`.

## 3. Kiểm thử dịch vụ trong booking

Các request ghi dữ liệu dùng Bearer `{{staffToken}}` hoặc `{{managerToken}}`. Dùng dịch vụ đang `ACTIVE` và chưa bị ẩn.

1. Gửi `POST {{baseUrl}}/staff/bookings/{{bookingId}}/services` với body:

   ```json
   { "serviceId": 1, "quantity": 2 }
   ```

   Thay `serviceId` bằng ID dịch vụ test. Kỳ vọng `201`, response `StaffBookingResponse.services` có tên, `quantity=2`, `priceAtBooking` và `subtotal=2 × priceAtBooking`; `servicePrice` bằng tổng các dòng dịch vụ, `totalAmount = courtPrice + servicePrice`.
2. Gửi lại cùng URL, cùng `serviceId`, `quantity=1`. Kỳ vọng `201`, chỉ có **một dòng** cho dịch vụ này, số lượng tăng thành 3. Giá của dòng vẫn là giá tại lần thêm đầu tiên.
3. Gửi `GET {{baseUrl}}/staff/bookings/{{bookingId}}` và kiểm tra các giá trị còn đúng sau khi đọc lại từ database. Với booking lẻ của chính khách, có thể kiểm tra thêm `GET {{baseUrl}}/bookings/detail/{{bookingId}}` bằng token `CUSTOMER`; trường `services` cũng dùng tên/giá đã lưu.
4. Gửi `DELETE {{baseUrl}}/staff/bookings/{{bookingId}}/services/{{serviceId}}`. Kỳ vọng `200`, dòng dịch vụ biến mất và `servicePrice`, `totalAmount` được tính lại. Nếu booking còn dịch vụ khác, các dòng đó phải giữ nguyên.

### Kiểm tra lịch sử sau kết toán

Trên **một booking test khác**, thêm dịch vụ và ghi lại `services`, `servicePrice`, `totalAmount`. Kết toán bằng `PATCH {{baseUrl}}/staff/bookings/{{bookingId}}/settle` khi booking đã `CHECKED_IN` và `PAID`. Sau đó dùng token quản lý sửa tên/giá dịch vụ trong danh mục rồi ẩn dịch vụ. Đọc lại chi tiết booking: tên, `priceAtBooking`, `subtotal`, `servicePrice` và `totalAmount` đã chốt phải **giữ nguyên**. Nếu là một buổi thuộc gói, `totalAmount` của gói không đổi khi thêm dịch vụ vào buổi.

## 4. Ca lỗi cần thử

| Thao tác | Kỳ vọng |
| --- | --- |
| Bỏ Authorization; dùng `STAFF`/`CUSTOMER` để POST, PUT, PATCH hoặc DELETE `/services` | `401`; `403` |
| Tạo/sửa dịch vụ với tên toàn khoảng trắng, tên quá 100 ký tự, giá âm hoặc quá 2 chữ số thập phân | `400` |
| Sửa/ẩn `serviceId` không tồn tại hoặc đã ẩn | `404` |
| Thêm dịch vụ `OUT_OF_STOCK`; thêm vào booking chưa `CHECKED_IN`, đã `SETTLED`, hoặc buổi thuộc gói không còn `ACTIVE` | `409` |
| Thêm dịch vụ đã ẩn hoặc ID không tồn tại; xóa dịch vụ không có trong booking | `404` |
| Gửi `quantity=0`, `quantity=100`, hoặc thêm tiếp làm tổng số lượng một dịch vụ vượt 99 | `400` |
| Thêm/xóa dịch vụ trong booking sau khi kết toán | `409`; đọc lại booking phải thấy dữ liệu cũ không đổi |

Trong Postman, đối chiếu **HTTP Status** và tab **Body** sau mỗi lần Send. Với ca thành công, luôn gửi thêm request GET để xác nhận dữ liệu đã được lưu. Các unit test backend đã chạy đạt 7/7; hướng dẫn này dùng để kiểm tra API và migration trên môi trường PostgreSQL của bạn.
