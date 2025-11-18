// frontend/src/components/Tables/TablesTableRow.js

import React, { useState } from "react";
import { Avatar, Flex, Td, Text, Tr, Switch, useColorModeValue, Spinner, Image, Box, useToast, IconButton, Icon, Menu, MenuButton, MenuList, MenuItem, Tooltip } from "@chakra-ui/react";
import { FaChartLine, FaExternalLinkAlt, FaEllipsisV, FaMagic, FaCopy, FaStickyNote, FaFileExport, FaInfoCircle } from "react-icons/fa";
import AnalysisModal from "components/Tables/AnalysisModal";
import AdsetStatsModal from "components/Tables/AdsetStatsModal";
import { CLIENT_AVATARS } from "../../variables/clientAvatars.js";
import { API_BASE } from "../../config/api";
import { fmtMoney, fmtPct, fmtNum, fmtFrequency } from "../../utils/formatters";

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

function TablesTableRow(props) {
  const { adset, onStatusChange, isUpdating, datePreset, columnVisibility, onOpenDetails } = props;
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

  const handleDuplicate = () => {
    toast({ title: "Duplicate", description: "Duplicate functionality coming soon", status: "info", duration: 2000, position: "top" });
  };

  const handleAddNote = () => {
    toast({ title: "Add Note", description: "Note functionality coming soon", status: "info", duration: 2000, position: "top" });
  };

  const handleExportRow = () => {
    try {
      const csvContent = [
        ["Field", "Value"],
        ["Account", adset.account_name || ""],
        ["Campaign", adset.campaign_name || ""],
        ["Ad Set", adset.adset_name || ""],
        ["Status", adset.status || ""],
        ["Objective", adset.objective || ""],
        ["Leads", adset.leads || 0],
        ["CPL", adset.cpl || 0],
        ["Spent", adset.spend || 0],
        ["Impressions", adset.impressions || 0],
        ["Frequency", adset.frequency || 0],
        ["CPM", adset.cpm || 0],
        ["CTR (All)", adset.ctr_all || 0],
        ["Link Clicks", adset.link_clicks || 0],
      ].map(row => row.join(",")).join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `adset_${adset.adset_id}_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Row exported", status: "success", duration: 1500, position: "top" });
    } catch (e) {
      toast({ title: "Export failed", status: "error", duration: 2000, position: "top" });
    }
  };

  return (
    <>
      <Tr
        onClick={() => onOpenDetails && onOpenDetails(adset)}
        _hover={{ cursor: "pointer" }}
      >
        <Td position="sticky" left="0" zIndex="1" bg={stickyBg} py={1.5}>
          <Flex align="flex-start" gap={3}>
            <Box
              as="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded();
              }}
              lineHeight="1"
              fontSize="18px"
              w="20px"
              textAlign="center"
              mt="2px"
              color="gray.700"
            >
              {expanded ? "▾" : "▸"}
            </Box>
            <Avatar size="sm" name={adset.account_name} src={avatarSrc} bg="gray.500" />
            <Flex direction="column" minW={0}>
              <Text fontSize="10px" textTransform="uppercase" color="gray.500" noOfLines={1}>{adset.account_name || "—"}</Text>
              <Text fontSize="sm" fontWeight="semibold" color={textColor} noOfLines={1} mt="1px">{adset.campaign_name || "—"}</Text>
              <Text fontSize="sm" color="gray.600" noOfLines={1} mt="1px">{adset.adset_name || "—"}</Text>
            </Flex>
          </Flex>
        </Td>
        <Td py={1.5}>{isUpdating ? <Spinner size="sm" /> : <Switch colorScheme="teal" isChecked={adset.status === "ACTIVE"} onChange={() => onStatusChange(adset.adset_id, adset.status === "ACTIVE" ? "PAUSED" : "ACTIVE")} />}</Td>
        <Td py={0.5} pl={2} pr={0} style={{ paddingRight: 0 }}>
          <Flex gap={1} align="center">
            {adsManagerUrl && (
              <Tooltip label="Open in Ads Manager" placement="top" hasArrow>
                <IconButton
                  as="a"
                  href={adsManagerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in Ads Manager"
                  icon={<Icon as={FaExternalLinkAlt} />}
                  size="sm"
                  colorScheme="teal"
                  variant="solid"
                />
              </Tooltip>
            )}
            <Tooltip label="View Statistics" placement="top" hasArrow>
              <IconButton 
                aria-label="View Ad Set Statistics" 
                icon={<Icon as={FaChartLine} />} 
                size="sm" 
                colorScheme="blue" 
                variant="solid" 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Opening stats modal for adset:", adset.adset_name);
                  setIsStatsModalOpen(true);
                }} 
              />
            </Tooltip>
            <Menu>
              <Tooltip label="More actions" placement="top" hasArrow>
                <MenuButton
                  as={IconButton}
                  aria-label="More actions"
                  icon={<Icon as={FaEllipsisV} />}
                  size="sm"
                  variant="ghost"
                  colorScheme="gray"
                />
              </Tooltip>
              <MenuList>
                <MenuItem icon={<Icon as={FaInfoCircle} />} onClick={() => setIsStatsModalOpen(true)}>
                  View Details
                </MenuItem>
                {adsManagerUrl && (
                  <MenuItem 
                    icon={<Icon as={FaExternalLinkAlt} />} 
                    as="a"
                    href={adsManagerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Ads Manager
                  </MenuItem>
                )}
                <MenuItem icon={<Icon as={FaCopy} />} onClick={handleDuplicate}>
                  Duplicate to…
                </MenuItem>
                <MenuItem icon={<Icon as={FaStickyNote} />} onClick={handleAddNote}>
                  Add Note
                </MenuItem>
                <MenuItem icon={<Icon as={FaFileExport} />} onClick={handleExportRow}>
                  Export Row
                </MenuItem>
                <MenuItem 
                  icon={isRowAnalyzing ? <Spinner size="xs" /> : <Icon as={FaMagic} />} 
                  onClick={handleRowAnalysis}
                  isDisabled={isRowAnalyzing}
                >
                  AI Analysis
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Td>
        <Td py={1.5}><Text fontSize="xs" color="gray.700">{shortObjective(adset.objective)}</Text></Td>
        <Td py={1.5} textAlign="right"><Text fontSize="sm" color="gray.800" fontWeight="bold">{fmtNum(adset.leads)}</Text></Td>
        <Td py={1.5} textAlign="right"><Text fontSize="sm" color="gray.800" fontWeight="bold">{fmtMoney(adset.cpl)}</Text></Td>
        <Td py={1.5} textAlign="right"><Text fontSize="sm" color="gray.800" fontWeight="bold">{fmtMoney(adset.spend)}</Text></Td>
        <Td py={1.5} textAlign="right"><Text fontSize="sm" color="gray.800">{fmtNum(adset.impressions)}</Text></Td>
        {columnVisibility?.frequency !== false && (
          <Td py={1.5} textAlign="right"><Text fontSize="sm" color="gray.800">{fmtFrequency(adset.frequency)}</Text></Td>
        )}
        <Td py={1.5} textAlign="right"><Text fontSize="sm" color="gray.800" fontWeight="bold">{fmtMoney(adset.cpm)}</Text></Td>
        {columnVisibility?.ctr_all !== false && (
          <Td py={1.5} textAlign="right"><Text fontSize="sm" color="gray.800">{fmtPct(adset.ctr_all)}</Text></Td>
        )}
        <Td py={1.5} textAlign="right"><Text fontSize="sm" color="gray.800" fontWeight="bold">{fmtPct(ctrLinkClick)}</Text></Td>
        <Td py={1.5} textAlign="right"><Text fontSize="sm" color="gray.800">{fmtNum(adset.link_clicks)}</Text></Td>
      </Tr>
      {expanded && (adsLoading ? (
        <Tr>
          <Td colSpan={13}>
            <Flex py={1.5} justify="center" align="center">
              <Spinner size="sm" mr={2} />
              Loading ads…
            </Flex>
          </Td>
        </Tr>
      ) : ads.length === 0 ? (
        <Tr>
          <Td colSpan={13}>
            <Text color="gray.600" fontSize="sm" py={1.5} pl="68px">
              No ads found for this ad set.
            </Text>
          </Td>
        </Tr>
      ) : (
        ads.map((ad) => (
          <Tr key={ad.ad_id} bg={AD_ROW_BG}>
            <Td position="sticky" left="0" zIndex="1" py={1} bg="white">
              <Flex align="center" gap={3} pl="48px">
                {ad.thumbnail_url ? (
                  <Image src={ad.thumbnail_url} alt="" boxSize="32px" borderRadius="md" objectFit="cover" />
                ) : (
                  <Avatar size="sm" name={ad.ad_name} />
                )}
                <Text noOfLines={1} color="gray.800">{ad.ad_name}</Text>
              </Flex>
            </Td>
            <Td py={1}>
              {updatingAdId === ad.ad_id ? (
                <Spinner size="xs" />
              ) : (
                <Switch size="sm" colorScheme="teal" isChecked={ad.status === "ACTIVE"} onChange={() => updateAdStatus(ad.ad_id, ad.status)} />
              )}
            </Td>
            <Td py={1}></Td>
            <Td py={1}><Text fontSize="xs" color="gray.700">—</Text></Td>
            <Td py={1} textAlign="right" color="gray.800"><Text fontSize="xs" fontWeight="bold">{fmtNum(ad.leads)}</Text></Td>
            <Td py={1} textAlign="right" color="gray.800"><Text fontSize="xs" fontWeight="bold">{fmtMoney(ad.cpa)}</Text></Td>
            <Td py={1} textAlign="right" color="gray.800"><Text fontSize="xs" fontWeight="bold">{fmtMoney(ad.spend)}</Text></Td>
            <Td py={1} textAlign="right" color="gray.800"><Text fontSize="xs">{fmtNum(ad.impressions)}</Text></Td>
            {columnVisibility?.frequency !== false && (
              <Td py={1} textAlign="right" color="gray.800"><Text fontSize="xs">{fmtFrequency(ad.frequency)}</Text></Td>
            )}
            <Td py={1} textAlign="right" color="gray.800"><Text fontSize="xs" fontWeight="bold">{fmtMoney(ad.cpm)}</Text></Td>
            {columnVisibility?.ctr_all !== false && (
              <Td py={1} textAlign="right" color="gray.800"><Text fontSize="xs">{fmtPct(ad.ctr)}</Text></Td>
            )}
            <Td py={1} textAlign="right" color="gray.800"><Text fontSize="xs" fontWeight="bold">{fmtPct(ad.ctr_link)}</Text></Td>
            <Td py={1} textAlign="right" color="gray.800"><Text fontSize="xs">{fmtNum(ad.link_clicks)}</Text></Td>
          </Tr>
        ))
      ))}
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
