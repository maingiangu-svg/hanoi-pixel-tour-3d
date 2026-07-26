const actor = (name, preset, animationOffset) => Object.freeze({
  name,
  preset,
  animationOffset,
})

const groups = {
  lakeExercise: [
    actor('Người tập thể dục ven hồ 1', 'elderly', 0.2),
    actor('Người tập thể dục ven hồ 2', 'middleAged', 1.1),
    actor('Người tập thể dục ven hồ 3', 'officeWorker', 2),
  ],
  lakeElderlyCouple: [
    actor('Cặp lớn tuổi ven hồ 1', 'elderly', 0.6),
    actor('Cặp lớn tuổi ven hồ 2', 'elderly', 1.7),
  ],
  lakeRunner: [
    actor('Người chạy qua nắng đẹp', 'student', 2.6),
  ],
  lakeBirdChildren: [
    actor('Em nhỏ cho chim ăn 1', 'child', 0.8),
    actor('Em nhỏ cho chim ăn 2', 'child', 2.1),
  ],
  lakeFamily: [
    actor('Gia đình dạo hồ phụ huynh 1', 'officeWorker', 0.4),
    actor('Gia đình dạo hồ phụ huynh 2', 'middleAged', 1.4),
    actor('Gia đình dạo hồ em nhỏ', 'child', 2.4),
  ],
  lakePhotoHelp: [
    actor('Khách nhờ chụp ảnh ven hồ 1', 'tourist', 0.9),
    actor('Khách nhờ chụp ảnh ven hồ 2', 'student', 1.9),
    actor('Người lạ giúp chụp ảnh ven hồ', 'officeWorker', 2.9),
  ],
  lakeReader: [
    actor('Người đọc sách ven hồ', 'student', 1.2),
  ],
  lakeSunsetCouple: [
    actor('Cặp đôi ngắm hoàng hôn 1', 'student', 0.5),
    actor('Cặp đôi ngắm hoàng hôn 2', 'officeWorker', 1.8),
  ],
  bridgeFamily: [
    actor('Gia đình trên Cầu Thê Húc 1', 'middleAged', 0.3),
    actor('Gia đình trên Cầu Thê Húc 2', 'officeWorker', 1.3),
    actor('Gia đình trên Cầu Thê Húc em nhỏ', 'child', 2.3),
  ],
  bridgePhotoHelp: [
    actor('Du khách nhờ chụp ảnh trên cầu', 'tourist', 0.7),
    actor('Người lạ giúp chụp ảnh trên cầu', 'student', 1.7),
  ],
  bridgeCouple: [
    actor('Cặp đôi ngắm hồ trên cầu 1', 'student', 0.4),
    actor('Cặp đôi ngắm hồ trên cầu 2', 'tourist', 1.6),
  ],
  bridgeRailPhotographer: [
    actor('Người chụp ảnh tựa lan can', 'tourist', 2.5),
  ],
  bridgeFriends: [
    actor('Bạn xem lại ảnh trên cầu 1', 'student', 0.8),
    actor('Bạn xem lại ảnh trên cầu 2', 'officeWorker', 1.9),
  ],
  bridgePointing: [
    actor('Người lớn chỉ cảnh trên cầu', 'middleAged', 0.6),
    actor('Em nhỏ ngắm cảnh trên cầu', 'child', 1.8),
  ],
  bridgeSilhouette: [
    actor('Bóng người trên Cầu Thê Húc', 'churchVisitor', 2.7),
  ],
  templeSignReader: [
    actor('Người đọc bảng Đền Ngọc Sơn', 'elderly', 0.9),
  ],
  templeTourists: [
    actor('Du khách đi chậm trong đền 1', 'tourist', 0.2),
    actor('Du khách đi chậm trong đền 2', 'tourist', 1.5),
  ],
  templeObserver: [
    actor('Người ngắm kiến trúc Đền Ngọc Sơn', 'officeWorker', 2.1),
  ],
  templeFamily: [
    actor('Gia đình nghỉ ở Đền Ngọc Sơn 1', 'middleAged', 0.5),
    actor('Gia đình nghỉ ở Đền Ngọc Sơn 2', 'child', 1.7),
  ],
  templePhotographer: [
    actor('Người chụp chi tiết kiến trúc đền', 'tourist', 2.4),
  ],
  templeRespectful: [
    actor('Người dừng trang nghiêm trong đền', 'churchVisitor', 1.1),
  ],
}

export const SCENIC_MOMENT_CAST_GROUPS = Object.freeze(
  Object.fromEntries(Object.entries(groups).map(([id, entries]) => [
    id,
    Object.freeze(entries),
  ])),
)

export const SCENIC_MOMENT_CAST = Object.freeze(
  Object.values(SCENIC_MOMENT_CAST_GROUPS).flat(),
)
