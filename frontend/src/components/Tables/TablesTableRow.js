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
  IconButton,
} from "@chakra-ui/react";
import { ChevronRightIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { CLIENT_AVATARS } from "../../variables/clientAvatars";

// shorten objective for the Objective column
function shortObjective(obj) {
  if (!obj) return "—";
  let s = String(obj).toUpperCase().trim();
  s = s.replace(/^OUTCOME_/, "");
  s = s.replace(/_/g, " ");
  return s;
}

function candidateKeysFromAdset(adset) {
  const keys = new Set();
  const idStr = adset?.account_id ? String(adset.account_id) : "";
  const nameStr = adset?.account_name ? String(adset.account_name) : "";
  if (idStr) {
    keys.add(idStr);
    if (!idStr.startsWith("act_")) keys.add(`act_${idStr}`);
    keys.add(idStr.replace(/^act_/, ""));
  }
  if (nameStr) keys.add(nameStr);
  return Array.from(keys).filter(Boolean);
}
function resolveAvatar(adset) {
  if (adset?.avatarUrl) return adset.avatarUrl;
  for (const k of candidateKeysFromAdset(adset)) {
    if (Object.prototype.hasOwnProperty.call(CLIENT_AVATARS, k)) {
      return CLIENT_AVATARS[k];
    }
  }
  const name = (adset?.account_name || "").toLowerCase();
  for (const key of Object.keys(CLIENT_AVATARS)) {
    if (key.toLowerCase() === name) return CLIENT_AVATARS[key];
  }
  return undefined;
}

function TablesTableRow(props) {
  const { adset, onStatusChange, isUpdating, expanded, onToggleExpand } = props;
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
  const avatarSrc = resolveAvatar(adset);

  return (
    <Tr>
      {/* LEFT sticky cell: expand chevron + Account → Campaign → Ad Set */}
      <Td position="sticky" left="0" zIndex="1" bg={stickyBg} py={3}>
        <Flex align="flex-start" gap={3}>
          <IconButton
            aria-label={expanded ? "Collapse ads" : "Expand ads"}
            icon={expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            size="sm"
            variant="ghost"
            color="gray.200"
            onClick={onToggleExpand}
            minW="28px"
          />
          <Avatar size="sm" name={account} src={avatarSrc} bg="gray.500" />
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
