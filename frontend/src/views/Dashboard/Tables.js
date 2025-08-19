Конечно, вот полный код для файла Tables.js с диагностической, упрощенной версией renderTableBody.

Эта версия не использует компонент TablesTableRow, а создает ячейки таблицы напрямую. Это поможет нам точно определить, где скрывается проблема.

Код для файла frontend/src/views/Dashboard/Tables.js
Замените всё содержимое вашего файла этим кодом и загрузите на GitHub.

JavaScript

/*!

=========================================================
* Vision UI Free Chakra - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/vision-ui-free-chakra
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)
* Licensed under MIT (https://github.com/creativetimofficial/vision-ui-free-chakra/blob/master LICENSE.md)

* Design and Coded by Simmmple & Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

import React, { useState, useEffect } from "react";

// Chakra imports
import {
  Flex,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";

// Custom components
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";

function Tables() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        // УБЕДИТЕСЬ, ЧТО ЗДЕСЬ ВАШ ПРАВИЛЬНЫЙ URL
        const response = await fetch("https://ad-dash-backend-production-....up.railway.app/api/active-campaigns"); // <-- ЗАМЕНИТЕ НА ВАШ URL
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCampaigns(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, []);

  // ДИАГНОСТИЧЕСКАЯ ВЕРСИЯ: Отображаем данные напрямую, без TablesTableRow
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
    if (campaigns.length === 0) {
        return (
            <Tr>
                <Td colSpan="6" textAlign="center">Активные кампании не найдены.</Td>
            </Tr>
        )
    }
    // Используем обычный <Tr> и <Td>
    return campaigns.map((campaign, index) => (
      <Tr key={index}>
        <Td>
            <Text fontSize="md" color="#fff" fontWeight="bold">{campaign.campaign_name}</Text>
            <Text fontSize="sm" color="gray.400">{campaign.account_name}</Text>
        </Td>
        <Td>
            <Text fontSize="md" color="#fff">{campaign.objective}</Text>
        </Td>
        <Td>
            <Text fontSize="md" color="#fff">{campaign.status}</Text>
        </Td>
        <Td>
            <Text fontSize="md" color="#fff">{`${campaign.spend.toFixed(2)} / ${campaign.leads} / ${campaign.cpl.toFixed(2)}`}</Text>
        </Td>
        <Td></Td>
      </Tr>
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
