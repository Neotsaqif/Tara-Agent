# Preferensi tampilan

Buka **Pengaturan → Tampilan**. Pilih **Kiri/Kanan** dan **Terang/Gelap/Abu-abu/Sistem**. Perubahan langsung berlaku, tanpa tombol Simpan. Radio native menunjukkan pilihan aktif selain warna. Tombol **Pratinjau Perubahan** existing tetap khusus pengaturan bisnis, bukan tampilan.

## Penyimpanan

- Key: `tara.appearance.v1`, berisi hanya `sidebarPosition` dan `theme`.
- Default: `left` + `system`. Sistem mengikuti perubahan light/dark perangkat selama aplikasi terbuka.
- Tema eksplisit tidak ditimpa OS. Storage event menyinkronkan tab pada origin yang sama.
- Nilai invalid kembali ke default per field. Jika storage diblokir/penuh, preferensi tetap bekerja di memori sesi.
- Reset hanya menulis default tampilan; tidak menghapus key/data lain.
- Bootstrap awal di `frontend/index.html` menetapkan atribut sebelum aplikasi dimuat untuk mengurangi flash. Validasi harus tetap selaras dengan `frontend/src/state/appearance.ts`.

## Implementasi

- Store React `useSyncExternalStore`, listener OS/storage bersama dan cleanup ketika subscriber terakhir dilepas.
- Satu sidebar; atribut root mengatur sisi desktop dan transform drawer pada lebar di bawah 1024px. Tidak memakai RTL atau collapse baru.
- Drawer memiliki tombol tutup, backdrop, Escape, focus trap/restoration, background inert dan scroll lock. Navigasi menutup drawer. Area navigasi/riwayat dapat discroll tanpa meruntuhkan pencarian pada viewport pendek.
- Semantic tokens meliputi surface, teks, status, input, dialog, chat, chart, shadow dan Bootstrap. Ikon nonbrand serta seri grafik memakai mask aset SVG existing agar warna mengikuti tema tanpa mengubah geometry. Brand tetap dipertahankan.
- React subtree halaman tidak diberi key berdasarkan preferensi; draft/form/search/filter/disclosure tidak direset saat tampilan berubah.

## Verifikasi 29 Oktober 2026

- `npm run build`: lulus, mencakup `tsc -b` dan Vite production build.
- `npm run lint`: lulus.
- `npm run format:check`: lulus.
- `npm run test`: 152 test, 18 file, lulus.
- `npm run test:e2e`: 84 test Chromium, lulus.
- Matriks 375/768/1024/1440px × kiri/kanan × empat preferensi tema: persistensi reload, route/form retention, geometry, overflow dan axe lulus.
- Semua halaman demo utama serta simulasi diperiksa dengan axe dalam Terang/Gelap/Abu-abu. Tidak ada violation pada kondisi yang diuji. Ini bukan sertifikasi aksesibilitas menyeluruh.
- Drawer: tombol/backdrop/Escape, focus wrap/restoration, inert, scroll lock, perubahan sisi saat terbuka dan navigasi diuji. Pencarian serta Pengaturan terjangkau pada tinggi 420/600/700/900px.
- OS changes, tema eksplisit, storage invalid/blocked, scoped reset, chat draft/search/disclosure serta header filter retention diuji.
- Baseline overview diperbarui setelah diff ditinjau: border input lebih jelas dan ikon mengikuti currentColor. Layout/chart geometry tetap dipertahankan; threshold tes tidak dilonggarkan.

## Screenshot

- [Terang, kiri, desktop](screenshots/appearance/light-left-1440.png)
- [Gelap, kanan, desktop](screenshots/appearance/dark-right-1440.png)
- [Abu-abu, kanan, desktop](screenshots/appearance/gray-right-1440.png)
- [Kontrol Tampilan](screenshots/appearance/settings-gray-1440.png)
- [Drawer gelap kiri](screenshots/appearance/drawer-dark-left-375.png)
- [Drawer gelap kanan](screenshots/appearance/drawer-dark-right-375.png)

Screenshot dihasilkan oleh test Playwright dan ditinjau sebagai gambar. Tidak memuat data bisnis nyata.

## Batas verifikasi

Figma design context meminta layer terpilih walaupun node diberikan; screenshot node berupa canvas sangat besar. Struktur mengikuti screenshot pengguna dan komponen existing, bukan verifikasi pixel-perfect detail Figma. Browser desktop bawaan tidak terhubung; pengujian browser memakai Chromium Playwright. Firefox/Safari, perangkat fisik, screen reader manual dan seluruh variasi state bisnis tidak diuji. Backend/auth/logika bisnis tidak diubah.
