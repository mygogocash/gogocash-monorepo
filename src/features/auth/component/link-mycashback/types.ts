import type { Dispatch, SetStateAction } from "react";

export type LinkMyCashbackChannel = "phone" | "email";

export type LinkMyCashbackMethodCopy = {
  methodTitle: string;
  methodDescription: string;
  methodPhoneLabel: string;
  methodEmailLabel: string;
  methodPhonePlaceholder: string;
  methodEmailPlaceholder: string;
  methodConsentPrefix: string;
  privacyPolicyLabel: string;
  methodBack: string;
  methodNext: string;
};

export type LinkMyCashbackVerifyCopy = {
  verifyTitle: string;
  verifyDescriptionPhone: string;
  verifyDescriptionEmail: string;
  verifySentToPhoneLabel: string;
  verifySentToEmailLabel: string;
  verifyResendLabel: string;
  verifyOtpAriaLabel: string;
  verifyBack: string;
  verifyNext: string;
};

export type LinkMyCashbackScreenCopy = {
  pageTitle: string;
  pageSubtitle: string;
  goGoCashImageLabel: string;
  myCashbackImageAlt: string;
  cardTitle: string;
  cardDescription: string;
  skipLabel: string;
  linkAccountLabel: string;
  goGoCashAria: string;
  method: LinkMyCashbackMethodCopy;
  verify: LinkMyCashbackVerifyCopy;
};

export type LinkStep = "intro" | "method" | "verify";

export type LinkMyCashbackMethodStepProps = {
  copy: LinkMyCashbackMethodCopy;
  linkChannel: LinkMyCashbackChannel;
  setLinkChannel: Dispatch<SetStateAction<LinkMyCashbackChannel>>;
  phoneLocal: string;
  setPhoneLocal: Dispatch<SetStateAction<string>>;
  emailValue: string;
  setEmailValue: Dispatch<SetStateAction<string>>;
  consentChecked: boolean;
  setConsentChecked: Dispatch<SetStateAction<boolean>>;
  onBack: () => void;
  onNext: () => void;
};

export type LinkMyCashbackVerifyStepProps = {
  copy: LinkMyCashbackVerifyCopy;
  linkChannel: LinkMyCashbackChannel;
  phoneDigits: string;
  emailValue: string;
  otpInput: string;
  setOtpInput: Dispatch<SetStateAction<string>>;
  resendSeconds: number;
  onResend: () => void;
  onBack: () => void;
  onNext: () => void;
};
