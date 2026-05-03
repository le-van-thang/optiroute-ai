export interface ProvinceInfo {
  id: string;
  intro: { vi: string; en: string };
  chips: { icon: string; vi: string; en: string }[];
  landmarks: { vi: string; en: string }; // For placeholder
}

export const PROVINCE_DATA: Record<string, ProvinceInfo> = {
  "Hà Nội": {
    id: "hanoi",
    intro: {
      vi: "Thủ đô ngàn năm văn hiến với nét đẹp cổ kính, nhịp sống thanh bình hòa quyện cùng sự hiện đại.",
      en: "A thousand-year-old capital blending ancient charm, peaceful pace, and modern vibrancy."
    },
    landmarks: {
      vi: "VD: Hồ Hoàn Kiếm, Lăng Bác, Phố cổ Hà Nội...",
      en: "E.g: Hoan Kiem Lake, Ho Chi Minh Mausoleum, Old Quarter..."
    },
    chips: [
      { icon: "🏛️", vi: "Phố cổ & Lăng Bác 1 ngày", en: "Old Quarter & Ho Chi Minh Mausoleum" },
      { icon: "🚲", vi: "Tour xe đạp quanh Hồ Tây", en: "West Lake cycling tour" },
      { icon: "☕", vi: "Thử Cafe Giảng & Bún Chả lâu đời", en: "Try Cafe Giang & Legendary Bun Cha" },
      { icon: "🎭", vi: "Xem múa rối nước & Thăm Văn Miếu", en: "Water Puppet show & Temple of Literature" },
      { icon: "🍜", vi: "Food tour phố cổ đêm", en: "Old Quarter night food tour" }
    ]
  },
  "TP Hồ Chí Minh": {
    id: "hcmc",
    intro: {
      vi: "Thành phố năng động nhất Việt Nam, nơi giao thoa văn hóa đặc sắc và nhịp sống không ngủ.",
      en: "Vietnam's most dynamic city, a melting pot of unique cultures and a lifestyle that never sleeps."
    },
    landmarks: {
      vi: "VD: Landmark 81, Dinh Độc Lập, Bến Nhà Rồng...",
      en: "E.g: Landmark 81, Independence Palace, Ben Nha Rong Wharf..."
    },
    chips: [
      { icon: "🌇", vi: "Ngắm thành phố từ Landmark 81", en: "Landmark 81 viewing deck" },
      { icon: "🍝", vi: "Food tour Quận 4 - Thiên đường ăn vặt", en: "District 4 food tour - Street food heaven" },
      { icon: "🚢", vi: "Ăn tối trên du thuyền Sông Sài Gòn", en: "Dinner cruise on Saigon River" },
      { icon: "🏫", vi: "Dinh Độc Lập & Bưu điện thành phố", en: "Independence Palace & City Post Office" },
      { icon: "🏛️", vi: "Địa đạo Củ Chi nửa ngày", en: "Cu Chi Tunnels half day tour" }
    ]
  },
  "Đà Nẵng": {
    id: "danang",
    intro: {
      vi: "Thành phố đáng sống nhất Việt Nam với những cây cầu huyền thoại, bãi biển Mỹ Khê tuyệt đẹp và núi non hùng vĩ.",
      en: "Vietnam's most livable city with legendary bridges, beautiful My Khe beach, and majestic mountains."
    },
    landmarks: {
      vi: "VD: Cầu Rồng, Bà Nà Hills, Ngũ Hành Sơn...",
      en: "E.g: Dragon Bridge, Bana Hills, Marble Mountains..."
    },
    chips: [
      { icon: "🐉", vi: "Cầu Rồng & Cầu Tình Yêu đêm nay", en: "Dragon & Love Bridge tonight" },
      { icon: "⛰️", vi: "Ngũ Hành Sơn & Chùa Linh Ứng", en: "Marble Mountains & Linh Ung Pagoda" },
      { icon: "🏰", vi: "Bà Nà Hills - Cầu Vàng 1 ngày", en: "Bana Hills - Golden Bridge 1 day" },
      { icon: "🥘", vi: "Food tour Đà Nẵng: Mì Quảng, Bánh Xèo", en: "Danang Food Tour: Mi Quang, Pancakes" },
      { icon: "🏖️", vi: "Bán đảo Sơn Trà - Ngắm voọc chà vá", en: "Son Tra Peninsula - Douc langur viewing" }
    ]
  },
  "Quảng Nam": {
    id: "quangnam",
    intro: {
      vi: "Vùng đất di sản với Phố cổ Hội An lung linh đèn lồng và thánh địa Mỹ Sơn trầm mặc.",
      en: "A land of heritage with shimmering Hoi An Ancient Town and the silent My Son Sanctuary."
    },
    landmarks: {
      vi: "VD: Phố cổ Hội An, Thánh địa Mỹ Sơn, Biển An Bàng...",
      en: "E.g: Hoi An Ancient Town, My Son Sanctuary, An Bang Beach..."
    },
    chips: [
      { icon: "🏮", vi: "Phố cổ Hội An về đêm lung linh", en: "Shimmering Hoi An at night" },
      { icon: "🛶", vi: "Chèo thuyền thúng rừng dừa Bảy Mẫu", en: "Basket boat tour at Bay Mau forest" },
      { icon: "🏛️", vi: "Thăm Thánh địa Mỹ Sơn cổ kính", en: "Visit ancient My Son Sanctuary" },
      { icon: "🏖️", vi: "Biển An Bàng & Thưởng thức hải sản", en: "An Bang beach & Seafood dinner" },
      { icon: "🍜", vi: "Thử Cao Lầu & Cơm gà Bà Buội", en: "Try Cao Lau & Ba Buoi Chicken Rice" }
    ]
  },
  "Lâm Đồng": {
    id: "lamdong",
    intro: {
      vi: "Xứ sở ngàn hoa với không khí se lạnh, những đồi thông xanh ngát và vẻ đẹp lãng mạn của Đà Lạt.",
      en: "The land of a thousand flowers with cool air, green pine hills, and the romantic beauty of Da Lat."
    },
    landmarks: {
      vi: "VD: Hồ Xuân Hương, Thác Datanla, Dinh Bảo Đại...",
      en: "E.g: Xuan Huong Lake, Datanla Falls, Bao Dai Palace..."
    },
    chips: [
      { icon: "🏕️", vi: "Cắm trại săn mây Đà Lạt", en: "Dalat cloud hunting & camping" },
      { icon: "☕", vi: "Tour cafe 'sống ảo' view thung lũng", en: "Vibe cafe tour with valley view" },
      { icon: "🌊", vi: "Thác Datanla & Chèo thuyền hồ Tuyền Lâm", en: "Datanla Falls & Tuyen Lam kayaking" },
      { icon: "🍓", vi: "Tham quan vườn dâu & Vườn hoa thành phố", en: "Strawberry garden & Flower garden tour" },
      { icon: "🚂", vi: "Ga Đà Lạt & Trại Mát bằng tàu hỏa", en: "Dalat Station & Trai Mat by train" }
    ]
  },
  "Khánh Hòa": {
    id: "khanhhoa",
    intro: {
      vi: "Thiên đường biển đảo với vịnh Nha Trang xanh ngắt, cát trắng mịn và các khu nghỉ dưỡng cao cấp.",
      en: "A sea and island paradise with deep blue Nha Trang bay, fine white sand, and luxury resorts."
    },
    landmarks: {
      vi: "VD: Vịnh Nha Trang, Tháp Bà Ponagar, Hòn Mun...",
      en: "E.g: Nha Trang Bay, Ponagar Tower, Hon Mun Island..."
    },
    chips: [
      { icon: "🏖️", vi: "Tour 4 đảo & VinWonders Nha Trang", en: "4-island tour & VinWonders" },
      { icon: "🦞", vi: "Hải sản Bình Ba & Tắm bùn khoáng", en: "Binh Ba seafood & Mud bath" },
      { icon: "🏛️", vi: "Tháp Bà Ponagar & Chùa Long Sơn", en: "Ponagar Tower & Long Son Pagoda" },
      { icon: "🌊", vi: "Lặn biển ngắm san hô Hòn Mun", en: "Snorkeling at Hon Mun" }
    ]
  },
  "Kiên Giang": {
    id: "kiengiang",
    intro: {
      vi: "Nổi tiếng với đảo ngọc Phú Quốc tuyệt đẹp và quần đảo Nam Du hoang sơ.",
      en: "Famous for the stunning Pearl Island of Phu Quoc and the pristine Nam Du archipelago."
    },
    landmarks: {
      vi: "VD: Bãi Sao Phú Quốc, Vinpearl Safari, Chợ đêm Phú Quốc...",
      en: "E.g: Sao Beach Phu Quoc, Vinpearl Safari, Phu Quoc Night Market..."
    },
    chips: [
      { icon: "🏝️", vi: "Phú Quốc: Bãi Sao & Ngắm hoàng hôn", en: "Phu Quoc: Sao Beach & Sunset" },
      { icon: "🦒", vi: "Vinpearl Safari & Grand World", en: "Vinpearl Safari & Grand World" },
      { icon: "🐟", vi: "Thăm nhà thùng nước mắm & Vườn tiêu", en: "Fish sauce factory & Pepper garden" },
      { icon: "🚤", vi: "Tour cano 4 đảo Nam Phú Quốc", en: "South Phu Quoc 4-island speedboat tour" }
    ]
  },
  "Thừa Thiên Huế": {
    id: "hue",
    intro: {
      vi: "Cố đô tĩnh lặng với kiến trúc cung đình đặc sắc, nhịp sống chậm rãi và ẩm thực tinh tế.",
      en: "The quiet former capital with unique royal architecture, a slow pace of life, and refined cuisine."
    },
    landmarks: {
      vi: "VD: Đại Nội Huế, Sông Hương, Chùa Thiên Mụ...",
      en: "E.g: Hue Citadel, Huong River, Thien Mu Pagoda..."
    },
    chips: [
      { icon: "🏯", vi: "Đại Nội Huế & Các lăng tẩm hoàng gia", en: "Hue Imperial City & Royal Tombs" },
      { icon: "🛶", vi: "Nghe ca Huế trên sông Hương", en: "Listen to Hue songs on Huong River" },
      { icon: "🍜", vi: "Thưởng thức Bún Bò Huế & Bánh Bèo", en: "Enjoy Hue Beef Noodles & Fern-shaped cakes" },
      { icon: "⛩️", vi: "Chùa Thiên Mụ & Làng hương Thủy Xuân", en: "Thien Mu Pagoda & Thuy Xuan incense village" }
    ]
  },
  "Quảng Ninh": {
    id: "quangninh",
    intro: {
      vi: "Sở hữu kỳ quan thiên nhiên thế giới Vịnh Hạ Long cùng những hòn đảo kỳ vĩ.",
      en: "Home to the world natural wonder of Ha Long Bay and its majestic islands."
    },
    landmarks: {
      vi: "VD: Vịnh Hạ Long, Núi Yên Tử, Đảo Cô Tô...",
      en: "E.g: Ha Long Bay, Yen Tu Mountain, Co To Island..."
    },
    chips: [
      { icon: "🚢", vi: "Du thuyền ngủ đêm trên Vịnh Hạ Long", en: "Overnight cruise on Ha Long Bay" },
      { icon: "⛰️", vi: "Leo núi Yên Tử & Thăm chùa Đồng", en: "Hike Yen Tu Mountain & Dong Pagoda" },
      { icon: "🎡", vi: "Sun World Ha Long & Bãi Cháy", en: "Sun World Ha Long & Bai Chay" },
      { icon: "🏝️", vi: "Đảo Cô Tô - Thiên đường biển miền Bắc", en: "Co To Island - Northern sea paradise" }
    ]
  },
  "Lào Cai": {
    id: "laocai",
    intro: {
      vi: "Vùng núi cao hùng vĩ với đỉnh Fansipan - nóc nhà Đông Dương và thị trấn Sapa mờ sương.",
      en: "Majestic highlands with Fansipan peak - the roof of Indochina and the misty Sapa town."
    },
    landmarks: {
      vi: "VD: Đỉnh Fansipan, Bản Cát Cát, Ruộng bậc thang Mường Hoa...",
      en: "E.g: Fansipan Peak, Cat Cat Village, Muong Hoa Terraces..."
    },
    chips: [
      { icon: "🏔️", vi: "Chinh phục đỉnh Fansipan bằng cáp treo", en: "Conquer Fansipan peak by cable car" },
      { icon: "🎋", vi: "Trekking bản Cát Cát & Tả Van", en: "Trekking Cat Cat & Ta Van villages" },
      { icon: "🧣", vi: "Đi chợ tình Sapa & Thưởng thức đồ nướng", en: "Sapa love market & BBQ dinner" },
      { icon: "⛰️", vi: "Ngắm ruộng bậc thang Mường Hoa", en: "Muong Hoa valley terraced fields" }
    ]
  },
  "Ninh Bình": {
    id: "ninhbinh",
    intro: {
      vi: "Được mệnh danh là 'Hạ Long trên cạn' với danh thắng Tràng An và Tam Cốc Bích Động.",
      en: "Known as 'Ha Long Bay on land' with Trang An landscape and Tam Coc Bich Dong."
    },
    landmarks: {
      vi: "VD: Tràng An, Tam Cốc, Chùa Bái Đính...",
      en: "E.g: Trang An, Tam Coc, Bai Dinh Pagoda..."
    },
    chips: [
      { icon: "🛶", vi: "Thuyền Tràng An & Phim trường Kong", en: "Trang An boat tour & Kong film set" },
      { icon: "🏯", vi: "Cố đô Hoa Lư & Chùa Bái Đính", en: "Hoa Lu Ancient Capital & Bai Dinh Pagoda" },
      { icon: "⛰️", vi: "Hang Múa - Ngắm toàn cảnh Tam Cốc", en: "Mua Cave - Panoramic view of Tam Coc" },
      { icon: "🍲", vi: "Đặc sản Cơm cháy & Thịt dê núi", en: "Burnt rice & Mountain goat specialties" }
    ]
  },
  "Hà Giang": {
    id: "hagiang",
    intro: {
      vi: "Vùng đất địa đầu tổ quốc với những cung đường đèo hiểm trở và cao nguyên đá hùng vĩ.",
      en: "The country's northern frontier with rugged mountain passes and majestic karst plateaus."
    },
    landmarks: {
      vi: "VD: Đèo Mã Pì Lèng, Cột cờ Lũng Cú, Dinh họ Vương...",
      en: "E.g: Ma Pi Leng Pass, Lung Cu Flagpole, Vuong Palace..."
    },
    chips: [
      { icon: "🏍️", vi: "Chinh phục đèo Mã Pì Lèng & Sông Nho Quế", en: "Ma Pi Leng Pass & Nho Que River" },
      { icon: "⛰️", vi: "Dinh họ Vương & Cột cờ Lũng Cú", en: "Vuong Palace & Lung Cu Flagpole" },
      { icon: "🌸", vi: "Mùa hoa tam giác mạch cao nguyên đá", en: "Buckwheat flower season on the karst plateau" },
      { icon: "🎒", vi: "Hà Giang Loop - Tour xe máy 3 ngày", en: "Hà Giang Loop - 3-day motorbike tour" }
    ]
  },
  "Bà Rịa - Vũng Tàu": {
    id: "vungtau",
    intro: {
      vi: "Điểm đến nghỉ dưỡng biển lý tưởng gần Sài Gòn với những bãi tắm trải dài.",
      en: "Ideal seaside resort destination near Saigon with long stretches of beaches."
    },
    landmarks: {
      vi: "VD: Tượng Chúa Kitô Vua, Bãi Sau, Côn Đảo...",
      en: "E.g: Christ the King Statue, Back Beach, Con Dao Island..."
    },
    chips: [
      { icon: "🏖️", vi: "Tắm biển Bãi Sau & Bãi Trước", en: "Beach day at Back Beach & Front Beach" },
      { icon: "🗽", vi: "Tượng Chúa Kitô Vua & Ngọn Hải Đăng", en: "Christ the King Statue & Lighthouse" },
      { icon: "🦞", vi: "Ăn hải sản Gành Hào & Bánh khọt Cô Ba", en: "Ganh Hao seafood & Co Ba Banh Khot" },
      { icon: "🏝️", vi: "Du lịch Côn Đảo linh thiêng", en: "Visit the sacred Con Dao Island" }
    ]
  },
  "Cần Thơ": {
    id: "cantho",
    intro: {
      vi: "Thủ phủ miền Tây sông nước với chợ nổi Cái Răng nhộn nhịp và những vườn trái cây trĩu quả.",
      en: "The capital of the Mekong Delta with bustling Cai Rang floating market and fruit orchards."
    },
    landmarks: {
      vi: "VD: Chợ nổi Cái Răng, Bến Ninh Kiều, Vườn Mỹ Khánh...",
      en: "E.g: Cai Rang Floating Market, Ninh Kieu Wharf, My Khanh Garden..."
    },
    chips: [
      { icon: "🛶", vi: "Chợ nổi Cái Răng lúc sáng sớm", en: "Early morning Cai Rang floating market" },
      { icon: "🌳", vi: "Thăm vườn trái cây Mỹ Khánh", en: "Visit My Khanh fruit orchard" },
      { icon: "🏠", vi: "Nhà cổ Bình Thủy cổ kính", en: "Ancient Binh Thuy House" },
      { icon: "🌉", vi: "Bến Ninh Kiều & Cầu Tình Yêu về đêm", en: "Ninh Kieu Wharf & Love Bridge at night" }
    ]
  },
  "Bình Định": {
    id: "binhdinh",
    intro: {
      vi: "Xứ võ với vẻ đẹp hoang sơ của Quy Nhơn, Kỳ Co - Eo Gió và tháp Chăm cổ.",
      en: "The land of martial arts with the pristine beauty of Quy Nhon, Ky Co - Eo Gio, and Cham towers."
    },
    landmarks: {
      vi: "VD: Kỳ Co, Eo Gió, Tháp Đôi Quy Nhơn...",
      en: "E.g: Ky Co, Eo Gio, Twin Towers Quy Nhon..."
    },
    chips: [
      { icon: "🏖️", vi: "Kỳ Co - Eo Gió: Maldives của Việt Nam", en: "Ky Co - Eo Gio: Vietnam's Maldives" },
      { icon: "🏯", vi: "Tháp Đôi & Bảo tàng Quang Trung", en: "Twin Towers & Quang Trung Museum" },
      { icon: "🐚", vi: "Hòn Khô - Lặn ngắm san hô", en: "Hon Kho - Snorkeling" },
      { icon: "🍲", vi: "Thưởng thức nem nướng & Bún chả cá", en: "Enjoy grilled spring rolls & Fish cake noodles" }
    ]
  }
};

/** Default placeholder when no province is selected */
export const DEFAULT_LANDMARK_PLACEHOLDER = {
  vi: "VD: Cầu Rồng Đà Nẵng, Hồ Hoàn Kiếm...",
  en: "E.g: Dragon Bridge Da Nang, Hoan Kiem Lake..."
};
