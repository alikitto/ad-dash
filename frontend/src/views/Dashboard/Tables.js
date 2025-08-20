// --- Файл: frontend/src/views/Dashboard/Tables.js ---

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

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        // УБЕДИТЕСЬ, ЧТО ЗДЕСЬ ВАШ ПРАВИЛЬНЫЙ URL БЭКЕНДА
        const response = await fetch("https://ad-dash-backend-production-a1b2c3d4.up.railway.app/api/active-campaigns"); // <-- ЗАМЕНИТЕ НА ВАШ URL
        const data = await response.json();
        
        // Проверяем, не вернул ли бэкенд объект с ошибкой
        if (data.error) {
          throw new Error(data.error);
        }

        setCampaigns(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, []);

  const renderTableBody = () => {
    if (loading) {
      return (
        <Tr>
          <Td colSpan="6" textAlign="center">Загрузка данных...</Td>
        </Tr>
      );
    }
    
    if (error) {
      return (
        <Tr>
          <Td colSpan="6" textAlign="center">Ошибка загрузки: {error}</Td>
        </Tr>
      );
    }
    
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
        return (
            <Tr>
                <Td colSpan="6" textAlign="center">Активные кампании не найдены.</Td>
            </Tr>
        )
    }

    return campaigns.map((campaign, index) => (
      <TablesTableRow
        key={index}
        name={campaign.campaign_name}
        email={campaign.account_name}
        domain={campaign.objective}
        subdomain=""
        status={campaign.status}
        date={`${campaign.spend.toFixed(2)} / ${campaign.leads} / ${campaign.cpl.toFixed(2)}`}
        lastItem={index === campaigns.length - 1}
      />
    ));
  };

  return (
    <Flex direction='column' pt={{ base: "120px", md: "75px" }}>
      <Card overflowX={{ sm: "scroll", xl: "hidden" }} pb='0px'>
        <CardHeader p='6px 0px 22px 0px'>
          <Text fontSize='lg' color='#fff' fontWeight='bold'>
            Active Campaigns Table
          </Text>
        </CardHeader>
        <CardBody>
          <Table variant='simple' color='#fff'>
            <Thead>
              <Tr my='.8rem' ps='0px' color='gray.400'>
                <Th ps='0px' color='gray.400' fontFamily='Plus Jakarta Display' borderBottomColor='#56577A'>
                  Кампания / Кабинет
                </Th>
                <Th color='gray.400' fontFamily='Plus Jakarta Display' borderBottomColor='#56577A'>
                  Цель
                </Th>
                <Th color='gray.400' fontFamily='Plus Jakarta Display' borderBottomColor='#56577A'>
                  Статус
                </Th>
                <Th color='gray.400' fontFamily='Plus Jakarta Display' borderBottomColor='#56577A'>
                  Расход / Лиды / CPL
                </Th>
                <Th borderBottomColor='#56577A'></Th>
              </Tr>
            </Thead>
            <Tbody>
              {renderTableBody()}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </Flex>
  );
}

export default Tables;
