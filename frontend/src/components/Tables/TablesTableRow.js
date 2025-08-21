import React, { useState } from "react";
import {
  Avatar,
  Flex,
  Td,
  Text,
  Tr,
  Switch,
  useColorModeValue,
  Spinner,
  Image,
  Box,
  useToast,
} from "@chakra-ui/react";
import { CLIENT_AVATARS } from "../../variables/clientAvatars";

// ── helpers ─────────────────────────────────────────────────────────────────
function shortObjective(obj) {
  if (!obj) return "—";
  let s = String(obj).toUpperCase().trim();
  s = s.replace(/^OUTCOME_/, "");
  s = s.replace(/_/g, " ");
  return s;
}
const fmtMoney = (v) =>
  typeof v !== "number" || !isFinite(v) ? "$0.00" : `$${v.toFixed(2)}`;
const fmtPct = (v) =>
  typeof v !== "number" || !isFinite(v) ? "0.00%" : `${v.toFixed(2)}%`;
const fmtNum = (v) =>
  typeof v !== "number" || !isFinite(v) ? "0" : Number(v).toLocaleString("en-US");

function resolveAvatar(adset) {
  if (adset?.avatarUrl) return adset.avatarUrl;
  const id =
    adset?.account_id ??
    adset?.accountId ??
    adset?.ad_account_id ??
    adset?.account?.id ??
    adset?.account?.account_id ??
    "";
  const name =
    adset?.account_name ?? adset?.accountName ?? adset?.account?.name ?? "";

  const candidates = [];
  if (id) {
    candidates.push(String(id));
    if (!String(id).startsWith("act_")) candidates.push(`act_${id}`);
    candidates.push(String(id).replace(/^act_/, ""));
  }
  if (name) candidates.push(String(name));
  for (const k of candidates) if (CLIENT_AVATARS[k]) return CLIENT_AVATARS[k];
  const lower = (name || "").toLowerCase();
  for (const k of Object.keys(CLIENT_AVATARS))
    if (k.toLowerCase() === lower) return CLIENT_AVATARS[k];
  return undefined;
}

// ── component ───────────────────────────────────────────────────────────────
function TablesTableRow(props) {
  const { adset, onStatusChange, isUpdating, datePreset } = props;
  const textColor = useColorModeValue("white", "white");
  const stickyBg = useColorModeValue("#273b66", "#273b66"); // для первой колонки
  const AD_ROW_BG = "#21365f"; // фон строки объявлений (как на твоём примере)
  const toast = useToast();

  const [expanded, setExpanded] = useState(false);
  const [adsLoading, setAdsLoading] = useState(false);
  const [ads, setAds] = useState([]);
  const [updatingAdId, setUpdatingAdId] = useState(null);

  const leadsCount = adset.leads ?? adset.results ?? 0;
  const ctrLinkClick =
    adset && adset.impressions > 0
      ? (Number(adset.link_clicks || 0) / adset.impressions) * 100
      : 0;

  const account = adset.account_name || "—";
  const campaign = adset.campaign_name || "—";
  const adsetName = adset.adset_name || adset.name || "Untitled Ad Set";
  const avatarSrc = resolveAvatar(adset);

  const fetchAds = async () => {
    setAdsLoading(true);
    try {
      const res = await fetch(
        `https://ad-dash-backend-production.up.railway.app/api/adsets/${adset.adset_id}/ads?date_preset=${datePreset || "last_7d"}`
      );
      const data = await res.json();
      setAds(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("ads fetch error", e);
    } finally {
      setAdsLoading(false);
    }
  };

  const toggleExpanded = async () => {
    if (!expanded && ads.length === 0) await fetchAds();
    setExpanded((v) => !v);
  };

  const updateAdStatus = async (ad_id, curr) => {
    setUpdatingAdId(ad_id);
    try {
      const res = await fetch(
        `https://ad-dash-backend-production.up.railway.app/api/ads/${ad_id}/update-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: curr === "ACTIVE" ? "PAUSED" : "ACTIVE" }),
        }
      );
      if (!res.ok) throw new Error("Update failed");

      setAds((prev) =>
        prev.map((a) =>
          a.ad_id === ad_id ? { ...a, status: curr === "ACTIVE" ? "PAUSED" : "ACTIVE" } : a
        )
      );

      toast({
        title: "Ad status updated",
        status: "success",
        duration: 1500,
        isClosable: true,
        position: "top",
      });
    } catch (e) {
      toast({
        title: "Couldn't update ad status",
        status: "error",
        duration: 2200,
        isClosable: true,
        position: "top",
      });
    } finally {
      setUpdatingAdId(null);
    }
  };

  return (
    <>
      {/* основная строка ad set */}
      <Tr>
        {/* 1: стрелка + аватар + тексты (липкая колонка) */}
        <Td position="sticky" left="0" zIndex="1" bg={stickyBg} py={3}>
          <Flex align="flex-start" gap={3}>
            <Box
              as="button"
              onClick={toggleExpanded}
              lineHeight="1"
              fontSize="18px"
              color="white"
              w="20px"
              textAlign="center"
              mt="2px"
              aria-label={expanded ? "Collapse" : "Expand"}
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? "▾" : "▸"}
            </Box>
            <Avatar size="sm" name={account} src={avatarSrc} bg="gray.500" />
            <Flex direction="column" minW={0}>
              <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.6px" color="gray.300" noOfLines={1}>
                {account}
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color={textColor} noOfLines={1} mt="1px">
                {campaign}
              </Text>
              <Text fontSize="sm" color="gray.200" noOfLines={1} mt="1px">
                {adsetName}
              </Text>
            </Flex>
          </Flex>
        </Td>

        {/* 2: статус ad set */}
        <Td>
          {isUpdating ? (
            <Spinner size="sm" color="white" />
          ) : (
            <Switch
              colorScheme="teal"
              isChecked={adset.status === "ACTIVE"}
              onChange={() =>
                onStatusChange(adset.adset_id, adset.status === "ACTIVE" ? "PAUSED" : "ACTIVE")
              }
            />
          )}
        </Td>

        {/* 3: objective */}
        <Td><Text fontSize="xs" color={textColor} noOfLines={1}>{shortObjective(adset.objective)}</Text></Td>

        {/* метрики ad set */}
        <Td><Text fontSize="sm" color={textColor}>{fmtMoney(adset.spend)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtNum(adset.impressions)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtNum(adset.frequency)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtNum(leadsCount)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtMoney(adset.cpl)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtMoney(adset.cpm)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtPct(adset.ctr_all)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtPct(ctrLinkClick)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtNum(adset.link_clicks)}</Text></Td>
      </Tr>

      {/* строки объявлений: без заголовков, выровнены по тем же колонкам */}
      {expanded &&
        (adsLoading ? (
          <Tr>
            <Td colSpan={12}>
              <Flex py={3} justify="center" align="center">
                <Spinner size="sm" mr={2} />
                <Text color="gray.200">Loading ads…</Text>
              </Flex>
            </Td>
          </Tr>
        ) : ads.length === 0 ? (
          <Tr>
            <Td colSpan={12}>
              <Text color="gray.300" fontSize="sm" py={2}>No ads for this ad set.</Text>
            </Td>
          </Tr>
        ) : (
          ads.map((ad) => (
            <Tr key={ad.ad_id}>
              {/* 1: миниатюра + имя (сдвиг вправо для «вложенности») */}
              <Td position="sticky" left="0" zIndex="1" bg={AD_ROW_BG} py={2}>
                <Flex align="center" gap={3} pl="48px">
                  {ad.thumbnail_url ? (
                    <Image
                      src={ad.thumbnail_url}
                      alt=""
                      boxSize="32px"          // крупнее миниатюра
                      borderRadius="md"
                      objectFit="cover"
                      flex="0 0 auto"
                    />
                  ) : (
                    <Avatar size="sm" name={ad.ad_name} />
                  )}
                  <Text noOfLines={1}>{ad.ad_name}</Text>
                </Flex>
              </Td>

              {/* 2: статус ad + toast */}
              <Td bg={AD_ROW_BG}>
                {updatingAdId === ad.ad_id ? (
                  <Spinner size="xs" />
                ) : (
                  <Switch
                    size="sm"
                    colorScheme="teal"
                    isChecked={ad.status === "ACTIVE"}
                    onChange={() => updateAdStatus(ad.ad_id, ad.status)}
                  />
                )}
              </Td>

              {/* 3: objective для ads не показываем */}
              <Td bg={AD_ROW_BG}><Text fontSize="xs">—</Text></Td>

              {/* остальные метрики — та же последовательность колонок */}
              <Td bg={AD_ROW_BG}>{fmtMoney(ad.spend)}</Td>
              <Td bg={AD_ROW_BG}>{fmtNum(ad.impressions)}</Td>
              <Td bg={AD_ROW_BG}>{fmtNum(ad.frequency)}</Td>
              <Td bg={AD_ROW_BG}>{fmtNum(ad.leads)}</Td>
              <Td bg={AD_ROW_BG}>{fmtMoney(ad.cpa || 0)}</Td> {/* CPL */}
              <Td bg={AD_ROW_BG}>{fmtMoney(ad.cpm)}</Td>
              <Td bg={AD_ROW_BG}>{fmtPct(ad.ctr)}</Td>        {/* CTR (ALL) */}
              <Td bg={AD_ROW_BG}>{fmtPct(ad.ctr_link)}</Td>   {/* CTR (LINK) */}
              <Td bg={AD_ROW_BG}>{fmtNum(ad.link_clicks)}</Td>
            </Tr>
          ))
        ))}
    </>
  );
}

export default TablesTableRow;
