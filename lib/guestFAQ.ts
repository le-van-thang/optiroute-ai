/**
 * Guest Mode FAQ Engine for OptiRoute AI
 * Zero API calls - pure local Q&A matching with Vietnamese abbrev support.
 */

export interface FAQItem {
  keywords: string[];
  answer: string;
}

export const GUEST_SUGGESTIONS = [
  "Web này làm được gì?",
  "Tính năng chia tiền ntn?",
  "AI của web làm đc j?",
  "Có miễn phí ko?",
  "Cách tạo lịch trình",
  "Web có hỗ trợ nhóm k?",
  "Bảo mật dữ liệu ntn?",
  "Đăng ký mất bao lâu?",
];

export const FAQ_DATABASE: FAQItem[] = [
  // ===== GIỚI THIỆU CHUNG =====
  {
    keywords: ["optiroute", "web này", "app này", "trang web", "là gì", "giới thiệu", "về web", "làm gì", "chức năng", "tính năng"],
    answer: `🌟 **OptiRoute AI** là ứng dụng quản lý du lịch thông minh dành cho người Việt!\n\nMình giúp bạn:\n- 🗺️ **Lập lịch trình tự động** bằng AI chỉ trong vài giây\n- 💰 **Chia tiền nhóm** cực thông minh, tự tính toán ai nợ ai\n- 🤖 **Trợ lý AI** trả lời mọi câu hỏi về chuyến đi, chi tiêu\n- 📊 **Thống kê chi tiêu** trực quan với biểu đồ đẹp\n\n👉 *Đăng nhập để mở khoá toàn bộ tính năng và trải nghiệm AI thực tế!*`
  },
  {
    keywords: ["hello", "hi", "chào", "xin chào", "hey", "alo"],
    answer: `👋 Chào bạn! Mình là **OptiRoute Concierge** — trợ lý du lịch AI của trang web này!\n\nMình có thể giúp bạn tìm hiểu về:\n- Các tính năng của OptiRoute AI\n- Cách lên kế hoạch chuyến đi\n- Hướng dẫn sử dụng nhanh\n\n💡 *Đăng nhập để mình giúp bạn quản lý các chuyến đi và chi tiêu thực tế của mình nhé!*`
  },
  {
    keywords: ["cảm ơn", "cam on", "thanks", "thank you", "cmon", "cảm mơn"],
    answer: `😊 Không có gì! Mình luôn ở đây để hỗ trợ bạn.\n\n🔐 *Đăng nhập ngay để trải nghiệm phiên bản AI đầy đủ — phân tích chuyến đi và chi tiêu thực của bạn!*`
  },

  // ===== LỊCH TRÌNH =====
  {
    keywords: ["lịch trình", "lịch tr", "itinerary", "kế hoạch", "lên kế", "tạo lịch", "plan", "trip", "chuyến đi", "đi chơi"],
    answer: `✈️ **Tính năng Lịch trình thông minh** của OptiRoute AI:\n\n1. Bạn nhập điểm đến + số ngày + ngân sách\n2. **AI tự động tạo** lịch trình tối ưu theo từng ngày\n3. Gợi ý địa điểm ăn, chơi, ở phù hợp túi tiền\n4. Tự động tính chi phí ước tính từng hoạt động\n5. Cho phép chỉnh sửa linh hoạt\n\n🗺️ *Sau khi đăng nhập, bạn sẽ được AI lên kế hoạch cho chuyến đi tiếp theo chỉ trong 10 giây!*`
  },
  {
    keywords: ["đà lạt", "da lat", "dl"],
    answer: `🌸 **Đà Lạt** — thiên đường du lịch bạn đang hỏi về!\n\n**Chi phí tham khảo (2 người, 3 ngày):**\n- 🏨 Khách sạn: 300.000 – 800.000đ/đêm\n- 🍽️ Ăn uống: 200.000 – 400.000đ/người/ngày\n- 🎡 Tham quan: 100.000 – 300.000đ/ngày\n\n**Điểm nên ghé:** Hồ Xuân Hương, Đồi chè Cầu Đất, Thung lũng Tình Yêu, Làng Cù Lần...\n\n🔐 *Đăng nhập để AI tự tạo lịch trình Đà Lạt chi tiết, cá nhân hoá cho bạn!*`
  },
  {
    keywords: ["đà nẵng", "da nang", "đn"],
    answer: `🏖️ **Đà Nẵng** — thành phố đáng sống nhất Việt Nam!\n\n**Chi phí tham khảo (2 người, 4 ngày):**\n- 🏨 Khách sạn gần biển: 400.000 – 1.200.000đ/đêm\n- 🍽️ Hải sản tươi sống: 200.000 – 500.000đ/bữa\n- 🎡 Bà Nà Hills: 750.000đ/người\n\n**Điểm nên ghé:** Bãi biển Mỹ Khê, Bà Nà Hills, Hội An, Cầu Rồng...\n\n🔐 *Đăng nhập để AI lên lịch trình Đà Nẵng cá nhân hoá theo ngân sách của bạn!*`
  },
  {
    keywords: ["hà nội", "ha noi", "hn", "hni"],
    answer: `🏰 **Hà Nội** — thủ đô ngàn năm văn hiến!\n\n**Chi phí tham khảo (3 ngày):**\n- 🏨 Khách sạn khu phố cổ: 250.000 – 700.000đ/đêm\n- 🍜 Bún chả, phở, bún ốc: 30.000 – 80.000đ/bát\n- 🎡 Tham quan miễn phí: Hồ Hoàn Kiếm, phố đi bộ\n\n**Điểm nên ghé:** Phố cổ 36 phố phường, Văn Miếu, Lăng Bác, Hồ Tây...\n\n🔐 *Đăng nhập để AI tạo lịch trình Hà Nội tối ưu cho nhóm của bạn!*`
  },
  {
    keywords: ["hồ chí minh", "ho chi minh", "sài gòn", "sai gon", "hcm", "sg", "tphcm"],
    answer: `🌆 **TP. Hồ Chí Minh (Sài Gòn)** — thành phố không ngủ!\n\n**Chi phí tham khảo (3 ngày):**\n- 🏨 Khách sạn Q1: 400.000 – 1.500.000đ/đêm\n- 🍜 Ăn uống đa dạng: 50.000 – 200.000đ/người/bữa\n- 🚕 Di chuyển Grab: 50.000 – 150.000đ/ngày\n\n**Điểm nên ghé:** Bến Nhà Rồng, Dinh Độc Lập, Chợ Bến Thành, phố ẩm thực...\n\n🔐 *Đăng nhập để AI lên lịch trình Sài Gòn chuẩn xịn cho bạn!*`
  },
  {
    keywords: ["nha trang", "nt"],
    answer: `🌊 **Nha Trang** — thiên đường biển xanh!\n\n**Chi phí tham khảo (3 ngày):**\n- 🏨 Resort gần biển: 500.000 – 2.000.000đ/đêm\n- 🤿 Tour lặn ngắm san hô: 350.000 – 600.000đ/người\n- 🍤 Hải sản tươi: 200.000 – 500.000đ/bữa\n\n🔐 *Đăng nhập để AI lên lịch trình Nha Trang kèm chi phí chi tiết cho nhóm bạn!*`
  },
  {
    keywords: ["phú quốc", "phu quoc", "pq"],
    answer: `🏝️ **Phú Quốc** — đảo ngọc thiên đường!\n\n**Chi phí tham khảo (4 ngày 3 đêm):**\n- 🏨 Resort 3-4 sao: 1.000.000 – 3.000.000đ/đêm\n- ✈️ Vé máy bay khứ hồi: 1.500.000 – 3.000.000đ\n- 🍹 Sunset bar & ẩm thực: 300.000 – 700.000đ/ngày\n\n🔐 *Đăng nhập để AI tính toán ngân sách và lịch trình Phú Quốc tối ưu!*`
  },

  // ===== CHIA TIỀN =====
  {
    keywords: ["chia tiền", "chia tien", "split", "chia bill", "bill", "quyết toán", "tính tiền", "nợ", "ai nợ", "chia đều"],
    answer: `💸 **Tính năng Chia Tiền Thông Minh** của OptiRoute:\n\n✅ Nhập tổng chi phí chuyến đi\n✅ Thêm từng người tham gia\n✅ Ghi các khoản: khách sạn, ăn, vé, xăng...\n✅ **AI tự tính toán** ai nợ ai, bao nhiêu\n✅ Xuất báo cáo chia tiền rõ ràng\n\n**Ví dụ:** 5 người đi, tổng 10 triệu → AI tính toán chính xác từng người cần trả.\n\n🔐 *Đăng nhập để dùng tính năng chia tiền thực tế cho nhóm của bạn!*`
  },
  {
    keywords: ["nhóm", "group", "đi nhóm", "nhiều người", "bạn bè", "cả nhóm", "ng đi"],
    answer: `👥 **OptiRoute AI hỗ trợ đi nhóm rất mạnh!**\n\n- 👤 Mời thành viên vào chuyến đi cùng\n- 💰 Chia sẻ chi phí tự động\n- 📋 Lịch trình hiển thị cho cả nhóm\n- 💬 Không cần nhắn tin lòng vòng để tính tiền\n\n🔐 *Đăng nhập và mời nhóm bạn vào để quản lý chuyến đi dễ dàng hơn nhiều!*`
  },

  // ===== AI & CÔNG NGHỆ =====
  {
    keywords: ["ai", "trí tuệ nhân tạo", "gemini", "chatbot", "bot", "robot", "thông minh", "ai làm được", "ai có thể", "ai j"],
    answer: `🤖 **AI của OptiRoute** được tích hợp **Google Gemini 2.5 Flash** — một trong những AI mạnh nhất hiện nay!\n\nAI có thể:\n- 💬 Trả lời câu hỏi về chuyến đi, chi tiêu của bạn\n- 🗺️ Tự động tạo lịch trình từ A→Z\n- 📸 Phân tích ảnh hoá đơn, trích xuất số tiền\n- 🔍 Phân tích chi tiêu, đưa ra gợi ý tiết kiệm\n- 🗣️ Hiểu tiếng Việt kể cả viết tắt!\n\n🔐 *Đăng nhập để trải nghiệm AI thực sự với dữ liệu của bạn!*`
  },
  {
    keywords: ["vision", "ảnh", "hình", "photo", "image", "chụp", "scan", "hoá đơn", "receipt", "phân tích ảnh"],
    answer: `📸 **OptiRoute Vision AI** — Siêu năng lực phân tích ảnh!\n\n✅ Upload ảnh hoá đơn → AI tự đọc số tiền\n✅ Chụp menu nhà hàng → AI gợi ý món phù hợp ngân sách\n✅ Ảnh vé tham quan → AI nhập chi phí tự động\n✅ Ảnh bill nhà hàng → Chia tiền ngay lập tức\n\n🔐 *Đăng nhập để thử ngay tính năng Vision AI cực xịn này!*`
  },

  // ===== ĐĂNG KÝ / ĐĂNG NHẬP =====
  {
    keywords: ["đăng ký", "dang ky", "register", "tạo tài khoản", "tao tai khoan", "signup", "sign up", "mất bao lâu", "làm sao"],
    answer: `🚀 **Đăng ký OptiRoute AI cực nhanh!**\n\n1. Nhấn nút **"Bắt đầu ngay"** ở góc trên\n2. Điền email + mật khẩu (hoặc dùng Google)\n3. **Xong! Dùng ngay!** — không cần xác nhận email phức tạp\n\n⏱️ Chỉ mất **< 30 giây** để có tài khoản!\n\n🎁 Sau khi đăng ký bạn sẽ được:\n- Tạo không giới hạn chuyến đi\n- Dùng AI thực tế với dữ liệu cá nhân\n- Quản lý chi tiêu toàn diện`
  },
  {
    keywords: ["đăng nhập", "dang nhap", "login", "log in", "signin", "sign in", "quên mật khẩu", "mật khẩu"],
    answer: `🔐 **Đăng nhập vào OptiRoute AI:**\n\n- Nhấn **"Đăng nhập"** ở góc trên phải\n- Dùng email/mật khẩu đã tạo\n- Hoặc nhấn **"Google"** để đăng nhập siêu nhanh\n\n✨ Sau khi đăng nhập:\n- AI sẽ nhận ra bạn và đọc lịch sử chuyến đi\n- Trợ lý AI trả lời dựa trên dữ liệu thực của bạn\n- Chia tiền nhóm, biểu đồ chi tiêu đầy đủ`
  },
  {
    keywords: ["google", "facebook", "social login", "đăng nhập google", "login google"],
    answer: `✅ OptiRoute hỗ trợ **đăng nhập bằng Google và Facebook**!\n\nChỉ cần nhấn nút Google/Facebook trên trang đăng nhập → tự động tạo tài khoản và vào ngay.\n\n**Không cần nhớ mật khẩu** — cực kỳ tiện lợi!\n\n🔐 *Thử ngay bằng cách nhấn "Đăng nhập" ở góc trên nhé!*`
  },

  // ===== PHÍ & BẢO MẬT =====
  {
    keywords: ["miễn phí", "free", "mất tiền", "phí", "trả phí", "có tốn", "có mất", "bao nhiêu tiền", "giá", "pricing"],
    answer: `💚 **OptiRoute AI hoàn toàn MIỄN PHÍ** để sử dụng!\n\n✅ Tạo tài khoản: Miễn phí\n✅ Lịch trình AI: Miễn phí\n✅ Chia tiền nhóm: Miễn phí\n✅ Trợ lý AI chat: Miễn phí\n✅ Biểu đồ chi tiêu: Miễn phí\n\n🎉 Không có chi phí ẩn — không cần thẻ ngân hàng!\n\n🔐 *Đăng ký ngay và dùng miễn phí mọi tính năng nhé!*`
  },
  {
    keywords: ["bảo mật", "an toàn", "dữ liệu", "data", "privacy", "riêng tư", "hack", "thông tin cá nhân"],
    answer: `🔒 **Bảo mật dữ liệu tại OptiRoute AI:**\n\n- ✅ Mật khẩu được mã hoá **bcrypt** — không ai đọc được\n- ✅ Dữ liệu trên server **PostgreSQL** bảo mật cao\n- ✅ Token xác thực **NextAuth** chuẩn công nghiệp\n- ✅ Dữ liệu người dùng **riêng biệt tuyệt đối** — không ai xem được của nhau\n- ✅ Không bán dữ liệu cho bên thứ 3\n\n🛡️ *Bạn có thể yên tâm lưu thông tin chuyến đi và chi tiêu cá nhân!*`
  },

  // ===== TÍNH NĂNG ĐẶC BIỆT =====
  {
    keywords: ["biểu đồ", "thống kê", "bieu do", "chart", "graph", "recharts", "dashboard", "bảng điều khiển"],
    answer: `📊 **Biểu đồ & Thống kê Chi tiêu:**\n\nSau khi đăng nhập, bạn sẽ thấy:\n- 🥧 **Biểu đồ tròn** phân bổ chi tiêu: ăn uống, đi lại, lưu trú...\n- 📈 **Biểu đồ cột** chi tiêu theo tháng\n- 💰 Tổng chi tiêu, chi tiêu trung bình/ngày\n- 🏆 Chuyến đi tốn nhiều tiền nhất\n\n🔐 *Đăng nhập để xem dashboard cá nhân của bạn!*`
  },
  {
    keywords: ["ngôn ngữ", "language", "tiếng anh", "english", "đa ngôn ngữ", "i18n", "vi", "en"],
    answer: `🌐 **OptiRoute AI hỗ trợ 2 ngôn ngữ:**\n\n- 🇻🇳 **Tiếng Việt** — mặc định\n- 🇺🇸 **Tiếng Anh** (English)\n\nNhấn nút cờ **🇻🇳 VI** ở góc trên bên phải để đổi ngôn ngữ ngay lập tức!\n\nMọi nội dung sẽ chuyển đổi mượt mà, kể cả menu, thông báo và giao diện.`
  },
  {
    keywords: ["map", "bản đồ", "leaflet", "openstreetmap", "vị trí", "địa điểm", "navigation"],
    answer: `🗺️ **Tính năng Bản đồ Tương tác** (Coming soon):\n\nChúng mình đang phát triển bản đồ tích hợp **OpenStreetMap** để:\n- Hiển thị lộ trình chuyến đi trực quan\n- Tính khoảng cách giữa các điểm tham quan\n- Tối ưu thứ tự di chuyển tiết kiệm thời gian\n\n🔐 *Đăng nhập ngay để không bỏ lỡ khi tính năng này ra mắt!*`
  },
  {
    keywords: ["mobile", "điện thoại", "phone", "android", "ios", "app", "responsive", "màn hình nhỏ"],
    answer: `📱 **OptiRoute AI tương thích mọi thiết bị!**\n\n- ✅ Responsive design — đẹp trên mọi kích thước màn hình\n- ✅ Hoạt động tốt trên Chrome, Safari, Firefox\n- ✅ Tối ưu cho điện thoại Android & iOS\n\n📲 *Bạn có thể dùng ngay trên điện thoại mà không cần tải app!*\n\n🔐 *Đăng nhập trên điện thoại để dùng On-the-go!*`
  },
  {
    keywords: ["hotel", "khách sạn", "ks", "booking", "đặt phòng", "resort", "homestay"],
    answer: `🏨 **Gợi ý đặt phòng với OptiRoute AI:**\n\nKhi tạo lịch trình, AI sẽ:\n- Gợi ý loại chỗ ở phù hợp ngân sách\n- Ước tính giá theo khu vực\n- So sánh homestay vs khách sạn vs resort\n\n💡 **Mẹo:** Đặt trước 1-2 tháng thường rẻ hơn 20-40%!\n\n🔐 *Đăng nhập để nhận gợi ý lưu trú cá nhân hoá!*`
  },
  {
    keywords: ["ăn uống", "an uong", "food", "nhà hàng", "quán", "đặc sản", "món ăn", "ẩm thực"],
    answer: `🍜 **Ẩm thực được OptiRoute AI gơi ý:**\n\nAI phân tích theo từng điểm đến để gợi ý:\n- 🥗 Đặc sản địa phương không thể bỏ qua\n- 💰 Quán ngon giá tầm trung (100-200k/người)\n- ⭐ Quán được đánh giá cao\n- 📍 Vị trí gần lịch trình của bạn\n\n🔐 *Đăng nhập để AI gợi ý ẩm thực theo chuyến đi cụ thể của bạn!*`
  },
  {
    keywords: ["xe", "di chuyển", "transport", "máy bay", "mb", "xe bt", "xe bus", "taxi", "grab", "thuê xe"],
    answer: `🚗 **Phương tiện di chuyển — OptiRoute AI hỗ trợ:**\n\n- ✈️ **Máy bay:** Gợi ý hãng bay phù hợp ngân sách\n- 🚌 **Xe khách:** Tuyến liên tỉnh giá rẻ\n- 🛵 **Thuê xe máy:** Khuyến nghị theo điểm đến\n- 🚕 **Grab/Taxi:** Ước tính chi phí local\n\n💡 AI tự động tính chi phí di chuyển vào ngân sách chuyến đi!\n\n🔐 *Đăng nhập để tạo lịch trình tới ưu hoá di chuyển ngay!*`
  },

  // ===== CÂU HỎI VUI / KHÁC =====
  {
    keywords: ["hay không", "có tốt không", "nên dùng không", "đáng dùng", "review", "đánh giá", "giới thiệu"],
    answer: `⭐ **Tại sao nên dùng OptiRoute AI?**\n\n✅ **Tiết kiệm thời gian:** AI lên lịch trình thay vì mò mẫm Google hàng giờ\n✅ **Tiết kiệm tiền:** Tối ưu ngân sách, tránh chi tiêu vượt mức\n✅ **Tránh tranh cãi nhóm:** Chia tiền minh bạch, rõ ràng\n✅ **AI thông minh:** Hiểu tiếng Việt, kể cả viết tắt!\n✅ **Miễn phí 100%:** Không có điều khoản ẩn\n\n🔐 *Thử ngay — đăng ký chỉ mất 30 giây!*`
  },
  {
    keywords: ["contact", "liên hệ", "support", "hỗ trợ", "báo lỗi", "feedback", "góp ý", "bug"],
    answer: `📬 **Liên hệ & Hỗ trợ OptiRoute AI:**\n\nBạn có thể:\n- 📧 Email: support@optiroute.ai\n- 💬 Chat với trợ lý AI này bất kỳ lúc nào\n- 🐛 Gặp lỗi? Mô tả chi tiết cho mình biết nhé!\n\nChúng mình luôn lắng nghe và cải thiện sản phẩm dựa trên feedback của người dùng! 💚`
  },
  {
    keywords: ["ngân sách", "budget", "tiết kiệm", "rẻ", "giá rẻ", "tiết kiệm tiền", "cheap"],
    answer: `💰 **Mẹo du lịch tiết kiệm từ OptiRoute AI:**\n\n1. 📅 Đặt vé máy bay trước 1-2 tháng (tiết kiệm 30-50%)\n2. 🏨 Ở homestay thay khách sạn (rẻ hơn 40%)\n3. 🍜 Ăn quán địa phương, tránh quán tourist trap\n4. 🚌 Đi xe khách thay máy bay cho tuyến ngắn\n5. 🗓️ Tránh dịp lễ, du lịch ngày thường\n\n🔐 *Đăng nhập để AI tính toán ngân sách cụ thể cho chuyến đi của bạn!*`
  },
  {
    keywords: ["thời tiết", "weather", "mùa", "mùa mưa", "mùa khô", "khi nào đi", "nên đi tháng mấy"],
    answer: `🌤️ **Gợi ý thời điểm du lịch:**\n\n- 🌸 **Đà Lạt:** Đẹp nhất tháng 12 - 2 (hoa nở, khí hậu mát)\n- 🏖️ **Đà Nẵng:** Tháng 3 - 8 (nắng đẹp, biển xanh)\n- 🌆 **HCM:** Tháng 12 - 4 (mùa khô, không mưa)\n- 🏝️ **Phú Quốc:** Tháng 11 - 4 (nước trong, sóng êm)\n\n🔐 *Đăng nhập để AI gợi ý lịch trình theo thời điểm tốt nhất!*`
  },
  {
    keywords: ["passport", "visa", "hộ chiếu", "giấy tờ", "nước ngoài", "quốc tế", "international"],
    answer: `🛂 **Du lịch quốc tế với OptiRoute AI:**\n\nHiện tại OptiRoute tập trung vào du lịch **nội địa Việt Nam**.\n\nTuy nhiên AI có thể giúp bạn:\n- Gợi ý các điểm đến trong nước tuyệt vời\n- Tính toán chi phí nội địa chính xác\n- Lập lịch trình khắp 63 tỉnh thành\n\n🌏 *Chúng mình đang phát triển hỗ trợ quốc tế trong tương lai gần!*\n\n🔐 *Đăng nhập để dùng đầy đủ tính năng nội địa nhé!*`
  }
];

// Normalize Vietnamese text for matching
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
    .replace(/[èéẹẻẽêềếệểễ]/g, "e")
    .replace(/[ìíịỉĩ]/g, "i")
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
    .replace(/[ùúụủũưừứựửữ]/g, "u")
    .replace(/[ỳýỵỷỹ]/g, "y")
    .replace(/[đ]/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Simple Vietnamese abbreviation expander
function expandAbbreviations(text: string): string {
  const abbrevMap: Record<string, string> = {
    "ko": "không", "k": "không", "kh": "không",
    "dc": "được", "đc": "được",
    "vs": "với",
    "j": "gì",
    "ntn": "như thế nào",
    "cx": "cũng",
    "mk": "mình",
    "bn": "bao nhiêu",
    "tn": "bao nhiêu",
    "bh": "bây giờ",
    "trc": "trước",
    "r": "rồi",
    "v": "vậy",
    "lm": "làm",
    "dl": "đà lạt",
    "đn": "đà nẵng",
    "hn": "hà nội",
    "hni": "hà nội",
    "sg": "sài gòn",
    "hcm": "hồ chí minh",
    "nt": "nha trang",
    "ks": "khách sạn",
    "mb": "máy bay",
    "cp": "chi phí",
    "ok": "được",
    "oke": "được",
    "lịch tr": "lịch trình",
    "web": "trang web",
    "app": "ứng dụng",
  };
  
  let result = text.toLowerCase();
  // Word boundary replacement
  for (const [abbr, full] of Object.entries(abbrevMap)) {
    result = result.replace(new RegExp(`\\b${abbr}\\b`, 'gi'), full);
  }
  return result;
}

// Find best matching FAQ answer
export function findGuestAnswer(userMessage: string): string {
  const expanded = expandAbbreviations(userMessage);
  const normalized = normalize(expanded);
  const words = normalized.split(" ").filter(w => w.length > 1);

  let bestMatch: FAQItem | null = null;
  let bestScore = 0;

  for (const faq of FAQ_DATABASE) {
    let score = 0;
    for (const keyword of faq.keywords) {
      const normKeyword = normalize(keyword);
      if (normalized.includes(normKeyword)) {
        // Longer keyword matches score higher
        score += normKeyword.split(" ").length * 2;
      }
      // Partial word matching
      for (const word of words) {
        if (normKeyword.includes(word) || word.includes(normKeyword)) {
          score += 1;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  // Minimum score threshold to avoid garbage matches
  if (bestScore >= 2 && bestMatch) {
    return bestMatch.answer;
  }

  // Fallback for unrecognized questions
  return `🤔 Câu hỏi thú vị! Mình chưa có đủ thông tin để trả lời chính xác câu này.\n\nMình có thể giúp bạn về:\n- 🌟 Tính năng của OptiRoute AI\n- ✈️ Gợi ý địa điểm du lịch Việt Nam\n- 💰 Chi phí & ngân sách chuyến đi\n- 🔐 Đăng ký & đăng nhập\n\n*Thử hỏi: "Web này có tính năng gì?" hoặc "Cách tạo lịch trình?"*\n\n🔐 **Đăng nhập** để AI thực sự hiểu và trả lời mọi câu hỏi của bạn dựa trên dữ liệu cá nhân!`;
}
