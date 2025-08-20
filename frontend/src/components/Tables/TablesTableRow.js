import React from "react";
import { Avatar, Flex, Td, Text, Tr, Switch, useColorModeValue, Spinner } from "@chakra-ui/react";

function TablesTableRow(props) {
  const { adset, onStatusChange, isUpdating } = props;
  const textColor = useColorModeValue("white", "white");
  // ИЗМЕНЕНИЕ: Устанавливаем правильный темно-синий фон для "замороженной" ячейки
  const stickyBg = useColorModeValue("white", "#1A202C"); // Правильный темный фон карточки

  // ... (все функции форматирования остаются без изменений) ...
  const formatCurrency = (value) => (typeof value !== 'number' || !isFinite(value)) ? "$0.00" : `$${value.toFixed(2)}`;
  const formatPercentage = (value) => (typeof value !== 'number' || !isFinite(value)) ? "0.00%" : `${value.toFixed(2)}%`;
  const formatNumber = (value) => (typeof value !== 'number' || !isFinite(value)) ? "0" : value.toLocaleString('en-US');
  const ctrLinkClick = adset.impressions > 0 ? (adset.link_clicks / adset.impressions) * 100 : 0;


  return (
    <Tr>
      {/* Ad Set / Campaign */}
      <Td
        minWidth={{ sm: "250px" }}
        pl="0px"
        position="sticky"
        left="0"
        zIndex="1"
        bg={stickyBg} // Используем правильный фон
      >
        <Flex align="center" py=".8rem" minWidth="100%" flexWrap="nowrap">
          <Avatar src={adset.avatarUrl} w="50px" borderRadius="12px" me="18px" />
          <Flex direction="column">
            <Text fontSize="md" color="gray.300" fontWeight="bold">{adset.adset_name}</Text>
            <Text fontSize="sm" color="gray.500" fontWeight="normal">{adset.campaign_name}</Text>
          </Flex>
        </Flex>
      </Td>
      {/* ... (остальные ячейки <Td> остаются без изменений) ... */}
      <Td><Text fontSize="md" color={textColor}>{adset.objective}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.spend)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatNumber(adset.impressions)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{adset.frequency.toFixed(2)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{`${adset.leads} ${adset.cpa > 0 ? `(${formatCurrency(adset.cpa)})` : ''}`}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.cpl)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatCurrency(adset.cpm)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatPercentage(adset.ctr_all)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatPercentage(ctrLinkClick)}</Text></Td>
      <Td><Text fontSize="md" color={textColor}>{formatNumber(adset.link_clicks)}</Text></Td>
      <Td>
        {isUpdating ? <Spinner size="sm" color="white" /> : 
          <Switch colorScheme="teal" isChecked={adset.status === "ACTIVE"} onChange={() => onStatusChange(adset.adset_id, adset.status === "ACTIVE" ? "PAUSED" : "ACTIVE")} />
        }
      </Td>
    </Tr>
  );
}
export default TablesTableRow;
