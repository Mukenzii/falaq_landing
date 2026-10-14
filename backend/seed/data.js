/* Initial site content: books, news, contacts and external links.
   The backend loads this into the database on first start (src/seed.js); after that,
   content is edited in the admin panel (/admin/). */

window.FALAQ = {
  links: {
    telegram: "https://t.me/falaqnashr",
    instagram: "https://www.instagram.com/falaqnashr",
    youtube: "https://www.youtube.com/@FalaqNashrRasmiy",
    uzum: "https://uzum.uz/uz/shop/falaqnashr",
    // TODO: replace with the Telegram bot URL
    telegramBot: "https://t.me/falaqnashr",
    googlePlay: "https://play.google.com/store/search?q=falaq%20nashr&c=apps",
  },
  phones: ["+998 93 194 91 31", "+998 94 194 91 31"],

  categories: [
    { slug: "badiiy", name: "Badiiy adabiyot", tagline: "Hikoyalar va unutilmas taqdirlar", cover: "1500-yillik-mahbuslar" },
    { slug: "marifiy", name: "Ma’rifiy adabiyot", tagline: "Mutolaa va mulohaza", cover: "sahobalardan-maktublar" },
    { slug: "oila", name: "Oila va tarbiya", tagline: "Farzandingizni tushunish", cover: "bolamning-oqigisi-yoq" },
  ],

  books: [
    {
      slug: "binafsha-shulasi", title: "Binafsha shu’lasi", author: "Usoma Muslim", category: "badiiy",
      desc: "Usoma Muslimning Falaq Nashr tomonidan nashr etilgan asari. Birinchi va ikkinchi qismlari mavjud.",
      news: "binafsha-lotin", featured: true, announced: true,
    },
    {
      slug: "binafsha-shulasi-2", title: "Binafsha shu’lasi II", author: "Usoma Muslim", category: "badiiy",
      desc: "Binafsha shu’lasi asarining davomi. Kitobning ikki qismi ham lotin yozuvida taqdim etilgan.",
      news: "binafsha-ikki-qism", featured: true, announced: true,
    },
    {
      slug: "fotimaning-bolasi", title: "Fotimaning bolasi", author: "Josim al-Umron", category: "badiiy",
      desc: "Josim al-Umron qalamiga mansub asar. Uning davomi — Yusufning qizi. Nashriyot lotin yozuvidagi nashrlarini ham e’lon qilgan.",
      news: "fotima-yusuf-lotin", featured: true,
    },
    {
      slug: "yusufning-qizi", title: "Yusufning qizi", author: "Josim al-Umron", category: "badiiy",
      desc: "Fotimaning bolasi asarining ikkinchi qismi. Falaq Nashr kitoblari orasidan ushbu asar bilan tanishing.",
      news: "fotima-yusuf-lotin", featured: true,
    },
    {
      slug: "1500-yillik-mahbuslar", title: "1500 yillik mahbuslar", author: "Xoshim Abdulloh", category: "badiiy",
      desc: "Kelajak tasavvuri, kutilmagan sarguzashtlar va inson irodasining sinovi haqida. Nashriyot rasmiy kanalida sotuvga chiqqani e’lon qilingan.",
      news: "1500-sotuvda", more: true, announced: true,
    },
    {
      slug: "ayriliqdan-bir-qadam-oldin", title: "Ayriliqdan bir qadam oldin", author: "Ahmad Medhat", category: "badiiy",
      desc: "Yolg‘izlik, ikkilanishlar va ayriliq kabi qalbdagi nozik hislar haqida hikoya qiluvchi asar.",
      more: true, announced: true,
    },
    {
      slug: "sahobalardan-maktublar", title: "Sahobalardan maktublar", author: "Adham Sharqoviy", category: "marifiy",
      desc: "Sahobalar hayotidan ibratli voqealar. Kitobdagi oilaga munosabat va go‘zal muomala haqidagi parchalar nashriyot kanalida berilgan.",
      more: true,
    },
    {
      slug: "bolamning-oqigisi-yoq", title: "Bolamning o‘qigisi yo‘q", author: "Abu Bakr ibn Ubaydulloh", category: "oila",
      desc: "Farzandning o‘qishga qiziqishi va ota-ona bilan munosabati haqida. Ta’lim va tarbiyaga oid tavsiyalar bilan tanishing.",
      more: true,
    },
    {
      slug: "ishonchli-xabar", title: "Ishonchli xabar", author: "Adham Sharqoviy", category: "marifiy",
      desc: "Hayotga qarash va uni tushunishga yordam beruvchi o‘nta maslahat. Kitob haqida nashriyotning rasmiy kanalida o‘qishingiz mumkin.",
    },
  ],

  news: [
    {
      slug: "binafsha-lotin", title: "Binafsha shu’lasi — endi lotin yozuvida", image: "binafsha-lotin.jpg",
      summary: "Sevimli asar yangi yozuvda kitobxonlar bilan uchrashmoqda.",
      body: "Usoma Muslimning Binafsha shu’lasi asari lotin yozuvida ham kitobxonlarga taqdim etildi. Nashriyot rasmiy kanalida ushbu nashr sotuvga chiqqani haqida xabar berilgan.",
    },
    {
      slug: "1500-sotuvda", title: "1500 yillik mahbuslar sotuvda", image: "1500-sotuvda.jpg",
      summary: "Yangi sarguzasht asari bilan tanishing.",
      body: "Xoshim Abdullohning 1500 yillik mahbuslar asari Falaq Nashr kitoblari qatoridan joy oldi. Rasmiy e’londa kitobni respublikamizdagi kitob do‘konlaridan xarid qilish mumkinligi aytilgan.",
    },
    {
      slug: "uzum-market", title: "Falaq Nashr Uzum Marketda", image: "uzum-market.jpg",
      summary: "Kitoblarimizni rasmiy do‘kondan donalab buyurtma qiling.",
      body: "Falaq Nashr Uzum Marketda rasmiy do‘koni ochilganini e’lon qildi. Endi kitoblarni ulgurji xarid qilish bilan birga rasmiy do‘kondan donalab ham buyurtma berish mumkin.",
    },
    {
      slug: "fotima-yusuf-lotin", title: "Fotimaning bolasi va Yusufning qizi — lotin yozuvida", image: "fotima-yusuf-lotin.jpg",
      summary: "Bestseller kitoblarimiz tez kunda lotin alifbosida.",
      body: "Nashriyot Fotimaning bolasi hamda uning davomi bo‘lgan Yusufning qizi kitoblarining lotin yozuvidagi nashrlarini e’lon qildi. Qaysi nashr hozir sotuvda ekanini rasmiy savdo kanallaridan aniqlashtiring.",
    },
    {
      slug: "sevimli-kitoblar", title: "Sevimli kitoblar — yangi yozuvda", image: "sevimli-kitoblar.jpg",
      summary: "Yosh qizga nasihat va Qulog‘im senda, qizim lotin yozuvida.",
      body: "Falaq Nashr Yosh qizga nasihat va Qulog‘im senda, qizim kitoblarini lotin yozuvida chop etish haqida xabar berdi. E’londa Yosh qizga nasihat kitobining ko‘rinishiga ham o‘zgartirish kiritilgani aytilgan.",
    },
    {
      slug: "binafsha-ikki-qism", title: "Binafsha shu’lasi: ikki qism, bir mutolaa", image: "binafsha-ikki-qism.jpg",
      summary: "Ikkala qism ham lotin yozuvida.",
      body: "Usoma Muslimning Binafsha shu’lasi asari ikki qismdan iborat. Nashriyot ikkala qismning lotin yozuvidagi nashrlarini ham rasmiy kanalida tanishtirgan.",
    },
    {
      slug: "falaq-ilova", title: "Falaq Nashr: o‘qing va tinglang", image: "falaq-ilova.png", app: true,
      summary: "Elektron kitob va audiokitoblar uchun ilova.",
      body: "Falaq Nashr ilovasi elektron kitoblarni o‘qish va audiokitoblarni tinglash imkonini beradi. Google Play’dagi tavsifda offline foydalanish, xatcho‘plar va o‘qish holatini saqlash imkoniyatlari ko‘rsatilgan.",
    },
  ],
};
