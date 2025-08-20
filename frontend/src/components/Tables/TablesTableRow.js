import React from "react";
import { Avatar, Flex, Td, Text, Tr, Switch, useColorModeValue, Spinner } from "@chakra-ui/react";

function TablesTableRow(props) {
  const { adset, onStatusChange, isUpdating } = props;
  const textColor = useColorModeValue("white", "white");

  const formatCurrency = (value) => (typeof value !== 'number' || !isFinite(value)) ? "$0.00" : `$${value.toFixed(2)}`;
  const formatPercentage = (value) => (typeof value !== 'number' || !isFinite(value)) ? "0.00%" : `${value.toFixed(2)}%`;

  return (
    <Tr>
      <Td minWidth={{ sm: "250px" }} pl="0px">
        <Flex align="center" py=".8rem" minWidth="100%" flexWrap="nowrap">
          <Avatar src={adset.avatarUrl} w="50px" borderRadius="12px" me="18px" />
          <Flex direction="column">
            <Text fontSize="md" color={textColor} fontWeight="bold">{adset.adset_name}</Text>
            <Text fontSize="sm" color="gray.400" fontWeight="normal">{adset.campaign_name}</Text>
          </Flex>
        </Flex>
      </Td>
      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.spend)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{`${adset.leads} ${adset.cpa > 0 ? `(${formatCurrency(adset.cpa)})` : ''}`}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.cpl)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.cpm)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatPercentage(adset.ctr)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{adset.clicks}</Text></Td>
      <Td>
        {isUpdating ? <Spinner size="sm" color="white" /> : 
          <Switch colorScheme="teal" isChecked={adset.status === "ACTIVE"} onChange={() => onStatusChange(adset.adset_id, adset.status === "ACTIVE" ? "PAUSED" : "ACTIVE")} />
        }
      </Td>
    </Tr>
  );
}
export default TablesTableRow;
