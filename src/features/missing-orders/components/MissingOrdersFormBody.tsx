"use client";

import { getSupportHref } from "@/constants/navigation";
import {
  appendMissingOrderClaimToLocalStorage,
  getMissingOrderClaimAccountKey,
} from "@/lib/missingOrders/walletClaimSubmissions";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import LineAppIcon from "@/components/icons/social/LineAppIcon";
import { MissingOrdersSubmittedDialog } from "@/features/missing-orders/components/MissingOrdersSubmittedDialog";
import { getMissingOrdersSectionHeadings } from "@/features/missing-orders/missingOrdersSectionHeadings";
import { missingOrdersStaticT } from "@/features/missing-orders/missingOrdersStaticT";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";

/** Outlined secondary — LINE green (Get help on LINE, Clear data) */
const missingOrdersLineCtaSx = {
  minHeight: 48,
  px: 2.5,
  py: 1.25,
  gap: 1,
  borderRadius: "16px",
  fontSize: "0.9375rem",
  fontWeight: 600,
  letterSpacing: "0.01em",
  textTransform: "none" as const,
  borderWidth: 1.5,
  borderColor: "#06C755",
  color: "#06C755",
  bgcolor: "#fff",
  "&:hover": {
    borderColor: "#05b34c",
    bgcolor: "rgba(6, 199, 85, 0.08)",
  },
  "&:disabled": {
    borderColor: "rgba(152, 152, 152, 0.45)",
    color: "#989898",
    bgcolor: "#fff",
  },
};

/** Mint outline — matches primary CTA / SubProfile teal, same shell as LINE secondary */
const missingOrdersAttachmentButtonSx = {
  minHeight: 48,
  px: 2.5,
  py: 1.25,
  gap: 1,
  borderRadius: "16px",
  fontSize: "0.9375rem",
  fontWeight: 600,
  letterSpacing: "0.01em",
  textTransform: "none" as const,
  borderWidth: 1.5,
  borderColor: "#00CC99",
  color: "#00AA80",
  bgcolor: "#fff",
  "&:hover": {
    borderColor: "#00AA80",
    color: "#009973",
    bgcolor: "rgba(0, 204, 153, 0.1)",
  },
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    "& fieldset": { borderColor: "rgba(152,152,152,0.4)" },
  },
} as const;

const PRESET_SHOPS = [
  { id: "shopee", key: "missingOrdersShopShopee" as const },
  { id: "lazada", key: "missingOrdersShopLazada" as const },
  { id: "tiktok", key: "missingOrdersShopTiktok" as const },
  { id: "banana", key: "missingOrdersShopBananaIt" as const },
  { id: "agoda", key: "missingOrdersShopAgoda" as const },
  { id: "trip", key: "missingOrdersShopTripCom" as const },
  { id: "traveloka", key: "missingOrdersShopTraveloka" as const },
  { id: "klook", key: "missingOrdersShopKlook" as const },
] as const;

const MAX_MISSING_ORDER_IMAGES = 5;
const MAX_MISSING_ORDER_IMAGE_BYTES = 5 * 1024 * 1024;

/** `yyyy-mm-dd` in local timezone (for `<input type="date" max>`). */
function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Fixed mask so ID length is not inferable from the field. */
function maskUserIdForDisplay(): string {
  return "******";
}

/** Digits and at most one `.`; max two fractional digits (THB / satang). */
function sanitizeThbAmountInput(raw: string): string {
  let s = "";
  let seenDot = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      s += ch;
    } else if (ch === "." && !seenDot) {
      seenDot = true;
      s += ".";
    }
  }
  const dot = s.indexOf(".");
  if (dot === -1) return s;

  let intPart = s.slice(0, dot);
  let frac = s.slice(dot + 1);
  if (frac.length > 2) frac = frac.slice(0, 2);

  if (intPart === "" && (frac.length > 0 || s.endsWith("."))) {
    intPart = "0";
  }

  if (s.endsWith(".") && frac.length === 0) {
    return `${intPart}.`;
  }
  return frac.length > 0 ? `${intPart}.${frac}` : intPart;
}

type AttachmentItem = { id: string; file: File; url: string };

function mergeIncomingAttachments(
  prev: AttachmentItem[],
  incoming: File[]
): {
  next: AttachmentItem[];
  maxReached: boolean;
  rejectedNotImage: number;
  rejectedTooBig: number;
} {
  const newItems: AttachmentItem[] = [];
  let maxReached = false;
  let rejectedNotImage = 0;
  let rejectedTooBig = 0;

  for (const file of incoming) {
    if (prev.length + newItems.length >= MAX_MISSING_ORDER_IMAGES) {
      maxReached = true;
      break;
    }
    if (!file.type.startsWith("image/")) {
      rejectedNotImage += 1;
      continue;
    }
    if (file.size > MAX_MISSING_ORDER_IMAGE_BYTES) {
      rejectedTooBig += 1;
      continue;
    }
    newItems.push({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    });
  }

  const next = newItems.length > 0 ? [...prev, ...newItems] : prev;
  return { next, maxReached, rejectedNotImage, rejectedTooBig };
}

function MissingOrdersFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-2xl border border-[#e6e6e6] bg-[#f9fafb] p-4 md:p-5"
    >
      <header className="flex flex-col gap-1.5">
        <Typography
          id={headingId}
          component="h3"
          className="text-[17px] font-semibold leading-snug text-[#2d2d2d]"
        >
          {title}
        </Typography>
        <Typography className="text-sm leading-relaxed text-[#656565]">{description}</Typography>
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

/**
 * Missing Orders form — Figma 9620:204910.
 * Module name `MissingOrdersFormBody` (not `…FormCard`) helps Turbopack drop stale HMR chunks that still called `t()`.
 */
export default function MissingOrdersFormBody() {
  const locale = useLocale();
  /** All copy from static JSON — do not use `useTranslations()` / `t()` here (Turbopack drops flat keys). */
  const mo = (key: string) => missingOrdersStaticT(locale, key);
  const sectionHeadings = useMemo(() => getMissingOrdersSectionHeadings(locale), [locale]);
  const { data: session } = useSession();
  const supportHref = getSupportHref(session?.user?.region);
  const claimAccountKey = useMemo(
    () => getMissingOrderClaimAccountKey(session?.user),
    [session?.user]
  );
  const showMissingOrdersTestUi = process.env.NEXT_PUBLIC_MISSING_ORDERS_TEST_UI === "true";

  const [shop, setShop] = useState("");
  const [otherShop, setOtherShop] = useState("");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  /** Native date input value: `yyyy-mm-dd` or "". */
  const [purchaseDate, setPurchaseDate] = useState("");
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [userIdRevealed, setUserIdRevealed] = useState(false);
  const [submitSuccessOpen, setSubmitSuccessOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputId = useId();

  const userIdFromSession =
    session?.user?._id?.toString().trim() || session?.user?.id?.toString().trim() || "";
  const userIdDisplay = userIdFromSession || "—";
  const userIdFieldValue = !userIdFromSession
    ? userIdDisplay
    : userIdRevealed
      ? userIdFromSession
      : maskUserIdForDisplay();

  const handleShopChange = (e: SelectChangeEvent<string>) => {
    setShop(e.target.value);
    if (e.target.value !== "other") setOtherShop("");
  };

  const shopLabel = (() => {
    if (!shop) return "";
    if (shop === "other") return otherShop.trim() || mo("missingOrdersShopOtherPick");
    const preset = PRESET_SHOPS.find((p) => p.id === shop);
    return preset ? mo(preset.key) : "";
  })();

  const shopOk =
    shop &&
    (shop !== "other" || otherShop.trim().length > 0) &&
    (shop === "other" || PRESET_SHOPS.some((p) => p.id === shop));

  const canSubmit = Boolean(shopOk && orderId.trim());

  const attachmentsRef = useRef<AttachmentItem[]>([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    queueMicrotask(() => setUserIdRevealed(false));
  }, [userIdFromSession]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.url));
    };
  }, []);

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const addAttachmentFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList);
    let merged: ReturnType<typeof mergeIncomingAttachments> | undefined;

    setAttachments((prev) => {
      merged = mergeIncomingAttachments(prev, incoming);
      return merged.next;
    });

    if (!merged) return;

    if (merged.maxReached) {
      toast.error(mo("missingOrdersAttachmentMaxReached"));
    }
    if (merged.rejectedNotImage > 0) {
      toast.error(mo("missingOrdersAttachmentNotImage"));
    }
    if (merged.rejectedTooBig > 0) {
      toast.error(mo("missingOrdersAttachmentFileTooBig"));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (attachments.length > 0) {
      toast(mo("missingOrdersAttachmentRememberLine"), { duration: 6000 });
    }
    appendMissingOrderClaimToLocalStorage(claimAccountKey, {
      submittedAt: new Date().toISOString(),
      shopLabel: shopLabel.trim() || "—",
      orderId: orderId.trim(),
      amount: amount.trim(),
      currency: "THB",
    });
    setSubmitSuccessOpen(true);
    window.open(supportHref, "_blank", "noopener,noreferrer");
  };

  const hasFormData = Boolean(
    shop ||
    otherShop.trim() ||
    orderId.trim() ||
    amount.trim() ||
    purchaseDate ||
    note.trim() ||
    attachments.length > 0
  );

  const handleClearForm = () => {
    setShop("");
    setOtherShop("");
    setOrderId("");
    setAmount("");
    setPurchaseDate("");
    setNote("");
    setAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.url));
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full min-w-0 rounded-3xl border border-[#e4e4e4] bg-white p-6">
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-3">
          <div className="min-w-0 flex-1">
            <Typography
              component="h2"
              className="text-2xl font-medium text-[#3b3b3b]"
              sx={{ fontVariationSettings: "'opsz' 14" }}
            >
              {mo("missingOrdersPageTitle")}
            </Typography>
            <Typography
              component="p"
              className="mt-2 max-w-3xl text-sm leading-relaxed text-[#656565]"
            >
              {mo("missingOrdersPageIntroSelfService")}
            </Typography>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 self-start sm:w-auto sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outlined"
              onClick={handleClearForm}
              disabled={!hasFormData}
              className="w-full normal-case sm:w-auto"
              startIcon={<ClearOutlinedIcon sx={{ fontSize: 22 }} />}
              sx={missingOrdersLineCtaSx}
            >
              {mo("missingOrdersClearData")}
            </Button>
            {showMissingOrdersTestUi ? (
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  appendMissingOrderClaimToLocalStorage(claimAccountKey, {
                    submittedAt: new Date().toISOString(),
                    shopLabel: "[Test]",
                    orderId: `TEST-${Date.now()}`,
                    amount: "0",
                    currency: "THB",
                  });
                  setSubmitSuccessOpen(true);
                }}
                className="w-full border-dashed border-amber-600 text-amber-800 normal-case sm:w-auto"
                sx={{ ...missingOrdersLineCtaSx, borderColor: "#d97706", color: "#92400e" }}
              >
                [Dev] Test success + wallet row
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <MissingOrdersFormSection
            title={sectionHeadings.purchaseTitle}
            description={sectionHeadings.purchaseHelp}
          >
            <FormControl fullWidth sx={inputSx}>
              <InputLabel id="missing-orders-shop-label">{mo("missingOrdersFieldShop")}</InputLabel>
              <Select
                labelId="missing-orders-shop-label"
                id="missing-orders-shop"
                value={shop}
                label={mo("missingOrdersFieldShop")}
                onChange={handleShopChange}
                displayEmpty
                renderValue={() => shopLabel}
              >
                {PRESET_SHOPS.map(({ id, key }) => (
                  <MenuItem key={id} value={id}>
                    {mo(key)}
                  </MenuItem>
                ))}
                <MenuItem
                  disabled
                  disableRipple
                  sx={{
                    bgcolor: "#00AA80 !important",
                    color: "#fff !important",
                    opacity: "1 !important",
                    fontSize: 16,
                    py: 1,
                  }}
                >
                  {mo("missingOrdersShopOtherSection")}
                </MenuItem>
                <MenuItem value="other">{mo("missingOrdersShopOtherPick")}</MenuItem>
              </Select>
            </FormControl>

            {shop === "other" && (
              <TextField
                fullWidth
                label={mo("missingOrdersEnterShopPlaceholder")}
                placeholder={mo("missingOrdersEnterShopPlaceholder")}
                value={otherShop}
                onChange={(e) => setOtherShop(e.target.value)}
                sx={inputSx}
              />
            )}

            <TextField
              fullWidth
              required
              label={mo("missingOrdersFieldOrderId")}
              placeholder={mo("missingOrdersFieldOrderId")}
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              helperText={mo("missingOrdersOrderIdHelper")}
              FormHelperTextProps={{ className: "mx-0 text-xs text-[#7f7f7f]" }}
              sx={inputSx}
            />

            <TextField
              fullWidth
              label={mo("missingOrdersFieldAmount")}
              placeholder={mo("missingOrdersFieldAmount")}
              value={amount}
              onChange={(e) => setAmount(sanitizeThbAmountInput(e.target.value))}
              helperText={mo("missingOrdersAmountHelper")}
              FormHelperTextProps={{ className: "mx-0 text-xs text-[#7f7f7f]" }}
              slotProps={{
                htmlInput: {
                  inputMode: "decimal",
                  autoComplete: "off",
                  pattern: "[0-9]*[.]?[0-9]{0,2}",
                },
              }}
              sx={inputSx}
            />

            <div className="flex flex-col gap-1.5">
              <TextField
                fullWidth
                type="date"
                label={mo("missingOrdersFieldPurchaseDate")}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: {
                    max: toLocalISODate(new Date()),
                  },
                }}
                helperText={mo("missingOrdersDateHint")}
                FormHelperTextProps={{ className: "mx-0 text-xs text-[#7f7f7f]" }}
                sx={inputSx}
              />
            </div>
          </MissingOrdersFormSection>

          <MissingOrdersFormSection
            title={sectionHeadings.accountTitle}
            description={sectionHeadings.accountHelp}
          >
            <TextField
              fullWidth
              label={mo("profileUserIdLabel")}
              value={userIdFieldValue}
              helperText={mo("missingOrdersUserIdMatchHint")}
              FormHelperTextProps={{ className: "mx-0 text-xs text-[#989898]" }}
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: userIdFromSession ? (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        edge="end"
                        size="small"
                        aria-label={
                          userIdRevealed
                            ? mo("missingOrdersUserIdHideAria")
                            : mo("missingOrdersUserIdShowAria")
                        }
                        aria-pressed={userIdRevealed}
                        onClick={() => setUserIdRevealed((v) => !v)}
                      >
                        {userIdRevealed ? (
                          <VisibilityOffOutlinedIcon sx={{ color: "#989898", fontSize: 18 }} />
                        ) : (
                          <VisibilityOutlinedIcon sx={{ color: "#989898", fontSize: 18 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
              sx={{
                ...inputSx,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#fff",
                },
              }}
            />
          </MissingOrdersFormSection>

          {/* Extra section copy: `sectionHeadings.*` → getMissingOrdersSectionHeadings → missingOrdersStaticT (not next-intl t()) */}
          <MissingOrdersFormSection
            title={sectionHeadings.extraTitle}
            description={sectionHeadings.extraHelp}
          >
            <TextField
              fullWidth
              label={mo("missingOrdersFieldNote")}
              placeholder={mo("missingOrdersFieldNote")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={3}
              sx={inputSx}
            />

            <Box className="flex flex-col gap-2 rounded-xl border border-dashed border-[#d4d4d4] bg-white p-3 md:p-4">
              <Typography className="text-[15px] font-medium text-[#3b3b3b]">
                {mo("missingOrdersAttachmentLabel")}
              </Typography>
              <Typography variant="caption" className="text-xs leading-relaxed text-[#7f7f7f]">
                {mo("missingOrdersAttachmentHint")}
              </Typography>
              <input
                id={attachmentInputId}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  addAttachmentFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap items-start gap-3">
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<AddPhotoAlternateOutlinedIcon sx={{ fontSize: 22 }} />}
                  onClick={() => fileInputRef.current?.click()}
                  className="normal-case"
                  sx={missingOrdersAttachmentButtonSx}
                >
                  {mo("missingOrdersAttachmentButton")}
                </Button>
              </div>
              {attachments.length > 0 ? (
                <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
                  {attachments.map(({ id, url, file }) => (
                    <li key={id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview URLs */}
                      <img
                        src={url}
                        alt=""
                        className="h-20 w-20 rounded-xl border border-[#e4e4e4] object-cover"
                      />
                      <IconButton
                        type="button"
                        size="small"
                        onClick={() => removeAttachment(id)}
                        aria-label={mo("missingOrdersAttachmentRemoveAria")}
                        className="absolute -right-2 -top-2 bg-white shadow-md"
                        sx={{
                          border: "1px solid #e4e4e4",
                          width: 28,
                          height: 28,
                          "&:hover": { bgcolor: "#f6f6f6" },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <Typography
                        variant="caption"
                        className="mt-1 block max-w-22 truncate text-[#989898]"
                        title={file.name}
                      >
                        {file.name}
                      </Typography>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Box>
          </MissingOrdersFormSection>
        </div>

        <Typography component="div" className="text-sm text-[#7f7f7f]">
          <ul className="list-disc space-y-1 pl-5">
            <li>{mo("missingOrdersBullet1")}</li>
            <li>{mo("missingOrdersBullet2")}</li>
            <li>{mo("missingOrdersBullet3")}</li>
          </ul>
        </Typography>

        <div className="mt-1 flex w-full flex-col gap-3 border-t border-[#e4e4e4] pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-4">
          {process.env.NODE_ENV === "development" ? (
            <Button
              type="button"
              variant="outlined"
              onClick={() => setSubmitSuccessOpen(true)}
              className="w-full sm:w-auto"
              sx={{
                ...missingOrdersLineCtaSx,
                borderColor: "#989898",
                color: "#656565",
                "&:hover": {
                  borderColor: "#7a7a7a",
                  bgcolor: "rgba(0,0,0,0.04)",
                },
              }}
            >
              Test: success popup
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outlined"
            component="a"
            href={supportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
            startIcon={<LineAppIcon width={22} height={22} />}
            sx={missingOrdersLineCtaSx}
          >
            {mo("missingOrdersPageSupportButton")}
          </Button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex w-full max-w-full items-center justify-center gap-2 rounded-full bg-[#00CC99] px-6 text-base font-medium text-white transition hover:brightness-[0.97] disabled:cursor-not-allowed disabled:bg-[#e4e4e4] disabled:text-[#9ca3a3] disabled:hover:brightness-100 h-11 min-h-[44px] sm:h-10 sm:w-auto sm:min-w-[200px] sm:px-5"
          >
            {mo("missingOrdersSubmitClaim")}
          </button>
        </div>
      </form>

      <MissingOrdersSubmittedDialog
        open={submitSuccessOpen}
        onClose={() => setSubmitSuccessOpen(false)}
      />
    </div>
  );
}
