import type { IntlError } from "use-intl";

import en from "../messages/en.json";
import th from "../messages/th.json";

/** String from bundled locale JSON when serialized `messages` omits a key (Turbopack / RSC). */
function readCatalogString(messageLocale: string, key: string): string | undefined {
  const catalog = messageLocale === "th" ? th : en;
  const v = (catalog as Record<string, unknown>)[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * Shared next-intl `getMessageFallback` for server (`request.ts`) and client (`NextIntlClientProvider`).
 * Keeps behavior identical so missing keys resolve the same way everywhere.
 */
export function createGetMessageFallback(messageLocale: string) {
  return function getMessageFallback(info: {
    error: IntlError;
    key: string;
    namespace?: string;
  }): string {
    const { key, namespace } = info;
    if (key === "profilePopperGogoquestHistory") {
      return messageLocale === "th"
        ? "ประวัติ GoGoQuest"
        : messageLocale === "jp"
          ? "GoGoQuest 履歴"
          : "GoGoQuest History";
    }
    if (key === "merchantSummaryTagsAria") {
      return messageLocale === "th"
        ? "จุดเด่นของข้อเสนอ"
        : messageLocale === "jp"
          ? "オファーのハイライト"
          : "Offer highlights";
    }
    if (key === "merchantCashbackTipsIllustrationAlt") {
      return readCatalogString(messageLocale, key) ?? readCatalogString("en", key) ?? key;
    }
    if (key === "footerCopyright") {
      const year = new Date().getFullYear();
      return messageLocale === "th"
        ? `© ${year} ลิขสิทธิ์ - สร้างด้วย 💚 โดย GoGoCash`
        : messageLocale === "jp"
          ? `© ${year} Copyright - 💚を込めて GoGoCash が制作`
          : `© ${year} Copyright - Made with 💚 by GoGoCash`;
    }
    if (key === "authPhoneLabelSignIn") {
      return messageLocale === "th" ? "เข้าสู่ระบบด้วยเบอร์โทรศัพท์" : "Sign in with Phone Number";
    }
    if (key === "authPhoneLabelSignUp") {
      return messageLocale === "th" ? "สมัครด้วยเบอร์โทรศัพท์" : "Sign up with Phone Number";
    }
    if (key === "linkMyCashbackSignInReferenceBack") {
      return messageLocale === "th"
        ? "กลับไปหน้าเชื่อมบัญชี"
        : messageLocale === "jp"
          ? "連携画面に戻る"
          : "Back to linking";
    }
    if (key === "linkMyCashbackLinkPreviewTitle") {
      return messageLocale === "th"
        ? "เข้าสู่ระบบ MyCashback"
        : messageLocale === "jp"
          ? "MyCashBack でサインイン"
          : "MyCashback sign in";
    }
    if (key === "linkMyCashbackLinkPreviewAlt") {
      return messageLocale === "th"
        ? "หน้าจอเข้าสู่ระบบ MyCashback (อ้างอิงเดสก์ท็อป)"
        : messageLocale === "jp"
          ? "MyCashBack サインイン画面（デスクトップ参考）"
          : "MyCashback sign-in screen (desktop reference)";
    }
    if (key === "linkMyCashbackMethodTitle") {
      return messageLocale === "th"
        ? "เลือกวิธีเชื่อมบัญชีที่คุณต้องการ"
        : messageLocale === "jp"
          ? "連携方法を選択"
          : "Select Your Preferred Linking Method";
    }
    if (key === "linkMyCashbackMethodDescription") {
      return messageLocale === "th"
        ? "กรุณาเลือก 'อีเมล' หรือ 'หมายเลขโทรศัพท์' ตามที่ลงทะเบียนกับ MyCashBack เพื่อให้เชื่อมบัญชีได้ถูกต้อง"
        : messageLocale === "jp"
          ? "MyCashBack に登録した「メール」または「電話番号」を選択し、正しくアカウントを連携してください。"
          : "Please select 'Email' or 'Phone Number' as registered with MyCashBack to ensure your account is linked correctly.";
    }
    if (key === "linkMyCashbackMethodPhoneNumber") {
      return messageLocale === "th"
        ? "หมายเลขโทรศัพท์"
        : messageLocale === "jp"
          ? "電話番号"
          : "Phone Number";
    }
    if (key === "linkMyCashbackMethodEmail") {
      return messageLocale === "th" ? "อีเมล" : messageLocale === "jp" ? "メール" : "Email";
    }
    if (key === "linkMyCashbackMethodPhonePlaceholder") {
      return messageLocale === "th"
        ? "หมายเลขโทรศัพท์"
        : messageLocale === "jp"
          ? "電話番号"
          : "Phone Number";
    }
    if (key === "linkMyCashbackMethodEmailPlaceholder") {
      return messageLocale === "th" ? "อีเมล" : messageLocale === "jp" ? "メール" : "Email";
    }
    if (key === "linkMyCashbackMethodConsentPrefix") {
      return messageLocale === "th"
        ? "ข้าพเจ้ายินยอมแชร์ข้อมูล MyCashBack "
        : messageLocale === "jp"
          ? "MyCashBack の情報を共有することに同意します。"
          : "I consent to share my MyCashBack information. ";
    }
    if (key === "linkMyCashbackPrivacyPolicy") {
      return messageLocale === "th"
        ? "นโยบายความเป็นส่วนตัว"
        : messageLocale === "jp"
          ? "プライバシーポリシー"
          : "Privacy Policy";
    }
    if (key === "navPrivacyPolicy") {
      return messageLocale === "th"
        ? "การตั้งค่าความยินยอม"
        : messageLocale === "jp"
          ? "同意の設定"
          : "Consent preferences";
    }
    if (key === "linkMyCashbackMethodBack") {
      return messageLocale === "th" ? "กลับ" : messageLocale === "jp" ? "戻る" : "Back";
    }
    if (key === "linkMyCashbackMethodNext") {
      return messageLocale === "th" ? "ถัดไป" : messageLocale === "jp" ? "次へ" : "Next";
    }
    if (key === "linkMyCashbackVerifyTitle") {
      return messageLocale === "th"
        ? "รหัสยืนยัน"
        : messageLocale === "jp"
          ? "認証コード"
          : "Verification Code";
    }
    if (key === "linkMyCashbackVerifyDescriptionEmail") {
      return messageLocale === "th"
        ? "รหัสยืนยันจะถูกส่งไปยังอีเมลของคุณเพื่อยืนยันว่าการดำเนินการนี้เป็นคุณ"
        : messageLocale === "jp"
          ? "この操作が本人によるものであることを確認するため、認証コードをメールアドレスに送信します。"
          : "A verification code will be sent to your email address to confirm this action is being performed by you.";
    }
    if (key === "linkMyCashbackVerifySentToEmail") {
      return messageLocale === "th"
        ? "ส่งรหัสไปที่อีเมล :"
        : messageLocale === "jp"
          ? "認証コードの送信先メール :"
          : "Code is sent to email :";
    }
    if (key === "walletTransactionsColConversionDate") {
      return messageLocale === "th" ? "วันที่แปลง" : "Conversion Date";
    }
    if (key === "walletTransactionsColTransactionInfo") {
      return messageLocale === "th" ? "ข้อมูลธุรกรรม" : "Transaction Information";
    }
    if (key === "walletTransactionsColNote") {
      return messageLocale === "th" ? "หมายเหตุ" : messageLocale === "jp" ? "メモ" : "Note";
    }

    const walletTransactionsStatusFallbacks: Record<
      string,
      { en: string; th: string; jp: string }
    > = {
      walletTransactionsStatusFilterAll: {
        en: "All statuses",
        th: "ทุกสถานะ",
        jp: "すべてのステータス",
      },
      walletTransactionsStatusPending: {
        en: "Pending",
        th: "รอดำเนินการ",
        jp: "保留中",
      },
      walletTransactionsStatusApproved: {
        en: "Approved",
        th: "อนุมัติแล้ว",
        jp: "承認済み",
      },
      walletTransactionsStatusPaid: {
        en: "Paid",
        th: "จ่ายแล้ว",
        jp: "支払い済み",
      },
      walletTransactionsStatusRejected: {
        en: "Rejected",
        th: "ปฏิเสธ",
        jp: "却下",
      },
      walletTransactionsStatusFailed: {
        en: "Failed",
        th: "ล้มเหลว",
        jp: "失敗",
      },
    };
    const wts = walletTransactionsStatusFallbacks[key];
    if (wts) {
      if (messageLocale === "th") return wts.th;
      if (messageLocale === "jp") return wts.jp;
      return wts.en;
    }

    const withdrawMethodFallbacks: Record<string, { en: string; th: string }> = {
      withdrawMethodTabPromptPay: { en: "PromptPay", th: "พร้อมเพย์" },
      withdrawMethodTabCryptoWallet: { en: "Crypto Wallet", th: "กระเป๋าคริปโต" },
      withdrawMethodSectionCryptoTitle: { en: "Crypto Wallet", th: "กระเป๋าคริปโต" },
      withdrawMethodCryptoWalletPlaceholder: {
        en: "Enter your wallet address",
        th: "กรอกที่อยู่กระเป๋าของคุณ",
      },
      withdrawMethodAddPageTitle: { en: "Add Withdrawal Methods", th: "เพิ่มวิธีการถอนเงิน" },
      withdrawMethodSectionPromptPayTitle: { en: "PromptPay", th: "พร้อมเพย์" },
      withdrawMethodPromptPayIdPhone: { en: "Phone Number", th: "หมายเลขโทรศัพท์" },
      withdrawMethodPromptPayIdCitizen: { en: "Citizen ID", th: "เลขบัตรประชาชน" },
      withdrawMethodPromptPayCodePlaceholder: {
        en: "Enter PromptPay code",
        th: "กรอกรหัสพร้อมเพย์",
      },
      withdrawMethodPromptPayThaiNamePlaceholder: {
        en: "Enter Thai full name",
        th: "กรอกชื่อ-นามสกุลภาษาไทย",
      },
      withdrawMethodPromptPayEnglishNamePlaceholder: {
        en: "Enter English full name",
        th: "กรอกชื่อ-นามสกุลภาษาอังกฤษ",
      },
      withdrawMethodPromptPayAttachQrLabel: {
        en: "Attach QR Code (Optional)",
        th: "แนบคิวอาร์โค้ด (ไม่บังคับ)",
      },
      withdrawMethodPromptPayAttachQrAdd: { en: "Add", th: "เพิ่ม" },
      withdrawMethodFormBankAccountPlaceholder: {
        en: "Enter your bank account",
        th: "กรอกเลขบัญชีธนาคาร",
      },
      withdrawMethodSectionBankTitle: { en: "Bank Account", th: "บัญชีธนาคาร" },
      withdrawMethodFormSelectBankPlaceholder: {
        en: "Select your bank",
        th: "เลือกธนาคารของคุณ",
      },
    };
    const wm = withdrawMethodFallbacks[key];
    if (wm) {
      return messageLocale === "th" ? wm.th : wm.en;
    }

    const headerSearchFallbacks: Record<string, { en: string; th: string }> = {
      headerSearchTrendingTitle: { en: "Popular right now", th: "ยอดนิยมตอนนี้" },
      headerSearchTrendingSubtitle: {
        en: "Hand-picked stores with standout cashback—tap a shop to explore.",
        th: "ร้านคัดพิเศษพร้อมแคชแบ็กโดดเด่น—แตะเพื่อดูรายละเอียด",
      },
      headerSearchResultsTitle: {
        en: "Matching brands & products",
        th: "แบรนด์และสินค้าที่ตรงกับการค้นหา",
      },
      headerSearchResultsSubtitle: { en: "From your search", th: "จากคำที่คุณพิมพ์" },
      headerSearchTrendingEmpty: {
        en: "No popular stores to show yet. Try searching above.",
        th: "ยังไม่มีร้านแนะนำ ลองค้นหาด้านบนได้เลย",
      },
      headerSearchNoMatches: {
        en: "No brands or products match that search—browse popular picks below.",
        th: "ไม่พบแบรนด์หรือสินค้าที่ตรงกับคำค้น—ลองดูร้านยอดนิยมด้านล่าง",
      },
    };
    const hs = headerSearchFallbacks[key];
    if (hs) {
      return messageLocale === "th" ? hs.th : hs.en;
    }

    const pdpaConsentBannerFallbacks: Record<string, { en: string; th: string }> = {
      pdpaConsentBannerTitle: {
        en: "We use cookies in the delivery of our services.",
        th: "เราใช้คุกกี้ในการให้บริการของเรา",
      },
      pdpaConsentBannerBodyPart1: {
        en: "To learn about the cookies we use and your preferences, read our ",
        th: "หากต้องการทราบเกี่ยวกับคุกกี้และการตั้งค่าของคุณ โปรดอ่าน ",
      },
      pdpaConsentBannerBodyMid: {
        en: "",
        th: "",
      },
      pdpaConsentBannerBodyPart2: {
        en: ". By using GoGoCash you agree to our use of cookies for cashback and analytics.",
        th: " เมื่อใช้ GoGoCash ถือว่าคุณยอมรับการใช้คุกกี้เพื่อแคชแบ็กและการวิเคราะห์",
      },
      pdpaConsentDecline: { en: "Cookie settings", th: "ตั้งค่าคุกกี้" },
      pdpaConsentAllow: { en: "Accept all cookies", th: "ยอมรับคุกกี้ทั้งหมด" },
    };
    const pdpa = pdpaConsentBannerFallbacks[key];
    if (pdpa) {
      return messageLocale === "th" ? pdpa.th : pdpa.en;
    }

    if (key.startsWith("missingOrders") || key.startsWith("gogoquestHistory")) {
      const v = readCatalogString(messageLocale, key);
      if (v) return v;
    }

    const withdrawCtaFallbacks: Record<string, { en: string; th: string }> = {
      withdrawFormCtaTitle: { en: "Confirm", th: "ยืนยัน" },
      withdrawFormCtaSubtitle: { en: "and withdraw", th: "และถอนเงิน" },
      withdrawFormConfirmAndWithdraw: {
        en: "Confirm and Withdraw",
        th: "ยืนยันและถอนเงิน",
      },
      withdrawConfirmGoToWalletButton: { en: "Go to Wallet", th: "ไปที่กระเป๋าเงิน" },
      withdrawConfirmContinueShopping: { en: "Continue Shopping", th: "ช้อปต่อ" },
      withdrawConfirmReviewBadge: { en: "Pending", th: "รอดำเนินการ" },
    };
    const wCta = withdrawCtaFallbacks[key];
    if (wCta) {
      return messageLocale === "th" ? wCta.th : wCta.en;
    }

    return [namespace, key].filter(Boolean).join(".");
  };
}
