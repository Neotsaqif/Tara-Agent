# **TARA AGENT — Product Requirements Document (PRD)** 

**Versi:** 1.1 

**Status:** Revisi usulan stack dan implementasi MVP untuk review/konfirmasi tim. **Terakhir diperbarui:** 2026-10-26 

## **1. Pendahuluan** 

### **1.1 Tujuan** 

Dokumen ini menjadi acuan bersama bagi tim produk, engineering, dan QA dalam membangun **TARA AGENT** . Dokumen menjelaskan tujuan produk, alur kerja, arsitektur, kebutuhan fungsional dan nonfungsional, integrasi, batas MVP, tahapan delivery, serta kriteria agar MVP dapat dinyatakan selesai. 

### **1.2 Latar Belakang dan Kondisi Saat Ini** 

TARA AGENT adalah AI decision-support agent untuk bisnis F&B multi-outlet. Produk ditujukan untuk membantu manajemen mengubah data bisnis menjadi pemahaman, opsi strategi, keputusan yang disetujui, tindakan yang dapat ditelusuri, dan evaluasi hasil. 

Kondisi proyek berdasarkan dokumen tim: 

- Project Brief dan rancangan arsitektur sudah disusun. 

- Mockup UI/UX tersedia sebagai prototype desain. 

- Tim sudah menetapkan tiga workflow utama: **Informational, Diagnostic, dan GoalDirected** . 

- Alur keputusan mendukung tiga respons user: **Approve/Terima, Reject/Tolak, dan Revise/Revisi** . 

- Belum ada bukti dalam dokumen sumber bahwa backend, integrasi POS, database produksi, atau Agent end-to-end sudah selesai. Implementasi tersebut karena itu ditandai `Planned` sampai diverifikasi tim. 

- Pilihan teknologi final, izin penggunaan data bisnis, dan detail koneksi POS/API masih perlu diputuskan. 

PRD ini menggunakan Project Architecture dan AI Agent Project Brief sebagai sumber utama. Jika sebuah teknologi atau integrasi belum diputuskan, dokumen menandainya sebagai kandidat atau pertanyaan terbuka, bukan keputusan final. 

### **1.3 Definisi dan Status** 

|**Istilah**|**Arti**|
|---|---|
|**TARA AGENT**|AI decision-support agent untuk bisnis F&B<br>multi-outlet.|
|**Business objective**|Tujuan bisnis terukur yang dimasukkan<br>pengguna, misalnya meningkatkan omzet<br>dengan batas diskon dan margin tertentu.|
|**Event / case**|Satu kasus keputusan atau campaign beserta<br>konteks, status workflow, approval, tindakan,<br>dan hasilnya.|
|**Intent routing**|Proses menentukan workflow yang tepat untuk<br>input: Informational, Diagnostic, atau Goal-<br>Directed.|
|**Prediction**|Perkiraan hasil yang dihitung sebelum tindakan<br>dijalankan; bukan fakta atau jaminan.|
|**Actual**|Hasil bisnis yang benar-benar terjadi dan<br>tersedia sebagai data aktual.|
|**Realtime Prediction**|Perkiraan terbaru setelah data aktual baru<br>tersedia.|
|**Constraint / guardrail**|Batas bisnis yang harus dipenuhi, misalnya<br>diskon maksimum, margin minimum, budget,<br>dan ketersediaan stok.|
|**Human-in-the-loop**|Keputusan atau tindakan bisnis tertentu<br>membutuhkan persetujuan pengguna yang<br>berwenang.|
|`Proto`|Mockup/prototype UI tersedia; belum berarti<br>fitur backend sudah berjalan.|
|`BE done`|Backend sudah diimplementasikan, tetapi belum<br>terhubung ke frontend. Belum ada fitur yang<br>diberi status ini karena belum terverifikasi dalam<br>sumber.|
|`Planned`|Spesifikasi sudah direncanakan, tetapi<br>implementasi belum terverifikasi selesai.|
|`Out of MVP`|Secara eksplisit tidak termasuk ruang lingkup<br>MVP.|



## **2. Gambaran Proyek** 

|**Kolom**|**Detail**|
|---|---|
|**Nama Proyek**|TARA AGENT|
|**Nama lengkap**|Business Reasoning & Value Acceleration|



|**Kolom**|**Detail**|
|---|---|
||Agent|
|**Jenis Produk**|AI decision-support agent berbasis web untuk<br>Enterprise & Industry|
|**Industri**|F&B multi-outlet|
|**Tujuan**|Mempercepat proses dari data bisnis menjadi<br>diagnosis, opsi strategi, keputusan, tindakan,<br>monitoring, dan feedback.|
|**Pengguna utama**|Owner, Direktur Operasional, PMO, Area<br>Manager|
|**Pengguna pendukung**|Outlet Manager, Marketing, Purchasing,<br>Finance, Supervisor|
|**MVP inti**|Business Growth / Promotion Decision|
|**Prinsip utama**|“AI recommends and prepares; authorized<br>humans decide and approve.”|



### **2.1 Tujuan Produk** 

1. Menjawab pertanyaan bisnis menggunakan data yang tersedia dan perhitungan yang dapat ditelusuri. 

2. Menganalisis kondisi, masalah, kemungkinan penyebab, dan peluang berdasarkan bukti data. 

3. Menghasilkan beberapa alternatif strategi untuk memenuhi business objective. 

4. Mensimulasikan dampak opsi dan memeriksa risiko, asumsi, ketidakpastian, serta constraint. 

5. Memberikan rekomendasi yang menyertakan alasan dan evidence, tanpa menyajikan prediction sebagai jaminan. 

6. Menyediakan alur Approve, Reject, dan Revise yang menjaga keputusan final di tangan pengguna yang berwenang. 

7. Setelah disetujui, membuat event tindakan yang dapat dipantau dan membandingkan Prediction dengan Actual. 

8. Menyimpan feedback dan riwayat agar hasil keputusan sebelumnya dapat digunakan dalam evaluasi berikutnya. 

### **2.2 Non-Goals / Di Luar MVP** 

Hal berikut tidak menjadi persyaratan wajib MVP kecuali disetujui kemudian sebagai perubahan scope: 

- Mengelola seluruh operasional F&B secara otomatis, termasuk workforce/shift, purchasing, supplier, dan inventory planning penuh. 

- Menjamin target omzet atau profit akan tercapai. 

- Mengklaim akses ke omzet, transaksi, atau traffic aktual kompetitor. 

- Mengirim atau menerbitkan campaign ke media sosial secara langsung tanpa integrasi resmi, izin, dan persetujuan. 

- Melakukan training/fine-tuning LLM secara otomatis hanya dari transaksi bisnis. 

- Mengintegrasikan semua API eksternal sekaligus. 

- Menggunakan data pribadi pelanggan apabila data agregat sudah memadai. 

- Menjalankan keputusan finansial berisiko tinggi secara mandiri tanpa approval. 

- Membangun multi-agent terpisah untuk setiap fungsi bisnis; MVP menggunakan satu Agent utama dengan tools/engines modular. 

## **3. Teknologi dan Arsitektur** 

### **3.1 Rekomendasi Technology Stack untuk MVP**

**Status keputusan:** rekomendasi teknis untuk disepakati Neo dan tim. Rekomendasi ini mempertimbangkan repository yang sudah memiliki fondasi FastAPI/Python, kalkulasi deterministik, constraint gate, mock LLM provider, dan unit test. Teknologi yang belum benar-benar dikonfigurasi atau diuji tetap ditandai sebagai belum aktif.

| Lapisan | Rekomendasi MVP | Alasan dan batasan | Status |
|---|---|---|---|
| Frontend | React + Vite + TypeScript | Mengembangkan UI web/dashboard dengan setup ringan dan integrasi REST API. | Direkomendasikan; perlu konfirmasi tim |
| Backend/API | FastAPI + Python | Sudah digunakan di repository; cocok untuk validasi request, analytics, workflow, dan integrasi model. | Sudah menjadi fondasi; endpoint masih terbatas |
| Database | PostgreSQL | Mendukung relasi data bisnis, event, approval, prediction, feedback, dan audit. SQLite tetap boleh dipakai untuk tes lokal sederhana. | Target MVP; belum terpasang sebagai persistence produksi |
| ORM dan migrasi | SQLAlchemy + Alembic | Mengelola model database dan perubahan schema secara terkontrol. | Direkomendasikan; belum diimplementasikan |
| Validasi | Pydantic | Validasi request dan data terstruktur; sudah digunakan dalam fondasi FastAPI. | Sebagian tersedia |
| Data ingestion | CSV/Excel terkontrol | Menjadi jalur awal saat akses API POS belum dikonfirmasi. Dataset demo harus sintetis atau diizinkan dan diberi label jelas. | Prioritas MVP; ingestion belum diimplementasikan |
| LLM API | Pilih satu provider yang mendukung structured output/tool calling | Dipakai untuk reasoning, planning, penyusunan opsi, dan penjelasan. Pertahankan mock provider untuk tes tanpa API key. | Provider/model/biaya perlu diputuskan |
| Orkestrasi Agent | Workflow Python modular/state machine; evaluasi LangGraph bila diperlukan | Hindari menambah framework sebelum workflow inti terbukti membutuhkan fitur lanjut. | Rekomendasi MVP; perlu review tim |
| Perhitungan bisnis | Fungsi backend deterministik | Revenue, margin, biaya promo, constraint, dan metrik skenario dihitung dengan kode yang dapat diuji, bukan hitungan bebas LLM. | Wajib; fungsi dasar sudah ada, perlu diperluas |
| Simulation Engine | Modul Python terpisah | Simulasi harus berbasis data, rumus, business rules, dan asumsi eksplisit. | Planned |
| Testing | pytest + HTTPX | Melanjutkan fondasi pengujian backend yang sudah ada. Tambahkan integration dan end-to-end test bertahap. | Unit test tersedia; cakupan perlu diperluas |
| Version control | Git + repository GitHub | Menjaga kolaborasi, review, dan riwayat perubahan. | Repository GitHub tersedia |
| Deployment | Hosting frontend yang mendukung Vite + hosting backend Python | Pisahkan deployment UI dan API; pilih provider berdasarkan kompatibilitas, biaya, dan akses juri. | Provider final belum diputuskan |
| Vector search / RAG | Tidak digunakan pada fase awal kecuali ada kebutuhan retrieval dokumen | Data inti MVP berbentuk tabel terstruktur; vector search tidak wajib untuk menjalankan workflow bisnis. | Out of initial MVP |

#### Integrasi dan modul pendukung

| Integrasi/modul | Kebutuhan | Rekomendasi dan batasan | Status |
|---|---|---|---|
| POS | Data transaksi/penjualan | Mulai dengan CSV/Excel. Integrasi API POS dilakukan hanya setelah akses, izin, dokumentasi, dan format data dikonfirmasi. | Menunggu konfirmasi |
| TARA GEOAI | Konteks geografis untuk analisis lokasi outlet, konteks area, dan peluang pertumbuhan berbasis lokasi | Siapkan sebagai modul/interface terpisah. Belum menetapkan provider atau mengklaim analisis geospasial aktif sebelum sumber data dan kontrak teknis diputuskan. | Planned; sumber/provider belum diputuskan |
| Maps/Places | Data lokasi publik yang relevan | Bisa dipertimbangkan sebagai sumber GeoAI, tetapi bukan dependensi awal untuk core workflow. Patuhi aturan penggunaan data penyedia. | Opsional / belum dikunci |
| Weather | Konteks cuaca | Tunda sampai terbukti memberi nilai untuk skenario demo dan ada sumber/API yang disetujui. | Di luar prioritas MVP |
| Notifikasi | Status approval dan workflow | Gunakan notifikasi dalam dashboard sebagai jalur utama. WhatsApp Business API/Telegram bukan dependensi wajib. | Dashboard prioritas |
| Scheduler | Monitoring berkala | Mulai dengan pemanggilan/refresh terkontrol; tambah scheduler setelah monitoring aktual dan kebutuhan frekuensi jelas. | Direncanakan bila monitoring berkala diaktifkan |
| Materi promosi | Draft caption/campaign | Draft teks dan template sederhana dapat digunakan. Image-generation API eksternal ditunda. | Draft masuk kandidat MVP; image API opsional |
| LLM credential | Autentikasi ke provider model | Simpan hanya di backend melalui environment variable; tidak boleh dikirim ke frontend atau repository. | Belum dikonfigurasi |

**Keputusan arsitektur yang disarankan:** gunakan satu backend modular (modular monolith), satu Agent utama, satu database relasional, dan adapter untuk provider LLM/tools. Hindari microservices dan multi-agent terpisah pada MVP.

**Aturan dokumentasi status:** `Implemented` hanya digunakan ketika kode benar-benar tersedia dan telah diperiksa; `Skeleton` berarti struktur awal ada tetapi belum menyelesaikan kebutuhan; `Planned` berarti belum diimplementasikan; `Blocked` berarti menunggu akses, izin, credential, atau keputusan eksternal.

### **3.2 Pola Arsitektur** 

Arsitektur MVP disarankan menggunakan **modular monolith** : satu aplikasi backend dengan modul yang dipisahkan berdasarkan tanggung jawab. Pendekatan ini merupakan rekomendasi arsitektur awal, bukan keputusan teknologi final. Pola ini mengurangi kompleksitas deployment untuk tim kecil, tetapi masih memungkinkan pemisahan service jika kebutuhan berkembang. 

#### **_Diagram Arsitektur Tingkat Tinggi_** 

```
USER / OWNER / MANAGER
        │
        ▼
TARA AGENT UI (Web Dashboard / Chat)
        │
        ▼
BACKEND API
(Authentication, Authorization, RBAC, Request Validation)
        │
```

```
        ├──────────────► Event & Workflow State
        │
        ▼
TARA AGENT CORE
(Context Manager, Intent Router, Planner/Reasoning, Tool Selector)
        │
        ├── Informational ──► Deterministic Query / Calculation ──► Answer
        │
        ├── Diagnostic ─────► Analytics + Evidence Validation ────► Finding
        │
        └── Goal-Directed
               │
               ▼
         Readiness & Business Data
               │
               ▼
         Understand / Diagnose
               │
               ▼
         Strategy / Option Generator
               │
               ▼
         Simulation Engine
               │
               ▼
         Predictive Monitoring
               │
               ▼
         Constraint Gate + Option Evaluation
               │
               ▼
         Decision & Explanation
               │
               ▼
         User: Approve / Reject / Revise
             /          |          \
        Approve       Reject      Revise
           │             │            │
           ▼             ▼            ▼
      Approval &      Re-diagnose   Ask & Evaluate
      Action Event        │            │
           │          Re-explore    Re-explore
           │          Re-simulate   Re-simulate
           │             │            │
           ▼             └──► Re-decision ◄──┘
      Actual Monitoring / Control / Feedback
           │
           ▼
      Historical Result & Audit Trail
```

#### **_Penjelasan Komponen Utama_** 

|**Komponen**|**Tanggung jawab**|
|---|---|
|**TARA AGENT UI**|Menerima input bisnis; menampilkan data<br>readiness, diagnosis, opsi, simulasi, keputusan,<br>approval, status event, dan hasil monitoring.|
|**Backend API**|Menghubungkan UI, Agent, database, dan<br>integrasi. Memeriksa identitas, hak akses,<br>validasi request, serta mencatat aktivitas<br>penting.|



|**Komponen**|**Tanggung jawab**|
|---|---|
|**Event & Workflow State**|Menyimpan status kasus aktif agar pesan<br>lanjutan dan cabang Approve/Reject/Revise<br>melanjutkan case yang benar.|
|**TARA AGENT Core**|Mengatur intent routing, konteks, perencanaan,<br>reasoning, dan pemilihan tools. LLM tidak<br>diberi kewenangan langsung untuk melewati<br>constraint atau approval.|
|**Data Ingestion & Validation**|Mengambil data melalui file/connector yang<br>diizinkan, melakukan validasi, menyimpan<br>snapshot, dan memisahkan data tidak valid ke<br>quarantine.|
|**Deterministic Analytics Engine**|Menghitung metrik bisnis menggunakan rumus<br>dan data terstruktur; angka tidak diserahkan<br>kepada LLM untuk dihitung bebas.|
|**Intelligence / Evidence Layer**|Menyatukan hasil analisis dan konteks<br>internal/eksternal yang tersedia, serta<br>menampilkan sumber dan keterbatasan<br>evidence.|
|**Strategy Generator**|Menghasilkan beberapa opsi strategi yang<br>relevan dengan objective dan hasil diagnosis.|
|**Simulation Engine**|Menghitung estimasi untuk tiap opsi<br>berdasarkan data historis, business rules, dan<br>asumsi yang dicatat.|
|**Predictive Monitoring**|Memeriksa trajectory prediksi, sensitivitas,<br>kemungkinan deviasi, downside risk, kualitas<br>evidence, dan potensi pelanggaran constraint<br>sebelum prediksi ditampilkan.|
|**Constraint Gate / Decision Evaluation**|Menolak opsi yang melanggar hard constraint,<br>lalu membandingkan opsi yang layak<br>berdasarkan dampak, risiko, feasibility, dan<br>kualitas bukti.|
|**Approval & Action Layer**|Menyimpan pilihan dan persetujuan user.<br>Setelah disetujui, MVP mengaktifkan event<br>keputusan dan menyiapkan action package yang<br>diizinkan.|
|**Actual Monitoring / Control**|Membandingkan Prediction baseline dengan<br>Actual, memperbarui Realtime Prediction, dan<br>mendukung tindakan Continue, Re-analysis,<br>Adjust, atau Stop sesuai izin.|
|**Feedback & Audit**|Menyimpan hasil, umpan balik, versi<br>data/rumus/prediksi, approval, tool call, dan<br>aktivitas penting yang diperlukan untuk<br>menelusuri keputusan.|



### **3.3 Usulan Struktur Proyek** 

Struktur berikut adalah **usulan organisasi repository** , bukan gambaran folder yang sudah ada saat ini. Tim dapat menyesuaikannya setelah stack final dipilih. 

```
tara-agent/
├── frontend/
│   ├── app-or-pages/
│   ├── components/
│   ├── features/
│   │   ├── objectives/
│   │   ├── diagnosis/
│   │   ├── scenarios/
│   │   ├── approvals/
│   │   └── monitoring/
│   └── lib/
├── backend/
│   ├── api/
│   ├── auth/
│   ├── workflows/
│   ├── agent/
│   ├── tools/
│   ├── analytics/
│   ├── simulation/
│   ├── constraints/
│   ├── monitoring/
│   ├── data_ingestion/
│   ├── database/
│   └── audit/
├── data/
│   ├── sample/          # Hanya dataset sintetis/sanitasi yang diizinkan
│   └── schemas/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── end_to_end/
├── docs/
│   ├── PRD.md
│   └── architecture.md
├── .env.example
└── README.md
```

### **3.4 Keputusan Arsitektur, Asumsi, dan Pertanyaan Terbuka**

#### Rekomendasi implementasi MVP

- Pertahankan FastAPI/Python karena sudah menjadi fondasi backend repository.
- Gunakan React + Vite + TypeScript sebagai rekomendasi frontend baru; keputusan ini perlu dikonfirmasi tim sebelum konfigurasi frontend diganti.
- Gunakan PostgreSQL sebagai target database bersama; SQLite boleh dipakai sementara untuk tes lokal, bukan dianggap database multi-user produksi.
- Gunakan SQLAlchemy + Alembic untuk model dan migrasi saat persistence mulai dibangun.
- Mulai dengan workflow Python modular/state machine; tambah framework orkestrasi hanya jika dibutuhkan oleh workflow nyata.
- Gunakan CSV/Excel sebagai jalur ingestion awal jika akses POS belum tersedia.
- Gunakan satu LLM provider setelah provider, model, structured-output/tool-calling, biaya, dan batas pemakaian disepakati. `mock` tetap tersedia untuk unit test dan demo fondasi tanpa koneksi eksternal.
- Semua perhitungan finansial dan hard constraint harus menggunakan kode deterministik.
- TARA GEOAI dirancang sebagai modul pendukung yang terpisah. Pada initial MVP, interface dan input/output contract boleh disiapkan tanpa mengklaim integrasi provider geospasial sudah aktif.
- Semua hasil prediksi diberi label estimasi. Prediction baseline yang dipakai untuk approval/monitoring harus tetap tersimpan dan tidak ditimpa diam-diam.
- Action awal setelah approval berupa event/campaign record dan action package. Publikasi eksternal tidak tersedia tanpa integrasi, izin, dan pengujian.

#### Pertanyaan yang harus diputuskan tim

1. Apakah tim menyetujui React + Vite + TypeScript sebagai frontend dan mempertahankan FastAPI/Python sebagai backend?
2. Apakah PostgreSQL menjadi target database bersama, dan lingkungan PostgreSQL apa yang dapat digunakan tim untuk development/deployment?
3. Provider LLM/model mana yang dipilih, dan berapa batas biaya/pemakaian yang tersedia?
4. Apakah LLM wajib sudah aktif pada demo pertama, atau mock provider boleh dipakai hanya untuk pengujian fondasi sementara integrasi model dikerjakan?
5. Apakah sumber data bisnis tersedia sebagai CSV/Excel, atau ada API/ekspor POS yang diizinkan? Apa field dan formatnya?
6. Berapa periode historis yang benar-benar tersedia dan boleh digunakan? Apakah HPP, margin, dan histori promosi tersedia?
7. Apa rumus resmi revenue, margin, biaya promosi, baseline, dan hard constraint bisnis?
8. Siapa yang memiliki hak approve, execute, adjust, dan stop?
9. Apa scope awal TARA GEOAI: analisis lokasi outlet saja atau juga pencarian lokasi kompetitor publik? Sumber data/provider apa yang diizinkan?
10. Apakah dashboard cukup untuk notifikasi approval pada MVP?
11. Siapa yang menyediakan database dan hosting backend, dan bagaimana menjaga akses demo publik selama penilaian?
12. Apa target performa yang realistis setelah diukur melalui benchmark?

## **4. Kebutuhan Fungsional** 

**Catatan status:** hanya mockup UI/UX yang berstatus `Proto` . Implementasi backend dan workflow di bawah ditandai `Planned` karena dokumen sumber belum membuktikan implementasinya selesai. 

### **4.1 Antarmuka Web dan Dashboard** 

|**Fitur**|**Status**|
|---|---|
|Mockup UI/UX web dashboard dan interaksi<br>utama|`Proto`|
|Implementasi frontend yang terhubung ke<br>backend|`Planned`|
|Form business objective dan constraint|`Planned`|
|Tampilan diagnosis, opsi, simulasi, dan<br>keputusan|`Planned`|



|**Fitur**|**Status**|
|---|---|
|Tampilan status approval, event, monitoring,<br>dan hasil|`Planned`|



##### **Persyaratan:** 

- **FR-UI-01:** Sistem harus menyediakan antarmuka web bagi user untuk memasukkan pertanyaan atau business objective. 

- **FR-UI-02:** Form objective harus mendukung target metrik, nilai target, outlet/produk yang dituju, periode, dan constraint yang diperlukan untuk kasus tersebut. 

- **FR-UI-03:** UI harus membedakan fakta historis, hasil aktual, prediksi, asumsi, dan ketidakpastian. 

- **FR-UI-04:** UI harus menampilkan opsi strategi dalam format yang dapat dibandingkan. 

- **FR-UI-05:** UI harus menyediakan pilihan Terima/Approve, Tolak/Reject, dan Revisi/Revise sesuai status workflow. 

- **FR-UI-06:** UI harus menampilkan status case/event, status approval, dan status monitoring. 

- **FR-UI-07:** Error, data tidak cukup, atau integrasi gagal harus disampaikan dengan bahasa yang dapat dipahami user, bukan menghasilkan angka seolah-olah valid. 

### **4.2 Autentikasi, Hak Akses, dan Sesi** 

|**Fitur**|**Status**|
|---|---|
|Login/autentikasi|`Planned`|
|Role-based access control (RBAC)|`Planned`|
|Pemeriksaan permission sebelum tool/action|`Planned`|
|Session/context management|`Planned`|



##### **Persyaratan:** 

- **FR-AUTH-01:** Sistem harus mengidentifikasi user sebelum memberikan akses ke data bisnis yang dilindungi. 

- **FR-AUTH-02:** Setiap endpoint dan action harus memeriksa role serta permission dari user. 

- **FR-AUTH-03:** User hanya boleh melihat data outlet dan informasi yang berada dalam cakupan aksesnya. 

- **FR-AUTH-04:** Secret API harus disimpan di sisi server dan tidak dikirim ke frontend. 

- **FR-AUTH-05:** Ketika sesi berakhir atau akses tidak cukup, sistem harus menolak request dan menampilkan pesan yang sesuai. 

### **4.3 Business Objective, Intent Routing, dan Event/Case** 

|**Fitur**|**Status**|
|---|---|
|Input business objective|`Planned`|
|Intent routing Informational / Diagnostic / Goal-|`Planned`|
|Directed||
|Pemeriksaan konteks dan case aktif|`Planned`|
|Event dan workflow state|`Planned`|



##### **Persyaratan:** 

- **FR-WF-01:** Sistem harus mengklasifikasikan input menjadi salah satu workflow utama: Informational, Diagnostic, atau Goal-Directed, atau meneruskannya sebagai kelanjutan case yang sudah aktif. 

- **FR-WF-02:** Routing harus mempertimbangkan konteks percakapan, event aktif, business scope, status workflow, role user, permission, dan tugas yang diminta. 

- **FR-WF-03:** Setiap objective/campaign/workflow goal-directed harus memiliki `event_id` yang unik. 

- **FR-WF-04:** Sistem harus menyimpan `workflow_state` agar pesan seperti “revisi bagian diskon” atau “jalankan” diproses dalam case yang benar. 

- **FR-WF-05:** Sistem harus mendukung beberapa case/event terpisah tanpa mencampur konteks, rekomendasi, atau approval antar-event. 

- **FR-WF-06:** Routing intent tidak boleh melakukan approval atau mengeksekusi action dengan sendirinya. 

##### Model data awal: 

```
business_objectives
```

```
- objective_id, user_id, outlet_scope, target_metric, target_value
- period_start, period_end, constraints, created_at
```

```
events
```

```
- event_id, objective_id, current_state, selected_option_id
- approval_status, created_by, created_at, updated_at
agent_runs
- run_id, event_id, workflow_type, status, started_at, completed_at
```

### **4.4 Data Ingestion, Validasi, dan Data Readiness** 

|**Fitur**|**Status**|
|---|---|
|Impor dataset/file terstruktur|`Planned`|
|Integrasi POS melalui API/connector|`Planned`|
|Validasi kualitas data|`Planned`|
|Snapshot dan versi data|`Planned`|
|Quarantine untuk data invalid|`Planned`|



##### **Persyaratan:** 

- **FR-DATA-01:** Sistem harus menerima data dari sumber yang diizinkan, melalui file terstruktur atau connector yang telah disepakati. 

- **FR-DATA-02:** Sebelum digunakan untuk analisis/simulasi, dataset harus diperiksa minimal untuk kelengkapan, validitas, konsistensi, freshness, duplikasi, anomali, dan status rekonsiliasi jika relevan. 

- **FR-DATA-03:** Dataset yang gagal pada hard validation gate tidak boleh digunakan untuk perhitungan atau simulasi. 

- **FR-DATA-04:** Baris atau file yang invalid harus ditolak atau dipindahkan ke quarantine dengan alasan yang dapat ditelusuri. 

- **FR-DATA-05:** Sistem harus menyimpan `dataset_id` , `snapshot_id` , `source_id` , waktu ingest, dan versi data yang digunakan. 

- **FR-DATA-06:** Data yang tidak tersedia tidak boleh dianggap nol atau diisi sebagai fakta menggunakan tebakan model. 

- **FR-DATA-07:** Jika history tidak cukup, sistem harus menyatakan keterbatasan dan hanya memberikan hasil observasi atau simulasi berlabel asumsi sesuai aturan yang disepakati. 

- **FR-DATA-08:** Demo yang menggunakan data sintetis harus menandai data sebagai data simulasi. 

##### Data inti yang dibutuhkan untuk MVP: 

###### `sales_transactions` 

```
- transaction_id, outlet_id, transaction_datetime, order_channel
```

###### `transaction_items` 

- `transaction_id, sku_id, quantity, selling_price - discount_amount, gross_sales, net_sales, void_refund_status` 

###### `products` 

- `sku_id, sku_name, category_id, selling_price, cost_price_hpp - margin_percentage, product_status` 

###### `outlets` 

```
- outlet_id, outlet_name, location, region, operating_hours
- sales_target, operational_status
```

###### `promotion_history` 

```
- promotion_id, outlet_id, target_sku, promotion_type
- start_datetime, end_datetime, discount_percentage, promotion_cost
- revenue_before, revenue_during, revenue_after, actual_result
```

#### **_Pertanyaan Terbuka_** 

- Apakah data transaksi diimpor melalui CSV/Excel untuk MVP atau ada POS API yang dapat diakses? 

- Periode historis yang tersedia berapa lama, dan apakah field HPP serta histori promosi tersedia? 

### **4.5 Informational Workflow** 

|**Fitur**|**Status**|
|---|---|
|Pertanyaan angka/informasi bisnis|`Planned`|
|Query dan kalkulasi deterministik|`Planned`|
|Jawaban dengan sumber/periode data|`Planned`|



##### **Persyaratan:** 

- **FR-INFO-01:** Untuk pertanyaan seperti “Berapa omzet outlet A minggu ini?”, sistem harus membaca data dalam cakupan akses user dan menghitung jawaban menggunakan query/calculation engine. 

- **FR-INFO-02:** Angka keuangan tidak boleh dibuat oleh LLM tanpa hasil kalkulasi deterministik yang mendasarinya. 

- **FR-INFO-03:** Jawaban harus menyebutkan periode dan cakupan data apabila informasi itu diperlukan untuk menafsirkan angka. 

- **FR-INFO-04:** Jika data untuk menjawab tidak tersedia atau tidak lolos validasi, sistem harus menyatakan bahwa jawaban tidak dapat dihitung dari data yang ada. 

### **4.6 Diagnostic Workflow dan Business Intelligence** 

|**Fitur**|**Status**|
|---|---|
|Analisis tren penjualan dan performa<br>produk/outlet|`Planned`|
|Diagnosis berbasis evidence|`Planned`|
|Validasi bukti dan penjelasan temuan|`Planned`|
|Reuse diagnosis dalam case aktif|`Planned`|



##### **Persyaratan:** 

- **FR-DIAG-01:** Untuk pertanyaan diagnosis, sistem harus membaca metrik relevan dan membandingkan kondisi saat ini dengan baseline/target yang tersedia. 

- **FR-DIAG-02:** Sistem harus membedakan data faktual dari inference atau kemungkinan penyebab. 

- **FR-DIAG-03:** Setiap diagnosis harus menyertakan evidence yang mendasari temuan, misalnya periode, outlet, produk, metrik, dan perubahannya. 

- **FR-DIAG-04:** Agent tidak boleh menyatakan suatu penyebab sebagai fakta apabila data hanya menunjukkan korelasi atau dugaan. 

- **FR-DIAG-05:** Diagnosis dapat berdiri sendiri, digunakan di dalam Goal-Directed workflow, atau digunakan kembali ketika monitoring menemukan evidence baru. 

- **FR-DIAG-06:** Jika user beralih dari diagnosis ke pertanyaan “bagaimana 

memperbaikinya?”, sistem harus menggunakan kembali diagnosis dan evidence yang masih relevan, lalu memastikan intent tindakan bila permintaan masih ambigu. 

### **4.7 Goal-Directed Workflow dan Pembuatan Opsi** 

|**Fitur**|**Status**|
|---|---|
|Mengubah objective menjadi task/workflow|`Planned`|
|Menghasilkan beberapa opsi strategi|`Planned`|
|Menyertakan parameter dan asumsi per opsi|`Planned`|
|Memakai ulang diagnosis yang relevan|`Planned`|



##### **Persyaratan:** 

- **FR-GOAL-01:** Sistem harus menerima objective, target metrik, target value, scope outlet/SKU, periode, dan constraint yang diperlukan. 

- **FR-GOAL-02:** Agent harus memeriksa ketersediaan serta kualitas data sebelum menghasilkan strategi. 

- **FR-GOAL-03:** Ketika diagnosis diperlukan, Agent harus melakukan atau menggunakan kembali diagnosis yang relevan sebelum membuat opsi. 

- **FR-GOAL-04:** Agent harus menghasilkan beberapa alternatif yang dapat dibandingkan, bukan hanya satu jawaban naratif. 

- **FR-GOAL-05:** Setiap opsi harus memiliki parameter utama, expected impact, cost/margin effect bila dapat dihitung, risiko, asumsi, uncertainty, dan kebutuhan operasional yang relevan. 

- **FR-GOAL-06:** Jika evidence tidak cukup untuk menyusun opsi yang bertanggung jawab, sistem harus meminta data/penjelasan tambahan atau menyampaikan keterbatasan. 

### **4.8 Simulation, Predictive Monitoring, dan Evaluasi Opsi** 

|**Fitur**|**Status**|
|---|---|
|Simulasi beberapa strategi|`Planned`|
|Perhitungan metrik finansial deterministik|`Planned`|
|Predictive Monitoring sebelum hasil ditampilkan|<sup>`Planned`</sup>|
|Evaluasi trajectory, risiko, sensitivitas, dan<br>evidence|`Planned`|



##### **Persyaratan:** 

- **FR-SIM-01:** Sistem harus melakukan simulasi opsi yang feasible menggunakan data historis, business rules, hasil promosi sebelumnya, atau asumsi eksplisit. 

- **FR-SIM-02:** Output simulasi harus diberi label Prediction/Estimate dan tidak boleh disajikan sebagai jaminan. 

- **FR-SIM-03:** Sistem harus menjalankan Predictive Monitoring sebelum hasil simulasi disajikan untuk memeriksa trajectory, potensi deviasi, sensitivitas terhadap asumsi, downside risk, kualitas evidence, dan risiko pelanggaran constraint. 

- **FR-SIM-04:** Jika Predictive Monitoring menemukan risiko atau kelemahan material, Agent harus melakukan re-analysis atau memberi label peringatan sebelum mempresentasikan opsi. 

- **FR-SIM-05:** Sistem harus membedakan Prediction, Actual, Inference, Assumption, dan Uncertainty. 

- **FR-SIM-06:** Sistem harus menyimpan versi prediction, timestamp, asumsi dan formula/version terkait agar hasil dapat ditelusuri. 

- **FR-SIM-07:** Prediction baseline yang telah dikunci untuk approval tidak boleh berubah diam-diam setelah action dimulai. Perhitungan ulang harus membuat versi baru dan mempertahankan baseline sebelumnya. 

- **FR-SIM-08:** LLM tidak boleh menjadi satu-satunya tempat kalkulasi revenue, margin, diskon, profit, atau metrik finansial deterministik dilakukan. 

### **4.9 Constraint Gate dan Decision Evaluation** 

|**Fitur**|**Status**|
|---|---|
|Pemeriksaan hard constraint|`Planned`|
|Ranking/evaluasi opsi yang lolos|`Planned`|
|Alasan, evidence, risiko, dan expected impact|`Planned`|



##### **Persyaratan:** 

- **FR-DEC-01:** Sistem harus memeriksa hard constraint seperti diskon maksimum, margin minimum, budget maksimum, stok efektif, kapasitas operasional, periode berlaku, channel yang diizinkan, dan aturan lain yang dikonfigurasi. 

- **FR-DEC-02:** Opsi yang melanggar satu hard constraint wajib dinyatakan tidak layak dan tidak boleh dipilih sebagai rekomendasi final. 

- **FR-DEC-03:** Dari opsi yang lolos, sistem harus mengevaluasi expected impact, risiko, feasibility, potensi contribution, dan kualitas evidence. 

- **FR-DEC-04:** Opsi dengan prediksi omzet tertinggi tidak otomatis menjadi opsi terbaik jika trade-off margin, risiko, atau feasibility lebih buruk. 

- **FR-DEC-05:** Rekomendasi harus menyertakan alasan, evidence, asumsi, constraint yang diperiksa, risiko, estimasi dampak, dan keterbatasan. 

- **FR-DEC-06:** Jika tidak ada opsi yang lolos constraint, sistem harus menyatakan tidak ada opsi layak dan meminta perubahan objective/constraint yang diizinkan, bukan memaksakan rekomendasi. 

### **4.10 Human Decision, Approval, dan Revisi** 

|**Fitur**|**Status**|
|---|---|
|Tampilan opsi dan keputusan user|`Proto`untuk desain UI; implementasi<br>`Planned`|
|Approve / Reject / Revise|`Planned`|
|Pemeriksaan izin approver|`Planned`|
|Versioning proposal dan approval|`Planned`|



##### **Persyaratan:** 

- **FR-APP-01:** Sistem harus menyediakan pilihan Approve/Terima, Reject/Tolak, dan Revise/Revisi pada titik workflow yang sesuai. 

- **FR-APP-02:** Hanya role yang memiliki permission yang dapat menyetujui action berdampak tinggi. 

- **FR-APP-03:** Sistem tidak boleh mengeksekusi action sebelum approval yang diwajibkan tercatat. 

- **FR-APP-04:** Jika user memilih Reject, sistem harus kembali ke diagnosis atau tahap yang diperlukan, membuat opsi baru, melakukan simulasi ulang, kemudian menghasilkan ReDecision. 

- **FR-APP-05:** Jika user memilih Revise, Agent harus menanyakan parameter/bagian yang ingin diubah jika belum jelas, mengevaluasi perubahan, membuat opsi dan simulasi yang sesuai, lalu menyajikan Revision Decision. 

- **FR-APP-06:** Jika revisi mengubah parameter utama setelah approval, approval lama harus dibatalkan dan approval baru wajib diminta. 

- **FR-APP-07:** Sistem harus menyimpan siapa yang memilih/menyetujui, kapan tindakan dilakukan, opsi/versi yang disetujui, dan alasan jika diberikan. 

- **FR-APP-08:** Agent tidak boleh diam-diam mengganti opsi yang dipilih user atau menganggap permintaan revisi sebagai approval. 

##### Model data awal: 

```
recommendations
```

```
- recommendation_id, event_id, option_id, version
- reasoning_summary, evidence_refs, assumptions, uncertainty
- predicted_impact, risk_level, constraint_result, created_at
```

```
approvals
```

```
- approval_id, event_id, recommendation_id, approver_user_id
- decision (approve/reject/revise), comment, decided_at
```

### **4.11 Action, Campaign/Event Activation, dan Integrasi Tools** 

|**Fitur**|**Status**|
|---|---|
|Membuat event dari keputusan yang disetujui|`Planned`|



|**Fitur**|**Status**|
|---|---|
|Menetapkan Prediction baseline|`Planned`|
|Membuat action package / campaign record|`Planned`|
|Publikasi otomatis melalui channel eksternal|`Out of MVP`kecuali disetujui sebagai<br>integrasi wajib|



##### **Persyaratan:** 

- **FR-ACT-01:** Setelah approval yang diwajibkan, sistem harus membuat atau mengaktifkan `event_id` untuk keputusan terpilih. 

- **FR-ACT-02:** Sistem harus menyimpan objective, opsi terpilih, outlet/SKU, periode, KPI, constraint, asumsi, evidence, versi data/formula/prediction, dan approver. 

- **FR-ACT-03:** Sistem harus menetapkan Prediction baseline dari hasil simulasi yang telah melewati Predictive Monitoring. 

- **FR-ACT-04:** Untuk MVP, action minimal harus dapat menghasilkan campaign/event record atau action package yang siap dipantau. 

- **FR-ACT-05:** Setiap action eksternal harus menggunakan tool yang terdaftar, diizinkan, tervalidasi, dan memiliki permission yang sesuai. 

- **FR-ACT-06:** Jika integrasi eksternal belum tersedia, sistem harus menampilkan status bahwa action belum dikirim/dipublikasikan; sistem tidak boleh mengklaim action berhasil. 

- **FR-ACT-07:** Pemanggilan action yang dapat menyebabkan duplikasi harus menggunakan idempotency key atau pengecekan status agar retry tidak membuat campaign/action ganda. 

##### Model data awal: 

```
actions
```

```
- action_id, event_id, action_type, status, idempotency_key
- requested_by, approved_by, requested_at, executed_at, result
```

```
campaigns
```

```
- campaign_id, event_id, outlet_id, sku_scope, channel
- start_at, end_at, budget, quota, status
```

### **4.12 Actual Monitoring, Control, dan Feedback** 

|**Fitur**|**Status**|
|---|---|
|Monitoring event aktif|`Planned`|
|Prediction vs Actual vs Realtime Prediction|`Planned`|
|Control: Continue / Re-analysis / Adjust / Stop|`Planned`|
|Feedback/historical result|`Planned`|



##### **Persyaratan:** 

 **FR-MON-01:** Setelah event aktif, sistem harus mengaitkan data aktual yang tersedia dengan 

event tersebut. 

- **FR-MON-02:** Sistem harus membandingkan Prediction baseline dengan Actual yang terukur dan menghitung variance/deviation jika data memadai. 

- **FR-MON-03:** Realtime Prediction harus disimpan sebagai versi baru ketika forecast dihitung ulang berdasarkan Actual terbaru; Prediction baseline tetap tidak berubah. 

- **FR-MON-04:** Berdasarkan rule yang disetujui, sistem harus memberi status atau rekomendasi control seperti Continue, Re-analysis, Adjust, atau Stop. 

- **FR-MON-05:** Action Adjust/Stop hanya boleh dijalankan jika jenis action dapat dibatalkan/diubah dan permission tersedia. 

- **FR-MON-06:** Sistem harus menyimpan feedback dan hasil aktual untuk digunakan sebagai konteks historis bagi keputusan berikutnya. 

- **FR-MON-07:** “Learn” pada MVP berarti memperbarui historical context/feedback dan parameter yang memang dirancang untuk diperbarui; bukan mengklaim bahwa LLM dilatih otomatis. 

- **FR-MON-08:** Jika actual data belum tersedia, UI harus menyatakan “belum ada data aktual” dan tidak membuat hasil seolah-olah nyata. 

##### Model data awal: 

```
predictions
```

```
- prediction_id, event_id, version, is_baseline, predicted_metric
- predicted_value, assumptions, formula_version, created_at
```

```
actual_results
```

```
- actual_id, event_id, metric, actual_value, period, source_id, created_at
```

```
feedback_records
```

```
- feedback_id, event_id, prediction_id, actual_id
- variance, outcome_classification, feedback_note, created_at
```

### **4.13 Audit, Traceability, dan Error Handling** 

|**Fitur**|**Status**|
|---|---|
|Audit trail untuk workflow/approval/action|`Planned`|
|Referensi data, formula, dan versi prediction|`Planned`|
|Penanganan kegagalan tool dan integrasi|`Planned`|
|Quarantine/error reporting data|`Planned`|



##### **Persyaratan:** 

- **FR-AUD-01:** Sistem harus mencatat aktivitas penting, termasuk user/role, event, tool call, input/output yang relevan, versi data, formula, prediction, approval, action, dan hasil. 

- **FR-AUD-02:** Setiap rekomendasi harus dapat ditelusuri ke dataset/snapshot dan kalkulasi yang mendasarinya. 

- **FR-AUD-03:** Secret dan data pribadi yang tidak diperlukan tidak boleh ditulis ke log atau 

dikirim ke LLM. 

- **FR-AUD-04:** Kegagalan API, LLM, database, atau tool harus menghasilkan status gagal/parsial yang eksplisit dan tidak dianggap berhasil. 

- **FR-AUD-05:** Jika proses gagal setelah sebagian langkah selesai, sistem harus mempertahankan state yang dapat dipulihkan dan mencegah action tak berizin. 

### **4.14 Integrasi Eksternal** 

|**Integrasi**|**Status**|
|---|---|
|Data bisnis melalui CSV/Excel terkontrol|`Prioritas MVP`; ingestion belum diimplementasikan|
|LLM API|`Planned`; provider/model dan secret belum dikonfigurasi|
|POS API langsung|`Blocked/menunggu konfirmasi` akses, izin, dan format|
|TARA GEOAI|`Planned`; modul/interface perlu ditentukan dan provider/sumber data belum dikunci|
|Google Maps/Places sebagai sumber GeoAI|`Opsional`; bukan dependensi wajib core workflow awal|
|Weather API|`Di luar prioritas MVP`; dapat dievaluasi jika ada use case terukur|
|WhatsApp Business API / Telegram|`Di luar MVP awal`; dashboard menjadi jalur utama|
|API image generation eksternal|`Opsional`; draft teks/template lebih diprioritaskan|



##### **Persyaratan:** 

- **FR-INT-01:** Setiap integrasi harus memiliki kontrak input/output yang terdokumentasi. 

- **FR-INT-02:** Credential API harus disimpan di server dan tidak diekspos ke browser atau repository. 

- **FR-INT-03:** Data eksternal harus mencatat sumber, waktu observasi, dan cakupan data. 

- **FR-INT-04:** Data kompetitor hanya boleh menjadi konteks dari sumber yang sah; sistem tidak boleh mengarang data internal kompetitor. 

- **FR-INT-05:** Jika integrasi tidak tersedia, core workflow harus tetap dapat diuji dengan dataset simulasi berlabel jelas. 

#### **_Open Questions — Integrasi_** 

- Provider LLM yang dipilih dan model mana yang memenuhi kebutuhan structured output/tool calling? 

- Akses POS/API atau prosedur ekspor data yang tersedia? 

- Apakah ada kebutuhan nyata untuk WhatsApp, Maps, Weather, atau image generation pada MVP, atau cukup menjadi tahap lanjutan? 

## **5. Persyaratan Nonfungsional** 

|**Kategori**|**Persyaratan**|
|---|---|
|**Keamanan**|Semua endpoint dan tool action harus<br>memeriksa autentikasi, role, dan izin. Secret<br>hanya berada di server. Data sensitif dibatasi<br>sesuai peran.|
|**Validasi**|Input objective, data bisnis, tool arguments, dan<br>hasil terstruktur dari LLM harus divalidasi<br>sebelum dipakai untuk perhitungan atau action.|
|**Performa**|Query sederhana dan kalkulasi deterministik<br>ditargetkan merespons dalam ≤3 detik pada<br>lingkungan demo sebagai target awal. Workflow<br>LLM/simulasi yang lebih lama harus<br>memberikan status proses; target final<br>ditentukan setelah benchmark.|
|**Ketersediaan**|Prototype harus dapat diakses saat pengujian<br>juri. Jika integrasi pihak ketiga gagal, sistem<br>harus memberikan status kegagalan yang jelas<br>dan tidak mengklaim tindakan berhasil.|
|**Integritas Data**|Data mentah/snapshot, versi formula, prediction<br>baseline, approval, action, dan actual harus<br>disimpan konsisten. Prediction baseline tidak<br>boleh ditimpa setelah action berjalan.|
|**Privasi dan tata kelola**|Data bisnis hanya boleh digunakan sesuai izin<br>pemilik data. Data pribadi tidak dikirim ke LLM<br>jika data agregat sudah cukup. Dataset<br>sintetis/sanitasi harus diidentifikasi.|
|**Batasan keputusan**|Opsi yang melanggar hard constraint tidak boleh<br>dipilih. Action yang memerlukan approval tidak<br>boleh dieksekusi sebelum approval valid.|
|**Auditability**|Keputusan harus dapat ditelusuri ke event,<br>data/snapshot, evidence, asumsi, formula/model<br>version, approver, action, dan hasil aktual.|
|**Explainability**|Rekomendasi harus dapat menjelaskan alasan,<br>evidence, assumption, risk, expected impact,<br>constraint, dan uncertainty yang relevan.|
|**Maintainability**|Komponen analitik, simulator, constraint, Agent<br>orchestration, approval, dan monitoring dipisah<br>secara logis agar dapat diuji dan dikembangkan.|
|**Aksesibilitas**|UI harus dapat digunakan pada ukuran layar<br>desktop dan laptop yang umum dipakai untuk<br>demo; detail responsivitas diuji saat QA.|



## **6. Peran Pengguna dan Izin** 

Pembagian izin di bawah merupakan rancangan awal dan perlu dikonfirmasi dengan pemilik proses bisnis. Penegakan harus dilakukan di backend, bukan hanya menyembunyikan tombol di UI. 

|**Peran**|**Kemampuan yang diusulkan**|
|---|---|
|**Owner / Admin**|Mengakses ringkasan lintas outlet sesuai<br>otorisasi, mengelola parameter/constraint bisnis,<br>menyetujui keputusan berisiko tinggi, melihat<br>audit, dan mengelola akses jika fungsi tersebut<br>diaktifkan.|
|**Direktur Operasional / Area Manager**|Melihat dan menganalisis outlet dalam<br>cakupannya, membuat objective, mengevaluasi<br>opsi, serta approve/reject/revise sesuai delegasi.|
|**PMO / Business Analyst**|Meninjau data readiness, diagnosis, asumsi,<br>simulasi, dan rekomendasi; menyiapkan usulan<br>untuk approver. Hak eksekusi bergantung pada<br>delegasi.|
|**Marketing**|Melihat hasil analisis promosi, meninjau opsi,<br>dan menyiapkan draft campaign/material; tidak<br>mengesahkan constraint finansial tanpa izin.|
|**Finance**|Memeriksa HPP, margin, budget, dan financial<br>guardrail sesuai cakupan akses; mengesahkan<br>aturan finansial jika diberi kewenangan.|
|**Outlet Manager / Supervisor**|Melihat data outlet dalam cakupannya,<br>memberikan input/konteks, dan melihat status<br>event. Approval hanya jika diberikan secara<br>eksplisit.|
|**Viewer / Auditor**|Melihat laporan dan audit yang diizinkan; tidak<br>mengubah constraint atau menjalankan action.|



**Penegakan teknis:** Backend memeriksa RBAC pada setiap endpoint dan tool. Permission dipisahkan antara **read** , **propose** , **approve** , **execute** , dan **administer** . Hak final tiap peran harus disepakati dengan owner sebelum integrasi data nyata. 

#### **_Open Questions — Role dan Approval_** 

- Apakah Finance harus menyetujui semua promo yang berdampak pada margin? 

- Apakah Area Manager dapat approve untuk satu outlet atau beberapa outlet? 

- Apakah Owner/Admin merupakan satu role atau dua role berbeda dalam implementasi? 

## **7. Rencana Delivery — Roadmap Bertahap** 

Roadmap berikut menyusun pekerjaan berdasarkan dependensi. Mockup UI sudah ada sebagai `Proto` ; fase implementasi lainnya tetap `Planned` sampai tim membuktikan bahwa fitur benar- 

benar selesai. 

|**Fase**|**Nama**|**Tujuan**|**Status**|
|---|---|---|---|
|0|Validasi PRD dan<br>mockup|Mengunci scope MVP,<br>workflow, stack inti,<br>kontrak data/API, dan<br>keputusan terbuka.|`Proto` untuk mockup;<br>validasi teknis<br>`Planned`|
|1|Fondasi aplikasi dan<br>security|Menyiapkan repository,<br>konfigurasi,<br>backend/API,<br>autentikasi, role, event<br>state, dan audit dasar.|<br>`Planned`|
|2|Data ingestion dan<br>analytics|Memuat data<br>demo/diizinkan,<br>validasi kualitas,<br>snapshot, schema, serta<br>perhitungan bisnis<br>deterministik.|`Planned`|
|3|Informational dan<br>Diagnostic workflow|Mengaktifkan query<br>informasi, metrik,<br>diagnosis, evidence,<br>dan jawaban dengan<br>batasan data.|`Planned`|
|4|Goal-Directed,<br>simulasi, dan constraint|Menghasilkan opsi,<br>simulasi skenario,<br>Predictive Monitoring,<br>hard constraint gate,<br>dan rekomendasi.|`Planned`|
|5|Approval, cabang<br>Reject/Revise, dan<br>action event|Membuat state machine<br>user decision,<br>versioning, approval,<br>campaign/event record,<br>dan action package.|<br>`Planned`|
|6|Actual monitoring dan<br>feedback|Membandingkan<br>prediction dengan<br>actual, menghitung<br>variance, control status,<br>dan menyimpan<br>feedback.|`Planned`|
|7|Integrasi UI, QA, dan<br>deployment|Menyambungkan UI ke<br>backend, menjalankan<br>pengujian end-to-end,<br>memperbaiki bug, dan<br>menyiapkan akses<br>demo publik.|`Planned`|



### **7.1 Pemetaan Sprint** 

Belum ada durasi sprint yang dipastikan dalam sumber. Tim dapat mengatur sprint setelah kapasitas anggota dan jadwal Technical Meeting dikonfirmasi. Urutan fase pada tabel di atas tetap menjadi urutan dependensi. 

### **7.2 Alur Pengembangan per Fitur** 

```
Requirement
```

- `→ Acceptance Criteria` 

- `→ Task Trello` 

- `→ Implementasi` 

- `→ Unit Test` 

- `→ Integrasi` 

- `→ Self Check` 

- `→ QA / End-to-End Test` 

- `→ Perbaikan Bug` 

- `→ Review Tim → Done` 

### **7.3 Struktur Tim** 

Pembagian berikut mengikuti penugasan yang terlihat pada board tim; tanggung jawab implementasi lain perlu dikonfirmasi, bukan diasumsikan. 

|**Anggota / Peran**|**Fokus yang telah tercatat**|
|---|---|
|**Neo**|Project Brief dan koordinasi/review PRD.|
|**Kiandra**|Architecture dan kebutuhan/requirement untuk<br>PRD.|
|**Rainer / Reiner**|Prototype/mockup Figma. Nama yang<br>digunakan di board perlu diseragamkan.|
|**Engineering, data integration, QA,**<br>**deployment**|Pembagian implementasi belum ditetapkan<br>dalam bahan yang tersedia. Perlu dibagi sebelum<br>fase coding.|



### **7.4 Asumsi Delivery** 

- Tim mengutamakan end-to-end core workflow dibanding jumlah fitur. 

- Jika akses POS/API belum tersedia, data simulasi yang diberi label jelas digunakan agar workflow bisa diuji. 

- Fitur eksternal yang tidak diperlukan untuk membuktikan core value ditunda. 

- Semua perubahan scope dicatat di PRD/Trello agar tim tidak membangun fitur yang belum disepakati. 

- Guidebook mencantumkan masa pengerjaan proyek 19 Oktober–10 November 2026; jadwal internal harus disesuaikan dengan tanggal tersebut dan kapasitas tim. 

### **7.5 Detail Setiap Fase** 

#### Keputusan teknologi sebelum implementasi

Sebelum Fase 1 dimulai, tim harus menyepakati usulan stack inti berikut atau mencatat penggantinya secara eksplisit:

- Frontend: React + Vite + TypeScript.
- Backend: FastAPI + Python (fondasi sudah ada di repository).
- Database target: PostgreSQL; SQLite hanya untuk tes lokal sementara.
- ORM/migrasi: SQLAlchemy + Alembic.
- Analytics/constraint: Python deterministik dengan unit test.
- Agent workflow: orkestrasi modular/state machine; framework eksternal hanya jika diperlukan.
- LLM: satu provider yang disepakati, dengan `mock` untuk tes tanpa koneksi eksternal.
- GeoAI: modul/interface terpisah; provider dan sumber data ditentukan setelah use case dan izin data divalidasi.

Tabel ini adalah rekomendasi perubahan PRD dan harus dikonfirmasi ketua tim sebelum diperlakukan sebagai keputusan final.

#### **_Fase 0 — Validasi PRD dan Mockup_** 

**Tujuan:** memastikan tim sepakat tentang problem, workflow, data, batas MVP, dan teknologi yang akan digunakan. 

**Cakupan:** review mockup; validasi status fitur; putuskan frontend/backend/database/LLM candidate; tentukan input-data contract; daftar open questions; dan buat acceptance criteria tiap domain. 

**Selesai jika:** Neo, Kiandra, dan anggota terkait menyepakati scope MVP, teknologi inti, data demo, workflow Approve/Reject/Revise, serta daftar pertanyaan yang harus dijawab owner/mentor. 

#### **_Fase 1 — Fondasi Aplikasi dan Security_** 

**Tujuan:** menyediakan struktur aplikasi yang dapat dijalankan dan memiliki kontrol akses dasar. 

**Cakupan:** repository, konfigurasi environment, backend health check, autentikasi/role minimal yang disepakati, API structure, event/workflow state awal, dan audit log dasar. 

**Selesai jika:** aplikasi dapat dijalankan dari environment yang terdokumentasi, endpoint utama memerlukan autentikasi/izin sesuai desain, dan event uji tersimpan serta dapat dibaca kembali. 

#### **_Fase 2 — Data Ingestion dan Analytics_** 

**Tujuan:** menyediakan data valid dan metrik bisnis yang menjadi dasar Agent. 

**Cakupan:** schema, data contoh berlabel, file/connector ingestion, validasi, quarantine, snapshot data, master produk/HPP, outlet, transaksi, histori promo, dan rumus metrik deterministik. 

**Selesai jika:** dataset yang valid dapat dimuat dan menghasilkan metrik yang sesuai dengan perhitungan pembanding, sedangkan data invalid ditolak/quarantine dan tidak dipakai untuk simulasi. 

#### **_Fase 3 — Informational dan Diagnostic Workflow_** 

**Tujuan:** menjawab pertanyaan bisnis dan menjelaskan kondisi berdasarkan evidence. 

**Cakupan:** intent routing, query bisnis, kalkulasi, tren, diagnosis, referensi evidence, penanganan data tidak cukup, dan penggunaan ulang diagnosis pada case yang sama. 

**Selesai jika:** pertanyaan informasi menghasilkan angka dari calculation engine dan pertanyaan diagnosis menghasilkan penjelasan yang terhubung dengan evidence serta menyatakan keterbatasan apabila bukti tidak memadai. 

#### **_Fase 4 — Goal-Directed, Simulation, dan Constraint_** 

**Tujuan:** mengubah objective menjadi alternatif yang disimulasikan dan dievaluasi. 

**Cakupan:** objective form, option generation, simulation, Predictive Monitoring, constraint gate, ranking/evaluasi, serta penjelasan recommendation. 

**Selesai jika:** objective uji menghasilkan beberapa opsi, setiap opsi memiliki simulasi/asumsi/risiko, opsi yang melanggar hard constraint ditolak, dan opsi yang disajikan membedakan prediction dari 

fact. 

#### **_Fase 5 — Approval, Reject/Revise, dan Action Event_** 

**Tujuan:** membuat keputusan dapat disetujui, ditolak, atau direvisi tanpa kehilangan konteks. 

**Cakupan:** UI dan API approve/reject/revise, permission approver, versioning proposal, rediagnose/re-simulate, pertanyaan revisi, pencatatan keputusan, serta pembuatan event/campaign record setelah approval. 

**Selesai jika:** tiga cabang keputusan dapat diuji end-to-end; reject mengarah ke re-diagnosis dan redecision, revise mengumpulkan perubahan dan menghasilkan revisi keputusan, sedangkan action event hanya aktif setelah approval sah. 

#### **_Fase 6 — Actual Monitoring dan Feedback_** 

**Tujuan:** membandingkan prediksi dengan hasil aktual dan menyimpan hasil untuk keputusan berikutnya. 

**Cakupan:** data actual, Prediction baseline, Realtime Prediction, variance, status control, feedback record, dan riwayat hasil. 

**Selesai jika:** event uji menyimpan baseline yang tidak berubah, menerima data actual, 

menampilkan perbandingan, menghitung variance, dan menyimpan feedback yang terkait dengan event yang benar. 

#### **_Fase 7 — Integrasi, QA, dan Deployment_** 

**Tujuan:** memastikan core MVP stabil dan dapat dinilai melalui demo publik. 

**Cakupan:** integrasi UI/API/database/LLM, uji permission, uji error, uji workflow, dokumentasi setup, deployment, repository, dan demo scenario. 

**Selesai jika:** skenario utama dapat dijalankan dari input objective sampai monitoring/feedback tanpa bug blocker, tautan demo dapat diakses sesuai ketentuan lomba, dan repository serta dokumentasi tersedia bagi juri. 

## **8. Risiko dan Mitigasi** 

|**Risiko**|**Dampak**|**Mitigasi**|
|---|---|---|
|Data POS tidak tersedia atau<br>formatnya tidak konsisten|Core analysis tidak bisa<br>memakai data nyata|Konfirmasi akses sedini<br>mungkin; siapkan CSV/dataset<br>sintetis berlabel; validasi<br>schema dan mapping.|
|Data HPP/margin atau histori<br>promo tidak lengkap|Simulasi kurang dapat<br>dipercaya|Tampilkan data readiness;<br>tandai asumsi; jangan keluarkan<br>estimasi yang membutuhkan<br>data yang tidak ada.|
|Prediksi dianggap sebagai<br>jaminan bisnis|User dapat mengambil<br>keputusan dengan ekspektasi|Labeli semua hasil sebagai<br>estimate, tunjukkan|



|**Risiko**|**Dampak**|**Mitigasi**|
|---|---|---|
||keliru|asumsi/uncertainty, dan<br>bandingkan dengan Actual<br>setelah event berjalan.|
|LLM membuat angka atau<br>alasan yang tidak didukung|Rekomendasi menyesatkan|Gunakan calculation engine<br>deterministik, evidence<br>references, structured output<br>validation, dan abstention saat<br>bukti tidak cukup.|
|Opsi melanggar margin atau<br>budget|Kerugian finansial|Hard constraint gate<br>deterministik; opsi yang<br>melanggar otomatis ditolak.|
|Action dijalankan tanpa izin|Risiko operasional dan<br>keamanan|Backend-enforced RBAC,<br>approval record, pemisahan<br>read/write tool, dan audit trail.|
|API provider gagal atau limit<br>tercapai|Workflow terhenti|Error handling, timeout/retry<br>dengan batas, status gagal yang<br>jelas, dan fallback hanya untuk<br>demo yang tidak mengklaim<br>sukses eksternal.|
|Scope terlalu luas|MVP terlambat/tidak selesai|Prioritaskan Business<br>Growth/Promotion Decision;<br>tunda Maps, Weather,<br>WhatsApp, image API, dan<br>modul operasional penuh bila<br>tidak kritis.|
|Prediction baseline berubah<br>setelah action dimulai|Evaluasi hasil tidak dapat<br>dipercaya|Simpan baseline immutable dan<br>buat versi baru untuk<br>recalculation.|
|Data bisnis bocor melalui<br>log/LLM|Risiko kerahasiaan|Minimisasi data, agregasi,<br>secret management, role<br>restriction, serta audit atas akses<br>dan tool call.|
|Tim belum memutuskan stack<br>dan tanggung jawab<br>implementasi|Integrasi terlambat|Konfirmasi React/Vite, FastAPI,<br>PostgreSQL, LLM provider, dan<br>kontrak API pada Fase 0; tetapkan<br>owner serta acceptance criteria<br>setiap task di Trello.|



### **8.1 Dependensi** 

- Keputusan stack frontend, backend, database, dan provider LLM. 

- Data bisnis yang diizinkan atau dataset sintetis terstruktur untuk demo. 

- Definisi field transaksi, master produk/HPP, outlet, dan histori promosi. 

- Persetujuan owner terkait penggunaan data, role, hard constraint, dan batas action. 

- Credential API yang sah untuk integrasi yang dipilih. 

- Hosting frontend/backend dan repository yang dapat diakses sesuai ketentuan kompetisi. 

- Waktu anggota untuk integrasi, testing, review, dan persiapan demo. 

## **9. Definition of Done (MVP)** 

MVP dianggap selesai hanya jika seluruh kondisi berikut terpenuhi: 

1. **End-to-end user flow:** user dapat memasukkan business objective, sistem memeriksa data readiness, melakukan diagnosis bila diperlukan, membuat opsi, melakukan simulasi dan Predictive Monitoring, memeriksa constraint, menampilkan recommendation beserta evidence/asumsi/risiko, dan menerima pilihan Approve/Reject/Revise. 

2. **Percabangan workflow:** Approve hanya mengaktifkan event setelah approval valid; Reject kembali ke re-diagnosis/re-decision; Revise mengumpulkan parameter yang ingin diubah dan menghasilkan opsi/simulasi/revision decision baru. 

3. **Event dan monitoring:** keputusan yang disetujui memiliki `event_id` , Prediction baseline, target dan constraint; ketika Actual tersedia, sistem menampilkan perbandingan Prediction vs Actual dan menyimpan feedback. 

4. **Kualitas:** unit test, integration test, dan end-to-end test meliputi jalur normal, data invalid, tidak ada opsi layak, LLM/API gagal, user tidak berizin, approval ditolak, dan revisi parameter. 

5. **Integritas dan keterlacakan:** data yang digunakan, versi prediction/formula, alasan rekomendasi, approval, action, dan hasil aktual dapat ditelusuri melalui event/audit record. 

6. **Demo data:** sistem berjalan menggunakan data yang disetujui atau data sintetis yang diberi label jelas; tidak ada klaim bahwa data simulasi adalah hasil bisnis nyata. 

7. **Integrasi:** semua integrasi yang dinyatakan masuk MVP benar-benar terhubung dan diuji. Fitur eksternal yang tidak selesai harus dinyatakan tidak tersedia, bukan ditampilkan seolah berhasil. 

8. **Keamanan:** endpoint dan tool action memeriksa autentikasi, permission, constraint, dan approval sesuai role. Secret tidak tersimpan di kode yang dipublikasikan. 

9. **Kualitas UX:** alur utama dapat diselesaikan melalui UI tanpa memerlukan manipulasi database manual saat demo. 

10. **Release:** web app dapat diakses melalui tautan publik selama periode penilaian, repository kode diatur sesuai ketentuan lomba, serta README menjelaskan setup, environment variables, data demo, batasan, dan cara menjalankan demo. 

11. **Deferred scope:** publikasi otomatis ke WhatsApp/media sosial, API cuaca/kompetitor, image generation eksternal, serta modul inventory/workforce penuh tetap dinyatakan di luar MVP jika belum diimplementasikan dan diuji. 

## **10. Checklist Peluncuran** 

Sebelum demo/release, pastikan: 

- ☐ Stack final dan environment variables terdokumentasi. 

- ☐ Schema dan data demo sudah divalidasi. 

- ☐ Dataset sintetis diberi label dan tidak tercampur dengan data aktual. 

- ☐ UI terhubung ke backend untuk alur utama. 

- ☐ Intent routing mendukung Informational, Diagnostic, dan Goal-Directed. 

- ☐ Case/event tidak tercampur antar-objective. 

- ☐ Semua kalkulasi finansial inti bersifat deterministik dan memiliki test. 

- ☐ Predictive Monitoring berjalan sebelum prediction ditampilkan. 

- ☐ Hard constraint gate mencegah opsi yang tidak layak dipilih. 

- ☐ Approve/Reject/Revise telah diuji dari UI sampai backend. 

- ☐ Action/event hanya aktif setelah approval yang sah. 

- ☐ Prediction baseline tidak tertimpa setelah action dimulai. 

- ☐ Actual monitoring/feedback menangani kondisi data belum tersedia. 

- ☐ Audit log dan penanganan kegagalan bekerja. 

- ☐ Permission dan secret handling telah diuji. 

- ☐ Skenario demo utama telah dilatih dan memiliki data awal yang konsisten. 

- ☐ Dokumentasi dan README diperbarui. 

- ☐ Link demo publik dan repository siap untuk pengujian juri. 

**Urutan release:** `Final QA → Review Tim → Persetujuan/Penetapan Release → Deployment → Smoke Test → Demo` . 

## **11. Pemeliharaan Setelah Rilis** 

```
Masukan User / Hasil Monitoring
          ↓
Triage Bug atau Improvement
          ↓
Backlog Produk / Trello
          ↓
Prioritas dan Acceptance Criteria
          ↓
Development
          ↓
Testing dan Review
          ↓
Release Baru
          ↓
Monitoring Kembali
```

Pemeliharaan mencakup perbaikan bug, pemantauan error API/LLM, evaluasi kualitas data, review hasil prediction dibanding Actual, pembaruan dokumentasi, kontrol biaya provider, serta perubahan fitur yang disetujui. Perubahan formula, constraint, prompt/model, atau alur approval harus memiliki versi dan pengujian regresi yang sesuai. 

## **12. Lampiran — Alur Produk End-to-End** 

### **12.1 Alur Pengguna** 

```
Login
```

- `→ Masukkan pertanyaan atau business objective` 

- `→ TARA memeriksa konteks dan memilih workflow` 

- `→ User melihat jawaban atau diagnosis / opsi strategi` 

- `→ Untuk Goal-Directed: lihat simulasi, risiko, asumsi, dan constraint` 

- `→ Pilih Approve / Reject / Revise` 

- `→ Jika Approve: tinjau approval dan aktifkan event/action yang diizinkan → Pantau Prediction vs Actual` 

- `→ Tinjau feedback dan hasil` 

### **12.2 Alur Admin/Operator** 

```
Login dengan role yang sesuai
```

- `→ Kelola/unggah data yang diizinkan` 

- `→ Lihat status validasi dan quarantine` 

- `→ Kelola konfigurasi/constraint sesuai permission` 

- `→ Review event dan audit trail` 

- `→ Pantau kegagalan tool/integrasi` 

- `→ Perbaiki data atau konfigurasi melalui prosedur yang disetujui` 

### **12.3 Alur Sistem** 

```
Sumber Data / File / POS Connector
```

- `→ Ingestion dan Timestamped Snapshot` 

- `→ Validasi Data / Quarantine` 

- `→ Database Terstandar` 

- `→ Backend API + Event/Workflow State` 

- `→ Intent Router + Context Check` 

- `→ Informational / Diagnostic / Goal-Directed` 

- `→ Deterministic Analytics + Intelligence Context` 

- `→ Generate Options → Simulate` 

- `→ Predictive Monitoring → Constraint Gate → Evaluate Options` 

- `→ Decision + Explanation` 

- `→ User Selection / Approval` 

- `→ Action/Event Activation` 

- `→ Actual Monitoring → Control → Feedback / Audit` 

### **12.4 Alur Cabang Keputusan** 

##### **Approve/Terima** 

```
Decision Presented → User Approves → Permission/Constraint Recheck
→ Activate Event + Freeze Prediction Baseline → Action Package
→ Actual Monitoring → Control → Feedback
```

##### **Reject/Tolak** 

```
Decision Presented → User Rejects → Re-diagnose
→ Re-explore Options → Re-simulate → Re-decision
→ User selects Approve / Reject / Revise again
```

##### **Revise/Revisi** 

```
Decision Presented → User Requests Revision → Ask for Details if Needed
→ Evaluate Requested Change → Re-explore Options
→ Re-simulate → Revision Decision → User selects again
```

## **Daftar Keputusan yang Harus Dikunci Sebelum Implementasi** 

1. Frontend: Next.js atau React. 

2. Backend: FastAPI atau Node.js. 

3. Database: PostgreSQL/Supabase atau alternatif. 

4. LLM provider/model dan pendekatan agent orchestration. 

5. Format data MVP: CSV/Excel, API POS, atau kombinasi. 

6. Periode data historis yang benar-benar tersedia dan diizinkan. 

7. Rumus metrik, baseline, dan aturan hard constraint yang akan digunakan. 

8. Hak approve/execute/adjust/stop untuk tiap role. 

9. Batas action MVP: event/campaign record dan draft materi atau integrasi eksternal. 

10. Hosting, repository publik, biaya API, serta batas pemakaian untuk demo. 

**Status dokumen:** PRD ini merupakan satu acuan produk dan engineering awal. Perubahan setelah review tim/mentor harus diperbarui di dokumen ini agar Project Brief, Architecture, task Trello, dan implementasi tetap selaras. 



## **12. Ringkasan Keputusan Teknologi untuk Review Tim**

Rekomendasi stack inti: **React + Vite + TypeScript, FastAPI + Python, PostgreSQL, SQLAlchemy + Alembic, Pydantic, pytest + HTTPX, serta satu provider LLM dengan mock provider untuk pengujian.** Orkestrasi Agent dimulai dari workflow modular/state machine sebelum mempertimbangkan framework tambahan.

**TARA GEOAI** menjadi modul pendukung terpisah untuk konteks geografis. Provider geospasial atau Maps/Places belum dikunci dan bukan dependensi wajib untuk menjalankan core workflow pertama.

Prioritas urutan implementasi: (1) konfirmasi stack dan kontrak data/API; (2) persistence dan data ingestion CSV; (3) analytics deterministic; (4) Informational dan Diagnostic; (5) Goal-Directed, simulation, Predictive Monitoring, dan hard constraints; (6) Approve/Reject/Revise dan action package; (7) Actual Monitoring, feedback, audit; (8) integrasi UI, QA, dan deployment.

Catatan: rekomendasi teknologi di atas tidak mengubah status implementasi aktual. Komponen yang belum tersedia harus tetap diberi label `Planned`, `Skeleton`, atau `Blocked` hingga benar-benar dibangun dan diuji.
