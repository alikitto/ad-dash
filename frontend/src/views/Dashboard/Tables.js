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

// Импортируем хуки useState и useEffect из React
import React, { useState, useEffect } from "react";

// Chakra imports
import {
  Flex,
  Table,
  Tbody,
  Td, // ИСПРАВЛЕНО: Добавлен импорт Td
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";

// Custom components
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";

// Table Components
import TablesTableRow from "components/Tables/TablesTableRow";

function Tables() {
  // Создаем состояния для хранения кампаний, статуса загрузки и ошибок
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Используем useEffect для загрузки данных при первом рендере компонента
  useEffect(() => {
    async function fetchCampaigns() {
      try {
        // ВАЖНО: Убедитесь, что здесь указан правильный URL вашего рабочего бэкенда
        const response = await fetch("https://ad-dash-backend-production-1234.up.railway.app/api/active-campaigns"); // <-- ЗАМЕНИТЕ НА ВАШ URL
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCampaigns(data); // Сохраняем данные в состояние
      } catch (e) {
        setError(e.message); // Сохраняем ошибку
      } finally {
        setLoading(false); // Убираем статус загрузки
      }
    }

    fetchCampaigns();
  }, []); // Пустой массив зависимостей означает, что эффект выполнится один раз

  // Функция для отображения тела таблицы в зависимости от состояния
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
