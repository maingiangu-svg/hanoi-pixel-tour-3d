# Audit chuyển bản đồ 2D sang 3D

Ngày audit: 2026-07-23. Nguồn sự thật là `hanoi-pixel-tour-2d/src/data/maps.js` và bốn map mà registry này đăng ký. Gameplay, nhiệm vụ, NPC và phương tiện không nằm trong phạm vi chuyển đổi; shop được tính như một khối kiến trúc/collider của map.

## Quy ước đếm coverage

- **Terrain**: `groundPatches` và `water`.
- **Roads**: mọi `walkZones` (road, sidewalk, plaza, courtyard, path, bridge).
- **Buildings**: `buildings`, food shop và vehicle shop vì cả ba đều là vật cản tĩnh trong 2D.
- **Landmarks**: từng phần tử `landmarks`; landmark trùng footprint building vẫn chỉ dựng một mesh 3D nhưng giữ hai source reference.
- **Collision**: toàn bộ static solid rect mà `getSolidObjects()` trả về, cộng explicit `collisionBlocks`. Boundary ngoài hợp walk zone được kiểm tra riêng trong 3D.
- **Connection**: từng phần tử `exits`, bao gồm cửa nội thất.
- **Environment**: từng phần tử `decorations` và `parkingSpots`; chỉ các vật lớn/nguy hiểm mới được nâng thành collider 3D. Parking là bề mặt/biển báo tĩnh, không có interaction hay collision.
- **Fixtures**: nội thất tĩnh được renderer 2D dựng từ layout, gồm sanctuary, altar, pew, column và stained-glass window.

Phần trăm trong báo cáo tiến độ phải lấy tử số là số source reference đã có mesh/region/collider/portal tương ứng và mẫu số là số trong audit này.

## Registry tổng

| Map ID | Tên | Kích thước 2D | Spawn 2D | Terrain | Walk zones | Buildings | Fixtures | Landmarks | Static collision | Exits | Decorations | Parking |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `hoanKiem` | Hoàn Kiếm - Phố Cổ | 2800 × 1900 | (610, 1370) | 7 | 30 | 60 | 0 | 5 | 66 | 3 | 74 | 1 |
| `baDinh` | Ba Đình - Văn Miếu | 3000 × 2200 | (340, 1850) | 9 | 34 | 26 | 0 | 5 | 31 | 2 | 77 | 2 |
| `longBien` | Long Biên - Đồng Xuân | 3000 × 1800 | (150, 890) | 6 | 14 | 35 | 0 | 3 | 36 | 2 | 69 | 1 |
| `churchInterior` | Nhà thờ Lớn - Bên trong | 1400 × 980 | (688, 850) | 1 floor suy ra từ renderer/layout | 1 | 0 | 28 | 0 | 24 | 1 | 0 | 0 |

`maps.js` còn ghép ba collection liên quan phương tiện. Chúng đã được lưu nguyên ID/toạ độ trong `mapMobilityMetadata.js`, nhưng cách dùng trong 3D tuân thủ đúng phạm vi map-only:

| Map | Parking tĩnh | Vehicle-restricted zones | Ambient vehicle routes | Xử lý trong 3D |
| --- | ---: | ---: | ---: | --- |
| Hoàn Kiếm | 1 | 1 | 5 | Dựng parking; hai collection còn lại chỉ lưu metadata |
| Ba Đình | 2 | 2 | 3 | Dựng parking; hai collection còn lại chỉ lưu metadata |
| Long Biên | 1 | 1 | 5 | Dựng parking; hai collection còn lại chỉ lưu metadata |
| Church Interior | 0 | 0 | 0 | Không áp dụng |
| **Tổng** | **4/4** | **4/4 đã audit** | **13/13 đã audit** | Không thêm vehicle gameplay |

`vehicleRestrictedZones` chỉ chi phối route/movement của xe trong 2D nên không được biến thành collider người đi bộ. `ambientVehicles` phụ thuộc thời gian, thời tiết, traffic và quest nên không được instantiate/update trong giai đoạn này. Các field gameplay khác cũng được loại khỏi mẫu số map: 7 NPC ở mỗi outdoor map, 1 neighborhood + 1 companion return point tại Hoàn Kiếm và 24 congregation-seat anchors trong nội thất; không field nào bị hiểu nhầm là geometry còn thiếu.

## Hoàn Kiếm - Phố Cổ

Nguồn: `mapHoanKiem.js`, `mapHelpers.js`, `parking.js`.

### Terrain, đường và vùng đi bộ

- 6 ground patches: 2 paving, 1 plaza, 1 brick, 2 grass strips.
- 1 water: Hồ Gươm `[1318,294,760,860]`.
- 30 walk zones: 17 sidewalk, 10 road, 2 plaza, 1 bridge.
- Hai hành lang chính sang map khác nằm trên road phía tây `[0,1328,1280,112]` và trục road phía đông/nam quanh Nhà thờ.
- Restricted walking area Hồ Gươm `[1148,150,1082,1118]`; parking Hồ Gươm `[1040,1110,82,54]`.

### Buildings và collider

- 57 base buildings: 50 tube houses, 2 collective blocks, 1 apartment, 2 cafe fronts, 2 walls.
- 2 food shops và 1 vehicle shop; tổng mẫu số building là 60.
- 5 explicit cathedral collision blocks, chia hai tháp/khối giữa nhưng chừa cửa chính.
- 1 solid landmark mặc định: Đền Ngọc Sơn.
- Tổng 66 static collider source: 57 buildings + 3 shops + 5 explicit blocks + 1 temple.
- Wall source `[2070,244,44,1020]` cắt ngang phần giao duy nhất giữa walk zone Cầu Thê Húc và plaza Đền Ngọc Sơn. Bản 3D giữ nguyên footprint nhưng tách collider/mesh tại `[2070,690,44,54]` để sửa tuyến bắt buộc này.

### Landmarks

| ID | Kind | Rect 2D | Solid | Trạng thái 3D trước chuyển đổi |
| --- | --- | --- | --- | --- |
| `hoGuom` | lake | `[1318,294,760,860]` | không | Có một phần; sai tỷ lệ/boundary so với 2D |
| `denNgocSon` | temple | `[2126,638,154,124]` | có | Có, nhưng vị trí tương đối chưa khớp map 2D |
| `cauTheHuc` | redBridge | `[1848,690,292,54]` | không | Có, nhưng vị trí tương đối chưa khớp map 2D |
| `phoCo` | oldQuarter | `[188,168,920,420]` | không | Có một tuyến mẫu, chưa bao phủ toàn khu |
| `nhaThoLon` | cathedral | `[2348,548,270,194]` | 5 block riêng | Có chi tiết tốt; giữ lại và ghép vào coverage mới |

### Exits

| Exit | Vùng/điểm tương tác | Destination |
| --- | --- | --- |
| `enterNhaThoLon` | `[2460,710,48,42]`, interaction (2484,750) | `churchInterior` (688,850) |
| `busToBaDinh` | `[2448,1540,126,76]` | `baDinh` (340,1850) |
| `roadToLongBien` | `[36,1324,102,118]` | `longBien` (150,890) |

### Environment

74 decorations: skyline 2, pocket parking 2, alley mouth 2, Turtle Tower 1, lake rail 1, tree 9, lamp 12, bench 8, motorbike 8, power pole 5, bicycle 3, trash bin 3, electric box 2, planter 4, zebra 2, street sign 3, traffic sign 2 và 1 mỗi loại sign/tea corner/stools/vendor/banner. Ngoài ra có 1 parking spot chính xác từ `parking.js`, dựng tĩnh và không collision.

### Đánh giá 3D ban đầu

Nhà thờ, quảng trường nhỏ, một đoạn phố, một connector, Hồ Gươm, Cầu Thê Húc và Đền Ngọc Sơn đã có chất lượng blockout tốt. Tuy nhiên 3D chưa có representation one-to-one cho 30 walk zones, 60 building blocks, 74 environment items, full boundary và hai exit liên quận. Trạng thái: **đã có một phần, nhiều phần sai vị trí/tỷ lệ**.

## Ba Đình - Văn Miếu

Nguồn: `mapBaDinh.js`, `mapHelpers.js`.

### Terrain, đường và vùng đi bộ

- 7 ground patches: paving 2, plaza 2, grass 2, brick 1.
- 2 water: Ao Sen `[1760,508,250,132]`, Hồ Văn `[760,1510,250,88]`.
- 34 walk zones: 10 sidewalk, 5 road, 6 plaza, 9 courtyard, 4 path.
- Các trục chính: road ngang y≈960, road ngang y≈1780, road dọc x≈358, x≈1556 và x≈2496.

### Buildings và collider

- 24 base buildings: 2 admin, 6 walls, 9 tube houses, 4 collective, 2 apartment, 1 cafe front.
- 2 food shops; tổng mẫu số building là 26.
- 2 explicit water collision blocks.
- 3 solid landmarks mặc định: Lăng Bác, Chùa Một Cột, Hoàng Thành; Quảng trường và Văn Miếu `solid:false`.
- Tổng static collider source: 24 buildings + 2 shops + 2 water + 3 solid landmarks = 31.

### Landmarks

| ID | Kind | Rect 2D | Trạng thái 3D trước chuyển đổi |
| --- | --- | --- | --- |
| `quangTruongBaDinh` | plazaLabel | `[640,300,820,490]` | Chưa có |
| `langBac` | mausoleum | `[930,250,430,184]` | Chưa có |
| `chuaMotCot` | onePillar | `[1810,396,190,178]` | Chưa có |
| `hoangThanh` | citadel | `[1978,1102,500,238]` | Chưa có |
| `vanMieu` | gate/complex | `[690,1348,820,520]` | Chưa có |

### Exits

- `busBackHoanKiem` `[270,1818,128,76]` → `hoanKiem` (2450,1540).
- `busToLongBien` `[2550,960,128,76]` → `longBien` (1420,1320).

### Environment

77 decorations: skyline 2, pocket parking 2, alley 1, flags 5, trees 14, lamps 9, benches 7, lotus 5, steles 4, street signs 2, bicycles 2, bins 3, electric boxes 2, motorbikes 4, planters 5, Khuê Văn Các 1, zebra 2, bus signs 2, traffic signs 2, stools 1, vendor 1, banner 1. Ngoài ra có 2 parking spot chính xác từ `parking.js`, dựng tĩnh và không collision.

### Đánh giá 3D ban đầu

Không có district, terrain, landmark, collider hoặc connection Ba Đình tương ứng. Trạng thái: **chưa có**.

## Long Biên - Đồng Xuân

Nguồn: `mapLongBien.js`, `mapHelpers.js`.

### Terrain, đường và vùng đi bộ

- 5 ground patches: paving, brick 2, embankment, grass strip.
- 1 water: Sông Hồng `[1760,0,1240,1800]`.
- 14 walk zones: 5 sidewalk, 5 road, 2 plaza, 2 bridge.
- Bridge deck trên `[1080,530,1760,128]`, deck dưới `[1090,660,1760,64]`; cả hai là walkable.
- Cầu là scenic dead end ở bờ đông, không phải exit. Lối liên quận nằm ở mép tây và bus gần Đồng Xuân.

### Buildings và collider

- 32 base buildings: 22 tube houses, 2 collective, 1 apartment, 1 market hall, 2 cafe fronts, 2 walls và 2 tube houses khai báo riêng.
- 3 food shops; tổng mẫu số building là 35.
- 1 solid landmark mặc định là Chợ Đồng Xuân, trùng footprint market hall; 3D chỉ dựng một công trình nhưng giữ cả source reference.
- Tổng static collider source: 32 buildings + 3 shops + 1 solid market landmark = 36.
- 3D cần bổ sung rail collider ở hai cạnh deck và chặn river/fall area ngoài hợp walk zones; đây là yêu cầu an toàn mạnh hơn renderer 2D.

### Landmarks

| ID | Kind | Rect 2D | Trạng thái 3D trước chuyển đổi |
| --- | --- | --- | --- |
| `cauLongBien` | longBridge | `[1060,470,1800,270]` | Chưa có |
| `choDongXuan` | market | `[540,392,470,246]` | Chưa có |
| `songHong` | riverLabel | `[1760,0,1240,1800]` | Chưa có |

### Exits

- `roadBackHoanKiem` `[36,832,112,128]` → `hoanKiem` (90,1370).
- `busToBaDinhFromLongBien` `[1402,1310,128,76]` → `baDinh` (2550,960).

### Environment

69 decorations: skyline 2, pocket parking 2, alley 2, tree 6, lamp 9, power pole 5, motorbike 8, crate 5, stall 4, bicycle 3, street sign 2, bin 3, electric box 2, planter 4, bridge truss 1, rails 2, zebra 1, sign 1, bench 1, traffic sign 2, tea corner 1, stools 1, vendor 1, banner 1. Ngoài ra có 1 parking spot chính xác từ `parking.js`, dựng tĩnh và không collision.

### Đánh giá 3D ban đầu

Không có district, river, market, bridge, rail safety collider hoặc connection Long Biên tương ứng. Trạng thái: **chưa có**.

## Nội thất Nhà thờ Lớn

Nguồn: `churchInterior.js` và `renderChurchInterior.js`.

- 1 floor/walk zone courtyard `[54,50,1292,870]`, không cho vehicle.
- Layout: aisle 1, sanctuary 1, altar 1, 12 pews (6 hàng × 2 bên), 6 columns, 8 stained-glass windows và 24 congregation seat anchors.
- 24 static collision rects: 5 shell pieces, sanctuary 1, pews 12, columns 6. Tường cuối chừa khe cửa x=620..780.
- `churchDoorOut` `[648,862,104,48]`, interaction (700,876) → `hoanKiem` (2480,764).
- 3D ban đầu đã có shell, aisle/altar, pews, columns, windows và portal, nhưng số hàng và tỷ lệ chưa khớp: 16 pews thay vì 12, 10 columns thay vì 6, 10 windows thay vì 8; tường cuối dùng một collider kín. Trạng thái: **đã có một phần nhưng sai số lượng/tỷ lệ/cửa collision**.

## Ma trận coverage trước triển khai

| Khu vực | Có trong 2D | Trạng thái 3D ban đầu | Phần còn thiếu | Module 3D phụ trách |
| --- | ---: | --- | --- | --- |
| Hoàn Kiếm terrain/water | 7 | Một phần | full patches, exact lake boundary | `HoanKiemCoverageDistrict` + module hiện có |
| Hoàn Kiếm roads/walk zones | 30 | Một phần | one-to-one road/sidewalk/plaza/bridge | `HoanKiemCoverageDistrict` |
| Hoàn Kiếm buildings | 60 | Một phần | toàn bộ Phố Cổ, shop blocks, walls | `HoanKiemCoverageDistrict` |
| Hoàn Kiếm landmarks | 5 | Có hình nhưng topology chưa khớp | placement/scale/source refs | district + landmark builders hiện có |
| Hoàn Kiếm collision | 66 + boundary | Một phần | source blocks, water, non-walk boundary | district + collision helper |
| Hoàn Kiếm exits | 3 | 1 interior | Ba Đình và Long Biên | map registry/portals |
| Ba Đình | 34 zones, 26 structures, 5 landmarks | Chưa có | toàn bộ district | `BaDinhDistrict` |
| Long Biên | 14 zones, 35 structures, 3 landmarks | Chưa có | toàn bộ district | `LongBienDistrict` |
| Cầu Long Biên | 2 decks + truss + 2 rails | Chưa có | geometry, rails, fall/water collision | `LongBienDistrict` |
| Church Interior | 1 zone, 28 fixtures, 24 colliders, 1 exit | Một phần | exact count/layout/door gap | `ChurchInterior` |

## Topology kết nối bắt buộc

```text
churchInterior ⇄ hoanKiem ⇄ longBien
                     ⇄ baDinh ⇄ longBien
```

Mỗi hướng giữ đúng `targetX/targetY` của exit 2D. Transition chỉ hợp lệ khi destination tồn tại, target spawn nằm trong bounds, nằm trên walk zone và không overlap collider.
