# **TARA AGENT** 

Business Reasoning & Value Acceleration Agent 

**Tagline:** From Business Signals to Executable Decisions **Kategori:** AI Agent: Building Intelligent AI Agents for Enterprise Productivity **Fokus Industri:** Enterprise & Industry: F&B Multi-Outlet 

**Catatan branding:** TARA AGENT adalah nama kerja utama dalam dokumen ini. Arsitektur produk dibuat brand-agnostic, sehingga nama dapat dievaluasi ulang setelah validasi owner tanpa mengubah fungsi, workflow, atau data model. Nama alternatif hanya menjadi keputusan branding, bukan penggantian konsep TARA AGENT. Sebelum penggunaan komersial, tim wajib memeriksa ketersediaan merek dan domain. dokumen ini tidak menyatakan bahwa nama TARA AGENT atau alternatifnya sudah tersedia secara legal. 

## 1.Definisi Produk 

<mark>TARA AGENT adalah AI Agent untuk bisnis F&B multi-outlet yang:</mark> 

1. Mengamati kondisi bisnis secara berkelanjutan. 

<mark>2. Menganalisis data historis dan operasional.</mark> 

<mark>3. Mengidentifikasi masalah serta peluang.</mark> 

<mark>4. Melakukan reasoning dan simulasi terhadap berbagai strategi.</mark> 

5. Menghasilkan rekomendasi keputusan yang terukur untuk membantu manajemen meningkatkan performa dan omzet. 

Setelah rekomendasi disetujui, TARA AGENT membantu mengeksekusi keputusan menjadi tindakan nyata, mengukur hasilnya, dan menggunakan hasil tersebut sebagai umpan balik (feedback) untuk keputusan berikutnya. 

## 2.Statement Problem 

Pada bisnis F&B multi-outlet, data tersedia namun proses mengubah data menjadi keputusan dan tindakan masih membutuhkan analisis manual serta koordinasi lintas fungsi/lapisan manajemen. 

##### **Dampak yang muncul:** 

- <mark>Identifikasi masalah dan peluang sering terlambat.</mark> 

- <mark>Analisis data masih bergantung pada pekerjaan manual.</mark> 

- <mark>Pengambilan keputusan melibatkan banyak pihak dan lapisan birokrasi.</mark> 

- <mark>Keputusan tertinggal dari perubahan kondisi pasar.</mark> 

- Keputusan bisnis belum selalu mempertimbangkan data lintas fungsi secara bersamaan. 

**Problem inti:** Data ada, tetapi belum cepat berubah menjadi keputusan yang dapat dieksekusi. 

## 3.Target Users 

###### **Primary User:** 

- Owner 

- Direktur Operasional 

- PMO 

- Area Manager 

###### **Secondary User:** 

- Outlet Manager 

- Marketing 

- Purchasing 

- Finance 

- Supervisor 

TARA AGENT berfungsi sebagai **decision-support layer** yang menjembatani data operasional dengan pengambil keputusan. 

## 4.Business Objective 

Pengguna memberikan business objective secara langsung ke TARA AGENT, misalnya: 

_"Naikkan omzet outlet sebesar 15% bulan ini, tetapi margin tetap aman dan diskon tidak lebih dari 15%."_ 

Objective ini menjadi target yang harus dicapai melalui proses reasoning, planning, simulation, dan decision-making TARA AGENT. 

## <mark>5.Core Agent Workflow</mark> 

TARA AGENT bekerja sebagai **decision-making cycle** yang mengubah business input menjadi pemahaman, rekomendasi, tindakan, dan pembelajaran. Tidak setiap interaksi menjalankan seluruh siklus; workflow yang digunakan ditentukan terlebih dahulu melalui **intent routing** . 

_Input → (Routing → Thinking) → Output / Action_ 

**Thinking** terdiri dari tiga workflow utama: 

1. **Informational** — mengambil atau menghitung informasi bisnis untuk menjawab pertanyaan. 

2. **Diagnostic** — menganalisis kondisi, masalah, penyebab, atau peluang berdasarkan evidence. 

3. **Goal-Directed** — menerjemahkan business objective menjadi opsi strategi, simulasi, evaluasi, approval, dan tindakan yang dapat dipantau. 

Dengan demikian, TARA AGENT tidak hanya menghasilkan jawaban, tetapi dapat membawa proses dari **business signal → decision → action → feedback** , dengan keputusan final tetap berada pada manusia yang berwenang. 

**Note: (Routing → Thinking) ada di bagian 6** 

## 6.Intent & Workflow Routing 

### **Intent & Workflow Routing** 

**Intent & Workflow Routing adalah tahap Routing dalam Core Agent Workflow** yang menentukan bagaimana TARA AGENT harus memproses setiap business input. Routing terjadi setelah input diterima dan sebelum **Thinking** dimulai. 

_Input → [Context Check → Task Routing → (Informational / Diagnostic / GoalDirected)] → Output_ 

Routing tidak menghasilkan keputusan bisnis; fungsinya adalah menentukan **workflow Thinking yang tepat** dan memastikan percakapan dilanjutkan pada case serta state yang benar. 

#### **Routing Flow** 

_Context Check → Task Routing → (Informational / Diagnostic / Goal-Directed)_ 

|**Workflow**|**Digunakan untuk**|
|---|---|
|**Informational**|Informasi, query, atau kalkulasi sederhana.|
|**Diagnostic**|Memahami kondisi, masalah, penyebab, atau peluang berdasarkan<br>evidence.|
|**Goal-Directed**|Business objective yang membutuhkan strategi, simulasi, evaluasi,<br>approval, dan action.|



#### **Active Event & Context Check** 

Sebelum menentukan workflow, TARA AGENT memeriksa apakah input berkaitan dengan **case aktif** . Routing mempertimbangkan case, conversation context, business scope, workflow state, user role/permission, dan requested task — bukan hanya pesan terakhir. 

Contoh: 

_"Kenapa omzet turun?" → Diagnostic_ 

_"Kalau begitu bagaimana cara menaikkannya?" → Goal-Directed_ 

_"Pilih opsi B." → Continuation_ 

_"Jalankan." → Approval / Action continuation_ 

#### **Event & State** 

Setiap objective, campaign, atau workflow bisnis direpresentasikan sebagai event_id dengan context dan state sendiri. Case memungkinkan percakapan berlanjut lintas waktu dan beberapa case berjalan secara bersamaan. 

Secara konseptual: 

_Diagnosing → Options Presented → Pending Approval → Executing → Monitoring → Closed_ 

Detail classifier dan state machine berada di PRD. 

**Monitoring dan Control bukan hasil routing intent.** Keduanya merupakan bagian dari lifecycle setelah action dijalankan. 

## 7.Informational Workflow 

Digunakan ketika user hanya membutuhkan informasi atau angka bisnis. 

Contoh: "Berapa omzet outlet A minggu ini?" 

_Input → Read Business Data → Query / Calculate → Answer_ 

Angka dihasilkan langsung dari deterministic query/calculation engine, bukan estimasi LLM. 

## 8.Diagnostic Workflow 

Digunakan ketika user ingin memahami kondisi, masalah, penyebab, atau peluang. 

Contoh: "Kenapa omzet outlet A turun?" 

_Input → Read Business Data → Diagnose → Evidence Validation → Explain Finding → Answer_ 

###### Fokus: **What happened? Why did it happen?** 

Diagnostic bersifat reusable, bukan branch yang selalu berdiri sendiri: 

- **Standalone** — berhenti setelah Explain Finding. 

- **Embedded di Goal-Directed** — ketika objective membutuhkan pemahaman kondisi sebelum Generate Options. 

- **Reused saat Re-Thinking** — ketika Monitoring menemukan evidence baru. 

Ketika user melanjutkan dari Diagnostic ke Goal-Directed pada event yang sama, TARA AGENT menggunakan ulang root cause dan evidence yang sudah ditemukan dan tidak mengulang diagnosis, kecuali ada context atau data baru. Jika perpindahan terjadi secara implisit ("terus gimana solusinya?"), TARA AGENT memastikan dulu bahwa user memang menginginkan rekomendasi tindakan sebelum menjadi preskriptif. 

## 9.Goal-Directed Workflow 

Digunakan ketika user memiliki business objective dan membutuhkan rekomendasi strategi. 

TARA AGENT tidak langsung menampilkan hasil simulasi kepada user. Setiap opsi terlebih dahulu melalui **Predictive Monitoring** , yaitu proses internal untuk menginspeksi trajectory hasil simulasi sebelum opsi dievaluasi dan dipresentasikan. _Read Business Data → Diagnose (jika diperlukan) → Generate Options → Simulate →_ **_Predictive Monitoring_** _→ Evaluate Options → User Selection → Approval → Action → Monitoring → Control → Feedback / Learning_ 

Siklus ini memisahkan dua kondisi monitoring: 

- **Predictive Monitoring** — dilakukan sebelum action dijalankan, menggunakan hasil simulasi/future projection untuk melihat kemungkinan trajectory, potensi deviasi, constraint breach, sensitivitas, dan kondisi yang dapat menyebabkan strategi keluar dari target. 

- **Actual Monitoring / Monitoring** — dilakukan setelah action berjalan, menggunakan actual business data untuk membandingkan hasil nyata dengan Prediction dan memperbarui Realtime Prediction. 

###### **Predictive Monitoring** 

Predictive Monitoring merupakan tahap internal reasoning sebelum hasil prediction ditampilkan kepada user. 

Untuk setiap opsi yang feasible, TARA AGENT melakukan: 

_Simulation → Future Trajectory → Predictive Monitoring → Risk / Deviation Detection → Re-evaluation_ 

TARA AGENT memeriksa sekurang-kurangnya: 

- apakah trajectory prediction konsisten dengan objective; 

- apakah terdapat titik waktu ketika target mulai tertinggal; 

- apakah margin, inventory, budget, discount, atau constraint lain berpotensi terlanggar; 

- seberapa sensitif hasil terhadap perubahan asumsi; 

- apakah terdapat kondisi yang membuat prediction menjadi tidak stabil; 

- apakah terdapat skenario downside yang material; 

- apakah evidence dan asumsi yang digunakan cukup kuat untuk mendukung prediction. 

Predictive Monitoring **tidak mengubah Prediction baseline secara diam-diam** . Prediction tetap merupakan baseline estimasi yang dibuat sebelum action berjalan. 

Apabila predictive monitoring menemukan masalah, TARA AGENT melakukan re-analysis terhadap opsi sebelum hasil dipresentasikan. Contohnya: 

_Simulation → Prediction +13% → Predictive Monitoring menemukan risiko trajectory → Re-analysis → Prediction/assessment diperbarui sesuai mekanisme yang ditetapkan → Evaluate Options_ 

Dengan demikian, prediction yang ditampilkan kepada user bukan hasil simulasi mentah, tetapi **hasil simulasi yang telah terlebih dahulu diperiksa oleh reasoning engine** . 

Predictive Monitoring tidak diperlakukan sebagai Actual Monitoring. Tidak ada actual business outcome pada tahap ini; seluruh hasil masih berupa projection, estimate, assumption, atau uncertainty. 

###### **Simulation & Evaluate Options** 

Simulation memperkirakan dampak setiap opsi menggunakan historical data, business rules, hasil campaign sebelumnya, atau asumsi eksplisit. Hasil simulation merupakan estimate/prediction, bukan jaminan. 

Setiap prediction dapat berbentuk trajectory terhadap waktu, bukan hanya satu angka akhir. 

Contoh: 

|**Opsi**|**Final**|**Trajectory**|**Margin Risk**|**Predictive Finding**|
|---|---|---|---|---|



||**Prediction**||||
|---|---|---|---|---|
|A|+7%|Stabil tetapi di<br>bawah target|Rendah|Target kemungkinan tidak<br>tercapai|
|B|+13%|Naik stabil|Rendah|Hampir mencapai target|
|C|+16%|Tinggi tetapi<br>volatil|Tinggi|Berpotensi mencapai target<br>tetapi memiliki downside risk|



Evaluate Options dilakukan **setelah Predictive Monitoring** , sehingga evaluasi tidak hanya mempertimbangkan angka akhir simulation, tetapi juga trajectory, potensi deviasi, risk, sensitivity, constraint, feasibility, dan evidence quality. 

Strategi dengan final prediction tertinggi tidak otomatis menjadi keputusan terbaik. 

## 10.Human Decision & Approval 

_AI Analysis → Options → Simulation → User Selection → Approval → Action_ 

**Prinsip:** _AI recommends and prepares; authorized humans decide and approve._ 

TARA AGENT boleh menganalisis, menghasilkan opsi, mensimulasikan, mengevaluasi, merekomendasikan, dan menyiapkan output tindakan. TARA AGENT **tidak boleh** diam-diam mengambil keputusan bisnis final atau mengganti opsi yang sudah dipilih user. User dapat memilih, menolak, merevisi, mendiskusikan, dan menantang hasil analisis. 

Pilihan approval: **Approve / Reject / Revise** . 

**Mekanisme yang dapat diaudit:** setiap proposal menyimpan outlet, SKU, harga, waktu, kuota, anggaran, channel, data version, formula version, risiko, masa berlaku, dan approver. Revisi pada parameter utama membatalkan approval lama dan mengharuskan approval baru. 

## 11.Action / Execution 

Setelah user memilih dan menyetujui opsi, TARA AGENT mengubah keputusan tersebut menjadi **event aktif** yang menjadi objek utama pada lifecycle Monitoring. 

_User Selection → Approval → Activate Event → Monitoring_ 

Pada tahap ini, TARA AGENT akan: 

1. Membuat event_id untuk keputusan yang disetujui. 

2. Menyimpan opsi yang dipilih beserta objective, outlet, periode, KPI, constraint, parameter strategi, asumsi, dan evidence yang digunakan. 

3. Menetapkan **Prediction baseline** dari hasil simulation yang telah melalui Predictive Monitoring. 

4. Menetapkan target dan metrik yang akan dibandingkan selama event berjalan. 

5. Mengubah workflow state menjadi **Monitoring** sehingga event dapat dipantau pada periode yang telah ditentukan. 

6. Menghubungkan event dengan actual business data yang masuk sehingga hasil aktual dapat dibandingkan dengan Prediction dan menghasilkan Realtime Prediction. 

7. Menjadikan event tersebut sebagai sumber traceability dari **keputusan → prediction → actual → monitoring result → feedback** . 

Dengan demikian, fungsi Action / Execution pada MVP adalah **mengaktifkan keputusan yang sudah disetujui menjadi event yang siap dipantau dan diukur hasilnya** . 

## 12.Monitoring, Control & Feedback 

Setelah action dijalankan, monitoring menggunakan actual business data: 

_Prediction → Action Running → Actual Data → Forecast Recalibration → Realtime Prediction_ 

Tahap ini berbeda dari Predictive Monitoring karena sekarang TARA AGENT memiliki evidence aktual. 

   - **Prediction** adalah baseline immutable yang dibuat sebelum action. 

   - **Actual** adalah hasil bisnis yang benar-benar terjadi. 

- **Realtime Prediction** adalah forecast terbaru setelah actual terbaru tersedia. 

Predictive Monitoring dapat memprediksi bahwa sebuah campaign berpotensi mencapai +13%, tetapi Actual pada hari ke-7 mungkin hanya +8%. Perbedaan tersebut kemudian diproses oleh Actual Monitoring dan Control untuk menentukan apakah perlu Continue, Re-analysis, Adjust, atau Stop. 

Dengan demikian lifecycle lengkap TARA AGENT menjadi: 

_Understand → Simulate → Predictively Observe → Evaluate → Decide → Approve → Act → Observe Actuals → Recalibrate → Control → Learn_ 

## 13.Reasoning & Decision Principles 

###### **Predict Before Present** 

TARA AGENT harus terlebih dahulu "melihat" dan menginspeksi hasil prediction secara internal sebelum prediction tersebut disajikan kepada user. 

Secara konseptual: 

_Generate → Simulate → Predictive Monitoring → Inspect → Evaluate → Present_ 

Prediction yang tampil pada UI merupakan hasil yang telah melalui predictive inspection, bukan raw output dari simulator. 

TARA AGENT dapat menggunakan hasil predictive monitoring untuk: 

- mendeteksi kemungkinan kegagalan sebelum action dijalankan; 

- mengidentifikasi constraint yang berpotensi terlanggar; 

- memahami trajectory, bukan hanya endpoint; 

- menemukan sensitivitas terhadap asumsi; 

- mengidentifikasi skenario downside; 

- menentukan apakah evidence cukup kuat; 

- melakukan re-analysis sebelum memberikan recommendation. 

Prinsip ini menghasilkan urutan: 

###### **AI observes the future projection before the human observes the projection.** 

Namun prediction tetap diperlakukan sebagai **estimate** , bukan fakta atau jaminan. 

Prediction awal disimpan immutable sebagai baseline setelah proposal dikunci untuk approval. Setiap perubahan akibat revisi parameter, simulation ulang, atau perubahan context harus menghasilkan versi prediction baru yang dapat dilacak melalui versioning dan audit trail. 

###### **Evidence, Prediction & Uncertainty** 

Pada tahap predictive monitoring, TARA AGENT harus membedakan: 

- **Fact** — data historis atau actual yang benar-benar tersedia; 

- **Prediction** — hasil projection sebelum action; 

- **Inference** — interpretasi terhadap trajectory prediction; 

- **Assumption** — kondisi yang diasumsikan dalam simulation; 

- **Uncertainty** — bagian prediction yang memiliki ketidakpastian material. 

Predictive Monitoring tidak boleh mengubah prediction menjadi fact. 

## 14.Data Scope 

Data TARA AGENT dibagi menjadi **Core Business Data** , **Supporting Intelligence Data** , dan **Data Governance & Traceability** . 

#### **Sales & Transaction Data — Core** 

Data untuk memahami performa penjualan outlet. 

- transaction_id — ID transaksi unik 

- outlet_id — outlet tempat transaksi 

- transaction_datetime — waktu transaksi 

- order_channel — dine-in, takeaway, delivery, dll. 

- sku_id — produk/menu 

- quantity — jumlah produk terjual 

- selling_price — harga jual per unit 

- discount_amount — nominal diskon 

- gross_sales — penjualan sebelum diskon 

- net_sales — penjualan setelah diskon 

- payment_method — metode pembayaran 

- void/refund_status — status pembatalan/refund 

Digunakan untuk menghitung revenue, sales trend, product performance, basket behavior, dan baseline bisnis. 

#### **Product & Menu Data — Core** 

Data master produk yang menjadi dasar analisis SKU dan margin. 

- sku_id 

- sku_name 

- category_id 

- category_name 

- product_status 

- selling_price 

- cost_price / HPP 

- gross_margin 

- margin_percentage 

- unit 

- recipe/BOM jika tersedia 

- product_group 

- launch_date 

- discontinue_date 

#### **Promotion Data — Core** 

Data historis untuk memahami efektivitas promosi. 

- promotion_id 

- promotion_name 

- promotion_type 

- start_datetime 

- end_datetime 

- target_outlet 

- target_sku 

- discount_percentage 

- discount_amount 

- promotion_budget 

- promotion_channel 

- minimum_purchase 

- quota 

- revenue_before_promotion 

- revenue_during_promotion 

- revenue_after_promotion 

- incremental_revenue jika dapat dihitung 

- promotion_cost 

- promotion_roi 

- prediction_baseline 

- actual_result 

#### **Outlet & Operational Data — Core/Supporting** 

Data untuk memahami perbedaan performa antar-outlet. 

- outlet_id 

- outlet_name 

- location 

- region/area 

- outlet_type 

- operating_hours 

- opening_date 

- capacity 

- sales_target 

- operational_status 

- available_channels 

- peak_hours 

- staff_capacity jika tersedia 

#### **Inventory Data — Supporting** 

Data untuk memastikan rekomendasi tidak menghasilkan demand yang tidak dapat dipenuhi. 

- inventory_snapshot_id 

- outlet_id 

- sku_id 

- stock_quantity 

- reserved_quantity 

- available_quantity 

- minimum_stock 

- stock_in 

- stock_out 

- waste_quantity 

- stockout_status 

- inventory_timestamp 

#### **Financial Guardrail Data — Supporting** 

Data untuk menjaga keputusan tetap sesuai batas finansial. 

- Revenue 

- HPP 

- Gross profit 

- Gross margin 

- Discount cost 

- Promotion cost 

- Budget 

- Budget utilization 

- Minimum margin 

- Target revenue 

- Contribution/profitability metrics 

Metric dihitung oleh **deterministic calculation engine** , bukan LLM. 

#### **Market & Competitor Data — Supporting** 

Data eksternal digunakan sebagai konteks, bukan sebagai sumber kebenaran absolut. 

- competitor_id 

- competitor name 

- location 

- product/menu 

- observed price 

- promotion 

- observation timestamp 

- source 

- market segment 

- trend signal 

TARA AGENT **tidak mengasumsikan akses terhadap revenue, transaksi, atau traffic aktual kompetitor** . 

#### **External Context Data — Supporting** 

Sinyal eksternal yang dapat memengaruhi performa bisnis. 

- Calendar 

- Hari kerja/weekend 

- Public holiday 

- Local event 

- Weather 

- Seasonality 

- Location/geo context 

- Market trend 

Data yang tidak tersedia tidak dianggap bernilai nol; sistem mencatat keterbatasan coverage. 

#### **Business Objective & Constraint Data** 

Data yang berasal dari objective user dan parameter keputusan. 

- event_id 

- business objective 

- target metric 

- target value 

- outlet scope 

- SKU scope 

- campaign period 

- maximum discount 

- minimum margin 

- maximum budget 

- quota 

- operational capacity 

- stop condition 

- approval requirement 

#### **Prediction, Actual & Feedback Data** 

Digunakan untuk Monitoring dan historical learning. 

- campaign_id 

- prediction_id 

- prediction baseline 

- prediction timestamp 

- predicted impact 

- actual result 

- actual timestamp 

- realtime prediction 

- variance/deviation 

- forecast version 

- feedback 

- outcome classification 

- historical learning record 

###### **Prediction awal tidak boleh diubah setelah action dimulai.** 

#### **Data Quality & Readiness** 

Setiap dataset melewati validasi sebelum digunakan. 

- completeness 

- validity 

- consistency 

- freshness 

- duplicate detection 

- anomaly detection 

- reconciliation status 

- source reliability 

- data readiness status 

- quarantine status 

Dataset yang gagal hard gate **tidak boleh digunakan untuk simulation** . 

#### **Data Traceability & Governance** 

Setiap keputusan harus dapat ditelusuri kembali ke data yang digunakan. 

- dataset_id 

- snapshot_id 

- source_id 

- ingestion timestamp 

- data version 

- formula version 

- model/version jika relevan 

- evidence reference 

- assumption 

- uncertainty 

- user/role 

- approval record 

- tool call 

- action ID 

- campaign ID 

- audit log 

#### **Data Priority untuk MVP** 

###### **Must Have** 

- Sales & Transaction 

- Product & HPP 

- Outlet 

- Promotion History 

- Business Objective & Constraint 

###### **Should Have** 

- Inventory 

- Financial Guardrail 

- Calendar/Event 

###### **Could Have** 

- Competitor 

- Market Trend 

- Weather 

- Geo Context 

**Prinsip utama:** data yang tidak tersedia atau tidak lolos validasi tidak boleh diisi dengan asumsi seolah-olah merupakan fakta. 

## 15.Security & Governance 

**TARA AGENT tidak boleh:** mengambil keputusan high-impact tanpa kontrol manusia, menggunakan data sensitif tanpa otorisasi, mengarang data yang tidak tersedia, melanggar business constraint, atau menjalankan tool tanpa permission. 

**TARA AGENT harus memiliki:** Authentication, Authorization, Role-Based Access, Tool Permission, Input/Output Validation, Audit Logging, Error Handling, Data Privacy, dan Human Approval. 

- Akses baca dan tulis dipisahkan; secret disimpan di sisi server. 

- Data pribadi tidak dikirim ke LLM jika data agregat sudah cukup. 

- Audit trail mencakup tool call, input, output, versi formula, approval, dan hasil aktual. 

- Stop/rollback hanya berlaku pada tindakan yang masih dapat dibatalkan, mengikuti izin role. 

## 16.MVP Scope & Non-Goals 

**Core MVP:** Business Growth / Promotion Decision 

**Supporting Intelligence:** Outlet Health, Inventory, Financial Guardrail, Market/Competitor Context 

## 17.Success Criteria / KPI 

|**KPI**|**Definisi**|
|---|---|
|**Decision Time**|Durasi dari business objective sampai rekomendasi<br>dihasilkan|
|**Decision Efficiency**|Seberapa banyak proses manual yang dipangkas|
|**Margin Safety**|Proporsi rekomendasi yang memenuhi constraint margin|
|**Revenue Uplift**|Perubahan performa setelah action dijalankan|
|**Prediction**<br>**Accuracy**|Kedekatan estimasi dengan hasil aktual|
|**Action Completion**|Proporsi rekomendasi yang benar-benar dapat dieksekusi|



## 18.Main Demo Scenario 

**Owner:** "Saya ingin meningkatkan omzet outlet sebesar 15% bulan ini. Diskon maksimal 15% dan margin harus tetap aman." 

Yang akan dilakukan oleh AI: 

_Input → Routing → Data → Diagnosis → Options → Simulation → Evaluate Options → User Selection → Approval → Action → Monitoring → Prediction vs Actual vs Realtime Prediction → Control / Re-analysis (bila perlu)_ 

###### Hal yang akan dilakukan: 

1. Owner memasukkan objective, batas diskon, margin minimum, outlet, dan periode. 2. TARA AGENT mengarahkan input ke Goal-Directed Workflow, lalu menunjukkan data readiness, baseline, dan fakta naik-turun sebelum menampilkan hipotesis. 

3. TARA AGENT menampilkan opsi A/B/C dengan asumsi, estimasi dampak, risiko, dan sensitivitas; opsi yang melanggar constraint ditandai tidak layak. 

4. Owner memilih opsi, lalu memberi Approve, Reject, atau Revise. 

5. Setelah approval, TARA AGENT menyiapkan action package (campaign record dan draft materi) beserta campaign ID. 

6. Demo menampilkan Prediction vs Actual vs Realtime Prediction, lalu Control (continue atau re-analysis) bila ditemukan deviasi. 

7. Hasil disimpan sebagai historical feedback untuk keputusan berikutnya. 

Seluruh data pada demo adalah data simulasi yang diberi label jelas dan tidak dipresentasikan sebagai hasil bisnis aktual. 

## 19.High-Level System Architecture 

Data dari TERRA POS, master produk/HPP, inventory, data outlet, histori promo, dan sinyal eksternal yang diizinkan masuk melalui connector atau file terjadwal. Data mentah disimpan sebagai snapshot bertimestamp agar setiap rekomendasi dapat direproduksi. 

_Data Sources → Ingestion → Validation & Quarantine → Normalized Database → Deterministic Analytics → Outlet/Market Intelligence → Scenario Simulator → Constraint Gate → LLM Explanation → Human Approval → Authorized Action Tools → Monitoring & Feedback_ 

###### **Lapisan sistem:** 

|**Lapisan**|**Fungsi**|
|---|---|
|Data layer|Snapshot, data terstandar, master SKU, versi HPP|
|Reasoning engine|Metrik bisnis serta konteks outlet, kompetitor, dan tren|



|Decision engine|Menghasilkan dan menyaring opsi berdasarkan constraint|
|---|---|
|Event / workflow state<br>layer|Context dan state perevent_id(Bagian 7)|
|Approval & action layer|Menyiapkan atau menjalankan tindakan setelah approval|
|Monitoring & feedback<br>layer|Membandingkan Prediction, Actual, dan Realtime Prediction;<br>menyimpan feedback|



**Prinsip fail-closed:** data yang tidak lolos validasi tidak masuk perhitungan; baseline yang tidak memadai hanya menghasilkan observasi; simulasi tanpa histori yang cukup diberi label asumsi; proposal tanpa approval tidak dapat dieksekusi. 

## 20.Final Positioning 

### **Final Positioning** 

Pada bisnis F&B multi-outlet, data operasional sudah tersedia, tetapi proses mengubah data menjadi **pemahaman, keputusan, dan tindakan** masih membutuhkan analisis manual serta koordinasi lintas fungsi. Akibatnya, respons bisnis menjadi lebih lambat dan peluang perbaikan dapat terlewat. 

_TARA AGENT adalah_ **_AI decision-support agent untuk F&B multi-outlet_** _yang membantu mengubah business signals menjadi keputusan dan tindakan yang terukur:_ 

**Understand → Diagnose → Explore Options → Simulate → Evaluate → Decide → Act → Monitor → Learn** 

TARA AGENT menganalisis kondisi bisnis, menemukan penyebab dan peluang, menghasilkan beberapa opsi strategi, mensimulasikan dampaknya, mengevaluasi opsi berdasarkan objective dan constraints, lalu menyiapkan tindakan setelah keputusan disetujui oleh manusia berwenang. 

###### **Core Principle** 

_AI recommends and prepares. Authorized humans decide and approve._ 

TARA AGENT bukan sekadar sistem untuk melihat data atau mendapatkan rekomendasi. TARA AGENT membantu memperpendek jalur dari **Business Data → Understanding → Decision → Action → Measurement → Feedback** , sehingga keputusan bisnis dapat dibuat lebih cepat, terukur, dan dapat ditelusuri. 

