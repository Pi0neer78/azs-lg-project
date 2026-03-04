const API_URLS = {
  clients: 'https://functions.poehali.dev/5d6b9503-f733-4035-8881-786d1f28023b',
  stations: 'https://functions.poehali.dev/80fb772c-a848-45ed-84c5-780c2b3e690c',
  fuelTypes: 'https://functions.poehali.dev/7f376587-531e-4810-8ccc-b25240dd48b2',
  cards: 'https://functions.poehali.dev/8159060e-0a1a-41d4-87ad-04d9b1367d78',
  operations: 'https://functions.poehali.dev/85e04362-ba57-45bf-8226-8b92c7bea08d',
};

export const adminApi = {
  clients: {
    getAll: async () => {
      try {
        const response = await fetch(API_URLS.clients);
        if (!response.ok) {
          console.error('Fetch error:', response.status, response.statusText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.clients || [];
      } catch (error) {
        console.error('Fetch error:', error instanceof Error ? error.message : 'Unknown error', 'for', API_URLS.clients);
        throw error;
      }
    },
    create: async (client: any) => {
      const response = await fetch(API_URLS.clients, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Client creation error:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    update: async (client: any) => {
      await fetch(API_URLS.clients, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
    },
    delete: async (id: number) => {
      await fetch(`${API_URLS.clients}?id=${id}`, {
        method: 'DELETE'
      });
    }
  },

  stations: {
    getAll: async () => {
      const response = await fetch(API_URLS.stations);
      const data = await response.json();
      return data.stations || [];
    },
    create: async (station: any) => {
      await fetch(API_URLS.stations, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(station)
      });
    },
    update: async (station: any) => {
      await fetch(API_URLS.stations, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(station)
      });
    },
    delete: async (id: number) => {
      await fetch(`${API_URLS.stations}?id=${id}`, {
        method: 'DELETE'
      });
    }
  },

  fuelTypes: {
    getAll: async () => {
      const response = await fetch(API_URLS.fuelTypes);
      const data = await response.json();
      return data.fuel_types || [];
    },
    create: async (fuelType: any) => {
      await fetch(API_URLS.fuelTypes, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fuelType)
      });
    },
    update: async (fuelType: any) => {
      await fetch(API_URLS.fuelTypes, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fuelType)
      });
    },
    delete: async (id: number) => {
      await fetch(`${API_URLS.fuelTypes}?id=${id}`, {
        method: 'DELETE'
      });
    }
  },

  cards: {
    getAll: async () => {
      const response = await fetch(API_URLS.cards);
      const data = await response.json();
      return data.cards || [];
    },
    create: async (card: any) => {
      const response = await fetch(API_URLS.cards, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(errorData.error || `HTTP ${response.status}`);
        (err as any).status = response.status;
        (err as any).data = errorData;
        throw err;
      }
      return response.json();
    },
    update: async (card: any) => {
      const response = await fetch(API_URLS.cards, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Card update error:', response.status, errorText);
        throw new Error(`HTTP ${response.status} : ${API_URLS.cards}`);
      }
      return response.json();
    },
    delete: async (id: number) => {
      await fetch(`${API_URLS.cards}?id=${id}`, {
        method: 'DELETE'
      });
    }
  },

  operations: {
    getAll: async () => {
      const response = await fetch(API_URLS.operations);
      const data = await response.json();
      return data.operations || [];
    },
    create: async (operation: any) => {
      await fetch(API_URLS.operations, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation)
      });
    },
    update: async (operation: any) => {
      await fetch(API_URLS.operations, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation)
      });
    },
    delete: async (id: number) => {
      await fetch(`${API_URLS.operations}?id=${id}`, {
        method: 'DELETE'
      });
    }
  }
};