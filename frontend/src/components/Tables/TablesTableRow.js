import React from "react";
import {
  Avatar,
  Flex,
  Td,
  Text,
  Tr,
  Switch,
  useColorModeValue,
  Spinner,
} from "@chakra-ui/react";

// твой словарь: src/variables/clientAvatars.js
// export const CLIENT_AVATARS = { "act_284902192299330": "https://..." , ... }
import { CLIENT_AVATARS } from "../../variables/clientAvatars";

// --- utils ---
function shortObjective(obj) {
  if (!obj) return "—";
  let s = String(obj).toUpperCase().trim();
  s = s.replace(/^OUTCOME_/, "");
  s = s.replace(/_/g, " ");
  return s;
}

// строим список возможных ключей для словаря
function candidateKeysFromAdset(adset) {
  const keys = new Set();

  const rawId =
    adset?.account_id ??
    adset?.accountId ??
    adset?.ad_account_id ??
    adset?.account?.id ??
    adset?.account?.account_id ??
    "";

  const rawName =
    adset?.account_name ??
    adset?.accountName ??
    adset?.account?.name ??
    "";

  const idStr = rawId != null ? String(rawId) : "";
  const nameStr = rawName != null ? String(rawName) : "";

  if (idStr) {
    keys.add(idStr);                       // "2849..."
    if (!idStr.startsWith("act_")) keys.add(`act_${idStr}`); // "act_2849..."
    keys.add(idStr.replace(/^act_/, ""));  // "2849..." если пришло с act_
  }
  if (nameStr) {
    keys.add(nameStr);                     // точное имя
  }

  return Array.from(keys).filter(Boolean);
}

function resolveAvatar(adset) {
  // приоритет: прямой URL из бэка -> словарь по ключам -> словарь по имени (без регистра)
  if (adset?.avatarUrl) return { src: adset.avatarUrl, hit: "adset.avatarUrl" };

  const candidates = candidateKeysFromAdset(adset);
  for (const k of candidates) {
    if (Object.prototype.hasOwnProperty.call(CLIENT_AVATARS, k)) {
      return { src: CLIENT_AVATARS[k], hit: k };
    }
  }

  // case-insensitive по имени
  const name = (adset?.account_name ?? adset?.accountName ?? "").toLowerCase();
  if (name) {
    for (const k of Object.keys(CLIENT_AVATARS)) {
      if (k.toLowerCase() === name) {
        return { src: CLIENT_AVATARS[k], hit: `${k} (ci)` };
      }
    }
  }
  return { src: undefined, hit: "not-found" };
}

function TablesTableRow(props) {
  const { adset, onStatusChange, isUpdating } = props;
  const textColor = useColorModeValue("white", "white");
  const stickyBg = useColorModeValue("#273b66", "#273b66");

  const formatCurrency = (value) =>
    typeof value !== "number" || !isFinite(value) ? "$0.00" : `$${value.toFixed(2)}`;
  const formatPercentage = (value) =>
    typeof value !== "number" || !isFinite(value) ? "0.00%" : `${value.toFixed(2)}%`;
  const formatNumber = (value) =>
    typeof value !== "number" || !isFinite(value) ? "0" : value.toLocaleString("en-US");

  const ctrLinkClick =
    adset && adset.impressions > 0 ? (Number(adset.link_clicks || 0) / adset.impressions) * 100 : 0;

  const leadsCount = adset.leads ?? adset.results ?? 0;

  const account = adset.account_name || "—";
  const campaign = adset.campaign_name || "—";
  const adsetName = adset.adset_name || adset.name || "Untitled Ad Set";

  const { src: avatarSrc, hit } = resolveAvatar(adset);

  // дебаг в консоль — посмотри что реально подставилось
  /* eslint-disable no-console */
  console.debug("[avatar]", {
    account_id: adset?.account_id,
    account_name: adset?.account_name,
    used_key: hit,
    src: avatarSrc,
  });
  /* eslint-enable no-console */

  return (
    <Tr>
      {/* LEFT sticky cell: Account → Campaign → Ad Set */}
      <Td position="sticky" left="0" zIndex="1" bg={stickyBg} py={3}>
        <Flex align="flex-start" gap={3}>
          <Avatar
            size="sm"
            name={account}
            src={avatarSrc}
            bg="gray.500"
            title={`avatar: ${hit}`}
            onError={(e) => {
              // покажем в консоли, если картинка не загрузилась (404/403 и т.д.)
              console.debug("avatar load error:", e?.currentTarget?.src);
              e.currentTarget.src = ""; // вернётся к инициалам
            }}
          />
          <Flex direction="column" minW={0}>
            <Text
              fontSize="10px"
              textTransform="uppercase"
              letterSpacing="0.6px"
              color="gray.300"
              noOfLines={1}
            >
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

      {/* STATUS right after left cell */}
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

      {/* Objective (short & compact) */}
      <Td>
        <Text fontSize="xs" color={textColor} noOfLines={1}>
          {shortObjective(adset.objective)}
        </Text>
      </Td>

      <Td><Text fontSize="sm" color={textColor}>{formatCurrency(adset.spend)}</Text></Td>
      <Td><Text fontSize="sm" color={textColor}>{formatNumber(adset.impressions)}</Text></Td>
      <Td><Text fontSize="sm" color={textColor}>{formatNumber(adset.frequency)}</Text></Td>
      <Td><Text fontSize="sm" color={textColor}>{formatNumber(leadsCount)}</Text></Td>
      <Td><Text fontSize="sm" color={textColor}>{formatCurrency(adset.cpl)}</Text></Td>
      <Td><Text fontSize="sm" color={textColor}>{formatCurrency(adset.cpm)}</Text></Td>
      <Td><Text fontSize="sm" color={textColor}>{formatPercentage(adset.ctr_all)}</Text></Td>
      <Td><Text fontSize="sm" color={textColor}>{formatPercentage(ctrLinkClick)}</Text></Td>
      <Td><Text fontSize="sm" color={textColor}>{formatNumber(adset.link_clicks)}</Text></Td>
    </Tr>
  );
}

export default TablesTableRow;
