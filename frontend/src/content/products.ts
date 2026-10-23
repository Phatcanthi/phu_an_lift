// Product catalogue for /san-pham. The product types follow the range in the ELITE catalogue (see `about.range`
// in site.ts), and the villa lines reuse the catalogue text from `productLines`.
//
// PLACEHOLDER CONTENT: everything in a product marked `draft: true` that is not imported from site.ts (specs,
// highlights, taglines, applications) was filled in as an editable placeholder at the owner's request and is
// NOT from the catalogue. Most images are reused catalogue photos and do not show the actual product yet.
// Replace both with real data before publishing.

import { productLines } from "./site";

const IMG = "/images/catalogue";

export type CategoryId = "gia-dinh" | "tai-khach" | "chuyen-dung" | "thang-cuon";

export const categories: { id: CategoryId; label: string; note: string }[] = [
  { id: "gia-dinh", label: "Thang máy gia đình", note: "Biệt thự, nhà phố, căn hộ cải tạo" },
  { id: "tai-khach", label: "Thang máy tải khách", note: "Văn phòng, khách sạn, chung cư" },
  { id: "chuyen-dung", label: "Thang máy chuyên dụng", note: "Bệnh viện, nhà xưởng, nhà hàng, bãi xe" },
  { id: "thang-cuon", label: "Thang cuốn & băng tải", note: "Trung tâm thương mại, nhà ga, sân bay" },
];

export type Spec = { label: string; value: string };

export type Product = {
  slug: string;
  name: string;
  nameEn: string;
  category: CategoryId;
  tagline: string;
  summary: string[];
  /** The first image is the cover. */
  images: string[];
  /** Three or four headline figures shown on cards and at the top of the detail page. */
  highlights: Spec[];
  features: string[];
  specs: Spec[];
  doors?: string[];
  /** 3D model (glTF binary, authored in metres) shown with an AR button on the detail page. */
  ar?: { glb: string; alt: string };
  /** Show the cabin interior styles (V01 – V11) on the detail page. */
  cabins?: boolean;
  applications: string[];
  /** True while the product still carries placeholder content (see the note at the top of this file). */
  draft: boolean;
};

const [traction, platform, round] = productLines;

export const products: Product[] = [
  {
    slug: "thang-may-biet-thu-keo-cap",
    name: "Thang máy biệt thự kiểu kéo cáp",
    nameEn: "Traction villa elevator",
    category: "gia-dinh",
    tagline: "Êm ái, tiết kiệm điện, không cần phòng máy truyền thống",
    summary: [
      "Dòng thang máy gia đình kéo cáp sử dụng động cơ đồng bộ nam châm vĩnh cửu không hộp số và bộ điều khiển thông minh “All-in-one”, vận hành êm ái và tiết kiệm năng lượng.",
      traction.note ?? "",
    ],
    images: [traction.image, `${IMG}/villa-exterior.jpg`, `${IMG}/cabin-v01.jpg`, `${IMG}/gearless-cabin.jpg`, `${IMG}/cabin-v05.jpg`],
    highlights: [
      { label: "Tải trọng", value: "250 – 450 kg" },
      { label: "Tốc độ", value: "0,4 – 1,0 m/s" },
      { label: "Điểm dừng", value: "2 – 6 tầng" },
      { label: "Phòng máy", value: "Không cần" },
    ],
    features: traction.bullets ?? [],
    specs: [
      { label: "Tải trọng định mức", value: "250 / 320 / 400 / 450 kg" },
      { label: "Tốc độ định mức", value: "0,4 – 1,0 m/s" },
      { label: "Số điểm dừng", value: "2 – 6 điểm dừng" },
      { label: "Hành trình tối đa", value: "18 m" },
      { label: "Động cơ", value: "Đồng bộ nam châm vĩnh cửu, không hộp số" },
      { label: "Bộ điều khiển", value: "Tích hợp “All-in-one”" },
      { label: "Điều khiển cửa", value: "VVVF vòng kín" },
      { label: "Nguồn điện", value: "1 pha 220V / 3 pha 380V" },
      { label: "Cứu hộ khi mất điện", value: "Nguồn dự phòng UPS" },
    ],
    doors: traction.chips,
    ar: { glb: "/models/thang-may-elevator-only.glb", alt: "Mô hình 3D cabin thang máy ELITE" },
    cabins: true,
    applications: ["Biệt thự", "Nhà phố", "Căn hộ penthouse", "Nhà ở cải tạo"],
    draft: true,
  },
  {
    slug: "thang-may-biet-thu-nang-san",
    name: "Thang máy biệt thự kiểu nâng sàn",
    nameEn: "Platform villa elevator",
    category: "gia-dinh",
    tagline: "Lắp đặt linh hoạt trong không gian giếng thang hạn chế",
    summary: [
      "Thang máy nâng sàn với vách cabin kính cường lực, phù hợp cho biệt thự, nhà ở cải tạo hoặc công trình có không gian giếng thang hạn chế.",
      "Có thể lắp giữa cầu thang, cạnh cầu thang, sát tường hoặc trong giếng thang hiện hữu.",
    ],
    images: [platform.image, `${IMG}/champagne-villa.jpg`, `${IMG}/hero-living-room.jpg`, `${IMG}/cabin-v02.jpg`],
    highlights: [
      { label: "Tốc độ", value: "0,3 m/s" },
      { label: "Hành trình", value: "2,3 – 20 m" },
      { label: "Truyền động", value: "Đai thép" },
      { label: "Hố PIT", value: "≤ 100 mm" },
    ],
    features: platform.bullets ?? [],
    specs: platform.specs ?? [],
    cabins: false,
    applications: ["Biệt thự", "Nhà ở cải tạo", "Giếng thang hiện hữu", "Cạnh cầu thang bộ"],
    draft: true,
  },
  {
    slug: "thang-may-tron-biet-thu",
    name: "Thang máy tròn biệt thự",
    nameEn: "Round villa elevator",
    category: "gia-dinh",
    tagline: "Tác phẩm nghệ thuật giữa không gian sống",
    summary: [round.paragraphs?.[0] ?? ""],
    images: [round.image, `${IMG}/hero-living-room.jpg`, `${IMG}/villa-exterior.jpg`, `${IMG}/cabin-v06.jpg`],
    highlights: [
      { label: "Đường kính cabin", value: "Ø 900 – 1400 mm" },
      { label: "Tải trọng", value: "200 – 320 kg" },
      { label: "Tốc độ", value: "0,4 m/s" },
      { label: "Vách", value: "Kính cong" },
    ],
    features: [
      "Cabin hình tròn thiết kế riêng cho biệt thự",
      "Hệ thống bảo vệ an toàn toàn diện",
      "Vách kính cong cường lực, tầm nhìn 360°",
      "Khung giếng thang đồng bộ màu sơn với nội thất",
    ],
    specs: [
      { label: "Đường kính cabin", value: "Ø 900 / 1100 / 1400 mm" },
      { label: "Tải trọng định mức", value: "200 – 320 kg" },
      { label: "Tốc độ định mức", value: "0,4 m/s" },
      { label: "Số điểm dừng", value: "2 – 5 điểm dừng" },
      { label: "Vách cabin", value: "Kính cong cường lực nhiều lớp" },
      { label: "Giếng thang", value: "Hợp kim nhôm & kính" },
      { label: "Nguồn điện", value: "1 pha 220V" },
    ],
    doors: ["Cửa cong tự động", "Cửa cong mở tay"],
    applications: ["Sảnh biệt thự", "Giếng trời", "Không gian trưng bày"],
    draft: true,
  },
  {
    slug: "thang-may-ban-nguyet-biet-thu",
    name: "Thang máy bán nguyệt biệt thự",
    nameEn: "Semicircular villa elevator",
    category: "gia-dinh",
    tagline: "Rộng rãi hơn, ấn tượng hơn",
    summary: [round.paragraphs?.[1] ?? ""],
    images: [`${IMG}/champagne-villa.jpg`, round.image, `${IMG}/cabin-v08.jpg`, `${IMG}/cabin-v04.jpg`],
    highlights: [
      { label: "Tải trọng", value: "250 – 400 kg" },
      { label: "Tốc độ", value: "0,4 m/s" },
      { label: "Điểm dừng", value: "2 – 5 tầng" },
      { label: "Vách", value: "Kính bán nguyệt" },
    ],
    features: [
      "Kết cấu bán nguyệt tăng cảm giác rộng rãi",
      "Chứa được nhiều hành khách hơn cabin tròn",
      "Chế tác riêng theo nhu cầu của gia chủ",
      "Vách kính cường lực, bảo vệ an toàn toàn diện",
    ],
    specs: [
      { label: "Kích thước cabin", value: "Theo thiết kế" },
      { label: "Tải trọng định mức", value: "250 – 400 kg" },
      { label: "Tốc độ định mức", value: "0,4 m/s" },
      { label: "Số điểm dừng", value: "2 – 5 điểm dừng" },
      { label: "Vách cabin", value: "Kính cường lực + inox" },
      { label: "Nguồn điện", value: "1 pha 220V / 3 pha 380V" },
    ],
    doors: ["Mở bên", "Mở giữa"],
    cabins: true,
    applications: ["Biệt thự", "Sảnh khách sạn boutique", "Showroom"],
    draft: true,
  },
  {
    slug: "thang-may-tai-khach",
    name: "Thang máy tải khách",
    nameEn: "Passenger elevator",
    category: "tai-khach",
    tagline: "Vận hành ổn định cho tòa nhà nhiều tầng",
    summary: [
      "Thang máy tải khách cho văn phòng, khách sạn và chung cư, với cabin hoàn thiện theo phong cách kiến trúc của tòa nhà.",
    ],
    images: [`${IMG}/gearless-cabin.jpg`, `${IMG}/cabin-v01.jpg`, `${IMG}/cabin-v05.jpg`, `${IMG}/cabin-v04.jpg`],
    highlights: [
      { label: "Tải trọng", value: "450 – 1600 kg" },
      { label: "Tốc độ", value: "1,0 – 2,5 m/s" },
      { label: "Điểm dừng", value: "Đến 40 tầng" },
    ],
    features: [
      "Động cơ không hộp số, vận hành êm",
      "Điều khiển nhóm thông minh, giảm thời gian chờ",
      "Cửa VVVF đóng mở chính xác",
      "Cabin tùy chọn vật liệu hoàn thiện",
    ],
    specs: [
      { label: "Tải trọng định mức", value: "450 – 1600 kg" },
      { label: "Tốc độ định mức", value: "1,0 / 1,5 / 1,75 / 2,0 / 2,5 m/s" },
      { label: "Số điểm dừng", value: "Đến 40 điểm dừng" },
      { label: "Động cơ", value: "Không hộp số" },
      { label: "Điều khiển", value: "Đơn / Đôi / Nhóm" },
      { label: "Nguồn điện", value: "3 pha 380V" },
    ],
    doors: ["Mở giữa", "Mở bên"],
    cabins: true,
    applications: ["Văn phòng", "Khách sạn", "Chung cư", "Trung tâm thương mại"],
    draft: true,
  },
  {
    slug: "thang-may-quan-sat",
    name: "Thang máy quan sát (thang kính)",
    nameEn: "Panoramic elevator",
    category: "tai-khach",
    tagline: "Biến hành trình thành trải nghiệm thị giác",
    summary: [
      "Thang máy với vách kính trong suốt, trở thành điểm nhấn kiến trúc cho sảnh, mặt tiền hoặc giếng trời của công trình.",
    ],
    images: [`${IMG}/champagne-villa.jpg`, `${IMG}/platform-villa.jpg`, `${IMG}/hero-living-room.jpg`],
    highlights: [
      { label: "Tải trọng", value: "400 – 1350 kg" },
      { label: "Tốc độ", value: "1,0 – 1,75 m/s" },
      { label: "Vách", value: "Kính an toàn" },
    ],
    features: [
      "Vách kính an toàn nhiều lớp",
      "Hình dạng cabin tùy biến: vuông, tròn, đa giác",
      "Chiếu sáng trang trí cabin",
      "Giếng thang kính hợp kim nhôm",
    ],
    specs: [
      { label: "Tải trọng định mức", value: "400 – 1350 kg" },
      { label: "Tốc độ định mức", value: "1,0 – 1,75 m/s" },
      { label: "Vách cabin", value: "Kính an toàn nhiều lớp" },
      { label: "Hình dạng cabin", value: "Vuông / Tròn / Đa giác" },
      { label: "Nguồn điện", value: "3 pha 380V" },
    ],
    doors: ["Mở giữa", "Mở bên"],
    applications: ["Sảnh khách sạn", "Trung tâm thương mại", "Mặt tiền tòa nhà"],
    draft: true,
  },
  {
    slug: "thang-may-khong-phong-may",
    name: "Thang máy không phòng máy",
    nameEn: "Machine-room-less elevator",
    category: "tai-khach",
    tagline: "Tiết kiệm diện tích và chi phí xây dựng",
    summary: [
      "Máy kéo và tủ điều khiển được bố trí ngay trong giếng thang, không cần xây phòng máy trên mái.",
    ],
    images: [`${IMG}/traction-villa.jpg`, `${IMG}/gearless-cabin.jpg`, `${IMG}/cabin-v02.jpg`],
    highlights: [
      { label: "Tải trọng", value: "320 – 1050 kg" },
      { label: "Tốc độ", value: "1,0 – 1,75 m/s" },
      { label: "Phòng máy", value: "Không cần" },
    ],
    features: [
      "Không cần phòng máy, tiết kiệm diện tích mái",
      "Máy kéo nam châm vĩnh cửu nhỏ gọn",
      "Tiêu thụ điện năng thấp",
      "Lắp đặt nhanh",
    ],
    specs: [
      { label: "Tải trọng định mức", value: "320 – 1050 kg" },
      { label: "Tốc độ định mức", value: "1,0 – 1,75 m/s" },
      { label: "Số điểm dừng", value: "Đến 24 điểm dừng" },
      { label: "Vị trí máy kéo", value: "Đỉnh giếng thang" },
      { label: "Nguồn điện", value: "3 pha 380V" },
    ],
    doors: ["Mở giữa", "Mở bên"],
    cabins: true,
    applications: ["Nhà phố", "Văn phòng", "Khách sạn mini", "Chung cư thấp tầng"],
    draft: true,
  },
  {
    slug: "thang-may-phong-may-nho",
    name: "Thang máy phòng máy nhỏ",
    nameEn: "Small machine room elevator",
    category: "tai-khach",
    tagline: "Phòng máy gọn bằng diện tích giếng thang",
    summary: ["Phòng máy được thu gọn bằng diện tích mặt cắt giếng thang, thuận tiện cho bảo trì và sửa chữa."],
    images: [`${IMG}/gearless-cabin.jpg`, `${IMG}/cabin-v04.jpg`, `${IMG}/villa-exterior.jpg`],
    highlights: [
      { label: "Tải trọng", value: "450 – 1600 kg" },
      { label: "Tốc độ", value: "1,0 – 2,0 m/s" },
      { label: "Phòng máy", value: "Thu gọn" },
    ],
    features: [
      "Phòng máy bằng diện tích giếng thang",
      "Bảo trì thuận tiện",
      "Phù hợp tòa nhà cao tầng",
    ],
    specs: [
      { label: "Tải trọng định mức", value: "450 – 1600 kg" },
      { label: "Tốc độ định mức", value: "1,0 – 2,0 m/s" },
      { label: "Số điểm dừng", value: "Đến 32 điểm dừng" },
      { label: "Nguồn điện", value: "3 pha 380V" },
    ],
    doors: ["Mở giữa", "Mở bên"],
    cabins: true,
    applications: ["Chung cư", "Văn phòng", "Khách sạn"],
    draft: true,
  },
  {
    slug: "thang-may-thuy-luc",
    name: "Thang máy thủy lực",
    nameEn: "Hydraulic elevator",
    category: "tai-khach",
    tagline: "Giải pháp cho công trình thấp tầng, hố PIT nông",
    summary: ["Truyền động bằng xi lanh thủy lực, phù hợp công trình thấp tầng và tải trọng lớn."],
    images: [`${IMG}/platform-villa.jpg`, `${IMG}/villa-exterior.jpg`, `${IMG}/cabin-v05.jpg`],
    highlights: [
      { label: "Tải trọng", value: "250 – 2000 kg" },
      { label: "Tốc độ", value: "0,3 – 0,6 m/s" },
      { label: "Hành trình", value: "Đến 15 m" },
    ],
    features: ["Hố PIT nông", "Không cần phòng máy trên mái", "Vận hành ổn định, tải trọng lớn"],
    specs: [
      { label: "Tải trọng định mức", value: "250 – 2000 kg" },
      { label: "Tốc độ định mức", value: "0,3 – 0,6 m/s" },
      { label: "Hành trình tối đa", value: "15 m" },
      { label: "Truyền động", value: "Xi lanh thủy lực" },
    ],
    doors: ["Mở bên", "Cửa mở tay"],
    applications: ["Nhà ở thấp tầng", "Nhà xưởng", "Công trình cải tạo"],
    draft: true,
  },
  {
    slug: "thang-may-tai-benh-nhan",
    name: "Thang máy tải bệnh nhân",
    nameEn: "Hospital bed elevator",
    category: "chuyen-dung",
    tagline: "Cabin sâu cho giường bệnh, dừng tầng chính xác",
    summary: ["Cabin kích thước sâu chứa vừa giường bệnh và nhân viên y tế, vận hành êm và dừng tầng chính xác."],
    images: [`${IMG}/cabin-v01.jpg`, `${IMG}/gearless-cabin.jpg`, `${IMG}/cabin-v05.jpg`],
    highlights: [
      { label: "Tải trọng", value: "1600 – 2000 kg" },
      { label: "Tốc độ", value: "1,0 – 1,75 m/s" },
      { label: "Cabin", value: "Sâu, chứa giường" },
    ],
    features: ["Cabin sâu chứa giường bệnh", "Khởi động và dừng êm", "Ưu tiên khẩn cấp", "Vách inox dễ vệ sinh"],
    specs: [
      { label: "Tải trọng định mức", value: "1600 / 2000 kg" },
      { label: "Tốc độ định mức", value: "1,0 – 1,75 m/s" },
      { label: "Kích thước cabin", value: "1500 × 2700 mm" },
      { label: "Vách cabin", value: "Inox xước" },
    ],
    doors: ["Mở bên hai cánh", "Mở giữa"],
    applications: ["Bệnh viện", "Phòng khám", "Viện dưỡng lão"],
    draft: true,
  },
  {
    slug: "thang-may-tai-hang",
    name: "Thang máy tải hàng",
    nameEn: "Freight elevator",
    category: "chuyen-dung",
    tagline: "Kết cấu chắc chắn cho hàng hóa nặng",
    summary: ["Cabin và sàn gia cường cho hàng hóa nặng, phù hợp nhà xưởng, kho bãi và siêu thị."],
    images: [`${IMG}/gearless-cabin.jpg`, `${IMG}/villa-exterior.jpg`, `${IMG}/cabin-v04.jpg`],
    highlights: [
      { label: "Tải trọng", value: "1000 – 5000 kg" },
      { label: "Tốc độ", value: "0,5 – 1,0 m/s" },
      { label: "Sàn", value: "Thép chống trượt" },
    ],
    features: ["Sàn thép gân chống trượt", "Vách cabin gia cường", "Cửa lùa rộng"],
    specs: [
      { label: "Tải trọng định mức", value: "1000 – 5000 kg" },
      { label: "Tốc độ định mức", value: "0,5 – 1,0 m/s" },
      { label: "Sàn cabin", value: "Thép gân chống trượt" },
      { label: "Nguồn điện", value: "3 pha 380V" },
    ],
    doors: ["Mở bên", "Mở lùa lên"],
    applications: ["Nhà xưởng", "Kho bãi", "Siêu thị"],
    draft: true,
  },
  {
    slug: "thang-may-tai-o-to",
    name: "Thang máy tải ô tô",
    nameEn: "Car elevator",
    category: "chuyen-dung",
    tagline: "Đưa xe lên tầng, tối ưu diện tích đỗ",
    summary: ["Thang máy chuyên dụng vận chuyển ô tô giữa các tầng, phù hợp nhà phố, showroom và bãi đỗ xe."],
    images: [`${IMG}/villa-exterior.jpg`, `${IMG}/platform-villa.jpg`, `${IMG}/gearless-cabin.jpg`],
    highlights: [
      { label: "Tải trọng", value: "3000 – 5000 kg" },
      { label: "Tốc độ", value: "0,25 – 0,5 m/s" },
      { label: "Sàn", value: "Chịu tải ô tô" },
    ],
    features: ["Sàn chịu tải trọng lớn", "Cabin rộng cho xe 7 chỗ", "Cảm biến định vị xe"],
    specs: [
      { label: "Tải trọng định mức", value: "3000 – 5000 kg" },
      { label: "Tốc độ định mức", value: "0,25 – 0,5 m/s" },
      { label: "Kích thước sàn", value: "Theo thiết kế" },
    ],
    doors: ["Mở bên", "Mở giữa"],
    applications: ["Nhà phố", "Showroom ô tô", "Bãi đỗ xe"],
    draft: true,
  },
  {
    slug: "thang-may-tai-thuc-pham",
    name: "Thang máy tải thực phẩm (tời thực phẩm)",
    nameEn: "Dumbwaiter",
    category: "chuyen-dung",
    tagline: "Nhỏ gọn, chuyên chở món ăn và hàng nhẹ",
    summary: ["Tời thực phẩm cỡ nhỏ chuyên chở món ăn, đồ dùng giữa bếp và các tầng phục vụ."],
    images: [`${IMG}/cabin-v01.jpg`, `${IMG}/hero-living-room.jpg`],
    highlights: [
      { label: "Tải trọng", value: "50 – 300 kg" },
      { label: "Tốc độ", value: "0,4 m/s" },
      { label: "Cabin", value: "Inox" },
    ],
    features: ["Cabin inox dễ vệ sinh", "Cửa lùa lên", "Gọi tầng hai chiều"],
    specs: [
      { label: "Tải trọng định mức", value: "50 / 100 / 200 / 300 kg" },
      { label: "Tốc độ định mức", value: "0,4 m/s" },
      { label: "Vật liệu cabin", value: "Inox" },
    ],
    doors: ["Mở lùa lên"],
    applications: ["Nhà hàng", "Khách sạn", "Biệt thự"],
    draft: true,
  },
  {
    slug: "thang-cuon",
    name: "Thang cuốn",
    nameEn: "Escalator",
    category: "thang-cuon",
    tagline: "Di chuyển liên tục cho lưu lượng lớn",
    summary: ["Thang cuốn cho các công trình công cộng có lưu lượng người qua lại lớn."],
    images: [`${IMG}/villa-exterior.jpg`, `${IMG}/hero-living-room.jpg`],
    highlights: [
      { label: "Góc nghiêng", value: "30° / 35°" },
      { label: "Bề rộng bậc", value: "600 – 1000 mm" },
      { label: "Tốc độ", value: "0,5 m/s" },
    ],
    features: ["Chế độ chạy tiết kiệm khi vắng khách", "Tay vịn đồng bộ tốc độ", "Hệ thống an toàn nhiều lớp"],
    specs: [
      { label: "Góc nghiêng", value: "30° / 35°" },
      { label: "Bề rộng bậc", value: "600 / 800 / 1000 mm" },
      { label: "Tốc độ", value: "0,5 m/s" },
      { label: "Chiều cao nâng", value: "Đến 8 m" },
    ],
    applications: ["Trung tâm thương mại", "Nhà ga", "Sân bay"],
    draft: true,
  },
  {
    slug: "bang-tai-bo",
    name: "Băng tải bộ",
    nameEn: "Moving walk",
    category: "thang-cuon",
    tagline: "Di chuyển ngang hoặc dốc nhẹ cho xe đẩy",
    summary: ["Băng tải bộ cho quãng đường dài hoặc dốc nhẹ, thuận tiện cho người đi bộ kèm xe đẩy hàng."],
    images: [`${IMG}/villa-exterior.jpg`, `${IMG}/champagne-villa.jpg`],
    highlights: [
      { label: "Góc nghiêng", value: "0° – 12°" },
      { label: "Bề rộng", value: "800 – 1000 mm" },
      { label: "Tốc độ", value: "0,5 m/s" },
    ],
    features: ["Phù hợp xe đẩy siêu thị", "Chế độ chạy tiết kiệm", "Bề mặt chống trượt"],
    specs: [
      { label: "Góc nghiêng", value: "0° – 12°" },
      { label: "Bề rộng pallet", value: "800 / 1000 mm" },
      { label: "Tốc độ", value: "0,5 m/s" },
    ],
    applications: ["Siêu thị", "Sân bay", "Trung tâm thương mại"],
    draft: true,
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const categoryLabel = (id: CategoryId) => categories.find((c) => c.id === id)?.label ?? "";

/** Same category first, then the rest, never the product itself. */
export function relatedProducts(product: Product, count = 3) {
  const others = products.filter((p) => p.slug !== product.slug);
  return [...others.filter((p) => p.category === product.category), ...others.filter((p) => p.category !== product.category)].slice(
    0,
    count,
  );
}
