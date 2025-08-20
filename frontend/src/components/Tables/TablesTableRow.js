import React from "react";
import { Avatar, Badge, Flex, Td, Text, Tr, Switch, useColorModeValue } from "@chakra-ui/react";

function TablesTableRow(props) {
  const { campaign, onStatusChange } = props;
  const textColor = useColorModeValue("gray.700", "white");

  return (
    <Tr>
      <Td minWidth={{ sm: "250px" }} pl="0px">
        <Flex align="center" py=".8rem" minWidth="100%" flexWrap="nowrap">
          <Avatar src={campaign.avatarUrl} w="50px" borderRadius="12px" me="18px" />
          <Flex direction="column">
            <Text fontSize="md" color={textColor} fontWeight="bold">{campaign.campaign_name}</Text>
            <Text fontSize="sm" color="gray.400" fontWeight="normal">{campaign.account_name}</Text>
          </Flex>
        </Flex>
      </Td>
      <Td><Text>{`$${campaign.spend.toFixed(2)}`}</Text></Td>
      <Td><Text>{campaign.leads}</Text></Td>
      <Td><Text>{`$${campaign.cpl.toFixed(2)}`}</Text></Td>
      <Td><Text>{`$${campaign.cpm.toFixed(2)}`}</Text></Td>
      <Td><Text>{`${campaign.ctr}%`}</Text></Td>
      <Td><Text>{`${campaign.inline_link_ctr}%`}</Text></Td>
      <Td><Text>{campaign.clicks}</Text></Td>
      <Td>
        <Switch
          isChecked={campaign.status === "ACTIVE"}
          onChange={() => onStatusChange(campaign.campaign_id, campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}
        />
      </Td>
    </Tr>
  );
}
export default TablesTableRow;
