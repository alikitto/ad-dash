// frontend/src/components/Tables/TablesTableRow.js

import React, { useState } from "react";
import { Avatar, Flex, Td, Text, Tr, Switch, useColorModeValue, Spinner, Image, Box, useToast, IconButton, Icon } from "@chakra-ui/react";
import { FaMagic, FaChartLine, FaExternalLinkAlt } from "react-icons/fa";
import AnalysisModal from "components/Tables/AnalysisModal";
import AdsetStatsModal from "components/Tables/AdsetStatsModal";
import { CLIENT_AVATARS } from "../../variables/clientAvatars.js";
import { API_BASE } from "../../config/api";

function resolveAvatar(adset) {
  if (!adset) return undefined;
  const id = adset.account_id || "";
  const name = adset.account_name || "";
  const candidates = [];
  if (id) {
    candidates.push(String(id));
    if (!String(id).startsWith("act_")) candidates.push(`act_${id}`);
  }
  if (name) candidates.push(String(name));
  for (const key of candidates) if (CLIENT_AVATARS[key]) return CLIENT_AVATARS[key];
  const lowerName = (name || "").toLowerCase();
  if (lowerName) {
      for (const key in CLIENT_AVATARS) if (key.toLowerCase() === lowerName) return CLIENT_AVATARS[key];
  }
  return undefined;
}

const shortObjective = (obj) => obj ? String(obj).toUpperCase().replace(/^OUTCOME_/, "").replace(/_/g, " ") : "—";
const fmtMoney = (v) => typeof v !== "number" || !isFinite(v) ? "$0.00" : `$${v.toFixed(2)}`;
const fmtPct = (v) => typeof v !== "number" || !isFinite(v) ? "0.00%" : `${v.toFixed(2)}%`;
const fmtNum = (v) => typeof v !== "number" || !isFinite(v) ? "0" : Number(v).toLocaleString("en-US");

function TablesTableRow(props) {
  const { adset, onStatusChange, isUpdating, datePreset } = props;
  const textColor = useColorModeValue("gray.800", "gray.800");
  const stickyBg = useColorModeValue("white", "white");
  const AD_ROW_BG = "#F7FAFC";
  const toast = useToast();

  const [expanded, setExpanded] = useState(false);
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [updatingAdId, setUpdatingAdId] = useState(null);
  const [isRowAnalyzing, setIsRowAnalyzing] = useState(false);
  const [rowAnalysisResult, setRowAnalysisResult] = useState(null);
  const [isRowModalOpen, setIsRowModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  
  const avatarSrc = resolveAvatar(adset);
  const ctrLinkClick = adset && adset.impressions > 0 ? (Number(adset.link_clicks || 0) / adset.impressions) * 100 : 0;
  const accountId = adset?.account_id ? String(adset.account_id) : "";
  const accountNumericId = accountId.replace(/^act_/, "");
  const adsManagerUrl = accountNumericId && adset?.adset_id
    ? `https://business.facebook.com/adsmanager/manage/campaigns?act=${accountNumericId}&selected_adsets=${adset.adset_id}&nav_entry_point=adsets_overview`
    : null;

  const toggleExpanded = async () => {
    if (!expanded && ads.length === 0) {
        setAdsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/adsets/${adset.adset_id}/ads?date_preset=${datePreset || "last_7d"}`);
            const data = await res.json();
            setAds(Array.isArray(data) ? data : []);
        } catch (e) { console.error("ads fetch error", e); } 
        finally { setAdsLoading(false); }
    }
    setExpanded((v) => !v);
  };
  
  // --- ИЗМЕНЕНА ЛОГИКА ОТПРАВКИ ДАННЫХ ---
  const handleRowAnalysis = async () => {
    setIsRowAnalyzing(true);
    setRowAnalysisResult(null);
    try {
      // Теперь мы отправляем весь объект adset
      const payload = { adset: adset }; 
      const response = await fetch(`${API_BASE}/api/analyze-adset-details`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Analysis failed");
      const result = await response.json();
      setRowAnalysisResult(result);
      setIsRowModalOpen(true);
    } catch (e) {
      toast({ title: "AI Analysis Error", description: e.message, status: "error", duration: 2500, position: "top" });
    } finally { setIsRowAnalyzing(false); }
  };

  const updateAdStatus = async (ad_id, curr) => {
    setUpdatingAdId(ad_id);
    try {
      const res = await fetch(`${API_BASE}/api/ads/${ad_id}/update-status`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: curr === "ACTIVE" ? "PAUSED" : "ACTIVE" }),
      });
      if (!res.ok) throw new Error("Update failed");
      setAds((prev) => prev.map((a) => a.ad_id === ad_id ? { ...a, status: curr === "ACTIVE" ? "PAUSED" : "ACTIVE" } : a));
      toast({ title: "Ad status updated", status: "success", duration: 1500, position: "top" });
    } catch (e) {
      toast({ title: "Couldn't update ad status", status: "error", duration: 2200, position: "top" });
    } finally { setUpdatingAdId(null); }
  };

  return (
    <>
      <Tr>
        <Td position="sticky" left="0" zIndex="1" bg={stickyBg} py={3}>
          <Flex align="flex-start" gap={3}>
            <Box as="button" onClick={toggleExpanded} lineHeight="1" fontSize="18px" w="20px" textAlign="center" mt="2px" color="gray.700">{expanded ? "▾" : "▸"}</Box>
            <Avatar size="sm" name={adset.account_name} src={avatarSrc} bg="gray.500" />
            <Flex direction="column" minW={0}>
              <Text fontSize="10px" textTransform="uppercase" color="gray.500" noOfLines={1}>{adset.account_name || "—"}</Text>
              <Text fontSize="sm" fontWeight="semibold" color={textColor} noOfLines={1} mt="1px">{adset.campaign_name || "—"}</Text>
              <Text fontSize="sm" color="gray.600" noOfLines={1} mt="1px">{adset.adset_name || "—"}</Text>
            </Flex>
          </Flex>
        </Td>
        <Td>{isUpdating ? <Spinner size="sm" /> : <Switch colorScheme="teal" isChecked={adset.status === "ACTIVE"} onChange={() => onStatusChange(adset.adset_id, adset.status === "ACTIVE" ? "PAUSED" : "ACTIVE")} />}</Td>
        <Td>
          <Flex gap={2} align="center">
            <IconButton 
              aria-label="Analyze Ad Set" 
              icon={<Icon as={FaMagic} />} 
              size="sm" 
              colorScheme="purple" 
              variant="solid" 
              onClick={handleRowAnalysis} 
              isLoading={isRowAnalyzing} 
            />
            <IconButton 
              aria-label="View Ad Set Statistics" 
              icon={<Icon as={FaChartLine} />} 
              size="sm" 
              colorScheme="blue" 
              variant="solid" 
              onClick={() => {
                console.log("Opening stats modal for adset:", adset.adset_name);
                setIsStatsModalOpen(true);
              }} 
            />
            {adsManagerUrl && (
              <IconButton
                as="a"
                href={adsManagerUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Открыть в кабинете"
                icon={<Icon as={FaExternalLinkAlt} />}
                size="sm"
                colorScheme="teal"
                variant="solid"
              />
            )}
          </Flex>
        </Td>
        <Td><Text fontSize="xs" color="gray.700">{shortObjective(adset.objective)}</Text></Td>
        <Td><Text fontSize="sm" color="gray.800">{fmtMoney(adset.spend)}</Text></Td>
        <Td><Text fontSize="sm" color="gray.800">{fmtNum(adset.impressions)}</Text></Td>
        <Td><Text fontSize="sm" color="gray.800">{adset.frequency?.toFixed(2)}</Text></Td>
        <Td><Text fontSize="sm" color="gray.800">{fmtNum(adset.leads)}</Text></Td>
        <Td><Text fontSize="sm" color="gray.800">{fmtMoney(adset.cpl)}</Text></Td>
        <Td><Text fontSize="sm" color="gray.800">{fmtMoney(adset.cpm)}</Text></Td>
        <Td><Text fontSize="sm" color="gray.800">{fmtPct(adset.ctr_all)}</Text></Td>
        <Td><Text fontSize="sm" color="gray.800">{fmtPct(ctrLinkClick)}</Text></Td>
        <Td><Text fontSize="sm" color="gray.800">{fmtNum(adset.link_clicks)}</Text></Td>
      </Tr>
      {expanded && (adsLoading ? (<Tr><Td colSpan={13}><Flex py={3} justify="center" align="center"><Spinner size="sm" mr={2} />Loading ads…</Flex></Td></Tr>) : ads.length === 0 ? (<Tr><Td colSpan={13}><Text color="gray.600" fontSize="sm" py={3} pl="68px">No ads found for this ad set.</Text></Td></Tr>) : (ads.map((ad) => (<Tr key={ad.ad_id} bg={AD_ROW_BG}><Td position="sticky" left="0" zIndex="1" py={2} bg="white"><Flex align="center" gap={3} pl="48px">{ad.thumbnail_url ? <Image src={ad.thumbnail_url} alt="" boxSize="32px" borderRadius="md" objectFit="cover" /> : <Avatar size="sm" name={ad.ad_name} />}<Text noOfLines={1} color="gray.800">{ad.ad_name}</Text></Flex></Td><Td>{updatingAdId === ad.ad_id ? <Spinner size="xs" /> : <Switch size="sm" colorScheme="teal" isChecked={ad.status === "ACTIVE"} onChange={() => updateAdStatus(ad.ad_id, ad.status)} />}</Td><Td></Td><Td><Text fontSize="xs" color="gray.700">—</Text></Td><Td color="gray.800">{fmtMoney(ad.spend)}</Td><Td color="gray.800">{fmtNum(ad.impressions)}</Td><Td color="gray.800">{ad.frequency?.toFixed(2)}</Td><Td color="gray.800">{fmtNum(ad.leads)}</Td><Td color="gray.800">{fmtMoney(ad.cpa)}</Td><Td color="gray.800">{fmtMoney(ad.cpm)}</Td><Td color="gray.800">{fmtPct(ad.ctr)}</Td><Td color="gray.800">{fmtPct(ad.ctr_link)}</Td><Td color="gray.800">{fmtNum(ad.link_clicks)}</Td></Tr>))))}
      {rowAnalysisResult && <AnalysisModal isOpen={isRowModalOpen} onClose={() => setIsRowModalOpen(false)} data={rowAnalysisResult} />}
      <AdsetStatsModal 
        isOpen={isStatsModalOpen} 
        onClose={() => setIsStatsModalOpen(false)} 
        adset={adset} 
      />
    </>
  );
}

export default TablesTableRow;
