import type { SupportedLocale } from '../locales'

// Localize the product title and purpose; retain standard 2FA / TOTP terminology.
export const toolHeadings: Record<SupportedLocale, string> = {
  en: 'Online TOTP 2FA Authenticator Code Generator — All-in-One | Generate Secure OTP Codes | Made by Minecraft Fans',
  'zh-CN': '在线多功能 TOTP 2FA验证码 Authenticator生成器｜生成安全OTP验证码｜Minecraft 爱好者制作',
  'zh-TW': '線上多功能 TOTP 2FA驗證碼 Authenticator產生器｜產生安全OTP驗證碼｜Minecraft 愛好者製作',
  es: 'Generador Authenticator multifunción de códigos TOTP 2FA en línea | Genera códigos OTP seguros | Creado por fans de Minecraft',
  fr: 'Générateur Authenticator multifonction de codes TOTP 2FA en ligne | Générez des codes OTP sécurisés | Créé par des fans de Minecraft',
  de: 'Multifunktionaler Online-Authenticator für TOTP- und 2FA-Codes | Sichere OTP-Codes generieren | Von Minecraft-Fans entwickelt',
  'pt-BR':
    'Gerador Authenticator multifuncional de códigos TOTP 2FA online | Gere códigos OTP seguros | Feito por fãs de Minecraft',
  ru: 'Многофункциональный онлайн-генератор кодов TOTP 2FA Authenticator | Создавайте безопасные OTP-коды | Создано поклонниками Minecraft',
  ja: '多機能オンライン TOTP・2FA 認証コード Authenticator ジェネレーター｜安全なOTP認証コードを生成｜Minecraftファンが制作',
  ko: '온라인 다기능 TOTP 2FA 인증 코드 Authenticator 생성기 | 안전한 OTP 인증 코드 생성 | Minecraft 팬 제작',
  ar: 'مولّد Authenticator متعدد الوظائف لرموز TOTP و2FA عبر الإنترنت | إنشاء رموز OTP آمنة | من صنع محبي Minecraft',
  hi: 'ऑनलाइन बहुउद्देशीय TOTP 2FA Authenticator कोड जनरेटर | सुरक्षित OTP कोड बनाएँ | Minecraft के प्रशंसकों द्वारा निर्मित',
  bn: 'অনলাইন বহুমুখী TOTP 2FA Authenticator কোড জেনারেটর | নিরাপদ OTP কোড তৈরি করুন | Minecraft অনুরাগীদের তৈরি',
  ur: 'آن لائن کثیر المقاصد TOTP 2FA Authenticator کوڈ جنریٹر | محفوظ OTP کوڈ بنائیں | Minecraft کے شائقین کا تیار کردہ',
  id: 'Generator Authenticator Kode TOTP 2FA Multifungsi Online | Buat Kode OTP Aman | Dibuat oleh Penggemar Minecraft',
  ms: 'Penjana Authenticator Kod TOTP 2FA Pelbagai Fungsi Dalam Talian | Jana Kod OTP Selamat | Dibuat oleh Peminat Minecraft',
  vi: 'Trình tạo mã TOTP 2FA Authenticator đa năng trực tuyến | Tạo mã OTP an toàn | Do người hâm mộ Minecraft tạo ra',
  th: 'เครื่องมือสร้างรหัส TOTP 2FA Authenticator ออนไลน์แบบมัลติฟังก์ชัน | สร้างรหัส OTP ที่ปลอดภัย | สร้างโดยแฟน Minecraft',
  tr: 'Çevrimiçi Çok İşlevli TOTP 2FA Authenticator Kod Üretici | Güvenli OTP Kodları Oluşturun | Minecraft Hayranları Tarafından Yapıldı',
  it: 'Generatore Authenticator multifunzione di codici TOTP 2FA online | Genera codici OTP sicuri | Creato da appassionati di Minecraft',
  nl: 'Multifunctionele online TOTP 2FA Authenticator-codegenerator | Genereer veilige OTP-codes | Gemaakt door Minecraft-fans',
  pl: 'Wielofunkcyjny generator kodów TOTP 2FA Authenticator online | Generuj bezpieczne kody OTP | Stworzony przez fanów Minecraft',
  uk: 'Багатофункціональний онлайн-генератор кодів TOTP 2FA Authenticator | Створюйте безпечні OTP-коди | Створено шанувальниками Minecraft',
  fa: 'تولیدکننده آنلاین چندمنظوره کد TOTP و 2FA Authenticator | تولید کدهای امن OTP | ساخته‌شده توسط طرفداران Minecraft',
  he: 'מחולל קודי TOTP 2FA Authenticator מקוון ורב־תכליתי | יצירת קודי OTP מאובטחים | נוצר בידי חובבי Minecraft',
  sw: 'Kizalishaji cha Misimbo ya TOTP 2FA Authenticator chenye Kazi Nyingi Mtandaoni | Tengeneza Misimbo Salama ya OTP | Kimetengenezwa na Mashabiki wa Minecraft',
  fil: 'Online na Multifunctional TOTP 2FA Authenticator Code Generator | Gumawa ng Ligtas na OTP Code | Gawa ng mga Tagahanga ng Minecraft',
  ta: 'ஆன்லைன் பல்நோக்கு TOTP 2FA Authenticator குறியீடு உருவாக்கி | பாதுகாப்பான OTP குறியீடுகளை உருவாக்குங்கள் | Minecraft ரசிகர்களால் உருவாக்கப்பட்டது',
  te: 'ఆన్‌లైన్ బహుళ ప్రయోజన TOTP 2FA Authenticator కోడ్ జనరేటర్ | సురక్షితమైన OTP కోడ్‌లను రూపొందించండి | Minecraft అభిమానులు రూపొందించారు',
  el: 'Πολυλειτουργική διαδικτυακή γεννήτρια κωδικών TOTP 2FA Authenticator | Δημιουργήστε ασφαλείς κωδικούς OTP | Από φίλους του Minecraft'
}

export const toolDescriptions: Record<SupportedLocale, string> = {
  en: 'Online 2FA/TOTP authenticator. Paste a secret to generate codes locally in your browser, without registration. Supports batch input, QR import, Google Authenticator migration and fragment links. Minecraft-inspired design.',
  'zh-CN':
    '在线 2FA/TOTP 身份验证器，粘贴密钥即可获取当前验证码，无需注册，取码完全在浏览器本地完成。支持自动识别批量数据、多种密钥格式、二维码导入、Google Authenticator 迁移和片段直链。界面参考 Minecraft 风格设计。',
  'zh-TW':
    '線上 2FA/TOTP 身分驗證器，貼上密鑰即可取得目前驗證碼，無需註冊，取碼完全在瀏覽器本機完成。支援自動辨識批次資料、多種密鑰格式、QR 碼匯入、Google Authenticator 遷移和片段直鏈。介面參考 Minecraft 風格設計。',
  es: 'Generador de códigos 2FA en línea. Admite TOTP, generación por lotes e importación QR. Funciona en el navegador, sin registro y con historial local cifrado opcional. Diseño inspirado en Minecraft.',
  fr: 'Générateur de codes 2FA en ligne. Codes TOTP, génération par lots et import QR. Calcul dans le navigateur, sans inscription, avec historique local chiffré en option. Design inspiré de Minecraft.',
  de: 'Online-Generator für 2FA-Codes. TOTP-Codes, mehrere Codes gleichzeitig und QR-Import. Berechnung im Browser, ohne Registrierung, mit optional verschlüsseltem lokalem Verlauf. Design inspiriert von Minecraft.',
  'pt-BR':
    'Gerador de códigos 2FA online. Suporta TOTP, geração em lote e importação QR. Funciona no navegador, sem cadastro, com histórico local criptografado opcional. Design inspirado em Minecraft.',
  ru: 'Онлайн-генератор кодов 2FA. Поддержка TOTP, пакетной генерации и импорта QR. Вычисления в браузере, без регистрации, с локальной зашифрованной историей по желанию. Дизайн вдохновлён Minecraft.',
  ja: 'オンライン 2FA 認証コード生成ツール。TOTP ワンタイムパスワード、一括生成、QR コードの読み込みに対応。ブラウザ内で計算、登録不要。暗号化したローカル履歴を任意で保存できます。 デザインは Minecraft に着想を得ています。',
  ko: '온라인 2FA 인증 코드 생성기. TOTP 일회용 코드, 일괄 생성, QR 가져오기를 지원합니다. 브라우저에서 계산하며 가입이 필요 없고, 암호화된 로컬 기록을 선택적으로 저장할 수 있습니다. 디자인은 Minecraft에서 영감을 받았습니다.',
  ar: 'مولّد رموز 2FA عبر الإنترنت. يدعم رموز TOTP والتوليد الجماعي واستيراد QR. يعمل داخل المتصفح دون تسجيل، مع سجل محلي مشفّر اختياري. تصميم مستوحى من Minecraft.',
  hi: 'ऑनलाइन 2FA कोड जनरेटर। TOTP कोड, एक साथ कई कोड बनाना और QR आयात समर्थित। ब्राउज़र में गणना, बिना पंजीकरण, वैकल्पिक एन्क्रिप्टेड स्थानीय इतिहास के साथ। डिज़ाइन Minecraft से प्रेरित है।',
  bn: 'অনলাইন 2FA কোড জেনারেটর। TOTP কোড, একসঙ্গে একাধিক কোড তৈরি ও QR আমদানি সমর্থিত। ব্রাউজারেই গণনা, নিবন্ধন ছাড়াই, ঐচ্ছিক এনক্রিপ্ট করা স্থানীয় ইতিহাসসহ। নকশা Minecraft থেকে অনুপ্রাণিত।',
  ur: 'آن لائن 2FA کوڈ جنریٹر۔ TOTP کوڈ، بیک وقت کئی کوڈ بنانا اور QR درآمد کی سہولت۔ حساب براؤزر میں، بغیر رجسٹریشن، اختیاری مقامی خفیہ کردہ تاریخ کے ساتھ۔ ڈیزائن Minecraft سے متاثر ہے۔',
  id: 'Generator kode 2FA online. Mendukung TOTP, pembuatan kode massal dan impor QR. Perhitungan di browser, tanpa pendaftaran, dengan riwayat lokal terenkripsi opsional. Desain terinspirasi Minecraft.',
  ms: 'Penjana kod 2FA dalam talian. Menyokong TOTP, penjanaan kod berkelompok dan import QR. Pengiraan dalam pelayar, tanpa pendaftaran, dengan sejarah tempatan disulitkan secara pilihan. Reka bentuk berinspirasikan Minecraft.',
  vi: 'Trình tạo mã 2FA trực tuyến. Hỗ trợ mã TOTP, tạo mã hàng loạt và nhập QR. Tính toán trong trình duyệt, không cần đăng ký, với tùy chọn lưu lịch sử cục bộ được mã hóa. Thiết kế lấy cảm hứng từ Minecraft.',
  th: 'เครื่องมือสร้างรหัส 2FA ออนไลน์ รองรับรหัส TOTP การสร้างหลายรหัสและนำเข้า QR คำนวณในเบราว์เซอร์ ไม่ต้องสมัครสมาชิก และเลือกเก็บประวัติแบบเข้ารหัสในเครื่องได้ ดีไซน์ได้แรงบันดาลใจจาก Minecraft',
  tr: 'Çevrimiçi 2FA kod üretici. TOTP, toplu kod üretimi ve QR içe aktarma desteği. Tarayıcıda hesaplama, kayıt gerektirmez, isteğe bağlı şifreli yerel geçmiş. Tasarım Minecraft’tan ilham alır.',
  it: 'Generatore di codici 2FA online. Supporta TOTP, generazione in blocco e importazione QR. Calcolo nel browser, senza registrazione, con cronologia locale cifrata facoltativa. Design ispirato a Minecraft.',
  nl: 'Online generator voor 2FA-codes. TOTP, meerdere codes tegelijk en QR-import. Berekening in je browser, zonder registratie, met optionele versleutelde lokale geschiedenis. Ontwerp geïnspireerd op Minecraft.',
  pl: 'Generator kodów 2FA online. Obsługuje TOTP, generowanie wielu kodów naraz i import QR. Obliczenia w przeglądarce, bez rejestracji, z opcjonalną szyfrowaną historią lokalną. Wygląd inspirowany Minecraftem.',
  uk: 'Онлайн-генератор кодів 2FA. Підтримка TOTP, пакетної генерації та імпорту QR. Обчислення в браузері, без реєстрації, з локальною зашифрованою історією за бажанням. Дизайн натхненний Minecraft.',
  fa: 'تولیدکننده آنلاین کدهای 2FA. پشتیبانی از TOTP، تولید گروهی کد و واردکردن QR. محاسبه در مرورگر، بدون ثبت‌نام، با تاریخچه محلی رمزگذاری‌شده اختیاری. طراحی با الهام از Minecraft.',
  he: 'מחולל קודי 2FA מקוון. תומך ב-TOTP, יצירת קודים באצווה וייבוא QR. חישוב בדפדפן, ללא הרשמה, עם היסטוריה מקומית מוצפנת לבחירה. עיצוב בהשראת Minecraft.',
  sw: 'Kizalishaji cha misimbo ya 2FA mtandaoni. Kinasaidia TOTP, kutengeneza misimbo kwa makundi na kuingiza QR. Hukokotoa ndani ya kivinjari, bila kujisajili, na historia ya ndani iliyosimbwa kwa hiari. Muundo umechochewa na Minecraft.',
  fil: 'Online na generator ng 2FA code. May TOTP, maramihang pagbuo ng code at QR import. Kinakalkula sa browser, walang pagpaparehistro, at may opsyonal na naka-encrypt na lokal na history. Disenyong hango sa Minecraft.',
  ta: 'இணையவழி 2FA குறியீடு உருவாக்கி. TOTP குறியீடுகள், தொகுப்பாக உருவாக்குதல் மற்றும் QR இறக்குமதி ஆதரவு. உலாவியிலேயே கணக்கீடு, பதிவு தேவையில்லை; விருப்ப உள்ளூர் மறைகுறியாக்க வரலாறு. வடிவமைப்பு Minecraft பாணியால் ஈர்க்கப்பட்டது.',
  te: 'ఆన్‌లైన్ 2FA కోడ్ జనరేటర్. TOTP కోడ్‌లు, ఒకేసారి పలు కోడ్‌ల తయారీ, QR దిగుమతికి మద్దతు. బ్రౌజర్‌లోనే గణన, నమోదు అవసరం లేదు; ఐచ్ఛిక ఎన్‌క్రిప్టెడ్ స్థానిక చరిత్ర. రూపకల్పనకు Minecraft స్ఫూర్తి.',
  el: 'Διαδικτυακή γεννήτρια κωδικών 2FA. Υποστηρίζει TOTP, μαζική δημιουργία κωδικών και εισαγωγή QR. Υπολογισμός στον browser, χωρίς εγγραφή, με προαιρετικό κρυπτογραφημένο τοπικό ιστορικό. Σχεδιασμός εμπνευσμένος από το Minecraft.'
}
