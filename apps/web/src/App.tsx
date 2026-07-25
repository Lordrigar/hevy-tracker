import { useEffect, useState } from 'react';
import { Badge, Box, Card, Heading, Stack, Text } from '@chakra-ui/react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export function App() {
  const [state, setState] = useState<'checking' | 'connected' | 'unavailable'>('checking');
  useEffect(() => {
    fetch(`${apiUrl}/health`)
      .then((response) => setState(response.ok ? 'connected' : 'unavailable'))
      .catch(() => setState('unavailable'));
  }, []);
  const color = state === 'connected' ? 'green' : state === 'unavailable' ? 'red' : 'yellow';
  return (
    <Box bg="bg.subtle" minH="100vh" p={{ base: 6, md: 12 }}>
      <Stack maxW="720px" mx="auto" gap="6">
        <Box>
          <Heading>Hevy Tracker</Heading>
          <Text color="fg.muted">Local training analytics — project foundation</Text>
        </Box>
        <Card.Root>
          <Card.Body>
            <Stack gap="3">
              <Text fontWeight="medium">API connection</Text>
              <Badge alignSelf="start" colorPalette={color}>
                {state}
              </Badge>
              <Text color="fg.muted" fontSize="sm">
                The dashboard only checks the local API health endpoint. It does not sync Hevy or
                run analysis automatically.
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>
      </Stack>
    </Box>
  );
}
