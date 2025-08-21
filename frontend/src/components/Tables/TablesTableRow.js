import React, { useState } from "react";
import {
  Avatar, Flex, Td, Text, Tr, Switch, useColorModeValue, Spinner, Box, Table, Tbody, Th, Thead, IconButton, Image
} from "@chakra-ui/react";
import { ChevronRightIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { CLIENT_AVATARS } from "../../variables/clientAvatars";

// --- utils (из твоего файла) ---
function shortObjective(obj) {
  if (!obj) return "—";
  let s = String(obj).toUpperCase().trim();
  s = s.replace(/^OUTCOME_/, "");
  s = s.replace(/_/g, " ");
  return s;
}
function candidateKeysFromAdset(adset) {
  const keys = new Set();
  const rawId = adset?.account_id ?? adset?.accountId ?? adset?.ad_account_id ?? adset?.account?.id ?? adset?.account?.account_id ?? "";
  const rawName = adset?.account_name ?? adset?.accountName ?? adset?.account?.name ?? "";
  const idStr = rawId != null ? String(rawId) : "";
  const nameStr = rawName != null ? String(rawName) : "";
  if (idStr) {
    keys.add(idStr);
    if (!idStr.startsWith("act_")) keys.add(`act_${idStr}`);
    keys.add(idStr.replace(/^act_/, ""));
  }
  if (nameStr) keys.add(nameStr);
  return Array.from(keys).filter(Boolean);
}
function resolveAvatar(adset) {
  if (adset?.avatarUrl) return { src: adset.avatarUrl, hit: "adset.avatarUrl" };
  const candidates = candidateKeysFromAdset(adset);
  for (const k of candidates) {
    if (Object.prototype.hasOwnProperty.call(CLIENT_AVATARS, k)) {
      return { src: CLIENT_AVATARS[k], hit: k };
    }
  }
  const name = (adset?.account_name ?? adset?.accountName ?? "").toLowerCase();
  if (name) {
    for (const k of Object.keys(CLIENT_AVATARS)) {
      if (k.toLowerCase() === name) return { src: CLIENT_AVATARS[k], hit: `${k} (ci)` };
    }
  }
  return { src: undefined, hit: "not-found" };
}

const fmt$ = (v) => (typeof v !== "number" || !isFinite(v) ? "$0.00" : `$${v.toFixed(2)}`);
const fmt% = (v) => (typeof v !== "number" || !isFinite(v) ? "0.00%" : `${v.toFixed(2)}%`);
const fmtN = (v) => (typeof v !== "number" || !isFinite(v) ? "0" : Number(v).toLocaleString("en-US"));

function TablesTableRow(props) {
  const { adset, onStatusChange, isUpdating, datePreset } = props;
  const textColor = useColorModeValue("white", "white");
  const stickyBg = useColorModeValue("#273b66", "#273b66");
  const [expanded, setExpanded] = useState(false);
  const [adsLoading, setAdsLoading] = useState(false);
  const [ads, setAds] = useState([]);
  const [updatingAdId, setUpdatingAdId] = useState(null);

  const ctrLinkClick = adset && adset.impressions > 0 ? (Number(adset.link_clicks || 0) / adset.impressions) * 100 : 0;
  const leadsCount = adset.leads ?? adset.results ?? 0;
  const account = adset.account_name || "—";
  const campaign = adset.campaign_name || "—";
  const adsetName = adset.adset_name || adset.name || "Untitled Ad Set";
  const { src: avatarSrc } = resolveAvatar(adset);

  const toggleExpanded = async () => {
    if (!expanded && ads.length === 0) {
      setAdsLoading(true);
      try {
        const res = await fetch(
          `https://ad-dash-backend-production.up.railway.app/api/adsets/${adset.adset_id}/ads?date_preset=${datePreset || "last_7d"}`
        );
        const data = await res.json();
        setAds(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("ads fetch error", err);
      } finally {
        setAdsLoading(false);
      }
    }
    setExpanded((e) => !e);
  };

  const updateAdStatus = async (ad_id, current) => {
    setUpdatingAdId(ad_id);
    try {
      const res = await fetch(
        `https://ad-dash-backend-production.up.railway.app/api/ads/${ad_id}/update-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: current === "ACTIVE" ? "PAUSED" : "ACTIVE" }),
        }
      );
      if (!res.ok) throw new Error("Update failed");
      setAds((prev) => prev.map(a => a.ad_id === ad_id ? { ...a, status: current === "ACTIVE" ? "PAUSED" : "ACTIVE" } : a));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingAdId(null);
    }
  };

  return (
    <>
      <Tr>
        {/* LEFT sticky cell: caret + Account → Campaign → Ad Set */}
        <Td position="sticky" left="0" zIndex="1" bg={stickyBg} py={3}>
          <Flex align="flex-start" gap={3}>
            <IconButton
              aria-label={expanded ? "Collapse" : "Expand"}
              size="xs"
              icon={expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
              onClick={toggleExpanded}
              variant="ghost"
              color="white"
              minW="24px"
            />
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

        {/* STATUS */}
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

        {/* Objective (short) */}
        <Td>
          <Text fontSize="xs" color={textColor} noOfLines={1}>
            {shortObjective(adset.objective)}
          </Text>
        </Td>

        <Td><Text fontSize="sm" color={textColor}>{fmt$(adset.spend)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtN(adset.impressions)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtN(adset.frequency)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtN(leadsCount)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmt$(adset.cpl)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmt$(adset.cpm)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmt%(adset.ctr_all)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmt%(ctrLinkClick)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtN(adset.link_clicks)}</Text></Td>
      </Tr>

      {/* EXPANDED ADS */}
      {expanded && (
        <Tr>
          <Td colSpan={12} p={0} bg="#21365f">
            <Box px={4} py={3}>
              {adsLoading ? (
                <Flex align="center" justify="center" py={4}>
                  <Spinner size="sm" mr={2}/> <Text fontSize="sm" color="gray.200">Loading ads...</Text>
                </Flex>
              ) : ads.length === 0 ? (
                <Text fontSize="sm" color="gray.300">No ads for this ad set.</Text>
              ) : (
                <Table variant="simple" color="#fff" size="sm" w="full" sx={{
                  tableLayout: "fixed",
                  "& th, & td": { borderRight: "1px solid rgba(255,255,255,0.10)" },
                  "& th:last-of-type, & td:last-of-type": { borderRight: "none" },
                }}>
                  <Thead>
                    <Tr>
                      <Th color="gray.300">AD</Th>
                      <Th color="gray.300">STATUS</Th>
                      <Th color="gray.300">OBJECTIVE</Th>
                      <Th color="gray.300">SPENT</Th>
                      <Th color="gray.300">IMPRESSIONS</Th>
                      <Th color="gray.300">FREQUENCY</Th>
                      <Th color="gray.300">LEADS (CPA)</Th>
                      <Th color="gray.300">CPL</Th>
                      <Th color="gray.300">CPM</Th>
                      <Th color="gray.300">CTR (ALL)</Th>
                      <Th color="gray.300">CTR (LINK)</Th>
                      <Th color="gray.300">LINK CLICKS</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {ads.map((ad) => (
                      <Tr key={ad.ad_id}>
                        <Td>
                          <Flex align="center" gap={3} minW={0}>
                            {ad.thumb ? (
                              <Image src={ad.thumb} alt="" boxSize="28px" borderRadius="md" objectFit="cover" />
                            ) : (
                              <Avatar size="xs" name={ad.ad_name} />
                            )}
                            <Text noOfLines={1}>{ad.ad_name}</Text>
                          </Flex>
                        </Td>
                        <Td>
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
                        <Td><Text fontSize="xs">—</Text></Td>
                        <Td>{fmt$(ad.spend)}</Td>
                        <Td>{fmtN(ad.impressions)}</Td>
                        <Td>{fmtN(ad.frequency)}</Td>
                        <Td>{fmtN(ad.leads)}</Td>
                        <Td>{fmt$(ad.cpa || 0)}</Td>
                        <Td>{fmt$(ad.cpm)}</Td>
                        <Td>{fmt%(ad.ctr_link)}</Td>
                        <Td>{fmt%(ad.link_clicks && ad.impressions ? (ad.link_clicks / ad.impressions) * 100 : 0)}</Td>
                        <Td>{fmtN(ad.link_clicks)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </Box>
          </Td>
        </Tr>
      )}
    </>
  );
}

export default TablesTableRow;
