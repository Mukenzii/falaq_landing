/* Site content: books, news, contacts and external links. Edit this file to change the site.

   Books: the cover is assets/books/<slug>.jpg. Price and stock come from Uzum Market through
   `npm run sync:uzum` (uzum.js); a book is linked to the Uzum product whose title contains the
   book title. If it picks the wrong product, set `uzumId` to the right Uzum product id (the
   number at the end of the uzum.uz link).
   News: `image` is a file in assets/news/. */

window.FALAQ = {
  links: {
    telegram: "https://t.me/falaqnashr",
    instagram: "https://www.instagram.com/falaqnashr",
    youtube: "https://www.youtube.com/@FalaqNashrRasmiy",
    uzum: "https://uzum.uz/uz/shop/falaq",
    // TODO: replace with the Telegram bot URL
    telegramBot: "https://t.me/falaqnashr",
    googlePlay: "https://play.google.com/store/search?q=falaq%20nashr&c=apps",
    appStore: "https://apps.apple.com/uz/app/falaq-nashr/id6789527504",
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
    {
      slug: "la-natlangan-qiz", title: "La’natlangan qiz", author: "Vafo Xasan", category: "badiiy",
      desc: "Qadimiy arab shaharlaridan birida ro‘y bergan, avloddan avlodga o‘tib afsonaga aylangan voqea. Ochiq bozorlar, shovqinli kunduzlar va sokin kechalar orasida burilishlarga boy qissa.",
    },
    {
      slug: "shaxmat-ustidagi-qotillik", title: "Shaxmat ustidagi qotillik", author: "Foyiz Qaroshiy", category: "badiiy",
      desc: "Xususiy izquvarga o‘limga hukm qilingan mahbus qo‘ng‘iroq qiladi: u oqsoch ayolning qotilligida ayblanmoqda va ishini izquvar tekshirishini istaydi. Sirli detektiv asar.",
    },
    {
      slug: "darbadar", title: "Darbadar", author: "Muhammad Yusuf G‘arboviy", category: "badiiy",
      desc: "Qorong‘u tunda kimsasiz sahro bo‘ylab tog‘dagi g‘orga yetib kelgan charchoq yo‘lovchi. Qo‘rquv va jarohatga to‘la qalbning yo‘l izlashi haqidagi asar.",
    },
    {
      slug: "assasin", title: "Assasin", author: "Mahmud Amin", category: "badiiy",
      desc: "Voqealar Fors shimolidagi Alamut qal’asi yaqinidagi qishloqda boshlanadi, ildizlari esa Shimoliy Afrikaga, Ismoiliylar da’vati paydo bo‘lgan joyga borib taqaladi.",
    },
    {
      slug: "oqshom-gozalliklari", title: "Oqshom go‘zalliklari", author: "Hasson Shamsiy Posho", category: "marifiy",
      desc: "Oila jam bo‘lib, qalblar Yaratuvchiga talpinadigan oqshomlar haqida. Imom Molik va shogirdlari kabi salaflar hayotidan ibratli rivoyatlar.",
    },
    {
      slug: "metin-qoyalar", title: "Metin qoyalar", author: "Hasson Shamsiy Posho", category: "marifiy",
      desc: "Qoyalar yemirilish va nurashlarga bardosh bergani uchun tik turadi. Sinovli dunyoda ikki olam yutug‘iga intilayotgan inson ham shunday metin bo‘lishi haqida.",
    },
    {
      slug: "qur-on-qalbiga-safar", title: "Qur’on qalbiga safar", author: "Yosin Pishgin", category: "marifiy",
      desc: "Qur’oni karimni tafakkur bilan o‘qishga va oyatlarni qalbga yaqinlashtirishga chorlovchi ma’rifiy kitob.",
    },
    {
      slug: "rasulullohdan-maktublar", title: "Rasulullohdan maktublar", author: "Adham Sharqoviy", category: "marifiy",
      desc: "Rasululloh sollallohu alayhi vasallamni yaxshi ko‘radiganlarga bag‘ishlangan maktublar. Nafs bilan kurashda noumid bo‘lmaslik va u zotning shafoatiga yetishish yo‘lida sobitqadam bo‘lish haqida.",
    },
    {
      slug: "alloh-sari-20-bekat", title: "Alloh sari 20 bekat", author: "Usoma Minshaviy", category: "marifiy",
      desc: "Bir oyat muallifni Robbisi bilan aloqasini qayta ko‘rib chiqishga undadi: Allohni qanchalik taniyman, Unga yetishishimga nima xalaqit beryapti? Shu savollarga javob izlagan yigirma bekat.",
    },
    {
      slug: "habibimiz-oramizda-bolsalar", title: "Habibimiz oramizda bo‘lsalar", author: "Ahmad Shuqayriy", category: "marifiy",
      desc: "Payg‘ambarimiz sollallohu alayhi vasallam bugun oramizda bo‘lganlarida, muammolarimizga qanday yechim topgan bo‘lardilar? Muallif javoblarni u zotning siyratlaridan izlaydi.",
    },
    {
      slug: "yosh-qizga-nasihat", title: "Yosh qizga nasihat", author: "Hasson Shamsiy Posho", category: "oila",
      desc: "Yosh qizlarga qalbdan aytilgan nasihatlar, «Yosh yigitga nasihat» kitobining egizagi. Nashriyot uning lotin yozuvidagi nashrini ham e’lon qilgan.",
      news: "sevimli-kitoblar",
    },
    {
      slug: "yosh-yigitga-nasihat", title: "Yosh yigitga nasihat", author: "Hasson Shamsiy Posho", category: "oila",
      desc: "Qalbdan chiqib, qalblarga yetib boruvchi nasihatlar. Muallif so‘zboshida kitobning o‘ninchi nashri taqdim etilayotganini, oldingi nashrlar to‘liq tarqalganini aytadi.",
    },
    {
      slug: "er-xotinga-nasihat", title: "Er-xotinga nasihat", author: "Hasson Shamsiy Posho", category: "oila",
      desc: "Oilaviy kelishmovchiliklar, ajrimlar va ularning farzandlarga ta’siri haqida. Hayotiy hikoyalar orqali er-xotin munosabatlarini mustahkamlashga chorlovchi kitob.",
    },
    {
      slug: "qulogim-senda-qizim", title: "Qulog‘im senda, qizim!", author: "Abdulloh Muhammad Abdulmu’ti", category: "oila",
      desc: "Qizlarni qiynaydigan savollarga javob: Alloh g‘am-tashvishlarni nega yaratgan, musibatlar ortida qanday hikmat bor? Nashriyot uning lotin yozuvidagi nashrini ham e’lon qilgan.",
      news: "sevimli-kitoblar",
    },
    {
      slug: "jannat-bostonidagi-oilaviy-oqshomlar", title: "Jannat bo‘stonidagi oilaviy oqshomlar", author: "Hasson Shamsiy Posho", category: "oila",
      desc: "Baxt-saodat va jannat umidida bo‘lgan, har kecha besh daqiqa bo‘lsa ham birga ilm olishni istagan oilalarga bag‘ishlangan kitob.",
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
