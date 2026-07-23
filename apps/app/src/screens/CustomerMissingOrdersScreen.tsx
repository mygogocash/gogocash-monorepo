import { Link } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen as GuideIcon,
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  CircleHelp as HelpIcon,
  Eye as EyeIcon,
  ImagePlus as ImageIcon,
  MessageCircle as SupportIcon,
  ShoppingBag as ShoppingIcon,
} from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import type { LayoutRectangle, ViewStyle } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import {
  type CustomerMissingOrderClaim,
  formatMissingOrderStatus,
  formatMissingOrderApiError,
  listMissingOrders,
  MISSING_ORDER_EVIDENCE_UNAVAILABLE_MESSAGE,
  submitMissingOrder,
} from "@mobile/account/missingOrderResource";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import { mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { isOfferListResponse } from "@mobile/api/catalogTypes";
import { getMobileEnv } from "@mobile/config/env";
import { BirthDateField } from "@mobile/components/BirthDateField";
import { KeyboardAwareScreen } from "@mobile/components/KeyboardAwareScreen";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import {
  mobileShellLayout,
  webMissingOrdersPage,
} from "@mobile/design/webDesignParity";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type MissingOrdersSection = (typeof webMissingOrdersPage.sections)[number];
type MissingOrdersField = MissingOrdersSection["fields"][number];
type MissingOrdersQuickCard = (typeof webMissingOrdersPage.quickCards)[number];

// The validation message reuses the attachment field's own "Required — add at least 1
// image…" helper from the existing catalog data — no new visible string is introduced.
const attachmentField = webMissingOrdersPage.sections
  .flatMap((section): readonly MissingOrdersField[] => section.fields)
  .find((field) => field.icon === "image");
const attachmentRequiredMessage = attachmentField?.helper ?? "";
const MISSING_ORDER_REQUIRED_FIELDS_MESSAGE =
  "User ID, Brand, Order ID, Amount, and Purchase date are required.";

const [purchaseSection, accountSection, extraSection] =
  webMissingOrdersPage.sections;

// Preset stores for the "Store or marketplace" dropdown (web parity: a real <Select>).
const MISSING_ORDERS_SHOPS = [
  "Shopee",
  "Lazada",
  "TikTok Shop",
  "Banana IT",
  "Agoda",
  "Trip.com",
  "Traveloka",
  "Klook",
  "Other (enter brand name)",
] as const;

const MISSING_ORDERS_USER_ID = "mock-user-001";
const missingOrderHistoryQueryKey = (apiUrl: string) =>
  ["missing-orders", apiUrl] as const;

const MAX_MISSING_ORDER_IMAGES = 5;

type MissingOrderImage = { id: string; name: string; uri: string };

// Opens the device image picker (web parity: <input type="file" accept="image/*" multiple>).
// On web it uses a real hidden file input; on native (where this mock is not exercised) it
// registers a single placeholder so the required-attachment flow still works.
function pickMissingOrderImages(
  onPicked: (images: MissingOrderImage[]) => void,
): void {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    onPicked([{ id: `mock-${Date.now()}`, name: "receipt.png", uri: "" }]);
    return;
  }
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.onchange = () => {
    const picked = Array.from(input.files ?? [])
      .slice(0, MAX_MISSING_ORDER_IMAGES)
      .map((file, index) => ({
        id: `${file.name}-${file.size}-${index}`,
        name: file.name,
        uri:
          typeof URL !== "undefined" && URL.createObjectURL
            ? URL.createObjectURL(file)
            : "",
      }));
    if (picked.length > 0) onPicked(picked);
  };
  input.click();
}

export function CustomerMissingOrdersScreen() {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  return (
    <MissingOrdersSubPage>
      {isDesktop ? null : <MissingOrdersTopBar />}
      <View style={styles.content}>
        <MissingOrdersFormPanel />
        <MissingOrdersClaimHistory />
        <MissingOrdersQuickCards />
        <MissingOrdersFaqSection />
      </View>
    </MissingOrdersSubPage>
  );
}

function MissingOrdersSubPage({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const tc = useCopy();
  return (
    <AccountPageShell
      activeRouteId="profile"
      showTitle={false}
      title={tc(webMissingOrdersPage.title)}
    >
      {/* Wave B (B2) — KeyboardAwareScreen wraps this long multi-field claim form so the
          on-screen keyboard never covers the focused input (the keyboard-occlusion fix
          matters most on a form this tall). It supplies the keyboard-avoiding ScrollView
          and forwards contentContainerStyle, so the existing surface layout is unchanged;
          on web it is a layout no-op. */}
      <KeyboardAwareScreen
        contentContainerStyle={[
          styles.surface,
          styles.missingOrdersSurfaceBleed,
        ]}
      >
        {children}
      </KeyboardAwareScreen>
    </AccountPageShell>
  );
}

function MissingOrdersTopBar() {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" hitSlop={8} style={styles.topBar}>
        <ChevronLeftIcon
          color={colors.accent}
          size={26}
          strokeWidth={typography.iconStrokeWidth}
        />
        <Text style={styles.topBarTitle}>{tc(webMissingOrdersPage.title)}</Text>
      </Pressable>
    </Link>
  );
}

function MissingOrdersFormPanel() {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const env = getMobileEnv();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const catalogResource = useCustomerAccountResource({
    fixtureData: { data: [], limit: 80, page: 1, total: 0, totalPages: 0 },
    resourceId: "brandCatalog",
  });
  const profileResource = useCustomerAccountResource({
    fixtureData: { id: MISSING_ORDERS_USER_ID },
    resourceId: "profile",
  });
  const shopOptions = useMemo(() => {
    if (env.accountDataSource === "backend") {
      return catalogResource.status === "ready" &&
        isOfferListResponse(catalogResource.data)
        ? mapOffersToCatalogBrands(catalogResource.data).map((brand) => ({
            label: brand.name,
            offerId: brand.id,
          }))
        : [];
    }

    return MISSING_ORDERS_SHOPS.map((label) => ({ label, offerId: "" }));
  }, [catalogResource.data, catalogResource.status, env.accountDataSource]);
  const catalogStateResource =
    env.accountDataSource === "backend" &&
    catalogResource.status === "ready" &&
    shopOptions.length === 0
      ? { ...catalogResource, data: null, status: "empty" as const }
      : catalogResource;
  const [attachments, setAttachments] = useState<readonly MissingOrderImage[]>(
    [],
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedOpen, setSubmittedOpen] = useState(false);
  const [shop, setShop] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [note, setNote] = useState("");
  const [shopOpen, setShopOpen] = useState(false);
  const [shopAnchor, setShopAnchor] = useState<LayoutRectangle | null>(null);

  const hasAttachment = attachments.length > 0;

  const addImages = (images: MissingOrderImage[]) => {
    setAttachments((prev) =>
      [...prev, ...images].slice(0, MAX_MISSING_ORDER_IMAGES),
    );
    setSubmitError(null);
  };
  const removeImage = (id: string) =>
    setAttachments((prev) => prev.filter((image) => image.id !== id));

  const handleSubmit = () => {
    if (env.accountDataSource !== "backend" && !hasAttachment) {
      setSubmitError(attachmentRequiredMessage);
      haptics.error();
      return;
    }

    if (env.accountDataSource === "backend") {
      const profileUserId =
        profileResource.data &&
        typeof profileResource.data === "object" &&
        "id" in profileResource.data &&
        typeof profileResource.data.id === "string"
          ? profileResource.data.id.trim()
          : "";
      if (
        !profileUserId ||
        !shop.trim() ||
        !selectedOfferId ||
        !orderId.trim() ||
        !amount.trim() ||
        !purchaseDate.trim()
      ) {
        setSubmitError(MISSING_ORDER_REQUIRED_FIELDS_MESSAGE);
        haptics.error();
        return;
      }

      setSubmitting(true);
      void (async () => {
        try {
          await submitMissingOrder({
            amount: amount.trim(),
            apiUrl: env.apiUrl,
            files: [],
            note: note.trim(),
            offerId: selectedOfferId,
            orderId: orderId.trim(),
            purchaseDate: purchaseDate.trim(),
          });
          setSubmitError(null);
          haptics.success();
          setSubmittedOpen(true);
          await queryClient.invalidateQueries({
            queryKey: missingOrderHistoryQueryKey(env.apiUrl),
          });
        } catch (error) {
          setSubmitError(formatMissingOrderApiError(error));
          haptics.error();
        } finally {
          setSubmitting(false);
        }
      })();
      return;
    }

    setSubmitError(null);
    haptics.success();
    setSubmittedOpen(true);
  };

  return (
    <View style={styles.formPanel}>
      <View style={styles.formHeader}>
        <View style={styles.formHeaderCopy}>
          <Text style={styles.formTitle}>{tc(webMissingOrdersPage.title)}</Text>
          <Text style={styles.formIntro}>{tc(webMissingOrdersPage.intro)}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            disabled
            style={[styles.outlineButton, styles.disabledButton]}
          >
            <Text style={[styles.outlineButtonText, styles.disabledButtonText]}>
              {tc(webMissingOrdersPage.clearActionLabel)}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionStack}>
        <MissingOrdersFormSection section={purchaseSection}>
          {env.accountDataSource === "backend" &&
          catalogStateResource.status !== "ready" ? (
            <CustomerAccountResourceState
              embedded
              emptyBody="No eligible merchants are available for a missing conversion claim."
              emptyTitle="No merchants available"
              resource={catalogStateResource}
              resourceLabel="merchant catalog"
            />
          ) : null}
          <MissingOrdersSelectField
            disabled={
              env.accountDataSource === "backend" &&
              catalogStateResource.status !== "ready"
            }
            helper={purchaseSection.fields[0].helper}
            label={purchaseSection.fields[0].label}
            onMeasure={setShopAnchor}
            onOpen={() => setShopOpen(true)}
            open={shopOpen}
            required
            value={shop}
          />
          <MissingOrdersTextField
            helper={purchaseSection.fields[1].helper}
            label={purchaseSection.fields[1].label}
            onChangeText={setOrderId}
            required
            value={orderId}
          />
          <MissingOrdersTextField
            helper={purchaseSection.fields[2].helper}
            keyboardType="decimal-pad"
            label={purchaseSection.fields[2].label}
            onChangeText={setAmount}
            required
            value={amount}
          />
          <MissingOrdersDateField
            helper={purchaseSection.fields[3].helper}
            label={purchaseSection.fields[3].label}
            onChange={setPurchaseDate}
            required
            value={purchaseDate}
          />
        </MissingOrdersFormSection>
        <MissingOrdersFormSection section={accountSection}>
          <MissingOrdersUserIdField
            helper={accountSection.fields[0].helper}
            label={accountSection.fields[0].label}
            userId={
              profileResource.data &&
              typeof profileResource.data === "object" &&
              "id" in profileResource.data &&
              typeof profileResource.data.id === "string"
                ? profileResource.data.id
                : env.accountDataSource === "backend"
                  ? "Unavailable"
                  : MISSING_ORDERS_USER_ID
            }
          />
        </MissingOrdersFormSection>
        <MissingOrdersFormSection section={extraSection}>
          <MissingOrdersTextField
            helper={extraSection.fields[0].helper}
            label={extraSection.fields[0].label}
            multiline
            onChangeText={setNote}
            value={note}
          />
          {env.accountDataSource === "backend" ? (
            <View style={styles.attachmentBox}>
              <Text style={styles.attachmentLabel}>
                Receipt upload unavailable
              </Text>
              <Text style={styles.attachmentHint}>
                {MISSING_ORDER_EVIDENCE_UNAVAILABLE_MESSAGE}
              </Text>
            </View>
          ) : (
            <MissingOrdersAttachmentField
              attachments={attachments}
              helper={extraSection.fields[1].helper}
              label={extraSection.fields[1].label}
              onAdd={addImages}
              onRemove={removeImage}
            />
          )}
        </MissingOrdersFormSection>
      </View>

      <View style={styles.bulletPanel}>
        {webMissingOrdersPage.bullets.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>{"•"}</Text>
            <Text style={styles.bulletText}>{tc(bullet)}</Text>
          </View>
        ))}
      </View>

      {submitError ? (
        <Text accessibilityRole="alert" style={styles.submitError}>
          {tc(submitError)}
        </Text>
      ) : null}

      {/* Footer mirrors the web: a top-bordered action row with the LINE help button +
          the green pill submit, right-aligned on desktop and stacked full-width on mobile. */}
      <View
        style={[styles.formFooter, isDesktop ? styles.formFooterDesktop : null]}
      >
        <MotionPressable pressScale={0.98} style={styles.lineButton}>
          <SupportIcon
            color="#06C755"
            size={18}
            strokeWidth={typography.iconStrokeWidth}
          />
          <Text style={styles.lineButtonText}>
            {tc(webMissingOrdersPage.supportActionLabel)}
          </Text>
        </MotionPressable>
        <MotionPressable
          onPress={handleSubmit}
          pressScale={0.98}
          style={[
            styles.submitButton,
            isDesktop ? styles.submitButtonDesktop : null,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {submitting
              ? tc("Loading…")
              : tc(webMissingOrdersPage.submitActionLabel)}
          </Text>
        </MotionPressable>
      </View>

      {shopOpen ? (
        <Modal
          animationType="none"
          onRequestClose={() => setShopOpen(false)}
          transparent
          visible
        >
          <Pressable
            accessibilityLabel={tc("Close")}
            onPress={() => setShopOpen(false)}
            style={styles.dropdownBackdrop}
          />
          {/* Anchored under the shop field (web parity: the <Select> menu opens below it). */}
          <View
            style={[
              styles.dropdownAnchoredMenu,
              shopAnchor
                ? {
                    left: shopAnchor.x,
                    top: shopAnchor.y + shopAnchor.height + 4,
                    width: shopAnchor.width,
                  }
                : styles.dropdownMenuFallback,
            ]}
          >
            <ScrollView style={styles.dropdownScroll}>
              {shopOptions.map((option) => {
                const selected = shop === option.label;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.label}
                    onPress={() => {
                      setShop(option.label);
                      setSelectedOfferId(option.offerId);
                      setShopOpen(false);
                    }}
                    style={styles.dropdownOption}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        selected ? styles.dropdownOptionTextSelected : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selected ? (
                      <CheckIcon
                        color={colors.primaryDark}
                        size={18}
                        strokeWidth={typography.iconStrokeWidth}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Modal>
      ) : null}

      {submittedOpen ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setSubmittedOpen(false)}
          transparent
          visible
        >
          <View style={styles.successRoot}>
            <View style={styles.successCard}>
              <View style={styles.successBadge}>
                <CheckIcon color={colors.white} size={36} strokeWidth={2.6} />
              </View>
              <Text style={styles.successTitle}>
                {tc("Order Tracking Submitted!")}
              </Text>
              <Text style={styles.successBody}>
                {tc("You can track the result on order transaction in wallet.")}
              </Text>
              <View style={styles.successActions}>
                <Link asChild href="/wallet">
                  <MotionPressable
                    onPress={() => setSubmittedOpen(false)}
                    pressScale={0.98}
                    style={styles.successOutlineButton}
                  >
                    <Text style={styles.successOutlineButtonText}>
                      {tc("Go to Wallet")}
                    </Text>
                  </MotionPressable>
                </Link>
                <Link asChild href="/brand">
                  <MotionPressable
                    onPress={() => setSubmittedOpen(false)}
                    pressScale={0.98}
                    style={styles.successPrimaryButton}
                  >
                    <Text style={styles.successPrimaryButtonText}>
                      {tc("Shop More!")}
                    </Text>
                  </MotionPressable>
                </Link>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function MissingOrdersFormSection({
  children,
  section,
}: {
  children: ReactNode;
  section: MissingOrdersSection;
}) {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{tc(section.title)}</Text>
        <Text style={styles.sectionHelp}>{tc(section.help)}</Text>
      </View>
      <View style={styles.fieldStack}>{children}</View>
    </View>
  );
}

// Outlined text input with a MUI-style floating label (web parity): the label sits as the
// placeholder when empty + unfocused, and floats onto the border once focused or filled.
function MissingOrdersTextField({
  helper,
  keyboardType,
  label,
  multiline,
  onChangeText,
  readOnly,
  required,
  value,
}: {
  helper: string;
  keyboardType?: "decimal-pad" | "default";
  label: string;
  multiline?: boolean;
  onChangeText?: (text: string) => void;
  readOnly?: boolean;
  required?: boolean;
  value: string;
}) {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const [focused, setFocused] = useState(false);
  const labelText = `${tc(label)}${required ? " *" : ""}`;
  const floated = focused || value.length > 0;
  return (
    <View style={styles.fieldGroup}>
      <View
        style={[
          styles.inputBox,
          multiline ? styles.inputBoxMultiline : null,
          focused ? styles.inputBoxFocused : null,
        ]}
      >
        {floated ? (
          <Text
            style={[
              styles.floatLabel,
              focused ? styles.floatLabelFocused : null,
            ]}
          >
            {labelText}
          </Text>
        ) : null}
        <TextInput
          editable={!readOnly}
          keyboardType={keyboardType ?? "default"}
          multiline={multiline}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          placeholder={floated ? "" : labelText}
          placeholderTextColor={colors.muted}
          style={[
            styles.fieldInput,
            multiline ? styles.fieldInputMultiline : null,
          ]}
          value={value}
        />
      </View>
      <Text style={styles.fieldHelper}>{tc(helper)}</Text>
    </View>
  );
}

// User ID is read-only + masked; the eye toggle reveals/hides the real id (web parity).
function MissingOrdersUserIdField({
  helper,
  label,
  userId,
}: {
  helper: string;
  label: string;
  userId: string;
}) {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.inputBox}>
        <Text style={styles.floatLabel}>{tc(label)}</Text>
        <Text style={styles.fieldInput}>{revealed ? userId : "******"}</Text>
        <Pressable
          accessibilityLabel={
            revealed ? tc("Hide user ID") : tc("Show user ID")
          }
          accessibilityRole="button"
          accessibilityState={{ selected: revealed }}
          hitSlop={8}
          onPress={() => setRevealed((value) => !value)}
          style={styles.eyeButton}
        >
          <EyeIcon
            color={revealed ? colors.primaryDark : colors.muted}
            size={20}
            strokeWidth={typography.iconStrokeWidth}
          />
        </Pressable>
      </View>
      <Text style={styles.fieldHelper}>{tc(helper)}</Text>
    </View>
  );
}

// Outlined select field that opens the store dropdown (web parity: a <Select> with a caret).
function MissingOrdersSelectField({
  disabled = false,
  helper,
  label,
  onMeasure,
  onOpen,
  open,
  required,
  value,
}: {
  disabled?: boolean;
  helper: string;
  label: string;
  onMeasure: (rect: LayoutRectangle) => void;
  onOpen: () => void;
  open: boolean;
  required?: boolean;
  value: string;
}) {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const ref = useRef<View>(null);
  const labelText = `${tc(label)}${required ? " *" : ""}`;
  const floated = open || value.length > 0;
  const handlePress = () => {
    if (disabled) return;
    // Open immediately, then anchor the menu under the field once measured (best-effort).
    onOpen();
    ref.current?.measureInWindow((x, y, fieldWidth, fieldHeight) =>
      onMeasure({ height: fieldHeight, width: fieldWidth, x, y }),
    );
  };
  return (
    <View style={styles.fieldGroup}>
      <Pressable
        accessibilityState={{ disabled }}
        accessibilityRole="button"
        disabled={disabled}
        onPress={handlePress}
        ref={ref}
        style={[
          styles.inputBox,
          open ? styles.inputBoxFocused : null,
          disabled ? styles.disabledButton : null,
        ]}
      >
        {floated ? (
          <Text
            style={[styles.floatLabel, open ? styles.floatLabelFocused : null]}
          >
            {labelText}
          </Text>
        ) : null}
        <Text
          style={[styles.fieldInput, value ? null : styles.fieldPlaceholder]}
        >
          {value || (floated ? "" : labelText)}
        </Text>
        <ChevronDownIcon
          color={colors.muted}
          size={20}
          strokeWidth={typography.iconStrokeWidth}
        />
      </Pressable>
      <Text style={styles.fieldHelper}>{tc(helper)}</Text>
    </View>
  );
}

// Outlined date field — the label always floats (the field always shows a dd/mm/yyyy slot,
// web shrink). Wraps the shared BirthDateField (browser <input type="date"> / native picker).
function MissingOrdersDateField({
  helper,
  label,
  onChange,
  required,
  value,
}: {
  helper: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const tc = useCopy();
  const [focused, setFocused] = useState(false);
  const labelText = `${tc(label)}${required ? " *" : ""}`;
  return (
    <View style={styles.fieldGroup}>
      <View style={[styles.inputBox, focused ? styles.inputBoxFocused : null]}>
        <Text
          style={[styles.floatLabel, focused ? styles.floatLabelFocused : null]}
        >
          {labelText}
        </Text>
        <BirthDateField
          accessibilityLabel={tc(label)}
          maxToday
          onBlur={() => setFocused(false)}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          value={value}
        />
      </View>
      <Text style={styles.fieldHelper}>{tc(helper)}</Text>
    </View>
  );
}

// Dashed attachment uploader (web parity): label* + hint + an outlined "Add images" button.
function MissingOrdersAttachmentField({
  attachments,
  helper,
  label,
  onAdd,
  onRemove,
}: {
  attachments: readonly MissingOrderImage[];
  helper: string;
  label: string;
  onAdd: (images: MissingOrderImage[]) => void;
  onRemove: (id: string) => void;
}) {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.attachmentBox}>
      <Text style={styles.attachmentLabel}>
        {tc(label)} <Text style={styles.attachmentRequired}>*</Text>
      </Text>
      <Text style={styles.attachmentHint}>{tc(helper)}</Text>
      <Pressable
        accessibilityLabel={tc("Add images")}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => pickMissingOrderImages(onAdd)}
        style={styles.attachmentButton}
      >
        <ImageIcon
          color="#00AA80"
          size={20}
          strokeWidth={typography.iconStrokeWidth}
        />
        <Text style={styles.attachmentButtonText}>{tc("Add images")}</Text>
      </Pressable>
      {attachments.length > 0 ? (
        <View style={styles.attachmentChips}>
          {attachments.map((image) => (
            <View key={image.id} style={styles.attachmentChip}>
              {image.uri ? (
                <Image
                  alt=""
                  resizeMode="cover"
                  source={{ uri: image.uri }}
                  style={styles.attachmentThumb}
                />
              ) : null}
              <Text numberOfLines={1} style={styles.attachmentChipName}>
                {image.name}
              </Text>
              <Pressable
                accessibilityLabel={`${tc("Remove")} ${image.name}`}
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => onRemove(image.id)}
                style={styles.attachmentRemove}
              >
                <Text style={styles.attachmentRemoveText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MissingOrdersClaimHistory() {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const tc = useCopy();
  const env = getMobileEnv();
  const enabled = env.accountDataSource === "backend" && Boolean(env.apiUrl);
  const query = useQuery({
    enabled,
    queryFn: () =>
      listMissingOrders({ apiUrl: env.apiUrl, limit: 10, page: 1 }),
    queryKey: missingOrderHistoryQueryKey(env.apiUrl),
    retry: false,
  });

  if (!enabled) return null;

  return (
    <View style={styles.claimHistoryPanel}>
      <View style={styles.claimHistoryHeader}>
        <Text style={styles.claimHistoryTitle}>
          {tc("Your missing conversions")}
        </Text>
        <Text style={styles.claimHistoryIntro}>
          {tc(
            "Track the support status of claims submitted from your account.",
          )}
        </Text>
      </View>
      {query.isPending ? (
        <CustomerRouteState
          body="Fetching your latest submitted claims."
          embedded
          title="Loading missing conversions"
          variant="loading"
        />
      ) : query.isError ? (
        <CustomerRouteState
          action={{
            accessibilityLabel: "Retry claim history",
            label: "Try again",
            onPress: () => void query.refetch(),
          }}
          body={formatMissingOrderApiError(query.error)}
          embedded
          title="We could not load missing conversions"
          variant="error"
        />
      ) : !query.data || query.data.data.length === 0 ? (
        <CustomerRouteState
          body="Claims you submit will appear here with their review status."
          embedded
          title="No missing conversions yet"
          variant="empty"
        />
      ) : (
        <View style={styles.claimHistoryList}>
          {query.data.data.map((claim) => (
            <MissingOrderClaimCard claim={claim} key={claim.id} />
          ))}
        </View>
      )}
    </View>
  );
}

function MissingOrderClaimCard({
  claim,
}: {
  claim: CustomerMissingOrderClaim;
}) {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.claimCard}>
      <View style={styles.claimCardHeader}>
        <View style={styles.claimCardIdentity}>
          <Text style={styles.claimMerchant}>
            {claim.merchantName || tc("Merchant")}
          </Text>
          <Text style={styles.claimOrderId}>{claim.orderId}</Text>
        </View>
        <View style={styles.claimStatusBadge}>
          <Text style={styles.claimStatusText}>
            {tc(formatMissingOrderStatus(claim.status))}
          </Text>
        </View>
      </View>
      <View style={styles.claimMetaRow}>
        <Text style={styles.claimMetaText}>
          {claim.orderAmount.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}{" "}
          {claim.currency}
        </Text>
        <Text style={styles.claimMetaText}>
          {claim.purchaseDate.slice(0, 10)}
        </Text>
      </View>
    </View>
  );
}

function MissingOrdersQuickCards() {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const { width } = useWindowDimensions();
  const desktop = width >= mobileShellLayout.desktopBreakpoint;

  return (
    <View style={styles.quickCardsGrid}>
      {webMissingOrdersPage.quickCards.map((card) => (
        <MissingOrdersQuickCard
          card={card}
          desktop={desktop}
          key={card.accent}
        />
      ))}
    </View>
  );
}

function MissingOrdersQuickCard({
  card,
  desktop,
}: {
  card: MissingOrdersQuickCard;
  desktop: boolean;
}) {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const tc = useCopy();
  return (
    <MotionPressable
      accessibilityLabel={`${tc(card.title)} ${tc(card.accent)}`}
      accessibilityRole="link"
      pressScale={0.99}
      style={[styles.quickCard, desktop ? styles.quickCardDesktop : null]}
    >
      <View style={[styles.quickCardArt, quickCardArtGradient]}>
        {renderQuickCardIcon(card.icon, desktop ? 42 : 36)}
      </View>
      <View style={styles.quickCardCopy}>
        <Text style={styles.quickCardTitle}>{tc(card.title)}</Text>
        <Text style={styles.quickCardAccent}>{tc(card.accent)}</Text>
      </View>
    </MotionPressable>
  );
}

function MissingOrdersFaqSection() {
  const styles = useThemedStyles(createMissingOrdersScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  // Web parity: the FAQ is an Accordion (first item expanded by default); tapping a
  // question toggles its answer and flips the chevron.
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <View style={styles.faqSection}>
      <Text style={styles.faqTitle}>{tc(webMissingOrdersPage.faqTitle)}</Text>
      <View style={styles.faqStack}>
        {webMissingOrdersPage.faqs.map((faq, index) => {
          const open = index === openIndex;
          return (
            <View key={faq.question} style={styles.faqCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setOpenIndex(open ? -1 : index)}
                style={styles.faqQuestionRow}
              >
                <HelpIcon
                  color={colors.primaryDark}
                  size={21}
                  strokeWidth={typography.iconStrokeWidth}
                />
                <Text style={styles.faqQuestion}>{tc(faq.question)}</Text>
                <View style={open ? styles.faqChevronOpen : null}>
                  <ChevronDownIcon
                    color={colors.ink}
                    size={16}
                    strokeWidth={typography.iconStrokeWidth}
                  />
                </View>
              </Pressable>
              {open ? (
                <Text style={styles.faqAnswer}>{tc(faq.answer)}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function renderQuickCardIcon(
  icon: MissingOrdersQuickCard["icon"],
  size: number,
): ReactNode {
  const { colors } = useTheme();
  const iconProps = {
    color: colors.primaryDark,
    size,
    strokeWidth: 1.55,
  };

  switch (icon) {
    case "guide":
      return <GuideIcon {...iconProps} />;
    case "shopping":
      return <ShoppingIcon {...iconProps} />;
    case "support":
      return <SupportIcon {...iconProps} />;
  }
}

// Web-only radial gradient for the quick-card art (mint→white→grey wash, web parity).
// Ignored on native, where the solid quickCardArt backgroundColor stands in.
const quickCardArtGradient = {
  backgroundImage:
    "radial-gradient(ellipse at top right, rgba(0,204,153,0.35) 0%, rgba(255,255,255,0.95) 55%, rgb(217,217,217) 100%)",
} as unknown as ViewStyle;

function createMissingOrdersScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
    surface: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      boxShadow: shadows.cardCss,
      overflow: "hidden",
      width: "100%",
    },
    missingOrdersSurfaceBleed: {
      marginHorizontal: -8,
      marginTop: 18,
    },
    topBar: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    topBarTitle: {
      color: colors.accent,
      fontFamily: typography.family,
      fontSize: 18,
      fontWeight: "600",
    },
    content: {
      gap: 18,
      paddingBottom: 30,
      paddingHorizontal: 18,
      paddingTop: 24,
    },
    formPanel: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 18,
      padding: 16,
    },
    formHeader: {
      gap: 14,
    },
    formHeaderCopy: {
      gap: 6,
    },
    formTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 22,
      fontWeight: "600",
      lineHeight: 30,
    },
    formIntro: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 13,
      lineHeight: 20,
    },
    headerActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    outlineButton: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: "#06C755",
      borderRadius: radii.md,
      borderWidth: 1.5,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 18,
    },
    disabledButton: {
      borderColor: "rgba(152, 152, 152, 0.45)",
    },
    outlineButtonText: {
      color: "#06C755",
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "600",
    },
    disabledButtonText: {
      color: colors.muted,
    },
    lineButton: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: "#06C755",
      borderRadius: radii.md,
      borderWidth: 1.5,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 18,
    },
    lineButtonText: {
      color: "#06C755",
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "600",
    },
    sectionStack: {
      gap: 16,
    },
    formSection: {
      backgroundColor: colors.fieldMuted,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: 14,
      padding: 14,
    },
    sectionHeader: {
      gap: 5,
    },
    sectionTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 22,
    },
    sectionHelp: {
      color: "#656565",
      fontFamily: typography.family,
      fontSize: 13,
      lineHeight: 19,
    },
    fieldStack: {
      gap: 16,
    },
    fieldGroup: {
      gap: 6,
    },
    inputBox: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: "row",
      gap: 8,
      minHeight: 56,
      paddingHorizontal: 12,
      position: "relative",
    },
    inputBoxMultiline: {
      alignItems: "flex-start",
      minHeight: 92,
      paddingVertical: 10,
    },
    inputBoxFocused: {
      borderColor: colors.primary,
    },
    floatLabel: {
      backgroundColor: colors.card,
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 12,
      left: 8,
      paddingHorizontal: 4,
      position: "absolute",
      top: -8,
      zIndex: 1,
    },
    floatLabelFocused: {
      color: colors.primaryDark,
    },
    fieldInput: {
      color: colors.ink,
      flex: 1,
      fontFamily: typography.family,
      fontSize: 16,
      outlineColor: "transparent",
      outlineWidth: 0,
      paddingVertical: 0,
    },
    fieldInputMultiline: {
      minHeight: 64,
      paddingTop: 4,
      textAlignVertical: "top",
    },
    fieldPlaceholder: {
      color: colors.muted,
    },
    eyeButton: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 32,
      minWidth: 32,
      outlineColor: "transparent",
      outlineWidth: 0,
    },
    attachmentBox: {
      backgroundColor: colors.card,
      borderColor: "#D4D4D4",
      borderRadius: 12,
      borderStyle: "dashed",
      borderWidth: 1,
      gap: 8,
      padding: 14,
    },
    attachmentLabel: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 15,
      fontWeight: "600",
    },
    attachmentRequired: {
      color: colors.danger,
    },
    attachmentHint: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 12,
      lineHeight: 17,
    },
    attachmentButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      borderColor: "#00CC99",
      borderRadius: 16,
      borderWidth: 1.5,
      flexDirection: "row",
      gap: 8,
      minHeight: 44,
      outlineColor: "transparent",
      outlineWidth: 0,
      paddingHorizontal: 16,
    },
    attachmentButtonText: {
      color: "#00AA80",
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "600",
    },
    dropdownRoot: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      padding: 24,
    },
    dropdownBackdrop: {
      backgroundColor: "rgba(0, 0, 0, 0.35)",
      bottom: 0,
      left: 0,
      outlineColor: "transparent",
      outlineWidth: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    dropdownMenu: {
      backgroundColor: colors.card,
      borderRadius: 16,
      boxShadow: shadows.cardCss,
      maxWidth: 360,
      padding: 8,
      width: "100%",
    },
    dropdownTitle: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 12,
      fontWeight: "600",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    dropdownOption: {
      alignItems: "center",
      borderRadius: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 44,
      outlineColor: "transparent",
      outlineWidth: 0,
      paddingHorizontal: 12,
    },
    dropdownOptionText: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 16,
    },
    dropdownOptionTextSelected: {
      color: colors.primaryDark,
      fontWeight: "700",
    },
    fieldHelper: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 11,
      lineHeight: 16,
    },
    bulletPanel: {
      gap: 8,
    },
    bulletRow: {
      flexDirection: "row",
      gap: 8,
    },
    bulletDot: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 14,
      lineHeight: 19,
    },
    bulletText: {
      color: "#656565",
      flex: 1,
      fontFamily: typography.family,
      fontSize: 12,
      lineHeight: 19,
    },
    submitError: {
      color: colors.danger,
      fontFamily: typography.family,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 18,
    },
    formFooter: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      flexDirection: "column",
      gap: 10,
      paddingTop: 16,
    },
    formFooterDesktop: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    submitButton: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 999,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 24,
    },
    submitButtonDesktop: {
      minWidth: 200,
    },
    submitButtonText: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: 15,
      fontWeight: "700",
    },
    claimHistoryPanel: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 16,
      padding: 16,
    },
    claimHistoryHeader: {
      gap: 4,
    },
    claimHistoryTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 20,
      fontWeight: "700",
    },
    claimHistoryIntro: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 13,
      lineHeight: 19,
    },
    claimHistoryList: {
      gap: 10,
    },
    claimCard: {
      backgroundColor: colors.fieldMuted,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: 10,
      padding: 14,
    },
    claimCardHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    claimCardIdentity: {
      flex: 1,
      gap: 3,
    },
    claimMerchant: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 15,
      fontWeight: "700",
    },
    claimOrderId: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 12,
    },
    claimStatusBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    claimStatusText: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 12,
      fontWeight: "700",
    },
    claimMetaRow: {
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    claimMetaText: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 12,
    },
    quickCardsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    quickCard: {
      backgroundColor: colors.card,
      borderColor: "rgba(59, 59, 59, 0.5)",
      borderRadius: radii.md,
      borderWidth: 1,
      flexBasis: "100%",
      flexGrow: 1,
      minHeight: 148,
      overflow: "hidden",
    },
    quickCardDesktop: {
      flexBasis: "30%",
    },
    quickCardArt: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      borderBottomColor: "rgba(0, 170, 128, 0.12)",
      borderBottomWidth: 1,
      height: 72,
      justifyContent: "center",
    },
    quickCardCopy: {
      alignItems: "center",
      flex: 1,
      gap: 2,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    quickCardTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 15,
      fontWeight: "400",
      lineHeight: 20,
      textAlign: "center",
    },
    quickCardAccent: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 20,
      fontWeight: "600",
      lineHeight: 25,
      textAlign: "center",
    },
    faqSection: {
      alignItems: "center",
      gap: 14,
      width: "100%",
    },
    faqTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 20,
      fontWeight: "600",
      lineHeight: 28,
      textAlign: "center",
    },
    faqStack: {
      gap: 8,
      maxWidth: 948,
      width: "100%",
    },
    faqCard: {
      backgroundColor: colors.card,
      borderBottomColor: "#B7E7DB",
      borderBottomWidth: 1,
      boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    faqQuestionRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    faqQuestion: {
      color: colors.ink,
      flex: 1,
      fontFamily: typography.family,
      fontSize: 15,
      fontWeight: "500",
      lineHeight: 21,
    },
    faqAnswer: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 13,
      lineHeight: 19,
      paddingLeft: 29,
      paddingTop: 8,
    },
    faqChevronOpen: {
      transform: [{ rotate: "180deg" }],
    },
    dropdownAnchoredMenu: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      boxShadow: shadows.cardCss,
      maxHeight: 320,
      overflow: "hidden",
      padding: 6,
      position: "absolute",
    },
    dropdownScroll: {
      flexGrow: 0,
    },
    dropdownMenuFallback: {
      left: 16,
      right: 16,
      top: 140,
    },
    attachmentChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
    },
    attachmentChip: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      maxWidth: "100%",
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    attachmentThumb: {
      borderRadius: 6,
      height: 28,
      width: 28,
    },
    attachmentChipName: {
      color: colors.ink,
      flexShrink: 1,
      fontFamily: typography.family,
      fontSize: 12,
    },
    attachmentRemove: {
      alignItems: "center",
      height: 18,
      justifyContent: "center",
      width: 18,
    },
    attachmentRemoveText: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 16,
      lineHeight: 18,
    },
    successRoot: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      flex: 1,
      justifyContent: "center",
      padding: 24,
    },
    successCard: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 24,
      gap: 16,
      maxWidth: 420,
      paddingHorizontal: 24,
      paddingVertical: 32,
      width: "100%",
    },
    successBadge: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 44,
      height: 88,
      justifyContent: "center",
      width: 88,
    },
    successTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 26,
      fontWeight: "700",
      lineHeight: 32,
      textAlign: "center",
    },
    successBody: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 15,
      lineHeight: 22,
      maxWidth: 360,
      textAlign: "center",
    },
    successActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "center",
      marginTop: 4,
    },
    successOutlineButton: {
      alignItems: "center",
      borderColor: colors.primary,
      borderRadius: 999,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 52,
      minWidth: 150,
      outlineColor: "transparent",
      outlineWidth: 0,
      paddingHorizontal: 20,
    },
    successOutlineButtonText: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: "600",
    },
    successPrimaryButton: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 999,
      justifyContent: "center",
      minHeight: 52,
      minWidth: 150,
      outlineColor: "transparent",
      outlineWidth: 0,
      paddingHorizontal: 20,
    },
    successPrimaryButtonText: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: "600",
    },
  });
}
