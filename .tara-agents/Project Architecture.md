TARA AGENT 

# **TARA AGENT** 

Business Reasoning & Value Acceleration Agent 

**Tagline:** From Business Signals to Executable Decisions **Kategori:** AI Agent: Building Intelligent AI Agents for Enterprise Productivity **Fokus Industri:** Enterprise & Industry: F&B Multi-Outlet 

## **1.Product Overview** 

TARA AGENT adalah AI decision-support agent untuk bisnis F&B multi-outlet yang membantu mengubah data operasional menjadi pemahaman, rekomendasi keputusan, tindakan, dan evaluasi hasil. 

### **Core Workflow** 

Business Data 

↓ 

Understand/Memahami Bisnis 

↓ 

Diagnose / Mendiagnosis kebutuhan bisnis, (contoh: “Tolong bagaimaimana cara menaikan omset produk A ke 10%) 

↓ 

Explore Options 

(Setelah mendiagnoiss kebutuhan dan Agents kemudian melakukan Ekspor Opsion, dan membuat berapa opsi untuk selanjutnya di simulasikan.) 

↓ 

Simulate 

(Setalah melakukan Explore Options dan menemukan opsi terbaik,maka agents akan melakukan simulasi terhadap opsi - opsi terbaik dan mencari Decision / Keputusan terbaik ) 

↓ 

Decision / Keputusan terbaik 

(Setelah melakukan Simulate, maka Agents akan memberikan  Decision / Keputusan terbaik kepada user untuk di Terima (1) /Di tolak (2)  / Revis (3) ) 

↓ 

#### **(User memilih tiga opsi yaitu di Terima (1) /Di tolak (2)  / Revisi (3)** 

↓ 

What if  di Approve / Di terima (1) 

↓ 

Act / Bertidak / Esekusi keputusan terbaik 

(Maka si Agents akan bertindak semuai dengan opsi terbaik dan kebutuhan.) ↓ 

#### Monitor 

(Setelah bertindak atau mengesekusi keputusan terbaik, maka si Agents terus memantau data agar hasilnya sesuai dengan target.) 

↓ 

Learn / Belajar 

(Jadi setelah Agents selesai melakukan tugas nya / menyelesaikan Esukusinya, maka Agents belajar dari tindakannya agar tidak membuat kesalahan) 

What if di Tolak (2) 

↓ 

Re-diagnose / Dianogsis Ulang (Agents akan melakukan Dianogsis Ulang) 

↓ 

Re - Explore Options 

(Setelah melakukan Re-diagnose / Dianogsis Ulang,  Agents kemudian melakukan Ekspor Opsion, dan membuat berapa opsi untuk selanjutnya di simulasikan ) 

↓ 

#### Re - Simulate 

(Setalah melakukan Re - Explore Options dan menemukan opsi terbaik,maka agents akan melakukan simulasi terhadap opsi - opsi terbaik dan mencari Decision / Keputusan terbaik ) 

↓ 

Re - Decision / Keputusan terbaik (Ulang) 

(Setelah melakukan Simulate, maka Agents akan memberikan Re- Decision / Keputusan terbaik (Ulang) kepada user untuk di Terima (1) /Di tolak (2)  / Revis (3) ) 

What if Revisi (3) ↓ 

Ask / Bertanya (Dimana Agents bertanya: “Bagian mana yang harus di Revisi?” User menjawab: “Bagian A di ubah” Agents menjawab: “Oke” 

↓ 

Evaluation / Evaluasi 

(Dimana dari jawaban user, Agents melakukan Evaluation dari Decision / Keputusan terbaik dan juga Jawaban user untuk di Evaluasi dan agar sesuai dengan keinginan User.) ↓ 

#### Explore Options 

(Setelah melalukan Evaluasi, Agents kemudian melakukan Ekspor Opsion, dan membuat berapa opsi untuk selanjutnya di simulasikan. ) 

↓ 

#### Simulate 

(Setalah melakukan Explore Options dan menemukan opsi terbaik,maka agents akan melakukan simulasi terhadap opsi - opsi terbaik dan mencari Decision / Keputusan terbaik serta sesuai dengan keiginanan User. ) 

↓ 

Revision Decision / Keputusan terbaik (Revisi) 

(Setelah melakukan Simulate, maka Agents akan memberikan  Decision / Keputusan terbaik kepada user untuk di Terima (1) /Di tolak (2)  / Revis (3) ) 

## **2. System Architecture** 

TARA AGENT UI 

Web Dashboard / Chat 

Interface utama untuk user memberikan Business Data, kebutuhan bisnis, melihat hasil analisis dan keputusan, serta memberikan pilihan Approve, Reject, atau Revise. 

↓ 

BACKEND / API 

Auth │ RBAC │ Event │ Workflow │ Audit 

Menghubungkan UI dengan Agent dan sistem lainnya, mengatur autentikasi, hak akses, workflow, event, serta mencatat aktivitas penting sistem. 

↓ 

TARA AGENT CORE 

Context Manager │ Planner / Reasoning │ Tool Selector 

Pusat pengatur workflow Agent yang memahami konteks, menentukan langkah yang perlu dilakukan, memilih tools yang dibutuhkan, dan mengatur proses sesuai kebutuhan user. 

↓ 

UNDERSTAND 

Business Data │ Business Context 

Agent membaca dan memahami kondisi bisnis berdasarkan 

data yang tersedia sebelum melakukan diagnosis. 

↓ 

DIAGNOSE 

Analysis Engine │ Intelligence Engine 

Agent menganalisis kondisi bisnis, menemukan masalah atau kebutuhan, serta menggunakan data pendukung untuk memahami penyebab dan konteksnya. 

↓ 

EXPLORE OPTIONS Strategy Generator 

Agent membuat beberapa alternatif strategi berdasarkan hasil diagnosis dan kebutuhan bisnis untuk selanjutnya dilakukan simulasi. 

↓ 

SIMULATE 

Simulator Engine 

Agent melakukan simulasi terhadap berbagai opsi untuk membandingkan kemungkinan dampak, risiko, biaya, margin, dan hasil dari setiap strategi. 

#### ↓ 

CONSTRAINT CHECK Constraint Engine 

Memeriksa setiap opsi berdasarkan aturan dan batasan bisnis seperti margin, budget, inventory, dan target sebelum menentukan keputusan. 

↓ 

DECISION 

Decision Coordinator + LLM / Model 

Agent mengevaluasi hasil analisis dan simulasi untuk menghasilkan keputusan terbaik beserta alasan, pertimbangan, dan hasil yang diharapkan. 

↓ 

USER DECISION **Approve │ Reject │ Revisi** 

Jika User memilih Approve ↓ APPROVE ↓ ACT Action Tools ↓ MONITOR Prediction │ Actual ↓ LEARN Feedback │ Historical Result 

Jika User memilih Reject ↓ REJECT ↓ RE-DIAGNOSE ↓ RE-EXPLORE OPTIONS ↓ RE-SIMULATE ↓ RE-DECISION ↓ Approve │ Reject │ Revisi 

Jika User memilih Revisi REVISE ↓ 

ASK ↓ EVALUATION ↓ EXPLORE OPTIONS ↓ SIMULATE ↓ REVISION DECISION ↓ Approve │ Reject │ Revise 

## **3. Technology Stack** 

|**Komponen**|**Kebutuhan**|**Kandidat**|
|---|---|---|
|Frontend|Web Dashboard|Next.js / React|
|Backend|REST API + Agent orchestration|FastAPI / Node.js|
|Database|Business & workflow data|PostgreSQL / Supabase|
|LLM|Reasoning & explanation|OpenAI / Gemini / Anthropic|
|Agent Framework|Tool calling/orchestration|LangGraph / LangChain / custom|
|Vector DB|Jika RAG diperlukan|pgvector|
|POS|Sales data|TARA POS / simulated POS|
|Maps|Competitor/location context|Google Maps/Places API|
|Weather|Weather context|Weather API|
|Notification|Approval/notification|WhatsApp Business API /<br>Telegram|
|Scheduler|Daily monitoring|Cron / scheduler|
|Image|Promo asset|Template generator / image API|
|Deployment|Public prototype|Vercel + backend hosting|



