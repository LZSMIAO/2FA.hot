import type { SupportedLocale } from '../locales'

// Page <h1> text for the tool: short, in the words people search for. The <title> adds the brand.
export const toolHeadings: Record<SupportedLocale, string> = {
  en: '2FA Code Generator – Free Online TOTP Authenticator',
  'zh-CN': '2FA 验证码在线生成器｜免费 TOTP 身份验证器网页版',
  'zh-TW': '2FA 驗證碼線上產生器｜免費 TOTP 驗證器網頁版',
  es: 'Generador de códigos 2FA – Autenticador TOTP online gratis',
  fr: 'Générateur de codes 2FA – Authenticator TOTP en ligne gratuit',
  de: '2FA-Code-Generator – kostenloser Online-TOTP-Authenticator',
  'pt-BR': 'Gerador de código 2FA – Autenticador TOTP online grátis',
  ru: 'Генератор кодов 2FA – бесплатный онлайн TOTP-аутентификатор',
  ja: '2FA認証コード生成ツール｜ブラウザで使える無料TOTP認証アプリ',
  ko: '2FA 인증 코드 생성기 – 무료 온라인 TOTP 인증 도구',
  ar: 'مولّد رموز 2FA – أداة مصادقة TOTP مجانية عبر الإنترنت',
  hi: '2FA कोड जनरेटर – मुफ़्त ऑनलाइन TOTP ऑथेंटिकेटर',
  bn: '2FA কোড জেনারেটর – বিনামূল্যে অনলাইন TOTP অথেন্টিকেটর',
  ur: '2FA کوڈ جنریٹر – مفت آن لائن TOTP تصدیق کار',
  id: 'Generator Kode 2FA – Authenticator TOTP Online Gratis',
  ms: 'Penjana Kod 2FA – Pengesah TOTP Dalam Talian Percuma',
  vi: 'Lấy mã 2FA online – Trình tạo mã TOTP xác thực miễn phí',
  th: 'สร้างรหัส 2FA ออนไลน์ – ตัวยืนยันตัวตน TOTP ฟรี',
  tr: '2FA Kod Oluşturucu – Ücretsiz Çevrimiçi TOTP Doğrulayıcı',
  it: 'Generatore di codici 2FA – Autenticatore TOTP online gratuito',
  nl: '2FA-codegenerator – gratis online TOTP-authenticator',
  pl: 'Generator kodów 2FA – darmowy uwierzytelniacz TOTP online',
  uk: 'Генератор кодів 2FA – безкоштовний онлайн TOTP-автентифікатор',
  fa: 'تولیدکننده کد 2FA – احراز هویت TOTP آنلاین رایگان',
  he: 'מחולל קודי 2FA – מאמת TOTP מקוון בחינם',
  sw: 'Kizalishaji cha Misimbo ya 2FA – Kithibitishaji cha TOTP Bila Malipo',
  fil: '2FA Code Generator – Libreng Online na TOTP Authenticator',
  ta: '2FA குறியீடு உருவாக்கி – இலவச ஆன்லைன் TOTP அங்கீகாரக் கருவி',
  te: '2FA కోడ్ జనరేటర్ – ఉచిత ఆన్‌లైన్ TOTP ఆథెంటికేటర్',
  el: 'Γεννήτρια κωδικών 2FA – Δωρεάν online TOTP Authenticator'
}

export const toolTitle = (locale: SupportedLocale) =>
  `${toolHeadings[locale] || toolHeadings.en} | 2fa.hot`

export const toolDescriptions: Record<SupportedLocale, string> = {
  en: 'Free online 2FA code generator. Paste a TOTP secret or import a QR code to get the same codes as Google Authenticator. Runs locally in your browser, no sign-up.',
  'zh-CN':
    '免费在线 2FA 验证码生成器：粘贴 TOTP 密钥或导入二维码，即可获取与谷歌身份验证器相同的动态验证码。浏览器本地计算，支持批量取码，无需注册。',
  'zh-TW':
    '免費線上 2FA 驗證碼產生器：貼上 TOTP 金鑰或匯入 QR Code，即可取得與 Google Authenticator 相同的動態驗證碼。瀏覽器本機計算，支援批次取碼，免註冊。',
  es: 'Generador de códigos 2FA en línea. Admite TOTP, generación por lotes e importación QR. Funciona en el navegador, sin registro y con historial local cifrado opcional. Diseño inspirado en Minecraft.',
  fr: 'Générateur de codes 2FA en ligne. Codes TOTP, génération par lots et import QR. Calcul dans le navigateur, sans inscription, avec historique local chiffré en option. Design inspiré de Minecraft.',
  de: 'Online-Generator für 2FA-Codes. TOTP-Codes, mehrere Codes gleichzeitig und QR-Import. Berechnung im Browser, ohne Registrierung, mit optional verschlüsseltem lokalem Verlauf. Design inspiriert von Minecraft.',
  'pt-BR':
    'Gerador de códigos 2FA online. Suporta TOTP, geração em lote e importação QR. Funciona no navegador, sem cadastro, com histórico local criptografado opcional. Design inspirado em Minecraft.',
  ru: 'Онлайн-генератор кодов 2FA. Поддержка TOTP, пакетной генерации и импорта QR. Вычисления в браузере, без регистрации, с локальной зашифрованной историей по желанию. Дизайн вдохновлён Minecraft.',
  ja: '無料のオンライン2FA認証コード生成ツール。TOTPシークレットキーを貼り付けるかQRコードを読み込むと、Google Authenticatorと同じコードを表示します。ブラウザ内で計算、一括生成に対応、登録不要。',
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
