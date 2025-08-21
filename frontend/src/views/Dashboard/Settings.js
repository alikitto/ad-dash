// Settings.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  HStack,
  IconButton,
  Input,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import { RepeatIcon, DeleteIcon } from "@chakra-ui/icons";

const BACKEND =
  process.env.REACT_APP_BACKEND_BASE ||
  "https://ad-dash-backend-production.up.railway.app";

export default function Settings() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [adsets, setAdsets] = useState([]);
  const [avatars, setAvatars] = useState({});
  const [draft, setDraft] = useState({});

  const loadAdsets = async () => {
    const res = await fetch(`${BACKEND}/api/adsets?date_preset=last_7d`);
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  };

  const loadAvatars = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/settings/avatars`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // dict или array — без разницы
      const map = {};
      if (Array.isArray(data)) {
        data.forEach((row) => {
          if (row && row.account_id) map[row.account_id] = row.image_url || "";
        });
      } else if (data && typeof data === "object") {
        Object.entries(data).forEach(([k, v]) => (map[k] = v || ""));
      }
      return map;
    } catch (e) {
      console.warn("loadAvatars failed:", e);
      return {};
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      const [adsetsData, avatarsMap] = await Promise.all([loadAdsets(), loadAvatars()]);
      setAdsets(adsetsData);
      setAvatars(avatarsMap);
      setDraft(avatarsMap);
    } catch (e) {
      toast({ title: "Failed to load data", description: String(e), status: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accounts = useMemo(() => {
    const m = new Map();
    for (const a of adsets) {
      const key = a.account_id || a.account_name;
      if (!key) continue;
      if (!m.has(key)) {
        m.set(key, {
          accountKey: key,
          account_name: a.account_name || key,
        });
      }
    }
    return Array.from(m.values()).sort((x, y) =>
      x.account_name.localeCompare(y.account_name, "en")
    );
  }, [adsets]);

  const saveAvatar = async (accountKey) => {
    const imageUrl = (draft[accountKey] || "").trim();
    if (!imageUrl) {
      toast({ title: "Image URL is empty", status: "warning" });
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND}/api/settings/avatars`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: accountKey, imageUrl }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAvatars((prev) => ({ ...prev, [accountKey]: imageUrl }));
      toast({ title: "Avatar saved", status: "success" });
    } catch (e) {
      toast({ title: "Save failed", description: String(e), status: "error" });
    } finally {
      setLoading(false);
    }
  };

  const deleteAvatar = async (accountKey) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${BACKEND}/api/settings/avatars/${encodeURIComponent(accountKey)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAvatars((prev) => {
        const copy = { ...prev };
        delete copy[accountKey];
        return copy;
      });
      setDraft((prev) => {
        const copy = { ...prev };
        delete copy[accountKey];
        return copy;
      });
      toast({ title: "Avatar deleted", status: "info" });
    } catch (e) {
      toast({ title: "Delete failed", description: String(e), status: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" pt={{ base: "120px", md: "75px" }}>
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Text fontSize="xl" color="#fff" fontWeight="bold">
              Settings — Avatars
            </Text>
            <IconButton
              aria-label="Refresh"
              icon={<RepeatIcon />}
              onClick={refresh}
              isLoading={loading}
            />
          </HStack>
          <Text mt="2" fontSize="sm" color="gray.300">
            Вставь прямой URL изображения (Cloudinary/S3/imgur). Можно .png/.jpg.
          </Text>
        </CardHeader>

        <CardBody>
          <Box overflowX="auto">
            <Table variant="simple" color="#fff">
              <Thead>
                <Tr>
                  <Th color="white">Avatar</Th>
                  <Th color="white">Account name</Th>
                  <Th color="white">Account key</Th>
                  <Th color="white" w="40%">Image URL</Th>
                  <Th color="white">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {accounts.map((acc) => {
                  const key = acc.accountKey;
                  const current = avatars[key];
                  const value = draft[key] ?? current ?? "";
                  return (
                    <Tr key={key}>
                      <Td>
                        <Avatar
                          size="sm"
                          name={acc.account_name}
                          src={value || current || undefined}
                        />
                      </Td>
                      <Td>
                        <Text fontWeight="semibold">{acc.account_name}</Text>
                      </Td>
                      <Td>
                        <Text fontSize="xs" color="gray.300">
                          {key}
                        </Text>
                      </Td>
                      <Td>
                        <Input
                          placeholder="https://..."
                          value={value}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [key]: e.target.value }))
                          }
                          size="sm"
                          color="white"
                          borderColor="gray.600"
                        />
                      </Td>
                      <Td>
                        <HStack>
                          <Button
                            size="sm"
                            colorScheme="teal"
                            onClick={() => saveAvatar(key)}
                            isLoading={loading}
                          >
                            Save
                          </Button>
                          <IconButton
                            size="sm"
                            aria-label="Delete"
                            icon={<DeleteIcon />}
                            onClick={() => deleteAvatar(key)}
                            isDisabled={!current}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
                {!accounts.length && (
                  <Tr>
                    <Td colSpan="5">
                      <Text textAlign="center" color="gray.300">
                        No accounts found.
                      </Text>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>
    </Flex>
  );
}
