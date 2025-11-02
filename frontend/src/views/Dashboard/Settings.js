import React, { useState, useEffect, useCallback } from "react";
import { Flex, Text, Button, useToast, VStack, Input, FormControl, FormLabel, Spinner, Table, Thead, Tbody, Tr, Th, Td, IconButton } from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";

function Settings() {
  const [avatars, setAvatars] = useState({});
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const toast = useToast();

  const fetchAvatars = useCallback(async () => {
    try {
      // ВАЖНО: Укажите здесь URL вашего *основного* бэкенда.
      // Railway направит запрос на правильный сервис.
      const response = await fetch("https://ad-dash-backend-production-023f.up.railway.app/api/settings/avatars");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setAvatars(data);
    } catch (error) {
      toast({ title: "Error fetching avatars", description: error.message, status: "error", duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  const handleSave = async () => {
    if (!accountId || !imageUrl) return;
    try {
      const response = await fetch("https://ad-dash-backend-production-023f.up.railway.app/api/settings/avatars", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, imageUrl })
      });
      if (!response.ok) throw new Error("Failed to save");
      setAccountId("");
      setImageUrl("");
      toast({ title: "Avatar saved!", status: "success", duration: 2000 });
      fetchAvatars(); // Обновляем список
    } catch (error) {
      toast({ title: "Error saving avatar", description: error.message, status: "error", duration: 3000 });
    }
  };

  const handleDelete = async (id) => {
    try {
        const response = await fetch(`https://ad-dash-backend-production.up.railway.app/api/settings/avatars/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to delete");
        toast({ title: "Avatar deleted!", status: "warning", duration: 2000 });
        fetchAvatars(); // Обновляем список
    } catch (error) {
        toast({ title: "Error deleting avatar", description: error.message, status: "error", duration: 3000 });
    }
  };

  return (
    <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader><Text fontSize="xl" color="#fff" fontWeight="bold">Client Avatars Settings</Text></CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch" mb={8}>
            <FormControl>
              <FormLabel color="white">Ad Account ID (только цифры)</FormLabel>
              <Input placeholder="1234567890123" value={accountId} onChange={(e) => setAccountId(e.target.value)} color="white" />
            </FormControl>
            <FormControl>
              <FormLabel color="white">Image URL</FormLabel>
              <Input placeholder="https://.../avatar.png" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} color="white" />
            </FormControl>
            <Button onClick={handleSave} colorScheme="teal">Save / Update Avatar</Button>
          </VStack>

          {loading ? <Spinner color="white" /> : (
            <Table variant="simple" color="white">
              <Thead>
                <Tr>
                  <Th color="gray.400">Account ID</Th>
                  <Th color="gray.400">Image URL</Th>
                  <Th color="gray.400">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(avatars).map(([id, url]) => (
                  <Tr key={id}>
                    <Td>{id}</Td>
                    <Td><Text isTruncated maxWidth="300px">{url}</Text></Td>
                    <Td><IconButton aria-label="Delete" icon={<DeleteIcon />} size="sm" colorScheme="red" onClick={() => handleDelete(id)} /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </Flex>
  );
}

export default Settings;
