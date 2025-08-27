// src/components/Tables/AdsetTable.js

import React from "react";
import { Box, Table, Tbody, Td, Th, Thead, Tr, Flex, Icon } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon } from "@chakra-ui/icons";
import TablesTableRow from "./TablesTableRow";

const SEPARATOR = "rgba(255,255,255,0.10)";

const tableStyles = {
  maxH: "70vh", overflow: "auto",
  sx: {
    "&::-webkit-scrollbar": { height: "8px", width: "8px" },
    "&::-webkit-scrollbar-thumb": { background: "#2D3748", borderRadius: "8px" },
    "& thead th": { position: "sticky", top: 0, zIndex: 3, background: "#2a406e" },
    "& thead th:first-of-type": { left: 0, zIndex: 5 },
    "& tbody td:first-of-type": { position: "sticky", left: 0, zIndex: 4 },
    "& th, & td": { borderRight: `1px solid ${SEPARATOR}` }
  }
};

const SortableTh = ({ children, sortKey, sortConfig, onSort }) => (
  <Th color="white" cursor="pointer" onClick={() => onSort(sortKey)}>
    <Flex align="center">
      {children}
      {sortConfig.key === sortKey && <Icon as={sortConfig.direction === "ascending" ? TriangleUpIcon : TriangleDownIcon} w={3} h={3} ml={2} />}
    </Flex>
  </Th>
);

function AdsetTable({ adsets, loading, error, sortConfig, onSort, onStatusChange, updatingId, datePreset }) {
  const renderTableBody = () => {
    if (loading) return <Tr><Td colSpan={13} textAlign="center">Loading ad sets...</Td></Tr>;
    if (error) return <Tr><Td colSpan={13} textAlign="center">Error: {error}</Td></Tr>;
    if (!adsets.length) return <Tr><Td colSpan={13} textAlign="center">No ad sets found.</Td></Tr>;
    return adsets.map((adset) => <TablesTableRow key={adset.adset_id} adset={adset} onStatusChange={onStatusChange} isUpdating={updatingId === adset.adset_id} datePreset={datePreset} />);
  };

  return (
    <Box {...tableStyles}>
      <Table variant="simple" color="white">
        <Thead>
          <Tr my=".8rem" ps="0px">
            <SortableTh sortKey="account_name" {...{ sortConfig, onSort }}>Account / Campaign / Ad Set</SortableTh>
            <Th color="white">Status</Th><Th color="white">Actions</Th><Th color="white">Objective</Th>
            <SortableTh sortKey="spend" {...{ sortConfig, onSort }}>Spent</SortableTh>
            <SortableTh sortKey="impressions" {...{ sortConfig, onSort }}>Impressions</SortableTh>
            <SortableTh sortKey="frequency" {...{ sortConfig, onSort }}>Frequency</SortableTh>
            <SortableTh sortKey="leads" {...{ sortConfig, onSort }}>Leads</SortableTh>
            <SortableTh sortKey="cpl" {...{ sortConfig, onSort }}>CPL</SortableTh>
            <SortableTh sortKey="cpm" {...{ sortConfig, onSort }}>CPM</SortableTh>
            <SortableTh sortKey="ctr_all" {...{ sortConfig, onSort }}>CTR (All)</SortableTh>
            <Th color="white">CTR (Link Click)</Th>
            <SortableTh sortKey="link_clicks" {...{ sortConfig, onSort }}>Link Clicks</SortableTh>
          </Tr>
        </Thead>
        <Tbody>{renderTableBody()}</Tbody>
      </Table>
    </Box>
  );
}

export default AdsetTable;
