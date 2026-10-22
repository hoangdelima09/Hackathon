# Care Passport — Kế hoạch build trong ngày nộp bài

Lập lúc 11:15 thứ Năm 22/10/2026 (giờ Việt Nam). **Hạn nộp của Việt Nam: 18:00 hôm nay**
(`deadlineIso 2026-10-22T18:00:00+07:00` trong config của BTC). Đây là kế hoạch duy nhất
đang áp dụng. Kế hoạch cũ (P00–P11, PostgreSQL, S01–S17) đã bị xóa vì không làm kịp
trong khoảng 6 giờ còn lại. Cơ chế Tide lấy theo [TIDE-INTEGRATION](TIDE-INTEGRATION.md).

Mục tiêu là đủ điều kiện nộp: một prototype nhỏ chạy thật với TideCloak, video 2 phút và
README ≤300 từ. Bản demo phải chứng minh được bốn khoảnh khắc sau:

1. **GP A** mở được referral mà Patient A đã chia sẻ, sau khi 2/3 steward duyệt.
2. **GP B**, cùng vai trò GP và đã có bản sao ciphertext, vẫn bị **mạng Tide** từ chối.
3. Patient rút quyền của **Physio A**: lần giải mã kế tiếp bị từ chối.
4. **Một admin đơn lẻ** tự thêm mình vào nhóm pathology: change request bị kẹt ở 1/2,
   admin không giải mã được. Server chỉ lưu ciphertext.

## 0. Cập nhật lúc 15:30: trạng thái thật và lịch còn lại

Đã xong: scaffold, SDK (bản mới nhất, một bản duy nhất sau dedupe), code Phase C, realm `care-passport`
(license, IGA, client cổng 4300, mapper `groups`), 7 user, crypto role và membership
`/pa-*` (do `scripts/provision-demo.sh` tạo khi realm còn ở chế độ FirstAdmin). Còn thiếu: **chưa ai
link tài khoản Tide**. Tiến trình init đã chết lúc đang poll nên chưa có `data/tidecloak.json`.
Không chạy lại init. Dùng `scripts/finish-init.sh` (bước sau link của init) và
`scripts/finish-init.sh --grant-admin` (cấp `tide-realm-admin`, chuyển realm sang multi-admin).

| Giờ | Việc | Ai |
|---|---|---|
| 15:35–15:55 | H3 (link admin) → finish-init → `npm run dev` → doctor. H4: link 6 tài khoản còn lại **trước khi flip** | User + AI |
| 15:55–16:10 | `--grant-admin`, ký 3 policy ở `/steward` (G0), patient ghi và mở (G1), physio mở care plan | User thao tác, AI ghi EVIDENCE |
| 16:10–16:20 | Cấp `tide-realm-admin` cho steward-b/c (admin duyệt), kiểm tra CR mới có threshold 2 | User |
| 16:20–16:50 | **Quay video trong lúc chạy G2–G4** (share GP A 2/3, GP B leaked test, rút quyền physio, admin tự thêm mình bị kẹt 1/2) | User quay, AI hướng dẫn |
| 16:50–17:10 | ffmpeg → `demo.mp4`, EVIDENCE, README cuối | AI |
| 17:10–17:30 | User bảo commit/push, kiểm tra repo public, **nộp form trước 17:30** | User |

## 1. Việc chỉ người dùng làm được (AI không được tự làm thay)

| # | Khi nào | Việc |
|---|---|---|
| H1 | **Ngay bây giờ** | Hỏi Tide trên Discord `#support` (https://discord.gg/XBMd9ny2q5): *"Does the production network used by tideorg/tidecloak-dev:latest have the built-in RelationshipAttestation:1 contract? We are building a Group-subject per-record share for UNLOCKED (deadline 18:00 Vietnam today)."* |
| H2 | Trước khi chạy init | Tự điền vào `care-passport/.env` (file này không commit): `KC_BOOTSTRAP_ADMIN_PASSWORD` (mật khẩu tự chọn), `TIDE_LICENSE_EMAIL` (email thật của bạn) và `TIDE_TERMS_ACCEPTED=yes`. Chỉ ghi `yes` sau khi chính bạn đã đọc và đồng ý https://tide.org/legal. Không dán mật khẩu vào chat. |
| H3 | Khi init in ra invite link | Mở link, tạo tài khoản Tide cho admin (steward 1) và tự giữ mật khẩu. Hai câu hỏi của init nên trả lời: **giữ logo Tide** và **không thu thập thêm thông tin**, vì app dùng tên hiển thị synthetic trong fixtures. |
| H4 | Sau khi app login được | Mở 6 browser profile riêng (Chrome profile hoặc Firefox container) và đăng ký tài khoản Tide qua app với username đúng như sau: `patient-a`, `gp-a`, `gp-b`, `physio-a`, `steward-b`, `steward-c`. |
| H5 | Theo nhắc của AI | Trong TideCloak admin console, steward duyệt change request (bulk authorize). Mỗi lần duyệt có cửa sổ enclave mở ra, cần bật cho phép pop-up. |
| H6 | Lúc quay video | Bạn thao tác các browser profile theo [kịch bản demo](DEMO-SCENARIOS.md). AI chuẩn bị lệnh quay và nén video. |
| H7 | Trước 17:30 | Điền Google Form: tên nhóm `<trường>_<campus>_<team>_C2`, email thành viên, URL repo. |

## 2. Lịch theo giờ Việt Nam và điều kiện qua mỗi bước

| Giờ | Phase | Xong khi |
|---|---|---|
| 11:30–12:15 | **A.** Scaffold, init, doctor, login | `tide-doctor` báo `RESULT: OK` với `--url http://localhost:4300` và admin login được |
| 12:15–13:00 | **B.** Trang ký policy, gate G0, tạo tài khoản, roles, groups, 3 policy | Ký được policy `pa-referral` (G0). Patient ở cả 3 group, Physio ở `/pa-careplan` |
| 13:00–15:00 | **C.** Các màn hình patient, clinician, steward và API | Luồng chạy end-to-end với Tide thật |
| 15:00–15:30 | **D.** Thêm steward-b/c, threshold 2, chạy G1–G6 | `docs/EVIDENCE.md` có kết quả thật của từng gate |
| 15:30–16:30 | **E.** Quay và dựng video | `demo.mp4` dài khoảng 120 giây, dưới 100 MB, ở gốc repo |
| 16:30–17:15 | **F.** README cuối, SETUP, commit/push, kiểm tra repo public | Mở repo ở chế độ ẩn danh thấy README và video |
| 17:15–18:00 | Dự phòng và nộp form | Đã nộp form trước 17:30 |

**Quyết định lúc 13:30:** nếu G0 thất bại do mạng không có contract, chuyển sang Plan B
trong TIDE-INTEGRATION và sửa claim. Nếu tới 15:00 vẫn trễ, cắt theo thứ tự: activity
log → giao diện đẹp → trang steward (dùng console TideCloak thay) → G6. **Không cắt**
bốn khoảnh khắc demo và không thay Tide bằng mock.

## 3. Lệnh cụ thể (máy này: Linux, Node 26, Docker không cần sudo)

```bash
cd /home/duchoang2407/Work/Hackathon/care-passport
mkdir -p .tide-pack && curl -fsSL "https://mcp.tide.org/pack/templates.tgz" | tar -xz -C .tide-pack
cp -R --update=none .tide-pack/templates/nextjs-customer-portal/. ./   # không ghi đè README.md và docs/
# package.json: "name": "care-passport"
#   scripts: "dev": "next dev --webpack -p 4300", "start": "next start -p 4300"
npm install
cp .env.example .env    # bước H2 do người dùng điền
CLIENT_APP_URL=http://localhost:4300 npm run init   # chạy nền, chuyển invite link cho người dùng
```

Lưu ý môi trường:

- **Cổng 3000 (container `webdayhoc-app`) và 3100 (web khác của bạn) đã có người dùng.** Dùng 4300 cho app và cho
  `CLIENT_APP_URL`. Không dừng container của dự án khác. TideCloak dùng cổng 8080.
- `scripts/init-tidecloak.sh` có ba lệnh `sudo` (`rm`, `chown`, `docker run`) sẽ treo agent
  ở bước hỏi mật khẩu. User đang ở nhóm `docker` và có uid 1000 trùng với container, nên
  được phép bỏ `sudo` ở ba dòng đó. Đây là sửa đổi duy nhất được phép trong file đó.
- **Chỉ chạy init một lần.** Init xóa container `tidecloak` và `data/keycloakdb*`, tức là
  mất toàn bộ tài khoản đã enroll. Sau H3 tuyệt đối không chạy lại.
- Nếu MCP `tide-pack` không kết nối được, dùng `.tide-pack/` (các file `.md` trong
  `canon/`, `playbooks/`, `reference-apps/relationship-attestation/`). Chỉ đọc, không chạy
  file thực thi trong đó ngoài template đã copy.

## 4. Phạm vi app (tối thiểu, giữ nguyên các file auth của template)

Không sửa `next.config.ts`, `public/*.html`, `src/app/providers.tsx`,
`src/app/auth/redirect/page.tsx` và `src/lib/auth/*`. Route API mới bọc trong
`withAuth`/`withRole`.

- **Dữ liệu:** `data/app-db.json` (gitignored; chỉ chứa ciphertext, policy đã ký, request
  và event) + `fixtures/directory.json` (username → tên hiển thị synthetic, loại
  patient/gp/physio) + `fixtures/records.json` (3 record id, owner `patient-a`, group).
  Không dùng PostgreSQL hay Docker Compose.
- **`/steward`** (yêu cầu `tide-realm-admin`): ký policy cho từng record bằng
  `signRelationshipPolicy`, xem các yêu cầu share/withdraw của bệnh nhân, link tới
  console TideCloak.
- **`/patient`**: 3 thẻ record; nút ghi nội dung synthetic (mã hóa trong browser), Mở
  (giải mã), Chia sẻ với…, Rút quyền (tạo request), danh sách request kèm trạng thái
  thật: chờ 2/3 steward duyệt trong TideCloak.
- **`/clinician`**: chỉ hiện record có group nằm trong claim `groups` đã được verify; nút
  Mở. Thêm khung **"Leaked-copy test"**: lấy ciphertext và policy của một record bất kỳ
  qua `/api/demo/leaked/:id` (giả lập server bị lộ toàn bộ DB) rồi thử giải mã. Hiển thị
  nguyên văn lỗi từ chối của mạng Tide.
- **API:** xem [API-SPEC](API-SPEC.md). Danh tính lấy từ JWT đã verify
  (`preferred_username`, `groups`, roles), không lấy từ body hay header tự khai.

## 5. Prompt giao việc cho Claude Code (copy nguyên khối)

```text
Bạn triển khai Care Passport cho UNLOCKED. Hạn Việt Nam 18:00 hôm nay.
Đọc CLAUDE.md ở gốc repo, rồi care-passport/docs/BUILD-PLAN.md và TIDE-INTEGRATION.md.
Kiểm tra MCP tide-pack (gọi tide_list); không có thì dùng .tide-pack theo BUILD-PLAN.
Làm lần lượt Phase A→F, tự chuyển phase khi đạt điều kiện, cập nhật
care-passport/docs/EVIDENCE.md sau mỗi gate. Khi cần người dùng làm H1–H7, nói đúng
một việc cần làm rồi tiếp tục phần độc lập. Không tự điền email license hay đồng ý T&C,
không chạy lại init, không mock Tide, không commit/push khi chưa được bảo.
```
