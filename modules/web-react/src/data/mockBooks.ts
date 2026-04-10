export interface Book {
  bookUrl: string;
  name: string;
  author: string;
  coverUrl: string;
  intro: string;
  kind: string;
  wordCount: string;
  originName: string;
  origin?: string;
  totalChapterNum: number;
  durChapterIndex: number;
  durChapterTitle: string;
  durChapterPos?: number;
  durChapterTime: number;
  latestChapterTitle: string;
  latestChapterTime?: number;
  lastCheckCount: number;
  lastCheckTime: number;
  type?: number;
  group?: number;
  order?: number;
  canUpdate?: boolean;
  tocUrl?: string;
  charset?: string;
  variable?: string;
  syncTime?: number;
  readConfig?: Record<string, unknown>;
}

/** Book type utilities */
export const BOOK_TYPES = {
  VIDEO: 4,
  TEXT: 8,
  AUDIO: 32,
  COMIC: 64,
  LOCAL: 256,
} as const;

export function getBookTypeInfo(type?: number): { label: string; icon: string; color: string } {
  if (!type) return { label: 'Sách', icon: '📖', color: 'bg-primary/10 text-primary' };
  
  const isLocal = (type & BOOK_TYPES.LOCAL) !== 0;
  const baseType = type & ~BOOK_TYPES.LOCAL;
  
  const prefix = isLocal ? '📁 ' : '';
  
  if (baseType === BOOK_TYPES.VIDEO || type === BOOK_TYPES.VIDEO) {
    return { label: `${prefix}Video`, icon: '🎬', color: 'bg-red-500/10 text-red-600' };
  }
  if (baseType === BOOK_TYPES.COMIC || type === BOOK_TYPES.COMIC) {
    return { label: `${prefix}Truyện tranh`, icon: '🖼️', color: 'bg-purple-500/10 text-purple-600' };
  }
  if (baseType === BOOK_TYPES.AUDIO || type === BOOK_TYPES.AUDIO) {
    return { label: `${prefix}Sách nói`, icon: '🎧', color: 'bg-blue-500/10 text-blue-600' };
  }
  if (baseType === BOOK_TYPES.TEXT || type === BOOK_TYPES.TEXT) {
    return { label: `${prefix}Truyện chữ`, icon: '📖', color: 'bg-primary/10 text-primary' };
  }
  
  return { label: isLocal ? '📁 Cục bộ' : 'Sách', icon: '📖', color: 'bg-primary/10 text-primary' };
}

export interface BookChapter {
  index: number;
  title: string;
  bookUrl: string;
  url: string;
}

export const mockBooks: Book[] = [
  {
    bookUrl: "book-1",
    name: "Đấu La Đại Lục",
    author: "Đường Gia Tam Thiếu",
    coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop",
    intro: "Đường Tam, ngoại môn đệ tử của phái Đường Môn, vì trộm bí kíp nội môn Đường Môn mà bị truy sát, nhảy xuống vách núi tự vẫn nhưng lại được tái sinh ở một thế giới khác...",
    kind: "Huyền Huyễn,Kiếm Hiệp",
    wordCount: "12.5 triệu chữ",
    originName: "TruyenFull",
    totalChapterNum: 836,
    durChapterIndex: 234,
    durChapterTitle: "Chương 234: Đại chiến tại Đấu Hồn Trường",
    latestChapterTitle: "Chương 836: Đại kết cục",
    lastCheckCount: 5,
    lastCheckTime: Date.now() - 3600000,
    durChapterTime: Date.now() - 7200000,
  },
  {
    bookUrl: "book-2",
    name: "Phàm Nhân Tu Tiên",
    author: "Vong Ngữ",
    coverUrl: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300&h=400&fit=crop",
    intro: "Một thiếu niên nghèo bước vào giang hồ, trải qua biết bao gian nan thử thách trên con đường tu tiên...",
    kind: "Tiên Hiệp,Tu Chân",
    wordCount: "8.2 triệu chữ",
    originName: "SSTruyện",
    totalChapterNum: 2446,
    durChapterIndex: 1200,
    durChapterTitle: "Chương 1200: Linh Giới phong ba",
    latestChapterTitle: "Chương 2446: Đại kết cục",
    lastCheckCount: 0,
    lastCheckTime: Date.now() - 86400000,
    durChapterTime: Date.now() - 172800000,
  },
  {
    bookUrl: "book-3",
    name: "Ngã Dục Phong Thiên",
    author: "Nhĩ Căn",
    coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop",
    intro: "Một thế giới nơi kẻ mạnh là vua. Vương Lâm từ nhỏ đã kiên cường bất khuất, quyết tâm tu luyện để đạt đến đỉnh cao...",
    kind: "Tiên Hiệp,Huyền Huyễn",
    wordCount: "6.8 triệu chữ",
    originName: "TruyenFull",
    totalChapterNum: 2088,
    durChapterIndex: 0,
    durChapterTitle: "",
    latestChapterTitle: "Chương 2088: Phong thiên",
    lastCheckCount: 12,
    lastCheckTime: Date.now() - 1800000,
    durChapterTime: 0,
  },
  {
    bookUrl: "book-4",
    name: "Thần Đạo Đan Tôn",
    author: "Cô Đơn Phiêu Lưu",
    coverUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=400&fit=crop",
    intro: "Trần Tiêu Phong, chàng trai mang theo ký ức của kiếp trước, bắt đầu hành trình tu luyện đan đạo...",
    kind: "Huyền Huyễn,Luyện Đan",
    wordCount: "4.5 triệu chữ",
    originName: "TangThuVien",
    totalChapterNum: 1500,
    durChapterIndex: 890,
    durChapterTitle: "Chương 890: Thiên hỏa luyện đan",
    latestChapterTitle: "Chương 1500: Đan thành thiên hạ",
    lastCheckCount: 0,
    lastCheckTime: Date.now() - 604800000,
    durChapterTime: Date.now() - 3600000,
  },
  {
    bookUrl: "book-5",
    name: "Tru Tiên",
    author: "Tiêu Đỉnh",
    coverUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop",
    intro: "Trương Tiểu Phàm, một đứa trẻ mồ côi từ làng Thảo Miếu, tình cờ có được Thiên Thư và bắt đầu hành trình tu tiên...",
    kind: "Tiên Hiệp,Kỳ Huyễn",
    wordCount: "3.2 triệu chữ",
    originName: "MeTruyenChu",
    totalChapterNum: 650,
    durChapterIndex: 650,
    durChapterTitle: "Chương 650: Kết thúc",
    latestChapterTitle: "Chương 650: Kết thúc",
    lastCheckCount: 0,
    lastCheckTime: Date.now() - 2592000000,
    durChapterTime: Date.now() - 86400000,
  },
  {
    bookUrl: "book-6",
    name: "Bàn Long",
    author: "Ngã Cật Tây Hồng Thị",
    coverUrl: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=300&h=400&fit=crop",
    intro: "Lâm Lôi, hậu duệ của gia tộc Baruch, một gia tộc chiến binh nổi tiếng nhưng đã suy tàn. Cậu bé phát hiện một chiếc nhẫn bí ẩn...",
    kind: "Huyền Huyễn,Dị Giới",
    wordCount: "7.1 triệu chữ",
    originName: "TruyenFull",
    totalChapterNum: 806,
    durChapterIndex: 400,
    durChapterTitle: "Chương 400: Thánh vực",
    latestChapterTitle: "Chương 806: Hồng Mông chủ tể",
    lastCheckCount: 0,
    lastCheckTime: Date.now() - 172800000,
    durChapterTime: Date.now() - 259200000,
  },
  {
    bookUrl: "book-7",
    name: "Vũ Động Càn Khôn",
    author: "Thiên Tàm Thổ Đậu",
    coverUrl: "https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=300&h=400&fit=crop",
    intro: "Lâm Động, thiếu niên đến từ một gia tộc nhỏ bé, tình cờ có được Tổ Phù bí ẩn, từ đó bước lên con đường tu luyện...",
    kind: "Huyền Huyễn,Võ Hiệp",
    wordCount: "5.9 triệu chữ",
    originName: "SSTruyện",
    totalChapterNum: 1306,
    durChapterIndex: 120,
    durChapterTitle: "Chương 120: Huyền Đan cảnh",
    latestChapterTitle: "Chương 1306: Đại kết cục",
    lastCheckCount: 3,
    lastCheckTime: Date.now() - 7200000,
    durChapterTime: Date.now() - 14400000,
  },
  {
    bookUrl: "book-8",
    name: "Độc Bộ Thiên Hạ",
    author: "Nhĩ Căn",
    coverUrl: "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=300&h=400&fit=crop",
    intro: "Mạc Thiên Cơ, một thiếu niên bình thường nhưng mang trong mình sức mạnh phi thường. Hành trình chinh phục thiên hạ...",
    kind: "Huyền Huyễn",
    wordCount: "3.8 triệu chữ",
    originName: "TangThuVien",
    totalChapterNum: 980,
    durChapterIndex: 55,
    durChapterTitle: "Chương 55: Lần đầu xuất sơn",
    latestChapterTitle: "Chương 980: Chung cục",
    lastCheckCount: 0,
    lastCheckTime: Date.now() - 432000000,
    durChapterTime: Date.now() - 432000000,
  },
];

export const mockChapters: BookChapter[] = Array.from({ length: 50 }, (_, i) => ({
  index: i,
  title: `Chương ${i + 1}: ${["Khởi đầu mới", "Con đường tu luyện", "Đại chiến", "Bí ẩn cổ mộ", "Thần binh xuất thế", "Phong ba nổi lên", "Huyết chiến", "Đột phá cảnh giới", "Kỳ ngộ", "Thiên hạ vô song", "Ma giới xâm lấn", "Linh đan xuất lò", "Đấu pháp đại hội", "Bí cảnh thám hiểm", "Long hổ phong vân", "Thiên kiếp giáng lâm", "Tử chiến", "Niết bàn trùng sinh", "Đế vương chi lộ", "Chung cực quyết chiến"][i % 20]}`,
  bookUrl: "book-1",
  url: `chapter-${i}`,
}));

export const mockChapterContent = `
  <p>Ánh nắng chiều tà chiếu rọi qua cửa sổ, tạo nên những vệt sáng vàng ấm áp trên sàn đá cổ xưa. Gió nhẹ thổi qua, mang theo hương thơm ngào ngạt của hoa dã ngoại từ vườn sau.</p>
  
  <p>Đường Tam ngồi yên lặng trên bậc đá, đôi mắt nhìn xa xăm về phía chân trời. Trong lòng hắn, bao nhiêu suy nghĩ đang cuộn trào như sóng biển.</p>
  
  <p>"Thế giới này... thật sự khác biệt hoàn toàn với nơi ta từng sống," hắn tự nhủ, nhẹ nhàng nắm chặt bàn tay. Dù đã ở đây được vài tháng, nhưng mọi thứ vẫn còn rất mới mẻ và kỳ diệu.</p>
  
  <p>Hồn lực — thứ năng lượng thần kỳ mà mọi người ở thế giới này đều khao khát sở hữu. Đường Tam đã dần hiểu được cách vận dụng nó, nhờ vào trí nhớ và kinh nghiệm từ kiếp trước.</p>
  
  <p>Bỗng nhiên, một tiếng gọi vang lên từ phía sau: "Tam đệ! Tam đệ! Mau lên, sư phụ đang tìm cậu!"</p>
  
  <p>Đó là Tiểu Vũ, sư huynh cùng phòng của hắn. Cậu bé chạy hớt ha hớt hải, mặt đỏ bừng vì vận động quá sức.</p>
  
  <p>"Có chuyện gì vậy, sư huynh?" Đường Tam quay lại hỏi, vẻ mặt bình tĩnh như nước hồ thu.</p>
  
  <p>"Sư phụ nói... hôm nay bắt đầu dạy chúng ta thuật đúc hồn! Đây là cơ hội ngàn năm có một, mau lên nào!" Tiểu Vũ hào hứng nắm tay Đường Tam kéo đi.</p>
  
  <p>Thuật đúc hồn — nghệ thuật rèn luyện hồn lực thành vũ khí và công cụ. Đối với Đường Tam, người đã từng là bậc thầy ám khí ở kiếp trước, đây chính là lĩnh vực mà hắn có thể phát huy hết khả năng của mình.</p>
  
  <p>Một nụ cười nhẹ nhàng hiện lên trên khóe môi hắn. "Được, ta đi ngay."</p>
  
  <p>Hai người nhanh chóng chạy về phía đại sảnh chính của học viện. Trên đường đi, Đường Tam nhìn thấy nhiều đồng môn khác cũng đang hối hả di chuyển cùng hướng, ai nấy đều tràn đầy háo hức và kỳ vọng.</p>
  
  <p>Đại sảnh học viện rộng lớn, với những cây cột đá khổng lồ chạm trổ tinh xảo hình rồng phượng. Ánh sáng từ những viên đá phát quang trên trần nhà tỏa ra ánh sáng dịu nhẹ, tạo nên bầu không khí trang nghiêm và thần bí.</p>
  
  <p>Sư phụ — Ngọc Tiểu Cương — đã đứng sẵn ở trung tâm đại sảnh. Ông là một người đàn ông trung niên với vẻ ngoài phong trần nhưng đôi mắt sáng như sao, toát lên khí chất của bậc cường giả.</p>
`;
