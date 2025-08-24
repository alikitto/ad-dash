// --- TablesTableRow.js (Full updated code) ---

import React, { useState } from "react";
import {
  Avatar, Flex, Td, Text, Tr, Switch, useColorModeValue, Spinner,
  Image, Box, useToast, IconButton, Icon
} from "@chakra-ui/react";
import { FaMagic } from "react-icons/fa";
import AnalysisModal from "components/Tables/AnalysisModal"; // Modal for analysis results

// ── helpers ─────────────────────────────────────────────────────────────────
const shortObjective = (obj) => obj ? String(obj).toUpperCase().replace(/^OUTCOME_/, "").replace(/_/g, " ") : "—";
const fmtMoney = (v) => typeof v !== "number" || !isFinite(v) ? "$0.00" : `$${v.toFixed(2)}`;
const fmtPct = (v) => typeof v !== "number" || !isFinite(v) ? "0.00%" : `${v.toFixed(2)}%`;
const fmtNum = (v) => typeof v !== "number" || !isFinite(v) ? "0" : Number(v).toLocaleString("en-US");

// ── component ───────────────────────────────────────────────────────────────
function TablesTableRow(props) {
  const { adset, onStatusChange, isUpdating, datePreset } = props;
  const textColor = useColorModeValue("white", "white");
  const stickyBg = useColorModeValue("#273b66", "#273b66");
  const AD_ROW_BG = "#21365f";
  const toast = useToast();

  const [expanded, setExpanded] = useState(false);
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [updatingAdId, setUpdatingAdId] = useState(null);

  // States for the individual row's AI analysis
  const [isRowAnalyzing, setIsRowAnalyzing] = useState(false);
  const [rowAnalysisResult, setRowAnalysisResult] = useState(null);
  const [isRowModalOpen, setIsRowModalOpen] = useState(false);

  const ctrLinkClick = adset && adset.impressions > 0 ? (Number(adset.link_clicks || 0) / adset.impressions) * 100 : 0;
  const account = adset.account_name || "—";
  const campaign = adset.campaign_name || "—";
  const adsetName = adset.adset_name || adset.name || "Untitled Ad Set";
  const avatarSrc = adset.avatarUrl;

  const fetchAds = async () => {
    if (ads.length > 0) return ads; // Return cached ads if already fetched
    setAdsLoading(true);
    try {
      const res = await fetch(`https://ad-dash-backend-production.up.railway.app/api/adsets/${adset.adset_id}/ads?date_preset=${datePreset || "last_7d"}`);
      const data = await res.json();
      const fetchedAds = Array.isArray(data) ? data : [];
      setAds(fetchedAds);
      return fetchedAds;
    } catch (e) {
      console.error("ads fetch error", e);
      return []; // Return empty on error
    } finally {
      setAdsLoading(false);
    }
  };

  const toggleExpanded = async () => {
    if (!expanded) await fetchAds();
    setExpanded((v) => !v);
  };

  const handleRowAnalysis = async () => {
    setIsRowAnalyzing(true);
    setRowAnalysisResult(null);
    try {
      const currentAds = await fetchAds(); // Ensure we have the ads
      if (currentAds.length === 0) {
        toast({ title: "No ads to analyze in this ad set.", status: "info", duration: 2000, position: "top" });
        return;
      }
      const payload = { adset: adset, ads: currentAds };
      const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/analyze-adset-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Analysis failed");
      const result = await response.json();
      setRowAnalysisResult(result);
      setIsRowModalOpen(true);
    } catch (e) {
      toast({ title: "AI Analysis Error", description: e.message, status: "error", duration: 2500, position: "top" });
    } finally {
      setIsRowAnalyzing(false);
    }
  };

  const updateAdStatus = async (ad_id, curr) => {
    setUpdatingAdId(ad_id);
    try {
      const res = await fetch(`https://ad-dash-backend-production.up.railway.app/api/ads/${ad_id}/update-status`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: curr === "ACTIVE" ? "PAUSED" : "ACTIVE" }),
      });
      if (!res.ok) throw new Error("Update failed");
      setAds((prev) => prev.map((a) => a.ad_id === ad_id ? { ...a, status: curr === "ACTIVE" ? "PAUSED" : "ACTIVE" } : a));
      toast({ title: "Ad status updated", status: "success", duration: 1500, position: "top" });
    } catch (e) {
      toast({ title: "Couldn't update ad status", status: "error", duration: 2200, position: "top" });
    } finally {
      setUpdatingAdId(null);
    }
  };

  return (
    <>
      <Tr>
        <Td position="sticky" left="0" zIndex="1" bg={stickyBg} py={3}>
          <Flex align="flex-start" gap={3}>
            <Box as="button" onClick={toggleExpanded} lineHeight="1" fontSize="18px" color="white" w="20px" textAlign="center" mt="2px">{expanded ? "▾" : "▸"}</Box>
            <Avatar size="sm" name={account} src={avatarSrc} bg="gray.500" />
            <Flex direction="column" minW={0}>
              <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.6px" color="gray.300" noOfLines={1}>{account}</Text>
              <Text fontSize="sm" fontWeight="semibold" color={textColor} noOfLines={1} mt="1px">{campaign}</Text>
              <Text fontSize="sm" color="gray.200" noOfLines={1} mt="1px">{adsetName}</Text>
            </Flex>
          </Flex>
        </Td>
        <Td>{isUpdating ? <Spinner size="sm" color="white" /> : <Switch colorScheme="teal" isChecked={adset.status === "ACTIVE"} onChange={() => onStatusChange(adset.adset_id, adset.status === "ACTIVE" ? "PAUSED" : "ACTIVE")} />}</Td>
        
        {/* New "Actions" Cell with AI button */}
        <Td>
          <IconButton
            aria-label="Analyze Ad Set"
            icon={<Icon as={FaMagic} />}
            size="sm"
            colorScheme="purple"
            variant="ghost"
            onClick={handleRowAnalysis}
            isLoading={isRowAnalyzing}
          />
        </Td>
        
        <Td><Text fontSize="xs" color={textColor} noOfLines={1}>{shortObjective(adset.objective)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtMoney(adset.spend)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtNum(adset.impressions)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{adset.frequency?.toFixed(3)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtNum(adset.leads)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtMoney(adset.cpl)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtMoney(adset.cpm)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtPct(adset.ctr_all)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtPct(ctrLinkClick)}</Text></Td>
        <Td><Text fontSize="sm" color={textColor}>{fmtNum(adset.link_clicks)}</Text></Td>
      </Tr>

      {expanded && (
        adsLoading ? (
          <Tr><Td colSpan={13}><Flex py={3} justify="center" align="center"><Spinner size="sm" mr={2} /><Text color="gray.200">Loading ads…</Text></Flex></Td></Tr>
        ) : ads.length === 0 ? (
          <Tr><Td colSpan={13}><Text color="gray.300" fontSize="sm" py={3} pl="68px">No ads found for this ad set.</Text></Td></Tr>
        ) : (
          ads.map((ad) => (
            <Tr key={ad.ad_id} bg={AD_ROW_BG}>
              <Td position="sticky" left="0" zIndex="1" py={2}>
                <Flex align="center" gap={3} pl="48px">
                  {ad.thumbnail_url ? <Image src={ad.thumbnail_url} alt="" boxSize="32px" borderRadius="md" objectFit="cover" /> : <Avatar size="sm" name={ad.ad_name} />}
                  <Text noOfLines={1}>{ad.ad_name}</Text>
                </Flex>
              </Td>
              <Td>{updatingAdId === ad.ad_id ? <Spinner size="xs" /> : <Switch size="sm" colorScheme="teal" isChecked={ad.status === "ACTIVE"} onChange={() => updateAdStatus(ad.ad_id, ad.status)} />}</Td>
              <Td></Td> {/* Empty cell for Actions column */}
              <Td><Text fontSize="xs">—</Text></Td>
              <Td>{fmtMoney(ad.spend)}</Td>
              <Td>{fmtNum(ad.impressions)}</Td>
              <Td>{ad.frequency?.toFixed(3)}</Td>
              <Td>{fmtNum(ad.leads)}</Td>
              <Td>{fmtMoney(ad.cpa)}</Td>
              <Td>{fmtMoney(ad.cpm)}</Td>
              <Td>{fmtPct(ad.ctr)}</Td>
              <Td>{fmtPct(ad.ctr_link)}</Td>
              <Td>{fmtNum(ad.link_clicks)}</Td>
            </Tr>
          ))
        )
      )}
      
      {/* Modal for this specific row's analysis */}
      {rowAnalysisResult && <AnalysisModal isOpen={isRowModalOpen} onClose={() => setIsRowModalOpen(false)} data={rowAnalysisResult} />}
    </>
  );
}

export default TablesTableRow;
