# Bộ ảnh kiểm duyệt 3 NPC đặc biệt

Các ảnh trong thư mục này được chụp trực tiếp từ scene Three.js của game.

- `npc-a-*`: Anh kính cười — front, 3/4, side, back, dusk, night và celebration.
- `npc-b-*`: Cầu thủ Elite — front, 3/4, side, back, dusk và night.
- `npc-mo-*`: Mơ — front, 3/4, side, back, dusk, night và hội thoại.
- `all-special-npcs-dusk.png`: ba NPC trong scene lúc chiều tối.

Kết quả QA cuối:

- 124/124 test pass.
- Production build pass.
- Không có console error hoặc request 404 trong lượt kiểm tra front/3/4/side/back và day/dusk/night.
- Preset `special-npcs` lúc dusk: 1.102 calls, 56.014 triangles; baseline trước khi sửa là 1.166 calls, 60.782 triangles.
