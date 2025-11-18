import React, { useState, useEffect, useCallback } from "react";
import {
  Flex,
  Text,
  Button,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Avatar,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useDisclosure,
  Spinner,
  Badge,
  HStack,
  Box,
  Select,
  VStack,
  Divider,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, AddIcon } from "@chakra-ui/icons";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import { API_BASE } from "../../config/api";
import { CLIENT_AVATARS } from "../../variables/clientAvatars";

function ClientsList() {
  const [clients, setClients] = useState([]);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [formData, setFormData] = useState({
    account_id: "",
    account_name: "",
    avatar_url: "",
    monthly_budget: "",
    start_date: "",
    monthly_payment_azn: "",
  });
  const paymentsModal = useDisclosure();
  const [paymentsClient, setPaymentsClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paid_at: "",
    amount: "",
    note: "",
  });

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Fetching clients from:", `${API_BASE}/api/clients`);
      const response = await fetch(`${API_BASE}/api/clients`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Clients loaded:", data.length);
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch clients error:", error);
      toast({
        title: "Ошибка загрузки клиентов",
        description: error.message || "Проверьте подключение к серверу",
        status: "error",
        duration: 5000,
      });
      setClients([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchAvailableAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/clients/from-accounts/list`);
      if (!response.ok) throw new Error("Failed to fetch accounts");
      const data = await response.json();
      setAvailableAccounts(data);
    } catch (error) {
      toast({
        title: "Ошибка загрузки аккаунтов",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setAccountsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClients();
    fetchAvailableAccounts();
  }, [fetchClients, fetchAvailableAccounts]);

  const handleAddNew = () => {
    setEditingClient(null);
    setFormData({
      account_id: "",
      account_name: "",
      avatar_url: "",
      monthly_budget: "",
      start_date: "",
      monthly_payment_azn: "",
    });
    onOpen();
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      account_id: client.account_id,
      account_name: client.account_name,
      avatar_url: client.avatar_url || "",
      monthly_budget: client.monthly_budget.toString(),
      start_date: client.start_date,
      monthly_payment_azn: client.monthly_payment_azn.toString(),
    });
    onOpen();
  };

  const handleAccountSelect = (accountId) => {
    const account = availableAccounts.find((acc) => acc.account_id === accountId);
    if (account) {
      setFormData((prev) => ({
        ...prev,
        account_id: account.account_id,
        account_name: account.account_name,
      }));
    }
  };

  const fetchPayments = useCallback(
    async (client) => {
      if (!client) return;
      setPaymentsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/clients/${client.account_id}/payments`);
        if (!response.ok) throw new Error("Failed to fetch payments");
        const data = await response.json();
        setPayments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Fetch payments error:", error);
        toast({
          title: "Ошибка загрузки оплат",
          description: error.message,
          status: "error",
          duration: 4000,
        });
        setPayments([]);
      } finally {
        setPaymentsLoading(false);
      }
    },
    [toast]
  );

  const openPaymentsModal = async (client) => {
    setPaymentsClient(client);
    setPaymentForm({
      paid_at: new Date().toISOString().slice(0, 10),
      amount: "",
      note: "",
    });
    paymentsModal.onOpen();
    fetchPayments(client);
  };

  const closePaymentsModal = () => {
    paymentsModal.onClose();
    setPaymentsClient(null);
    setPayments([]);
  };

  const handleAddPayment = async () => {
    if (!paymentsClient) return;
    const amount = parseFloat(paymentForm.amount);
    if (!paymentForm.paid_at || !isFinite(amount) || amount <= 0) {
      toast({
        title: "Введите корректные данные оплаты",
        status: "warning",
        duration: 3000,
      });
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/clients/${paymentsClient.account_id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paid_at: paymentForm.paid_at,
          amount,
          note: paymentForm.note || null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to add payment");
      }
      const newPayment = await response.json();
      setPayments((prev) => [newPayment, ...prev]);
      setPaymentForm((prev) => ({ ...prev, amount: "", note: "" }));
      setClients((prev) =>
        prev.map((client) =>
          client.account_id === paymentsClient.account_id
            ? {
                ...client,
                total_paid: (client.total_paid || 0) + newPayment.amount,
                last_payment_at: newPayment.paid_at,
              }
            : client
        )
      );
      toast({ title: "Оплата добавлена", status: "success", duration: 2000 });
    } catch (error) {
      toast({
        title: "Ошибка добавления оплаты",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        account_id: formData.account_id,
        account_name: formData.account_name,
        avatar_url: formData.avatar_url || null,
        monthly_budget: parseFloat(formData.monthly_budget) || 0,
        start_date: formData.start_date,
        monthly_payment_azn: parseFloat(formData.monthly_payment_azn) || 0,
      };

      let response;
      if (editingClient) {
        // Update
        response = await fetch(`${API_BASE}/api/clients/${editingClient.account_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        response = await fetch(`${API_BASE}/api/clients`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to save client");
      }

      const savedClient = await response.json().catch(() => null);

      toast({
        title: editingClient ? "Клиент обновлен" : "Клиент добавлен",
        status: "success",
        duration: 2000,
      });

      if (savedClient && typeof savedClient === "object") {
        setClients((prev) => {
          if (editingClient) {
            return prev.map((client) =>
              client.account_id === savedClient.account_id ? savedClient : client
            );
          } else {
            return [...prev, savedClient];
          }
        });
      } else {
        fetchClients();
      }

      onClose();
    } catch (error) {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm("Вы уверены, что хотите удалить этого клиента?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/clients/${accountId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to delete client");
      }

      toast({
        title: "Клиент удален",
        status: "success",
        duration: 2000,
      });

      fetchClients();
    } catch (error) {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const formatMoney = (value) => {
    if (typeof value !== "number" || !isFinite(value)) return "$0.00";
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ru-RU");
    } catch {
      return dateString;
    }
  };

  const getAvatarSrc = (client) => {
    return (
      client.avatar_url ||
      CLIENT_AVATARS[client.account_id] ||
      CLIENT_AVATARS[client.account_name] ||
      (client.account_name && CLIENT_AVATARS[client.account_name.toLowerCase()])
    );
  };

  return (
    <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader>
          <Flex justify="space-between" align="center">
            <Text fontSize="xl" color="white" fontWeight="bold">
              Clients List
            </Text>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
              size="sm"
              onClick={handleAddNew}
            >
              Добавить клиента
            </Button>
          </Flex>
        </CardHeader>
        <CardBody pt="0">
          {loading ? (
            <Flex justify="center" align="center" py={8}>
              <Spinner size="lg" color="purple.500" />
              <Text ml={3} color="white">
                Загрузка клиентов...
              </Text>
            </Flex>
          ) : (
            <Table variant="simple" colorScheme="gray">
              <Thead>
                <Tr>
                  <Th color="gray.400">Аватар</Th>
                  <Th color="gray.400">ID</Th>
                  <Th color="gray.400">Название</Th>
                  <Th color="gray.400" isNumeric>
                    Месячный бюджет
                  </Th>
                  <Th color="gray.400">Дата начала</Th>
                  <Th color="gray.400" isNumeric>
                    Оплата (AZN)
                  </Th>
                  <Th color="gray.400">История оплат</Th>
                  <Th color="gray.400">Действия</Th>
                </Tr>
              </Thead>
              <Tbody>
                {clients.length === 0 ? (
                  <Tr>
                    <Td colSpan={8} textAlign="center" py={8}>
                      <Text color="gray.400">Нет клиентов. Добавьте первого клиента.</Text>
                    </Td>
                  </Tr>
                ) : (
                  clients.map((client) => (
                    <Tr key={client.id}>
                      <Td>
                        <Avatar
                          size="sm"
                          name={client.account_name}
                          src={getAvatarSrc(client)}
                        />
                      </Td>
                      <Td color="white">
                        <Text fontSize="sm">{client.account_id}</Text>
                      </Td>
                      <Td color="white">
                        <Text fontWeight="medium">{client.account_name}</Text>
                      </Td>
                      <Td color="white" isNumeric>
                        {formatMoney(client.monthly_budget)}
                      </Td>
                      <Td color="white">{formatDate(client.start_date)}</Td>
                      <Td color="white" isNumeric>
                        {client.monthly_payment_azn.toFixed(2)} AZN
                      </Td>
                      <Td color="white">
                        <Text fontSize="sm" fontWeight="bold">
                          {formatMoney(client.total_paid || 0)}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          Последняя: {client.last_payment_at ? formatDate(client.last_payment_at) : "—"}
                        </Text>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Button
                            size="xs"
                            colorScheme="purple"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPaymentsModal(client);
                            }}
                          >
                            Оплаты
                          </Button>
                          <IconButton
                            aria-label="Редактировать"
                            icon={<EditIcon />}
                            size="sm"
                            colorScheme="blue"
                            onClick={() => handleEdit(client)}
                          />
                          <IconButton
                            aria-label="Удалить"
                            icon={<DeleteIcon />}
                            size="sm"
                            colorScheme="red"
                            onClick={() => handleDelete(client.account_id)}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Modal for Add/Edit */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingClient ? "Редактировать клиента" : "Добавить клиента"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Выбрать из доступных аккаунтов</FormLabel>
              <Select
                placeholder="Выберите аккаунт"
                value={formData.account_id}
                onChange={(e) => handleAccountSelect(e.target.value)}
                isDisabled={editingClient !== null}
              >
                {availableAccounts.map((acc) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.account_name} ({acc.account_id})
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>Account ID</FormLabel>
              <Input
                value={formData.account_id}
                onChange={(e) =>
                  setFormData({ ...formData, account_id: e.target.value })
                }
                placeholder="Введите Account ID"
                isDisabled={editingClient !== null}
              />
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>Название клиента</FormLabel>
              <Input
                value={formData.account_name}
                onChange={(e) =>
                  setFormData({ ...formData, account_name: e.target.value })
                }
                placeholder="Введите название клиента"
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>URL аватарки</FormLabel>
              <Input
                value={formData.avatar_url}
                onChange={(e) =>
                  setFormData({ ...formData, avatar_url: e.target.value })
                }
                placeholder="https://..."
              />
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>Месячный бюджет ($)</FormLabel>
              <Input
                type="number"
                step="0.01"
                value={formData.monthly_budget}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_budget: e.target.value })
                }
                placeholder="0.00"
              />
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>Дата начала работы</FormLabel>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
              />
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>Оплата в месяц (AZN)</FormLabel>
              <Input
                type="number"
                step="0.01"
                value={formData.monthly_payment_azn}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    monthly_payment_azn: e.target.value,
                  })
                }
                placeholder="0.00"
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Отмена
            </Button>
            <Button colorScheme="blue" onClick={handleSave}>
              Сохранить
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Payments Modal */}
      <Modal isOpen={paymentsModal.isOpen} onClose={closePaymentsModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Оплаты: {paymentsClient?.account_name || "—"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="sm" color="gray.600">
                Управляйте платежами клиента, чтобы отслеживать поступления.
              </Text>
              <FormControl>
                <FormLabel>Дата оплаты</FormLabel>
                <Input
                  type="date"
                  value={paymentForm.paid_at}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, paid_at: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Сумма ($)</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Комментарий</FormLabel>
                <Textarea
                  placeholder="Например: предоплата за ноябрь"
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))}
                />
              </FormControl>
              <Button colorScheme="blue" onClick={handleAddPayment}>
                Добавить оплату
              </Button>
              <Divider />
              {paymentsLoading ? (
                <Flex justify="center" py={6}>
                  <Spinner />
                </Flex>
              ) : payments.length === 0 ? (
                <Text fontSize="sm" color="gray.500">
                  Пока нет оплат.
                </Text>
              ) : (
                <Table size="sm" variant="striped">
                  <Thead>
                    <Tr>
                      <Th>Дата</Th>
                      <Th isNumeric>Сумма</Th>
                      <Th>Комментарий</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {payments.map((payment) => (
                      <Tr key={payment.id}>
                        <Td>{formatDate(payment.paid_at)}</Td>
                        <Td isNumeric>{formatMoney(payment.amount)}</Td>
                        <Td>{payment.note || "—"}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={closePaymentsModal}>Закрыть</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}

export default ClientsList;

