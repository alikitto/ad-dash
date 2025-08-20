import React, { useState, useEffect } from "react";
import { Flex, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import TablesTableRow from "components/Tables/TablesTableRow";

function Tables() {
  const [adsets, setAdsets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://ad-dash-backend-production.up.railway.app/api/adsets"); // REPLACE WITH YOUR URL
      const data = await response.json();
      if (data.detail) throw new Error(data.detail);
      setAdsets(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (adsetId, newStatus) => {
    setAdsets(adsets.map(a => a.adset_id === adsetId ? { ...a, status: newStatus } : a));
    
    try {
      await fetch(`https://ad-dash-backend-production.up.railway.app/api/adsets/${adsetId}/update-status`, { // REPLACE WITH YOUR URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      setError("Failed to update status. Please refresh.");
      setTimeout(() => setError(null), 3000);
      fetchData(); 
    }
  };

  const renderTableBody = () => {
    if (loading) return <Tr><Td colSpan="9" textAlign="center">Loading ad sets...</Td></Tr>;
    if (error) return <Tr><Td colSpan="9" textAlign="center">Error: {error}</Td></Tr>;
    if (!adsets.length) return <Tr><Td colSpan="9" textAlign="center">No ad sets with spend found in the last 7 days.</Td></Tr>;
    
    return adsets.map((adset) => (
      <TablesTableRow
        key={adset.adset_id}
        adset={adset}
        onStatusChange={handleStatusChange}
      />
    ));
  };
  
  return (
    <Flex direction='column' pt={{ base: "120px", md: "75px" }}>
      <Card overflowX={{ sm: "scroll", xl: "hidden" }} pb='0px'>
        <CardHeader p='6px 0px 22px 0px'>
          <Text fontSize='lg' color='#fff' fontWeight='bold'>Active Ad Sets</Text>
        </CardHeader>
        <CardBody>
          <Table variant='simple' color='#fff'>
            <Thead>
              <Tr my='.8rem' ps='0px' color='gray.400'>
                <Th>Ad Set / Campaign</Th>
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
