# Tiến độ chuyển bản đồ 2D sang 3D

Mẫu số lấy từ `docs/2d-to-3d-map-audit.md`. Tử số là số source reference đã có representation 3D tương ứng; không dùng phần trăm cảm tính. Collision ghi theo source object, dù một collider có thể được tách thành nhiều mảnh để chừa cổng hoặc được dùng chung khi hai source object trùng footprint.

| Map/Khu vực | Terrain | Roads | Buildings | Fixtures | Landmarks | Collision | Connection | Environment | Trạng thái |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Hoàn Kiếm | 7/7 (100%) | 30/30 (100%) | 60/60 (100%) | 0/0 (100%) | 5/5 (100%) | 66/66 (100%) + water/boundary | 3/3 (100%) | 75/75 (100%) | Hoàn tất coverage |
| Ba Đình | 9/9 (100%) | 34/34 (100%) | 26/26 (100%) | 0/0 (100%) | 5/5 (100%) | 31/31 (100%) + boundary | 2/2 (100%) | 79/79 (100%) | Hoàn tất coverage |
| Long Biên | 6/6 (100%) | 14/14 (100%) | 35/35 (100%) | 0/0 (100%) | 3/3 (100%) | 36/36 (100%) + water/rail/fall boundary | 2/2 (100%) | 70/70 (100%) | Hoàn tất coverage |
| Church Interior | 1/1 (100%) | 1/1 (100%) | 0/0 (100%) | 28/28 (100%) | 0/0 (100%) | 24/24 (100%) + boundary | 1/1 (100%) | 0/0 (100%) | Hoàn tất coverage |

Environment gồm `decorations + parkingSpots`. Bốn parking spot được dựng như bề mặt/biển báo tĩnh; 4 vehicle-restricted zones và 13 ambient vehicle routes được lưu/audit nhưng không nằm trong coverage geometry vì chúng là luật và animation dành riêng cho gameplay phương tiện.

## Hạng mục đã hoàn tất

- Registry đủ `hoanKiem`, `baDinh`, `longBien`, `churchInterior` và kiểm tra mọi destination tồn tại.
- Một hệ tọa độ tập trung chuyển `source X → -world X` (mirror nhất quán), `source Y → world Z`; outdoor dùng `0.12 world unit/pixel`, interior dùng scale tập trung `0.025` cho scene close-up độc lập.
- Hoàn Kiếm giữ cảnh Nhà thờ/phố/hồ đã làm tốt, đồng thời bổ sung representation đầy đủ cho inventory 2D.
- Ba Đình và Long Biên có district procedural riêng, landmark nhận diện được, bounds, spawn, collision và portal đầy đủ.
- Church Interior khớp 12 pew, 6 cột, 8 cửa kính, 24 source collider và khe cửa ra vào.
- Hai cổng Văn Miếu và lối Cầu Thê Húc được tách collider đúng walk zone; đây là repair hẹp cho các tường source cắt tuyến bắt buộc.
- Sông Hồng/Hồ Gươm không thể đi lên; hai deck Cầu Long Biên được khoét khỏi water collider, có lan can và barrier tại scenic dead end.
- Transition dùng đúng `targetX/targetY`; tất cả default spawn và arrival point đã được kiểm tra nằm trong bounds, trên walk zone và ngoài collider.
- Debug inspect hỗ trợ các điểm map/landmark được yêu cầu, không thêm gameplay.
- Cả 12 alias inspect đều trả destination tường minh, đứng ngoài collider và quay về landmark/điểm chính; cấu hình `sourcePoint`/`lookAtSource` được truyền nguyên vẹn qua `Game`.
- Bốn parking spot từ `maps.js` có source ID, footprint, vạch và biển `P` đúng dữ liệu; không tạo interaction, collider hay phương tiện.
- Phím `M` mở bản đồ SVG của đúng khu vực hiện tại; marker được chiếu từ world position về source map, cập nhật tọa độ và hướng nhìn. `M` đóng và tiếp tục, `Esc` đóng nhưng giữ chuột tự do.

## Bằng chứng kiểm thử

- `test/MapMigration.test.js` đối chiếu registry, inventory/count, ID, ánh xạ từng source ID sang builder, tọa độ, parking metadata, portal, spawn/arrival, navigation repair, water/bridge safety và Church Interior.
- `test/MapOverlay.test.js` kiểm tra topology hiển thị, phép chiếu marker trên cả 4 map, hướng marker qua trục mirror, clamp boundary và phím `M`/`Esc`.
- `test/DayNightCycle.test.js` kiểm tra Ba Đình/Long Biên dùng palette ngoài trời mà không gây lỗi area.
- Node integration test mount đủ bốn area, đi qua toàn bộ portal; helper-level test xác nhận cả 12 alias `?inspect=` đáp xuống vị trí hợp lệ và có hướng nhìn đúng.
- `npm test`: đạt 82/82 test, 0 fail (2026-07-23), bao gồm kiểm tra đường đi liên tục từ spawn tới mọi exit/landmark và marker bản đồ.
- `npm run build`: thành công với Vite 8.1.5, 77 module được transform (2026-07-23). Còn cảnh báo không chặn build về main chunk lớn hơn 500 kB; chưa code-split vì giai đoạn này chỉ tập trung coverage map.
