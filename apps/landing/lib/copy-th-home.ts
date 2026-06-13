import { SITE_FACTS } from "@/lib/site-facts";
import type { LocaleHomeCopy } from "@/lib/locale-home-copy";

/** Thai landing page copy — keep numbers aligned with `SITE_FACTS`. */
export const TH_HOME = {
  langNavEnglish: "English site",
  langNavLocal: "ภาษาไทย",
  breadcrumbNavAria: "เลือกภาษา",

  hero: {
    h1: "รับแคชแบ็กทุกครั้งที่ใช้จ่าย",
    sub: "กับ GoGoCash — ช้อปที่คุณคุ้นเคยอยู่แล้ว",
    body: `รับแคชแบ็กสูงสุด 30% ที่ร้านกว่า ${SITE_FACTS.partnerCountLabel} แบรนด์ — ${SITE_FACTS.keyMerchantsShort} และอื่น ๆ ทั่วเอเชียตะวันออกเฉียงใต้ ใช้ฟรี เงินคืนจริงเข้ากระเป๋า — เล่นเควสในแอปเพื่อโบนัสเพิ่ม`,
    ctaLaunch: "เริ่มรับแคชแบ็ก",
    ctaLine: "สอบถามทาง LINE",
    lineAria: "ติดต่อเราผ่าน LINE",
  },

  partners: {
    badge: "พันธมิตรแบรนด์",
    title: "รับแคชแบ็กกับแบรนด์ที่คุณช้อปอยู่แล้ว",
    description: `รับแคชแบ็กที่ร้านที่คุณช้อปอยู่แล้ว — พันธมิตรกว่า ${SITE_FACTS.partnerCountLabel} แบรนด์ทั่ว${SITE_FACTS.regionLabel} เลือกร้าน เปิดจาก GoGoCash ก่อนชำระเงิน ระบบจะแทร็กให้และยืนยันยอดหลังร้านตรวจสอบ`,
    searchLabel: "ค้นหาแบรนด์",
    searchPlaceholder: "พิมพ์ชื่อร้านหรือหมวดหมู่…",
    searchClear: "ล้าง",
    noResults: "ไม่พบแบรนด์ที่ตรงกับคำค้น — ลองคำอื่นดูครับ",
    brandsCountAll: "ทั้งหมด {count} แบรนด์",
    brandsCountFiltered: "แสดง {filtered} จาก {total} แบรนด์",
    loadMore: "โหลดแบรนด์เพิ่ม",
  },

  why: {
    badge: "ทำไมต้อง GoGoCash",
    title: "ออกแบบมาให้ช้อปประจำวันในเอเชียตะวันออกเฉียงใต้",
    subtitle:
      "เห็นเงินคืนเข้ากระเป๋า ร้านที่คุณรู้จัก และรางวัลที่ถอนได้จริง — เว็บและมินิแอป",
    cards: [
      {
        title: "เงินคืนเข้ากระเป๋า ไม่ใช่แต้มคลุมเครือ",
        body: "เห็นยอดโตหลังร้านยืนยัน — ใช้จ่ายหรือเติบโตกับ Saving Plus ตามที่คุณเลือก",
      },
      {
        title: "ร้านค้าไว้ใจได้",
        body: `ช้อปกว่า ${SITE_FACTS.partnerCountLabel} แบรนด์ใน SEA เห็นเรทชัดก่อนจ่าย`,
      },
      {
        title: "เควสที่เหมาะกับคุณ",
        body: "ภารกิจช้อปและโปรช่วงซีซันที่เข้ากับพฤติกรรมจริง",
      },
      {
        title: "ซัพพอร์ตเมื่อคุณต้องการ",
        body: "สงสัยเรื่องแทร็กหรือการถอน ทีมพร้อมช่วยตลอด",
      },
    ],
  },

  features: {
    badge: "ฟีเจอร์เด่น",
    title: "ทำไมถึงรับแคชแบ็กได้ง่ายขึ้น",
    cards: [
      {
        title: "ดูเงินคืนเข้ากระเป๋า",
        body: "ร้านยืนยันออเดอร์แล้ว แคชแบ็กจริงเข้า GoGoCash — ไม่มีแต้มสลับซับซ้อน ติดตามยอดในแอปได้ชัดเจน",
      },
      {
        title: "ซัพพอร์ต 24/7",
        body: "เรื่องแทร็กหรือการถอน ทีมพร้อมช่วยทั้งแชทและอีเมล",
      },
      {
        title: "เควสเฉพาะคุณ",
        body: "ท้าทายช้อปที่เข้ากับนิสัยคุณ ปลดล็อกโบนัสและดีลพิเศษ",
      },
    ],
    ctaCard: {
      title: "พร้อมรับแคชแบ็กแล้วหรือยัง?",
      bodyLine: `ผู้ใช้กว่า ${SITE_FACTS.shopperCommunityLabel} คนกำลังรับเงินคืนแบบง่าย ๆ`,
      cta: "เริ่มรับแคชแบ็ก",
    },
  },

  howItWorks: {
    title: "สามขั้นสู่แคชแบ็กแรกของคุณ",
    intro:
      "เลือกร้านจาก GoGoCash ช้อปเหมือนเดิม แล้วดูยอดในกระเป๋าโตขึ้นหลังร้านยืนยัน — ง่ายแค่นี้",
    progressCue: "3 ขั้นตอนสู่แคชแบ็กแรก",
    browseAppCta: "เลือกดูร้านเลย!",
    steps: [
      {
        summary: "เลือกที่จะรับเงินคืน",
        title: "เปิดร้านจาก GoGoCash",
        desc: `สำรวจพันธมิตรอีคอมเมิร์ซและท่องเที่ยวกว่า ${SITE_FACTS.partnerCountLabel} รายทั่ว ${SITE_FACTS.regionLabel} เปรียบเทียบเรท แล้วเข้าร้านจาก GoGoCash เพื่อให้ระบบแทร็กได้`,
        bullets: [
          "Lazada, Shopee, Agoda, Samsung, Trip.com และอื่น ๆ",
          "เห็นเรทก่อนช้อปชัดเจน",
        ],
      },
      {
        summary: "ช้อปเหมือนเคย",
        title: "ชำระเงินที่ร้าน — ขั้นตอนเดิมของคุณ",
        desc: "ใส่ตะกร้าและจ่ายที่เว็บหรือแอปร้าน ไม่ต้องกรอกคูปองพิเศษ",
        bullets: [
          "ใช้บัญชีและวิธีชำระเงินเดิมของคุณ",
          "GoGoCash ติดตามคำสั่งซื้อเบื้องหลัง",
        ],
      },
      {
        summary: "ยอดในกระเป๋าโตขึ้น",
        title: "แคชแบ็กเข้ากระเป๋าหลังร้านยืนยัน",
        desc: "เมื่อร้านยืนยันออเดอร์ เงินคืนเข้า GoGoCash ติดตามในแอป แล้วถอนได้เมื่อถึงขั้นต่ำ — เงินจริง ไม่ใช่แต้ม",
        bullets: [
          "มักยืนยันภายในไม่กี่วัน",
          "ถอนเข้าธนาคารหรือ e-wallet เมื่อครบยอด",
        ],
      },
    ],
  },

  download: {
    badge: "เปิดแอป",
    title: "ใช้ GoGoCash ผ่านแอปที่คุณถนัด",
    desc: "Telegram หรือ LINE มินิแอป หรือเว็บแอป — แคชแบ็กเดียวกัน เล็กหน้าจอใช้งานสะดวก",
    bullets: [
      "ดูดีลและเควสได้ทุกที่",
      "แจ้งเตือนเมื่อเรทพุ่ง",
    ],
    scanLabel: "สแกนเพื่อเปิด",
    qrCaptionBefore: "เปิด",
    qrCaptionLink: "GoGoCash LINE Mini App",
    qrCaptionAfter: " — หรือใช้ Telegram / เว็บทางซ้าย",
    telegram: "Telegram Mini App",
    line: "LINE Mini App",
    web: "เปิดเว็บแอป",
    qrAria: "เปิด GoGoCash LINE Mini App (QR)",
    qrAlt: "QR เปิด GoGoCash LINE Mini App",
  },

  learn: {
    badge: "เรียนรู้",
    title: "ประหยัดฉลาด อธิบายแบบเข้าใจง่าย",
    readMore: "อ่านต่อ",
    teasers: [
      {
        title: "แคชแบ็กติดตามยังไง",
        desc: "จากคลิกจนถึงตอนร้านยืนยัน",
        href: "/learn/how-cashback-works",
      },
      {
        title: "ถอนแคชแบ็กเข้าบัญชี / วอลเล็ต",
        desc: "ขั้นต่ำ เวลา และยอดที่ยืนยันแล้ว",
        href: "/learn/withdraw-cashback-gogocash",
      },
      {
        title: "แคชแบ็กไม่ติด?",
        desc: "เช็กลิสต์สั้น ๆ ก่อนติดต่อซัพพอร์ต",
        href: "/learn/cashback-not-tracking-fixes",
      },
    ],
  },

  community: {
    badge: "ชุมชน",
    title: "เข้าร่วมชุมชน GoGoCash",
    desc: "เทียบทิป โปร และซัพพอร์ตจากทีมกับเพื่อนนักช้อป — เลือกช่องที่คุณใช้",
  },

  faq: {
    badge: "คำถามที่พบบ่อย",
    title: "คำถามที่พบบ่อยเกี่ยวกับ GoGoCash",
    subtitleEnHint:
      "รายละเอียดเพิ่มเติมภาษาอังกฤษที่หน้าหลักหรือบทความใน Learn",
  },

  finalCta: {
    title: "พร้อมรับแคชแบ็กทุกครั้งที่ใช้จ่ายหรือยัง?",
    sub: `เข้าร่วมกับผู้ใช้กว่า ${SITE_FACTS.shopperCommunityLabel} คนที่กำลังรับเงินคืนแบบง่าย ๆ`,
    cta: "เริ่มรับแคชแบ็ก",
  },
} satisfies LocaleHomeCopy;
