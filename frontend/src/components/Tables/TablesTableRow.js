import React from "react";
import { Avatar, Flex, Td, Text, Tr, Switch, useColorModeValue } from "@chakra-ui/react";

function TablesTableRow(props) {
  const { adset, onStatusChange } = props;
  const textColor = useColorModeValue("gray.700", "white"); // Main text color is white in dark mode

  // Function to safely format currency values
  const formatCurrency = (value) => {
    if (typeof value !== 'number' || !isFinite(value)) {
      return "$0.00";
    }
    return `$${value.toFixed(2)}`;
  };
  
  // Function to safely format percentage values
  const formatPercentage = (value) => {
    if (typeof value !== 'number' || !isFinite(value)) {
      return "0.00%";
    }
    return `${value.toFixed(2)}%`;
  };

  return (
    <Tr>
      {/* Ad Set / Campaign */}
      <Td minWidth={{ sm: "250px" }} pl="0px">
        <Flex align="center" py=".8rem" minWidth="100%" flexWrap="nowrap">
          <Avatar w="50px" borderRadius="12px" me="18px" />
          <Flex direction="column">
            <Text fontSize="md" color={textColor} fontWeight="bold">{adset.adset_name}</Text>
            <Text fontSize="sm" color="gray.400" fontWeight="normal">{adset.campaign_name}</Text>
          </Flex>
        </Flex>
      </Td>
      {/* Spent */}
      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.spend)}</Text></Td>
      {/* Leads (CPA) */}
      <Td><Text fontSize="md" color={textColor}>{`${adset.leads} (${formatCurrency(adset.cpa)})`}</Text></Td>
      {/* CPL */}
      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.cpl)}</Text></Td>
      {/* CPM */}
      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.cpm)}</Text></Td>
      {/* CTR (All) */}
      <Td><Text fontSize="md" color={textColor}>{formatPercentage(adset.ctr_all)}</Text></Td>
      {/* CTR (Link Click) */}
      <Td><Text fontSize="md" color={textColor}>{formatPercentage(adset.ctr_link_click)}</Text></Td>
      {/* Clicks */}
      <Td><Text fontSize="md" color={textColor}>{adset.clicks}</Text></Td>
      {/* Status Switch */}
      <Td>
        <Switch
          colorScheme="teal"
          isChecked={adset.status === "ACTIVE"}
          onChange={() => onStatusChange(adset.adset_id, adset.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}
        />
      </Td>
    </Tr>
  );
}
export default TablesTableRow;
