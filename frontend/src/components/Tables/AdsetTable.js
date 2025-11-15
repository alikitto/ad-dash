// src/components/Tables/AdsetTable.js

import React, { useRef, useCallback } from "react";
import { Box, Table, Tbody, Td, Th, Thead, Tr, Flex, Icon } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon } from "@chakra-ui/icons";
import TablesTableRow from "./TablesTableRow";
import { useColumnSizes } from "hooks/useColumnSizes";

const SEPARATOR = "rgba(0,0,0,0.10)";

const tableStyles = {
  maxH: "70vh", overflow: "auto",
  bg: "white",
  sx: {
    "&::-webkit-scrollbar": { height: "8px", width: "8px" },
    "&::-webkit-scrollbar-thumb": { background: "#CBD5E0", borderRadius: "8px" },
    "& thead th": { position: "sticky", top: 0, zIndex: 3, background: "#F7FAFC", color: "gray.800", fontWeight: "bold" },
    "& thead th:first-of-type": { left: 0, zIndex: 5 },
    "& tbody td:first-of-type": { position: "sticky", left: 0, zIndex: 4, background: "white" },
    "& th, & td": { borderRight: `1px solid ${SEPARATOR}`, borderBottom: `1px solid ${SEPARATOR}` },
    "& tbody tr:hover": { background: "#F7FAFC" }
  }
};

const SortableTh = ({ children, sortKey, sortConfig, onSort, width, columnKey, onResize }) => {
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
      style={{ userSelect: "none" }}
    >
      <Flex align="center">
        {children}
        {sortConfig.key === sortKey && <Icon as={sortConfig.direction === "ascending" ? TriangleUpIcon : TriangleDownIcon} w={3} h={3} ml={2} />}
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

function AdsetTable({ adsets, loading, error, sortConfig, onSort, onStatusChange, updatingId, datePreset, onResetColumns }) {
  const { sizes, updateSize, resetSizes } = useColumnSizes();
  
  // Передаем функцию resetSizes родителю
  React.useEffect(() => {
    if (onResetColumns) {
      onResetColumns(resetSizes);
    }
  }, [resetSizes, onResetColumns]);
  
  // Экспортируем resetSizes в window для доступа из консоли
  React.useEffect(() => {
    window.resetColumnSizes = () => {
      resetSizes();
      console.log("Column sizes reset via console");
    };
  }, [resetSizes]);

  const renderTableBody = () => {
    if (loading) return <Tr><Td colSpan={13} textAlign="center" color="gray.600">Loading ad sets...</Td></Tr>;
    if (error) return <Tr><Td colSpan={13} textAlign="center" color="red.500">Error: {error}</Td></Tr>;
    if (!adsets.length) return <Tr><Td colSpan={13} textAlign="center" color="gray.600">No ad sets found.</Td></Tr>;
    return adsets.map((adset) => (
      <TablesTableRow 
        key={adset.adset_id} 
        adset={adset} 
        onStatusChange={onStatusChange} 
        isUpdating={updatingId === adset.adset_id} 
        datePreset={datePreset}
      />
    ));
  };

  return (
    <Box {...tableStyles}>
      <Table variant="simple" colorScheme="gray" layout="fixed" width="100%">
        <Thead>
          <Tr my=".8rem" ps="0px">
            <SortableTh sortKey="account_name" {...{ sortConfig, onSort }} width={`${sizes.account}px`} columnKey="account" onResize={updateSize}>Account / Campaign / Ad Set</SortableTh>
            <Th color="gray.800" width={`${sizes.status}px`} minW={`${sizes.status}px`}>Status</Th>
            <Th color="gray.800" width={`${sizes.actions}px`} minW={`${sizes.actions}px`}>Actions</Th>
            <Th color="gray.800" width={`${sizes.objective}px`} minW={`${sizes.objective}px`}>Objective</Th>
            <SortableTh sortKey="spend" {...{ sortConfig, onSort }} width={`${sizes.spend}px`}>Spent</SortableTh>
            <SortableTh sortKey="impressions" {...{ sortConfig, onSort }} width={`${sizes.impressions}px`}>Impressions</SortableTh>
            <SortableTh sortKey="frequency" {...{ sortConfig, onSort }} width={`${sizes.frequency}px`}>Frequency</SortableTh>
            <SortableTh sortKey="leads" {...{ sortConfig, onSort }} width={`${sizes.leads}px`}>Leads</SortableTh>
            <SortableTh sortKey="cpl" {...{ sortConfig, onSort }} width={`${sizes.cpl}px`}>CPL</SortableTh>
            <SortableTh sortKey="cpm" {...{ sortConfig, onSort }} width={`${sizes.cpm}px`}>CPM</SortableTh>
            <SortableTh sortKey="ctr_all" {...{ sortConfig, onSort }} width={`${sizes.ctr_all}px`}>CTR (All)</SortableTh>
            <Th color="gray.800" width={`${sizes.ctr_link}px`} minW={`${sizes.ctr_link}px`}>CTR (Link Click)</Th>
            <SortableTh sortKey="link_clicks" {...{ sortConfig, onSort }} width={`${sizes.link_clicks}px`}>Link Clicks</SortableTh>
          </Tr>
        </Thead>
        <Tbody>{renderTableBody()}</Tbody>
      </Table>
    </Box>
  );
}

export default AdsetTable;
