// MOCK DATA for trying out the HR dashboard. Every person, email and phone number below is made up
// (example.com addresses, 0900 000 xxx numbers). Replace with API calls once the backend has an HR module.

import type { Employee, LeaveRequest } from "./types";

const e = (
  n: number,
  name: string,
  department: Employee["department"],
  position: string,
  joinDate: string,
  status: Employee["status"] = "working",
): Employee => ({
  id: `e${n}`,
  code: `NV${String(n).padStart(3, "0")}`,
  name,
  email: `nhanvien${n}@example.com`,
  phone: `0900 000 ${String(100 + n).padStart(3, "0")}`,
  department,
  position,
  status,
  joinDate,
});

export const seedEmployees: Employee[] = [
  e(1, "Nguyễn Văn An", "Kinh doanh", "Trưởng phòng kinh doanh", "2019-03-04"),
  e(2, "Trần Thị Bình", "Hành chính nhân sự", "Trưởng phòng nhân sự", "2019-06-17"),
  e(3, "Lê Hoàng Cường", "Kỹ thuật lắp đặt", "Kỹ sư trưởng", "2019-09-02"),
  e(4, "Phạm Minh Dũng", "Kỹ thuật lắp đặt", "Kỹ thuật viên", "2020-02-10"),
  e(5, "Võ Thị Hà", "Kế toán", "Kế toán trưởng", "2020-04-20"),
  e(6, "Đặng Quốc Huy", "Bảo trì", "Trưởng nhóm bảo trì", "2020-08-03"),
  e(7, "Bùi Thanh Hương", "Thiết kế", "Kiến trúc sư", "2021-01-11"),
  e(8, "Ngô Văn Khánh", "Kho vận", "Thủ kho", "2021-03-22"),
  e(9, "Hồ Thị Lan", "Kinh doanh", "Nhân viên kinh doanh", "2021-07-05"),
  e(10, "Dương Văn Long", "Bảo trì", "Kỹ thuật viên", "2021-10-18"),
  e(11, "Phan Thị Mai", "Kế toán", "Kế toán viên", "2022-02-07"),
  e(12, "Trương Quang Minh", "Kỹ thuật lắp đặt", "Kỹ thuật viên", "2022-05-16"),
  e(13, "Lý Thị Ngọc", "Hành chính nhân sự", "Chuyên viên nhân sự", "2022-08-01"),
  e(14, "Đỗ Văn Nam", "Kho vận", "Nhân viên kho", "2022-11-14"),
  e(15, "Vũ Thị Oanh", "Kinh doanh", "Nhân viên kinh doanh", "2023-03-06", "onLeave"),
  e(16, "Huỳnh Văn Phúc", "Bảo trì", "Kỹ thuật viên", "2023-06-19"),
  e(17, "Mai Thị Quyên", "Thiết kế", "Nhân viên thiết kế", "2023-09-04"),
  e(18, "Tạ Văn Sơn", "Kỹ thuật lắp đặt", "Kỹ thuật viên", "2024-01-15", "resigned"),
  e(19, "Châu Thị Thảo", "Kế toán", "Kế toán viên", "2024-05-13"),
  e(20, "Lâm Văn Tuấn", "Bảo trì", "Kỹ thuật viên", "2025-02-17"),
  e(21, "Cao Thị Uyên", "Kinh doanh", "Nhân viên kinh doanh", "2026-05-11"),
  e(22, "Đinh Văn Việt", "Kỹ thuật lắp đặt", "Kỹ thuật viên", "2026-07-06"),
  e(23, "Kiều Thị Xuân", "Hành chính nhân sự", "Nhân viên hành chính", "2026-08-24"),
  e(24, "Thái Văn Yên", "Kho vận", "Nhân viên kho", "2026-10-05"),
];

const l = (
  n: number,
  employeeId: string,
  type: LeaveRequest["type"],
  from: string,
  to: string,
  reason: string,
  status: LeaveRequest["status"],
): LeaveRequest => ({ id: `l${n}`, employeeId, type, from, to, reason, status });

export const seedLeaves: LeaveRequest[] = [
  l(1, "e4", "annual", "2026-10-26", "2026-10-28", "Về quê có việc gia đình", "pending"),
  l(2, "e9", "sick", "2026-10-22", "2026-10-23", "Đi khám bệnh theo lịch hẹn", "approved"),
  l(3, "e12", "annual", "2026-11-02", "2026-11-06", "Nghỉ phép năm", "pending"),
  l(4, "e7", "other", "2026-10-30", "2026-10-30", "Làm thủ tục giấy tờ cá nhân", "pending"),
  l(5, "e16", "unpaid", "2026-11-09", "2026-11-13", "Việc riêng", "rejected"),
  l(6, "e5", "annual", "2026-10-12", "2026-10-14", "Nghỉ phép năm", "approved"),
  l(7, "e10", "sick", "2026-10-05", "2026-10-06", "Sốt, có giấy khám bệnh", "approved"),
  l(8, "e19", "annual", "2026-12-24", "2026-12-26", "Nghỉ cuối năm", "pending"),
  l(9, "e3", "other", "2026-09-28", "2026-09-28", "Việc gia đình", "approved"),
  l(10, "e20", "annual", "2026-11-16", "2026-11-18", "Du lịch cùng gia đình", "pending"),
];
