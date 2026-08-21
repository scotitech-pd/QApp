import * as Application from "expo-application";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors, fonts, radius, space } from "../theme";

export type LegalDoc = "privacy" | "terms" | "deletion";

type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

type Doc = { title: string; updated: string; blocks: Block[] };

const APP_VERSION = Application.nativeApplicationVersion ?? "1.0.0";
const CONTACT = "privacy@scotitech.com";

const DOCS: Record<LegalDoc, Doc> = {
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated 21 August 2026 · OnQ by Scotitech Solutions Limited",
    blocks: [
      { kind: "h", text: "What we collect" },
      {
        kind: "ul",
        items: [
          "To join a queue: your first name and mobile number, so the shop can call you and we can verify the number.",
          "If you sign in (optional): your name, email and profile picture from Google or Apple, used only to show your visit history and favourites.",
          "Location (optional): used on your device to sort salons by distance. We do not store your location history.",
          "Notifications (optional): a device push token so we can tell you when it is your turn.",
          "Visit records: which shop you joined, when, and any rating you leave. Shops see your first name and a masked number."
        ]
      },
      { kind: "h", text: "What we do not do" },
      {
        kind: "ul",
        items: [
          "We do not sell personal data.",
          "We do not show ads or share data with advertisers.",
          "We do not track you across other apps or websites."
        ]
      },
      { kind: "h", text: "Who can see your data" },
      {
        kind: "p",
        text: "The shop you queue at sees your first name, masked phone number and visit times. Our hosting providers process data on our behalf under contract. Nobody else."
      },
      { kind: "h", text: "Retention" },
      {
        kind: "p",
        text: "Queue records are kept so shops have honest service history. You can delete your account at any time from Me → Account → Delete account; personal details are removed and remaining records are anonymised."
      },
      { kind: "h", text: "Your rights" },
      { kind: "p", text: `You can access, correct or delete your data at any time. Contact ${CONTACT}.` },
      { kind: "h", text: "Children" },
      { kind: "p", text: "OnQ is not directed at children under 13 and we do not knowingly collect their data." }
    ]
  },
  terms: {
    title: "Terms of Use",
    updated: "Last updated 21 August 2026 · OnQ by Scotitech Solutions Limited",
    blocks: [
      { kind: "h", text: "The service" },
      {
        kind: "p",
        text: "OnQ lets you join a participating shop's queue from your phone and tells you when it is your turn. Shops run their own queues; OnQ is the messenger, not the barber."
      },
      { kind: "h", text: "Fair use" },
      {
        kind: "ul",
        items: [
          "Join a queue only when you intend to turn up. Repeated no-shows may lead a shop to decline your joins.",
          "Provide a real name and a mobile number you control.",
          "Do not attempt to disrupt queues, scrape data or misuse the service."
        ]
      },
      { kind: "h", text: "Wait times" },
      {
        kind: "p",
        text: "Estimated waits are estimates. Shops may run late, extend services or pause their queue. OnQ is not liable for time lost waiting."
      },
      { kind: "h", text: "Accounts" },
      {
        kind: "p",
        text: "Signing in is optional. You are responsible for activity under your account. You may delete your account at any time from the app."
      },
      { kind: "h", text: "Reviews" },
      { kind: "p", text: "Reviews come only from customers who completed a visit. Keep them honest and respectful." },
      { kind: "h", text: "Liability" },
      {
        kind: "p",
        text: "OnQ is provided \"as is\". To the extent permitted by law, Scotitech Solutions Limited is not liable for indirect or consequential loss arising from use of the service."
      },
      { kind: "h", text: "Contact" },
      { kind: "p", text: "hello@scotitech.com" }
    ]
  },
  deletion: {
    title: "Delete your account",
    updated: "Free and permanent",
    blocks: [
      { kind: "h", text: "In the app (instant)" },
      {
        kind: "ol",
        items: [
          "Go to the Me tab.",
          "Scroll to Account and tap Delete account.",
          "Confirm. Your name, email, phone, photo and sign-in links are removed immediately."
        ]
      },
      { kind: "h", text: "What is deleted and what is kept" },
      {
        kind: "ul",
        items: [
          "Deleted: name, email, phone number, profile picture, Google/Apple sign-in links, favourites, notification tokens.",
          "Anonymised and kept: queue visit records (date, shop, duration) so shops' service history stays accurate. They can no longer be linked to you."
        ]
      },
      { kind: "h", text: "By email" },
      { kind: "p", text: `Email ${CONTACT} from the address you signed in with. We complete requests within 7 days.` }
    ]
  }
};

function BackChevron() {
  return (
    <Svg fill="none" height={22} viewBox="0 0 24 24" width={22}>
      <Path d="M15 5l-7 7 7 7" stroke={colors.accent700} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </Svg>
  );
}

function Bullet() {
  return <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent, marginTop: 8, marginRight: space(3) }} />;
}

export function LegalScreen({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  const content = doc ? DOCS[doc] : null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={doc != null}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space(2),
            paddingHorizontal: space(4),
            paddingTop: space(5),
            paddingBottom: space(3),
            borderBottomWidth: 1,
            borderBottomColor: colors.dividerSoft
          }}
        >
          <Pressable
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [
              { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
              pressed && { opacity: 0.6 }
            ]}
          >
            <BackChevron />
          </Pressable>
          <Text style={{ fontFamily: fonts.heading, fontSize: 22, color: colors.text }}>{content?.title}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: space(12) }}>
          {content ? (
            <>
              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.neutral500, marginBottom: space(5) }}>
                {content.updated}
              </Text>
              {content.blocks.map((block, index) => {
                if (block.kind === "h") {
                  return (
                    <Text
                      key={index}
                      style={{ fontFamily: fonts.heading, fontSize: 17, color: colors.text, marginTop: index === 0 ? 0 : space(5), marginBottom: space(2) }}
                    >
                      {block.text}
                    </Text>
                  );
                }
                if (block.kind === "p") {
                  return (
                    <Text key={index} style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.ink2, marginBottom: space(2) }}>
                      {block.text}
                    </Text>
                  );
                }
                return (
                  <View key={index} style={{ gap: space(2), marginBottom: space(2) }}>
                    {block.items.map((item, itemIndex) => (
                      <View key={itemIndex} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                        {block.kind === "ol" ? (
                          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.accent700, marginRight: space(3), width: 18 }}>
                            {itemIndex + 1}.
                          </Text>
                        ) : (
                          <Bullet />
                        )}
                        <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.ink2 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: colors.neutral500, textAlign: "center", marginTop: space(8) }}>
                OnQ {APP_VERSION} · Scotitech Solutions Limited
              </Text>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
