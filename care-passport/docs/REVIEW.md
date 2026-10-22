# Review Care Passport theo yêu cầu UNLOCKED

## Vòng 2 — 22/10/2026, 11:00–11:45 (giờ Việt Nam)

Nguồn đối chiếu:

- Config chính thức của BTC: `tide.org/unlocked/config.js` (tiêu chí 25/20/20/20/15, FAQ,
  form và deadline theo vùng) và `app.js` (template README).
- Tide agent pack `@tideorg/mcp` 1.9.33, đọc qua MCP.
- Môi trường thực tế của máy này.

Ý tưởng phù hợp đề bài, nhưng bộ docs trước đó có những vấn đề làm AI không thể làm
xong trước hạn:

| Mức | Vấn đề | Đã xử lý |
|---|---|---|
| P0 | Hạn Việt Nam là **18:00 hôm nay**, trong khi kế hoạch P00–P11 (PostgreSQL, reconciliation, S01–S17) cần nhiều ngày | Thay bằng [BUILD-PLAN](BUILD-PLAN.md) theo giờ, có danh sách cắt giảm và điểm quyết định 13:30. Ba file kế hoạch cũ đã bị xóa theo đồng ý của chủ repo |
| P0 | Cơ chế chia sẻ giữa các user bị ghi là "unresolved", trong khi Tide đã có pattern chính thức: contract dựng sẵn `RelationshipAttestation:1`, mỗi record một group, kèm helper `relationship.ts` | Viết lại [TIDE-INTEGRATION](TIDE-INTEGRATION.md) theo pack, gate G0–G6 cụ thể và Plan B |
| P0 | Yêu cầu "patient tự cấp và thu quyền, không cần admin" **không khả thi** với contract dựng sẵn: grant phải qua admin hoặc quorum, còn owner-grant cần contract riêng do Tide deploy | Mô hình mới: patient yêu cầu, 2/3 steward thực thi, không ai làm được một mình. Sửa ARCHITECTURE, API-SPEC, DESIGN, README |
| P0 | Thiếu các bước bắt buộc phải do người làm: email license, đồng ý T&C, invite link, tạo tài khoản Tide cho từng nhân vật, duyệt trong enclave | Bảng H1–H7 trong BUILD-PLAN, CLAUDE.md và SETUP |
| P1 | Môi trường: cổng 3000 và 3100 đã bị dùng; init script dùng `sudo` nên agent bị treo; chạy lại init sẽ xóa realm; MCP npx bị timeout 30 giây | Dùng cổng 4300, bỏ `sudo`, ghi rõ "chỉ init một lần", chuyển `.mcp.json` sang MCP hosted (đã ✔ Connected) |
| P1 | Repo gốc không có README nên giám khảo không thấy overview; dòng "Built with" lệch template | Thêm `README.md` ở gốc đúng template (288/300 từ). `care-passport/README.md` thành README cho developer |
| P1 | Không có CLAUDE.md nên AI không tự nạp quy tắc dự án và quy tắc Tide | Thêm `CLAUDE.md` ở gốc repo |
| P2 | `.DS_Store` bị commit; chưa có `.gitignore` cho `.env` và `data/tidecloak.json` | Đã xóa `.DS_Store` và thêm `.gitignore` |

Vòng này chưa tạo code và chưa chạy Tide; mọi gate vẫn là "Not run". Kết quả thật ghi
trong [EVIDENCE](EVIDENCE.md).

## Định vị theo tiêu chí chấm

Care Passport là một ý tưởng gợi ý của BTC, nên không tự nhận là hoàn toàn mới. Điểm
khác biệt cần thể hiện:

- Mỗi record được bảo vệ bởi mạng Tide, không phải bởi API của mình.
- Bài "leaked-copy test" chứng minh GP B có ciphertext vẫn bị từ chối.
- Một admin đơn lẻ không mở được dữ liệu.

Đây là câu trả lời trực tiếp cho lưu ý của giám khảo: *"If your app would work exactly
the same with ordinary login and backend permissions, develop the idea further."*
