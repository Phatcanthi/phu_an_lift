// Content is taken from the company's ELITE catalogue (PHU AN ELITE - CATALOGUE) and from
// https://www.phuanlift.com. Do not add claims (history, certifications, partners, named
// projects, technical specs) that those sources do not state.
// Images live in public/images/catalogue (cropped from the catalogue) and public/images/logo.png.

const IMG = "/images/catalogue";

export const company = {
  name: "Thang máy Phú An",
  legalName: "Công ty Cổ phần Thang máy Phú An",
  legalNameEn: "Phu An Elevator Joint Stock Company",
  brand: "ELITE Elevators",
  slogan: "Phú An luôn luôn sẵn sàng phục vụ quý khách hàng",
  taxCode: "0309509480",
  address: "Số 6 đường số 1, Phường Bình Hưng Hòa, Thành phố Hồ Chí Minh",
  /** Query that Google Maps resolves to the right pin (the displayed `address` wording points elsewhere). */
  mapQuery: "6 Đ. số 1, Bình Hưng Hòa, Hồ Chí Minh, Vietnam",
  phone: "(028) 6273 9239",
  hotline: "0907 702 512",
  email: "nvquang2512@gmail.com",
  zalo: "https://zalo.me/0907702512",
  facebook: "https://www.facebook.com/phuanlift",
  website: "https://www.phuanlift.com",
};

/** `section` is the id on the home page that marks the link active while it is on screen. */
export const navItems = [
  { label: "Giới thiệu", href: "/#about", section: "about" },
  { label: "Công nghệ", href: "/#technology", section: "technology" },
  { label: "Sản phẩm", href: "/san-pham", section: "products" },
  { label: "Cabin", href: "/#cabins", section: "cabins" },
  { label: "Dịch vụ", href: "/#services", section: "services" },
  { label: "Liên hệ", href: "/#contact", section: "contact" },
];

export const hero = {
  badge: "Thang máy gia đình cao cấp nhập khẩu",
  title: ["Kiến tạo", "tinh hoa"],
  accent: "Tôn vinh nghệ thuật",
  lead: "Trong thời đại hiện đại, chỉ có phong cách là trường tồn. Thang máy ELITE là tác phẩm nghệ thuật quý giá trong không gian nội thất — định nghĩa lại phong cách thời thượng, dẫn dắt lối sống tinh tế.",
  image: `${IMG}/hero-living-room.jpg`,
};

export const stats = [
  { value: "12", label: "Dải sản phẩm", note: "Từ thang tải khách đến thang cuốn, băng tải bộ" },
  { value: "20 m", label: "Hành trình tối đa", note: "Thang máy biệt thự kiểu nâng sàn" },
  { value: "11", label: "Mẫu cabin", note: "V01 – V11, tiêu chuẩn và tùy chọn" },
];

export const about = {
  image: `${IMG}/villa-exterior.jpg`,
  paragraphs: [
    "Sở hữu trọn bộ thiết bị sản xuất, gia công tiên tiến cùng các dụng cụ kiểm định hoàn hảo, công ty thang máy chuyên nghiệp ELITE áp dụng toàn diện các công nghệ điều khiển thang máy hiện đại nhằm đảm bảo trình độ công nghệ sản xuất đạt tiêu chuẩn hàng đầu trong ngành.",
    "Từ khâu thiết kế đến sản xuất, từ lắp đặt đến bảo trì, chúng tôi luôn nỗ lực hết mình để đáp ứng từng yêu cầu riêng biệt của khách hàng. Mạng lưới dịch vụ toàn quốc cùng đội ngũ kỹ sư được đào tạo bài bản luôn tận tâm mang đến cho khách hàng chất lượng dịch vụ hoàn hảo.",
  ],
  range: [
    "Thang máy tải khách",
    "Thang máy quan sát (thang kính)",
    "Thang máy tải bệnh nhân",
    "Thang máy tải hàng",
    "Thang máy thủy lực",
    "Thang máy tải ô tô",
    "Thang máy phòng máy nhỏ",
    "Thang máy không phòng máy",
    "Thang máy gia đình (homelift)",
    "Thang máy tải thực phẩm (tời thực phẩm)",
    "Thang cuốn",
    "Băng tải bộ",
  ],
  lifecycle: ["Thiết kế", "Sản xuất", "Lắp đặt", "Nâng cấp cải tạo", "Bảo trì"],
};

export const technology = {
  image: `${IMG}/gearless-cabin.jpg`,
  items: [
    {
      icon: "controller",
      title: "Công nghệ dẫn đầu",
      text: "Bộ điều khiển thông minh thế hệ mới “All-in-one” thiết kế nhỏ gọn, tinh xảo, linh hoạt lắp đặt mọi vị trí mà không ảnh hưởng kiến trúc căn hộ.",
    },
    {
      icon: "motor",
      title: "Hiệu năng vượt trội & êm ái",
      text: "Động cơ đồng bộ nam châm vĩnh cửu không hộp số thế hệ mới, mang lại hiệu suất truyền động tối đa và vận hành siêu êm ái, không tiếng ồn.",
    },
    {
      icon: "door",
      title: "Công nghệ cửa VVVF thông minh",
      text: "Điều khiển vòng kín VVVF tiên tiến giúp cửa tầng và cabin đóng mở đồng bộ, chính xác và an toàn tuyệt đối.",
    },
    {
      icon: "leaf",
      title: "Giải pháp xanh bảo vệ môi trường",
      text: "Động cơ vận hành sạch 100%, không cần bôi trơn bằng dầu mỡ, loại bỏ nguy cơ ô nhiễm dầu và giúp tiết kiệm năng lượng vượt trội.",
    },
  ],
};

export const productLines = [
  {
    id: "traction",
    slug: "thang-may-biet-thu-keo-cap",
    tag: "Kiểu kéo cáp",
    title: "Thang máy biệt thự kiểu kéo cáp",
    image: `${IMG}/traction-villa.jpg`,
    bullets: [
      "Độ an toàn cao",
      "Diện tích tiếp xúc giữa cáp thép và bánh kéo lớn, vận hành êm ái hơn",
      "Tiêu thụ điện năng thấp, thân thiện với môi trường",
      "Puly kéo đường kính nhỏ giúp tiết kiệm không gian giếng thang",
      "Lớp polyurethane không cần bôi trơn, độ ồn thấp và tuổi thọ cao",
      "Không cần phòng máy truyền thống, tiết kiệm chi phí xây dựng",
      "Nguồn điện dự phòng UPS, có thể giải cứu hành khách khi mất điện",
    ],
    chips: ["Mở giữa", "Mở bên", "Cửa mở tay"],
    note: "Sản phẩm có thể được thiết kế riêng theo nhu cầu và điều kiện sử dụng của khách hàng.",
  },
  {
    id: "platform",
    slug: "thang-may-biet-thu-nang-san",
    tag: "Kiểu nâng sàn",
    title: "Thang máy biệt thự kiểu nâng sàn",
    image: `${IMG}/platform-villa.jpg`,
    bullets: [
      "Vách cabin kính cường lực, giảm nguy cơ va chạm giữa hành khách và giếng thang",
      "Lắp đặt trong biệt thự, nhà ở cải tạo hoặc công trình có không gian giếng thang hạn chế — giữa cầu thang, cạnh cầu thang, sát tường hoặc trong giếng thang hiện hữu",
      "Hệ cứu hộ: điện thoại liên lạc ngoài (tiêu chuẩn)",
    ],
    specs: [
      { label: "Chiều cao", value: "2400 mm" },
      { label: "Tốc độ định mức", value: "0,3 m/s" },
      { label: "Hành trình nâng", value: "2300 – 20000 mm" },
      { label: "Nguồn điện điều khiển", value: "DC48V / AC220V / 380V" },
      { label: "Hệ truyền động", value: "Đai thép" },
      { label: "Hố PIT", value: "Có hố: độ sâu dưới 100 mm · Không hố: ram dốc cao khoảng 100 mm" },
    ],
  },
  {
    id: "round",
    slug: "thang-may-tron-biet-thu",
    tag: "Thang máy tròn nghệ thuật",
    title: "Thang máy tròn & bán nguyệt biệt thự",
    image: `${IMG}/round-elevator.jpg`,
    paragraphs: [
      "Thang máy tròn biệt thự: ELITE ELEVATOR lấy việc tạo nên vẻ đẹp tinh tế trong từng chi tiết làm triết lý thiết kế. Cabin hình tròn được thiết kế riêng cho biệt thự, tích hợp hệ thống bảo vệ an toàn toàn diện, mang đến trải nghiệm di chuyển an tâm, êm ái và đáng tin cậy.",
      "Thang máy bán nguyệt biệt thự: cabin nhấn mạnh bằng kết cấu bán nguyệt, tăng cảm giác rộng rãi và nâng cao trải nghiệm thị giác, có thể chứa nhiều hành khách hơn, chế tác riêng theo nhu cầu của gia chủ.",
    ],
  },
];

export const wellFrames = {
  image: `${IMG}/champagne-villa.jpg`,
  steel: "Tiết kiệm chi phí; lớp hoàn thiện và thiết kế tấm ốp ngoài có thể tùy chọn để đồng bộ với phong cách tại vị trí lắp đặt; bề mặt xử lý phun chống gỉ, chống ăn mòn.",
  aluminum:
    "Thiết kế giếng thang kính độc lập không làm tăng chi phí xây dựng và có độ trong suốt cao, tích hợp hài hòa với không gian nội thất. Chống ăn mòn, tuổi thọ cao; dùng hợp kim nhôm cấp công nghiệp và kính an toàn nhiều lớp.",
  colors: [
    { name: "Trắng", css: "#f4f4f2" },
    { name: "Đen mờ", css: "#1b1b1d" },
    { name: "Vàng champagne", css: "#d9c7a3" },
    { name: "Xám cao cấp", css: "#9c9ea3" },
    { name: "Vàng hồng", css: "#c98f7c" },
    { name: "Vàng ánh kim", css: "#c9a227" },
  ],
};

export const cabins = [
  {
    code: "V01",
    name: "Phong cách tối giản hiện đại",
    level: "Tiêu chuẩn",
    image: `${IMG}/cabin-v01.jpg`,
    detail: "Trần inox gương, đèn LED âm trần · Vách inox xước, inox gương",
  },
  {
    code: "V02",
    name: "Nhịp điệu thời thượng",
    level: "Tùy chọn",
    image: `${IMG}/cabin-v02.jpg`,
    detail: "Vách inox vàng hồng phun cát / gương · Trần tấm xuyên sáng acrylic",
  },
  {
    code: "V04",
    name: "Tối giản hiện đại",
    level: "Tùy chọn",
    image: `${IMG}/cabin-v04.jpg`,
    detail: "Vách inox màu đồng xước, inox gương · Tay vịn sơn nghệ thuật",
  },
  {
    code: "V05",
    name: "Đường nét thanh lịch",
    level: "Tùy chọn",
    image: `${IMG}/cabin-v05.jpg`,
    detail: "Trần inox xước, dải đèn LED · Vách inox đồng xước, dải đèn LED ẩn",
  },
  {
    code: "V06",
    name: "Phong cách cổ điển",
    level: "Tùy chọn",
    image: `${IMG}/cabin-v06.jpg`,
    detail: "Vách inox đồng gương khắc hoa văn · Trần tấm xuyên sáng acrylic",
  },
  {
    code: "V08",
    name: "Phong cách cổ điển",
    level: "Tùy chọn",
    image: `${IMG}/cabin-v08.jpg`,
    detail: "Inox đồng gương khắc hoa văn · Tay vịn inox titan vàng gương tròn",
  },
];

export const cabinNote =
  "Sàn cabin: sàn đá tiêu chuẩn, tùy chọn PVC hoặc đá marble. Ngoài các mẫu trên, catalogue còn có V03 (vách sau cabin đá vân), V07, V09 (Champagne sang trọng), V10 (Không gian khoáng đạt) và V11 (Phong thái thanh lịch).";

export const services = {
  image: `${IMG}/advisor.jpg`,
  items: [
    {
      title: "Tư vấn trải nghiệm trước khi mua",
      text: "Dịch vụ tư vấn và hỗ trợ tận tâm; quý khách trực tiếp trải nghiệm sản phẩm trước khi đưa ra quyết định.",
    },
    {
      title: "Đặt lịch khảo sát tận nơi",
      text: "Liên hệ đường dây nóng để đặt lịch khảo sát. Đội ngũ kỹ thuật đến đúng hẹn và phân tích chi tiết các yêu cầu của quý khách.",
    },
    {
      title: "Thiết kế chuyên nghiệp, cấu hình theo yêu cầu",
      text: "Đội ngũ thiết kế xây dựng phương án riêng, phù hợp với kết cấu công trình cũng như phong cách kiến trúc và nội thất.",
    },
    {
      title: "Lắp đặt tận nơi",
      text: "Thông qua hệ thống đối tác được ủy quyền, vận chuyển thang máy đến địa điểm yêu cầu, lắp đặt, hiệu chỉnh và kiểm tra cho đến khi vận hành ổn định.",
    },
    {
      title: "Dịch vụ hậu mãi lâu dài",
      text: "Chương trình bảo trì, bảo dưỡng chuyên nghiệp trong suốt vòng đời thang máy; kiểm tra định kỳ và kịp thời để thang luôn vận hành an toàn, ổn định.",
    },
    {
      title: "Mạng lưới dịch vụ trên toàn quốc",
      text: "Chi nhánh và trung tâm dịch vụ tại nhiều tỉnh, thành phố, sẵn sàng hỗ trợ nhanh chóng cùng nguồn phụ tùng thay thế chính hãng.",
    },
  ],
};
