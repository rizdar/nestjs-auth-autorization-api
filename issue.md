# [Feature] Sistem Promo dan Voucher Diskon

## Deskripsi
Membuat modul khusus untuk mengelola `Coupon` atau `Voucher`. Pengguna dapat memasukkan kode kupon yang valid saat proses checkout untuk mendapatkan potongan harga.

**Jenis Potongan:**
1. **Nominal (`fixed_amount`)**: Pemotongan harga berupa jumlah uang yang pasti (misal: diskon Rp 10.000).
2. **Persentase (`percentage`)**: Pemotongan harga berupa persentase dari total belanja (misal: diskon 10%).

## Prasyarat / Aturan Bisnis (Business Rules)
1. Kupon harus memiliki **tanggal kedaluwarsa** (`expiredAt`).
2. Kupon harus memiliki **kuota pemakaian** (`usageLimit` dan `usageCount`).
3. Kupon hanya bisa digunakan jika belum kedaluwarsa, kuota masih tersedia, dan statusnya aktif.
4. Kupon harus tervalidasi dengan aman saat checkout produk.
5. (Opsional) Kupon dapat memiliki batas minimal transaksi.

---

## Tahapan Implementasi (Step-by-Step Guide)

Halaman ini berisi instruksi spesifik untuk dipatuhi saat implementasi fitur ke dalam codebase NestJS. 

### Tahap 1: Update Schema Database (Prisma)
Tambahkan model `Coupon` pada file `prisma/schema.prisma`.

```prisma
enum DiscountType {
  FIXED_AMOUNT // Potongan jumlah tetap (misal Rp 10.000)
  PERCENTAGE   // Potongan persentase (misal 10%)
}

model Coupon {
  id              String       @id @default(uuid())
  code            String       @unique // Kode promo yang akan diketik user, misal: PROMO2024
  description     String?      // Deskripsi kupon
  discountType    DiscountType // Jenis potongan
  discountValue   Float        // Nilai potongan (persen atau flat)
  minTransaction  Float?       @default(0) // Minimal transaksi untuk bisa pakai kupon
  usageLimit      Int?         // Batas maksimal kupon bisa diklaim (quota), null jika unlimited
  usageCount      Int          @default(0) // Sudah digunakan berapa kali 
  isActive        Boolean      @default(true) // Untuk mematikan kupon secara manual jika perlu
  expiredAt       DateTime     // Batas waktu berlakunya kupon
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  //// (Opsional) Relasi ke User / Order jika ingin mencatat log pemakaian coupon ///
  // orders       Order[]
}
```

*Tugas Backend:* 
1. Masukkan block schema di atas.
2. Jalankan `npx prisma format` untuk merapikan schema.
3. Jalankan `npx prisma migrate dev --name add_coupon_model_and_enum` untuk menerapkan perubahan ke database.

### Tahap 2: Buat Modul Kupon (NestJS CLI)
Buat struktur file `Coupon` secara otomatis dengan Nest CLI.
Buka terminal dan jalankan:
```bash
nest g module coupon
nest g controller coupon
nest g service coupon
```

### Tahap 3: Pembuatan Data Transfer Object (DTO)
Buat file `create-coupon.dto.ts` dan `apply-coupon.dto.ts` di direktori `src/coupon/dto/`.

**`create-coupon.dto.ts`**: (Untuk endpoint CMS/Admin)
Gunakan `class-validator` agar payload request divalidasi.
- `code`: IsString, IsNotEmpty
- `discountType`: IsEnum
- `discountValue`: IsNumber, IsNotEmpty
- `usageLimit`: IsNumber, IsOptional
- `expiredAt`: IsDateString, IsNotEmpty

**`apply-coupon.dto.ts`** atau `validate-coupon.dto.ts`: (Untuk request dari cart/checkout)
- `code`: IsString, IsNotEmpty
- `transactionAmount`: IsNumber, IsNotEmpty (Untuk cek minimal transaksi & kalkulasi diskon)

### Tahap 4: Implementasi Logic pada `CouponService`
Di dalam `src/coupon/coupon.service.ts`, buat fungsi validasi dan perhitungan diskon.

**1. `createCoupon()` (Admin Only)**
- Pastikan untuk melakukan check `code` apakah sudah eksis di tabel, lempar `ConflictException` (409) jika sudah ada.
- Simpan data menggunakan `prisma.coupon.create`.

**2. `validateAndCalculateCoupon(code: string, transactionAmount: number)`**
Fungsi vital. Ini urutan validasinya:
1. **Find**: Cari kupon dengan `prisma.coupon.findUnique({ where: { code } })`.
2. **Exist**: Jika tidak ketemu -> throw `NotFoundException('Kupon tidak ditemukan atau tidak valid')`.
3. **Active**: Jika `isActive === false` -> throw `BadRequestException('Kupon tidak aktif')`.
4. **Expired**: Jika `expiredAt < new Date()` -> throw `BadRequestException('Kupon sudah kedaluwarsa')`.
5. **Quota**: Jika `usageLimit !== null` dan `usageCount >= usageLimit` -> throw `BadRequestException('Kuota kupon sudah habis')`.
6. **Min. Transaction**: Jika `minTransaction > 0` dan `transactionAmount < minTransaction` -> throw `BadRequestException('Total transaksi tidak memenuhi syarat minimal')`.
7. **Calculate**:
   - Jika `discountType === 'FIXED_AMOUNT'`: diskon adalah nominal `discountValue`.
   - Jika `discountType === 'PERCENTAGE'`: diskon adalah `transactionAmount * (discountValue / 100)`. Maksimal batas diskon dapat ditambahkan bila perlu.
8. **Return**: Nilai potongan diskon final (number) beserta detail kupon.

**3. `consumeCoupon(couponId: string)` (Dijalankan SETELAH checkout berhasil)**
- Eksekusi ini dalam transaction (misal digabung saat insert `Order`) atau update field increment.
- Jalankan query update increment `usageCount`:
  `prisma.coupon.update({ where: { id: couponId }, data: { usageCount: { increment: 1 } } })`

### Tahap 5: Implementasi Endpoint (Controller)
Gunakan `CouponController` untuk expose endpoint API.

- `POST /coupons`: Membuat kupon (harus pakai Auth Guard admin, `@UseGuards(RolesGuard)`).
- `GET /coupons`: List semua kupon untuk keperluan CMS.
- `POST /coupons/validate`: Endpoint bagi client web/mobile untuk memasukkan kode pada input box kupon dan menunjukkan harga diskon sebelum deal bayar. Gunakan DTO dari Tahap 3.

### Tahap 6: Integrasi ke Modul Pemesanan (Checkout / Order)
Di bagian pembuatan order (misal `createOrder` dalam `OrderService` atau checkout flow yang ada):
1. User mengirim `couponCode` dalam payload Create Order.
2. Modul checkout memanggil metode `validateAndCalculateCoupon` dari modulenya.
3. Potong `totalCost` dengan `discountAmount`.
4. Lakukan logic "Consume Coupon" sebelum finalisasi (menaikkan `usageCount`), pastinya harus di dalam Database Transaction yang sama agar *Atomic* dan menghindari *Race Condition* (`usage limit` kelewatan batas ketika diklik bebarengan oleh banyak user).

---

## Acceptance Criteria (Target Uji Coba / Testing)
- [ ] Admin / Manajer dapat melihat, membuat, mengubah, mematikan kupon dari sistem.
- [ ] Sistem menolak kupon yang `expiredAt` nya sudah terlewat waktu saat ini.
- [ ] Sistem menolak kupon berjenis `percentage` jika `transactionAmount * percentage` dimanipulasi client (hitungan harus always server-side).
- [ ] Sistem menolak jika jumlah `usageCount` sudah mencapai `usageLimit`.
- [ ] Error message harus jelas, e.g "Kupon / Promo ini sudah melebihi kuota penggunaan".
- [ ] Penggunaan kupon di-update dengan *increment* saat pembayaran/order diproses (tersimpan sukses).
