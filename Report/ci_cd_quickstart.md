# Quick Start: วิธีเริ่มต้นรัน CI/CD ระบบ QMS System

คู่มือแบบย่อสำหรับการเริ่มต้นเปิดใช้งานระบบ CI/CD บน GitHub และ Portainer ให้เริ่มทำงานทันที

---

## ขั้นตอนที่ 1: ดึง Webhook URL จาก Portainer
1. เปิด **Portainer Web UI**
2. ไปที่เมนู **Stacks** ด้านซ้าย -> เลือก Stack `qms-system` ของคุณ
3. เลื่อนลงมาที่ด้านล่างสุด หาหัวข้อ **Webhook**
4. เปิดสวิตช์ **Toggle ON** (ให้เป็นสีเขียว/เปิดใช้งาน)
5. กดปุ่ม **Copy** เพื่อคัดลอก **Webhook URL** ที่ระบบสร้างให้ (หน้าตาจะคล้าย: `https://portainer.yourdomain.com/api/stacks/webhooks/xxxx-xxxx...`)

---

## ขั้นตอนที่ 2: ใส่ Webhook ใน GitHub Secrets
1. เปิดหน้าเว็บ **GitHub Repository** ของระบบ `qms-system`
2. ไปที่แถบเมนู **Settings** ด้านบนสุด
3. เมนูด้านซ้าย เลือกหัวข้อ **Secrets and variables** -> **Actions**
4. คลิกปุ่ม **New repository secret** (สีเขียวด้านขวาบน)
5. กรอกข้อมูลดังนี้:
   * **Name:** `PORTAINER_WEBHOOK_URL`
   * **Secret:** วาง Webhook URL ที่คัดลอกมาจากขั้นตอนที่ 1
6. คลิกปุ่ม **Add secret** เพื่อบันทึกข้อมูล

---

## ขั้นตอนที่ 3: สั่งรัน CI/CD ครั้งแรก
คุณสามารถเลือกสั่งทำงานได้ 2 วิธีดังนี้:

### วิธีที่ 1: รันด้วยตนเอง (Manual Trigger) *[แนะนำสำหรับการทดสอบครั้งแรก]*
1. ไปที่แถบเมนู **Actions** ด้านบนสุดของหน้า GitHub
2. แถบเมนูด้านซ้ายเลือกหัวข้อ **CI/CD Pipeline**
3. ด้านขวาจะมีกล่องข้อความสีเทา ให้คลิกที่ปุ่ม **Run workflow**
4. เลือกสาขา (Branch) ที่คุณต้องการรัน (เช่น `main` หรือ `master`)
5. คลิกปุ่มสีเขียว **Run workflow** ระบบจะเริ่มดำเนินการทดสอบ บิลด์ และเดปลอยบน Portainer ทันที

### วิธีที่ 2: รันอัตโนมัติเมื่อดันโค้ด (Automatic Trigger)
* ทุกครั้งที่คุณพิมพ์คำสั่ง `git commit` และ `git push` โค้ดใหม่ขึ้นไปยังสาขา `main` หรือ `master` บน GitHub ระบบ Actions จะทริกเกอร์และทำตามขั้นตอนทั้งหมดโดยอัตโนมัติ
