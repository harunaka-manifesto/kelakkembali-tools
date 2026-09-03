/* The line on the boot curtain. Pure data plus one picker.

   - Owns: the copy shown while the app loads, and the rules that decide which
     lines are eligible at a given moment.
   - Does NOT own: the curtain, the animation, or when it is shown — app.js
     drives all three.
   - Used by: app.js

   Three kinds. A fact or a joke is always eligible. A greeting is eligible only
   when the clock and the calendar agree with it, which is what makes the screen
   feel like it noticed what time it is.
*/
window.KK = window.KK || {};

KK.quotes = (function () {
  'use strict';

  /* Facts are hedged where the record is hedged: "usually credited",
     "often traced". A loading screen is not the place to invent a statistic. */
  const FACTS = [
    'White wedding dresses only became the default after Queen Victoria wore one in 1840. Before that a bride wore her best dress, in any colour. Every rule was somebody’s choice first.',
    'UNESCO added kebaya to its Intangible Cultural Heritage list in 2024, on a joint nomination by Indonesia, Malaysia, Singapore, Thailand and Brunei. You work inside a living tradition.',
    'Indonesian batik was recognised by UNESCO in 2009. Work that slow still made it onto the world’s list.',
    '“Ikat” is simply the Indonesian word for “to tie”. The technique is named after the gesture that makes it. Good names describe the work.',
    'In France, “haute couture” is a protected term — a house has to be certified before it may use the word. Standards can be written down.',
    'A single couture gown can take hundreds of hours of hand finishing. Slow is not the same as late.',
    'Couture houses still cut a toile — a plain cotton mock-up — before touching the real cloth. Nobody good skips the practice run.',
    'The veil is older than the white dress by centuries. Not everything traditional is old, and not everything old is traditional.',
    'The ring goes on the fourth finger because of an old belief in a vein running straight from it to the heart. Anatomy said no. The habit stayed.',
    '“Something old, something new, something borrowed, something blue” is a Victorian rhyme. Two centuries on, brides still ask you for the blue.',
    'Indonesia has more than 300 ethnic groups, and adat wedding dress varies with nearly all of them. You will not run out of references.',
    'Kembar mayang, the paired floral arrangements at a Javanese wedding, are built by hand on the day itself. Some things cannot be ordered early.',
    'The lockstitch sewing machine arrived in the 1840s. Everything before that was somebody’s hand, one stitch at a time.',
    'Madeleine Vionnet popularised the bias cut — cutting on the diagonal so cloth follows a body instead of fighting it.',
    'Charles Frederick Worth is usually credited as the first designer to sew his own label into a garment. Signing your work is allowed.',
    'Songket is woven with supplementary gold or silver thread, added row by row on the loom. There is no shortcut in the middle of a weave.',
    'Almost nobody is symmetrical — most people’s two sides differ. That is why fittings exist, and it is not a fault in your pattern.',
    'A bride remembers the fitting where something finally fit. That is the appointment you are preparing for.',
    'Beading on a couture bodice is usually applied by hand, one piece at a time, on a frame. Volume was never the point.',
    'Muslin, calico, toile: three names for the humble cloth that every expensive dress is tested in first.',
    'Measurements are taken snug, never tight. The ease is added on purpose, on paper, afterwards.',
    'Custom means the garment changes to fit the person. Ready-to-wear means the person changes to fit the garment. You picked the harder one.'
  ];

  const JOKES = [
    'Kenapa penjahit tidak pernah tersesat? Karena selalu ada pola.',
    'Klien: “Bisa lebih cepat?” Kain: “Bisa. Tapi jangan salahkan aku nanti.”',
    'Why did the dress go to therapy? Too many unresolved seams.',
    'Pengantin: “Jangan putih banget ya.” Desainer: “Baik. Kita pakai putih yang sedang berpikir.”',
    'Apa bedanya deadline dan pengantin? Deadline tidak bisa diundur dua kali.',
    'Why don’t designers play hide and seek? They are always in the details, and nobody looks there.',
    'Fitting pertama: “Agak longgar.” Fitting kedua: “Agak sempit.” Fitting ketiga: “Sepertinya aku yang berubah.”',
    'A wedding planner walks into a bar. The bar was not on the timeline.',
    'Kenapa desainer suka jam dua pagi? Karena tidak ada yang minta revisi jam dua pagi.',
    'My sewing machine and I have an understanding. It breaks, I panic, we both carry on.',
    'Klien mengirim 47 referensi. Semuanya gaun yang sama.',
    'Why is a mood board never finished? There is always one more photo.',
    'Penjahit tidak percaya kebetulan. Mereka percaya kelim.',
    'Sequins are just glitter with a job.',
    'Pengantin: “Aku mau yang simpel.” Enam bulan kemudian: tiga lapis tulle.',
    'What is a designer’s favourite exercise? Running late, beautifully.',
    'Kalau jahitan bisa bicara, yang paling ribut pasti yang di bagian ketiak.',
    'I told the fabric to relax. It creased under pressure.'
  ];

  /* slot: dawn | morning | midday | afternoon | evening | night
     month: start | mid | end
     weekend: true
     A greeting with none of those is always eligible. */
  const GREETINGS = [
    { slot: 'dawn', text: 'Up before the city. The quietest hours are the ones that cut straightest.' },
    { slot: 'dawn', text: 'Selamat subuh. Kainnya masih dingin, tanganmu belum. Mulai pelan-pelan.' },
    { slot: 'morning', text: 'Good morning. One clean seam is a whole morning well spent.' },
    { slot: 'morning', text: 'Selamat pagi. Hari ini cukup untuk satu hal yang dikerjakan benar.' },
    { slot: 'morning', text: 'New day, fresh chalk marks. Nothing is decided yet.' },
    { slot: 'midday', text: 'Half the day gone and the pins are still in. That is normal.' },
    { slot: 'midday', text: 'Selamat siang. Minum air dulu, baru lanjut.' },
    { slot: 'afternoon', text: 'Good afternoon. The light is best now — check your colours while it lasts.' },
    { slot: 'afternoon', text: 'Selamat sore. Satu fitting lagi, lalu istirahat.' },
    { slot: 'evening', text: 'Evening. Put the needle down before the mistakes start. They always come later.' },
    { slot: 'evening', text: 'Selamat malam. Yang belum selesai hari ini masih ada besok.' },
    { slot: 'night', text: 'Late again. The dress will still be here tomorrow, and so should you.' },
    { slot: 'night', text: 'Jam segini ide datang, ketelitian pergi. Tandai saja, kerjakan besok.' },
    { month: 'start', text: 'New month. Whatever slipped last month has stopped counting.' },
    { month: 'start', text: 'Awal bulan. Waktu paling enak untuk merapikan jadwal fitting.' },
    { month: 'mid', text: 'Mid-month. Halfway is not behind. It is halfway.' },
    { month: 'mid', text: 'Pertengahan bulan. Cek deadline, jangan panik.' },
    { month: 'end', text: 'End of the month. Count what you finished, not what you did not.' },
    { month: 'end', text: 'Akhir bulan. Tutup buku, lalu tutup laptop.' },
    { weekend: true, text: 'Weekend. Wedding season does not rest, but you can, in pieces.' },
    { weekend: true, text: 'Akhir pekan. Kalau memang harus kerja, setidaknya kerjakan yang kamu suka.' },
    { text: 'Every gown here started as a measurement and a maybe.' },
    { text: 'Somebody is going to keep photographs of what you make for fifty years.' },
    { text: 'Selamat datang kembali. Ada yang menunggu untuk dijahit.' }
  ];

  const KIND_LABELS = { fact: 'Fun fact', joke: 'A small joke', greeting: 'Today' };

  const ENTRIES = FACTS.map((text) => ({ kind: 'fact', text: text }))
    .concat(JOKES.map((text) => ({ kind: 'joke', text: text })))
    .concat(GREETINGS.map((g) => ({
      kind: 'greeting', text: g.text, slot: g.slot || '', month: g.month || '', weekend: !!g.weekend
    })));

  function slotOf(date) {
    const hour = date.getHours();
    if (hour < 4) return 'night';
    if (hour < 6) return 'dawn';
    if (hour < 11) return 'morning';
    if (hour < 15) return 'midday';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  function monthPartOf(date) {
    const day = date.getDate();
    return day <= 10 ? 'start' : day <= 20 ? 'mid' : 'end';
  }

  const isWeekend = (date) => 0 === date.getDay() || 6 === date.getDay();

  /* Every fact and joke, plus the greetings this moment actually matches. A
     greeting that names a slot is not shown at another one, which is the whole
     reason greetings are a separate kind. */
  function eligible(date) {
    const when = date || new Date();
    const slot = slotOf(when);
    const month = monthPartOf(when);
    const weekend = isWeekend(when);
    return ENTRIES.filter((entry) => {
      if ('greeting' !== entry.kind) return true;
      if (entry.slot && entry.slot !== slot) return false;
      if (entry.month && entry.month !== month) return false;
      if (entry.weekend && !weekend) return false;
      return true;
    });
  }

  /* `random` is injectable so a test can pin the choice; nothing else passes
     it. Returns { kind, label, text }. */
  function pick(date, random) {
    const pool = eligible(date);
    const roll = ('function' === typeof random ? random() : Math.random());
    const entry = pool[Math.min(pool.length - 1, Math.floor(roll * pool.length))];
    return { kind: entry.kind, label: KIND_LABELS[entry.kind] || '', text: entry.text };
  }

  return {
    ENTRIES,
    KIND_LABELS,
    slotOf,
    monthPartOf,
    isWeekend,
    eligible,
    pick
  };
})();
