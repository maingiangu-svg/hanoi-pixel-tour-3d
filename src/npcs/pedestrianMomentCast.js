const actor = (name, preset, animationOffset) => Object.freeze({
  name,
  preset,
  animationOffset,
})

export const PEDESTRIAN_MOMENT_CAST = Object.freeze([
  actor('Vũ công phố đi bộ 1', 'student', 0.2),
  actor('Vũ công phố đi bộ 2', 'officeWorker', 1.1),
  actor('Vũ công phố đi bộ 3', 'tourist', 2),
  actor('Khán giả nhảy 1', 'middleAged', 2.9),
  actor('Khán giả nhảy 2', 'elderly', 3.8),
  actor('Người quay video phố đi bộ 1', 'student', 4.7),
  actor('Người quay video phố đi bộ 2', 'tourist', 5.6),
  actor('Em nhỏ bắt chước vũ công', 'child', 6.5),

  actor('Họa sĩ chân dung phố đi bộ', 'middleAged', 0.7),
  actor('Khách làm mẫu chân dung', 'tourist', 1.6),
  actor('Người xem vẽ 1', 'student', 2.5),
  actor('Người xem vẽ 2', 'elderly', 3.4),

  actor('Bạn chụp ảnh nhóm 1', 'student', 0.4),
  actor('Bạn chụp ảnh nhóm 2', 'officeWorker', 1.3),
  actor('Bạn chụp ảnh nhóm 3', 'tourist', 2.2),
  actor('Người cầm máy nhóm bạn', 'student', 3.1),

  actor('Khách chụp ảnh cùng gia đình 1', 'middleAged', 0.9),
  actor('Khách chụp ảnh cùng gia đình 2', 'child', 1.8),
  actor('Khách chụp ảnh cùng gia đình 3', 'elderly', 2.7),
  actor('Người lạ giúp chụp ảnh', 'tourist', 3.6),

  actor('Người bán kem cho gia đình', 'teaVendor', 0.5),
  actor('Phụ huynh mua kem', 'officeWorker', 1.4),
  actor('Em nhỏ nhận kem', 'child', 2.3),
  actor('Khách xếp hàng mua kem', 'student', 3.2),

  actor('Người bán kem cho cặp đôi', 'middleAged', 0.8),
  actor('Người trong cặp đôi ăn kem 1', 'student', 1.7),
  actor('Người trong cặp đôi ăn kem 2', 'tourist', 2.6),
  actor('Khách chờ mua kem', 'elderly', 3.5),
])

