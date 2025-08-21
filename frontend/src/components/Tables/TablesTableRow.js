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

function shortObjective(obj) {
  if (!obj) return "—";
  let s = String(obj).toUpperCase().trim();
  s = s.replace(/^OUTCOME_/, ""); // drop OUTCOME_
  s = s.replace(/_/g, " ");
  return s;
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

  const name = adset.adset_name || adset.name || "Untitled Ad Set";
  const subline = [adset.account_name, adset.campaign_name].filter(Boolean).join(" • ");

  return (
    <Tr>
      {/* LEFT sticky cell */}
      <Td position="sticky" left="0" zIndex="1" bg={stickyBg}>
        <Flex align="flex-start" gap={3}>
          <Avatar
            size="sm"
            name={adset.account_name || adset.campaign_name || adset.adset_name}
            bg="gray.500"
          />
          <Flex direction="column">
            <Text fontWeight="bold" color={textColor} noOfLines={2}>
              {name}
            </Text>
            {subline && (
              <Text fontSize="xs" color="gray.300" noOfLines={1}>
                {subline}
              </Text>
            )}
            {adset.objective && (
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {shortObjective(adset.objective)}
              </Text>
            )}
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

      {/* Objective (short & small) */}
      <Td>
        <Text fontSize="xs" color={textColor} noOfLines={1}>
          {shortObjective(adset.objective)}
        </Text>
      </Td>

      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.spend)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatNumber(adset.impressions)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatNumber(adset.frequency)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatNumber(leadsCount)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.cpl)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.cpm)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatPercentage(adset.ctr_all)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatPercentage(ctrLinkClick)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatNumber(adset.link_clicks)}</Text></Td>
    </Tr>
  );
}

export default TablesTableRow;
