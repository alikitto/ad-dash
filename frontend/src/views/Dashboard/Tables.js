import React, { useState, useEffect } from "react";
import { Flex, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import TablesTableRow from "components/Tables/TablesTableRow";

function Tables() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const response = await fetch("https://YOUR-BACKEND-URL/api/active-campaigns");
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setCampaigns(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (campaignId, newStatus) => {
    // Optimistically update UI
    setCampaigns(campaigns.map(c => c.campaign_id === campaignId ? { ...c, status: newStatus } : c));
    
    try {
      await fetch(`https://ad-dash-backend-production.up.railway.app/api/campaigns/${campaignId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: newStatus })
      });
    } catch (e) {
      // Revert UI on failure
      fetchData(); 
    }
  };

  const renderTableBody = () => {
    // ... (код для loading, error, empty state) ...
    return campaigns.map((campaign) => (
      <TablesTableRow
        key={campaign.campaign_id}
        campaign={campaign}
        onStatusChange={handleStatusChange}
      />
    ));
  };
  
  return (
    <Flex direction='column' pt={{ base: "120px", md: "75px" }}>
      <Card overflowX={{ sm: "scroll", xl: "hidden" }} pb='0px'>
        <CardHeader p='6px 0px 22px 0px'>
          <Text fontSize='lg' color='#fff' fontWeight='bold'>Active Campaigns</Text>
        </CardHeader>
        <CardBody>
          <Table variant='simple' color='#fff'>
            <Thead>
              <Tr my='.8rem' ps='0px' color='gray.400'>
                <Th>Campaign / Client</Th>
                <Th>Spent</Th>
                <Th>Leads (CPA)</Th>
                <Th>CPL</Th>
                <Th>CPM</Th>
                <Th>CTR (All)</Th>
                <Th>CTR (Link Click)</Th>
                <Th>Clicks</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>{renderTableBody()}</Tbody>
          </Table>
        </CardBody>
      </Card>
    </Flex>
  );
}
export default Tables;
