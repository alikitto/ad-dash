import React, { useState, useEffect } from "react";
import {
  Flex,
  Text,
  Button,
  useToast,
  VStack,
  Input,
  FormControl,
  FormLabel,
  Code,
  Spinner,
  Table, Thead, Tbody, Tr, Th, Td, IconButton
} from "@chakra-ui/react";
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

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const response = await fetch("https://ad-dash-backend-production.up.railway.app/api/settings/avatars"); // ЗАМЕНИТЕ НА ВАШ URL
        const data = await response.json();
        setAvatars(data);
      } catch (error) {
        toast({ title: "Error fetching avatars", status: "error", duration: 3000 });
      } finally {
        setLoading(false);
      }
    };
    fetchAvatars();
  }, [toast]);

  const handleSave = async () => {
    if (!accountId || !imageUrl) {
        // ... (код обработки ошибки)
        return;
    }

    try {
        const response = await fetch("https://ad-dash-backend-production.up.railway.app/api/settings/avatars", { // ЗАМЕНИТЕ НА ВАШ URL
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId, imageUrl })
        });
        if(!response.ok) throw new Error("Failed to save");
        const newAvatar = await response.json();
        setAvatars({...avatars, [newAvatar.account_id]: newAvatar.image_url});
        setAccountId("");
        setImageUrl("");
        toast({ title: "Avatar saved!", status: "success", duration: 2000 });
    } catch (error) {
        toast({ title: "Error saving avatar", status: "error", duration: 3000 });
    }
  };

  return (
    <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader>
          <Text fontSize="xl" color="#fff" fontWeight="bold">Client Avatars</Text>
        </CardHeader>
        <CardBody>
          {loading ? <Spinner/> : (
            <VStack spacing={4} align="stretch">
                {/* ... (Форма для добавления остается прежней) ... */}
                <FormControl>
                    <FormLabel color="white">Ad Account ID (numbers only)</FormLabel>
                    <Input placeholder="e.g., 1234567890123" value={accountId} onChange={(e) => setAccountId(e.target.value)} color="white" />
                </FormControl>
                <FormControl>
                    <FormLabel color="white">Image URL</FormLabel>
                    <Input placeholder="https://.../image.png" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} color="white" />
                </FormControl>
                <Button onClick={handleSave} colorScheme="teal">Save Avatar Link</Button>

                {/* Таблица для отображения сохраненных аватарок */}
                <Table variant="simple" color="white" mt={8}>
                    <Thead>
                        <Tr>
                            <Th color="gray.400">Account ID</Th>
                            <Th color="gray.400">Image URL</Th>
                            <Th color="gray.400">Action</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {Object.entries(avatars).map(([id, url]) => (
                            <Tr key={id}>
                                <Td>{id}</Td>
                                <Td><Text isTruncated maxWidth="300px">{url}</Text></Td>
                                <Td><IconButton aria-label="Delete" icon={<DeleteIcon/>} size="sm" colorScheme="red" /></Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </VStack>
          )}
        </CardBody>
      </Card>
    </Flex>
  );
}

export default Settings;
