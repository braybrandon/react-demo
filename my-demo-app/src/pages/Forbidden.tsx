import { Title, Text } from '@mantine/core';

export default function Forbidden() {
  return (
    <div>
      <Title order={2}>403 — Forbidden</Title>
      <Text mt="sm">You do not have permission to view this page.</Text>
    </div>
  );
}
