// src/components/Tables/AdsetTable.js

import React, { useRef, useCallback } from "react";
import { Box, Table, Tbody, Td, Th, Thead, Tr, Flex, Icon, Spinner, Text, VStack } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon } from "@chakra-ui/icons";
import { FaHourglassHalf } from "react-icons/fa";
import TablesTableRow from "./TablesTableRow";
import { useColumnSizes } from "hooks/useColumnSizes";
import AdsetDetailsDrawer from "./AdsetDetailsDrawer";

const SEPARATOR = "rgba(0,0,0,0.10)";

const tableStyles = {
  maxH: "70vh", 
  overflowY: "auto",
  overflowX: "auto",
  bg: "white",
  sx: {
    "&::-webkit-scrollbar": { height: "8px", width: "8px" },
    "&::-webkit-scrollbar-thumb": { background: "#CBD5E0", borderRadius: "8px" },
    "& thead th": { position: "sticky", top: 0, zIndex: 3, background: "#F7FAFC", color: "gray.800", fontWeight: "bold" },
    "& thead th:first-of-type": { left: 0, zIndex: 5 },
    "& tbody td:first-of-type": { position: "sticky", left: 0, zIndex: 4, background: "white" },
    "& th, & td": { borderRight: `1px solid ${SEPARATOR}`, borderBottom: `1px solid ${SEPARATOR}` },
    "& tbody tr:hover": { background: "#F7FAFC" },
    "& tbody td:nth-of-type(3)": { paddingRight: "0 !important" },
    "& table": { minWidth: "1400px" }
  }
};

const SortableTh = ({ children, sortKey, sortConfig, onSort, width, columnKey, onResize, textAlign, fontWeight }) => {
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e) => {
    if (!onResize) return;
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;
    // Получаем текущую ширину из DOM
    const currentWidth = parseInt(width) || 100;
    startWidth.current = currentWidth;

    const handleMouseMove = (e) => {
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(80, Math.min(500, startWidth.current + diff));
      onResize(columnKey, newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width, columnKey, onResize]);

  return (
    <Th
      color="gray.800"
      cursor="pointer"
      onClick={() => onSort(sortKey)}
      position="relative"
      width={width}
      minW={width}
      textAlign={textAlign || "left"}
      fontWeight={fontWeight || "normal"}
      style={{ userSelect: "none" }}
    >
      <Flex align="center" justify={textAlign === "right" ? "flex-end" : "flex-start"}>
        {textAlign === "right" && sortConfig.key === sortKey && <Icon as={sortConfig.direction === "ascending" ? TriangleUpIcon : TriangleDownIcon} w={3} h={3} mr={2} />}
        {children}
        {textAlign !== "right" && sortConfig.key === sortKey && <Icon as={sortConfig.direction === "ascending" ? TriangleUpIcon : TriangleDownIcon} w={3} h={3} ml={2} />}
      </Flex>
      {onResize && (
        <Box
          position="absolute"
          right={0}
          top={0}
          bottom={0}
          width="6px"
          cursor="col-resize"
          bg="transparent"
          _hover={{ bg: "blue.500" }}
          onMouseDown={handleMouseDown}
          zIndex={10}
        />
      )}
    </Th>
  );
};

function AdsetTable({ adsets, loading, error, sortConfig, onSort, onStatusChange, updatingId, datePreset, columnVisibility, onResetColumns }) {
  const { sizes, updateSize, resetSizes } = useColumnSizes();
  const [selectedAdset, setSelectedAdset] = React.useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  
  // Передаем функцию resetSizes родителю
  React.useEffect(() => {
    if (onResetColumns) {
      onResetColumns(resetSizes);
    }
  }, [resetSizes, onResetColumns]);
  
  // Экспортируем resetSizes в window для доступа из консоли
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.resetColumnSizes = () => {
        resetSizes();
        console.log("Column sizes reset via console");
      };
    }
  }, [resetSizes]);

  const renderTableBody = () => {
    if (loading) {
      return (
        <Tr>
          <Td colSpan={13} py={12}>
            <VStack spacing={4} justify="center" align="center">
              <Spinner
                thickness="4px"
                speed="0.65s"
                emptyColor="gray.200"
                color="blue.500"
                size="xl"
              />
              <Flex align="center" gap={2} color="gray.600">
                <Icon as={FaHourglassHalf} w={5} h={5} />
                <Text fontSize="md" fontWeight="medium">Loading ad sets...</Text>
              </Flex>
            </VStack>
          </Td>
        </Tr>
      );
    }
    if (error) return <Tr><Td colSpan={13} textAlign="center" color="red.500" py={8}>Error: {error}</Td></Tr>;
    if (!adsets.length) return <Tr><Td colSpan={13} textAlign="center" color="gray.600" py={8}>No ad sets found.</Td></Tr>;
    return adsets.map((adset) => (
      <TablesTableRow 
        key={adset.adset_id} 
        adset={adset} 
        onStatusChange={onStatusChange} 
        isUpdating={updatingId === adset.adset_id} 
        datePreset={datePreset}
        columnVisibility={columnVisibility}
        onOpenDetails={(row) => {
          setSelectedAdset(row);
          setIsDrawerOpen(true);
        }}
      />
    ));
  };

  const handleToggleStatus = (row) => {
    if (!row) return;
    onStatusChange(row.adset_id, row.status);
  };

  const fetchAdsForAdset = async (adsetId) => {
    try {
      const res = await fetch(`/api/adsets/${encodeURIComponent(adsetId)}/ads`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.items || []);
    } catch {
      return [];
    }
  };
  const fetchAdsetDetails = async (adsetId) => {
    try {
      const res = await fetch(`/api/adsets/${encodeURIComponent(adsetId)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };
  const fetchAdsetHistory = async (adsetId) => {
    try {
      const res = await fetch(`/api/adsets/${encodeURIComponent(adsetId)}/history`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.items || []);
    } catch {
      return [];
    }
  };

  return (
    <Box {...tableStyles}>
      <Table variant="simple" colorScheme="gray" layout="fixed" width="100%">
        <Thead>
          <Tr my=".4rem" ps="0px">
            <SortableTh sortKey="account_name" {...{ sortConfig, onSort }} width={`${sizes.account}px`} columnKey="account" onResize={updateSize}>Account / Campaign / Ad Set</SortableTh>
            <Th color="gray.800" width={`${sizes.status}px`} minW={`${sizes.status}px`}>Status</Th>
            <Th color="gray.800" width={`${sizes.actions}px`} minW={`${sizes.actions}px`}>Actions</Th>
            <Th color="gray.800" width={`${sizes.objective}px`} minW={`${sizes.objective}px`}>Objective</Th>
            <SortableTh sortKey="leads" {...{ sortConfig, onSort }} width={`${sizes.leads}px`} textAlign="right" fontWeight="bold">Leads</SortableTh>
            <SortableTh sortKey="cpl" {...{ sortConfig, onSort }} width={`${sizes.cpl}px`} textAlign="right" fontWeight="bold">CPL</SortableTh>
            <SortableTh sortKey="spend" {...{ sortConfig, onSort }} width={`${sizes.spend}px`} textAlign="right" fontWeight="bold">Spent</SortableTh>
            <SortableTh sortKey="impressions" {...{ sortConfig, onSort }} width={`${sizes.impressions}px`} textAlign="right">Impressions</SortableTh>
            {columnVisibility?.frequency !== false && (
              <SortableTh sortKey="frequency" {...{ sortConfig, onSort }} width={`${sizes.frequency}px`} textAlign="right">Frequency</SortableTh>
            )}
            <SortableTh sortKey="cpm" {...{ sortConfig, onSort }} width={`${sizes.cpm}px`} textAlign="right" fontWeight="bold">CPM</SortableTh>
            {columnVisibility?.ctr_all !== false && (
              <SortableTh sortKey="ctr_all" {...{ sortConfig, onSort }} width={`${sizes.ctr_all}px`} textAlign="right">CTR (All)</SortableTh>
            )}
            <Th color="gray.800" width={`${sizes.ctr_link}px`} minW={`${sizes.ctr_link}px`} textAlign="right" fontWeight="bold">CTR (Link Click)</Th>
            <SortableTh sortKey="link_clicks" {...{ sortConfig, onSort }} width={`${sizes.link_clicks}px`} textAlign="right">Link Clicks</SortableTh>
          </Tr>
        </Thead>
        <Tbody>{renderTableBody()}</Tbody>
      </Table>
      <AdsetDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        adset={selectedAdset}
        isUpdating={!!selectedAdset && updatingId === selectedAdset.adset_id}
        onToggleStatus={handleToggleStatus}
        fetchAdsForAdset={fetchAdsForAdset}
        fetchAdsetDetails={fetchAdsetDetails}
        fetchAdsetHistory={fetchAdsetHistory}
      />
    </Box>
  );
}

export default AdsetTable;
