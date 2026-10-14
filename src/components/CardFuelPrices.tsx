import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';
import { adminApi } from '@/utils/adminApi';

interface CardFuelPricesProps {
  cardId: number;
  fuelTypes: any[];
}

export default function CardFuelPrices({ cardId, fuelTypes }: CardFuelPricesProps) {
  const [items, setItems] = useState<any[]>([]);
  const [newFuelTypeId, setNewFuelTypeId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setItems(await adminApi.cardFuelPrices.getAll(cardId));
  };

  useEffect(() => {
    load();
  }, [cardId]);

  const usedIds = items.map((i) => i.fuel_type_id);
  const available = fuelTypes.filter((ft) => ft.unit !== '₽' && ft.name !== 'Рубль' && !usedIds.includes(ft.id));

  const handleAdd = async () => {
    setError('');
    if (!newFuelTypeId || newPrice === '') {
      setError('Выберите топливо и укажите цену');
      return;
    }
    try {
      await adminApi.cardFuelPrices.create({
        fuel_card_id: cardId,
        fuel_type_id: parseInt(newFuelTypeId),
        price: parseFloat(newPrice)
      });
      setNewFuelTypeId('');
      setNewPrice('');
      await load();
    } catch {
      setError('Не удалось добавить топливо');
    }
  };

  const handleSave = async (id: number) => {
    await adminApi.cardFuelPrices.update(id, parseFloat(editingPrice) || 0);
    setEditingId(null);
    await load();
  };

  const handleDelete = async (id: number) => {
    await adminApi.cardFuelPrices.delete(id);
    await load();
  };

  return (
    <div className="space-y-4 py-2">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Select value={newFuelTypeId} onValueChange={setNewFuelTypeId}>
            <SelectTrigger>
              <SelectValue placeholder="Вид топлива" />
            </SelectTrigger>
            <SelectContent>
              {available.map((ft) => (
                <SelectItem key={ft.id} value={ft.id.toString()}>{ft.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input type="number" step="0.01" placeholder="Цена, ₽" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-32" />
        <Button onClick={handleAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Icon name="Plus" size={16} />
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Топливо</TableHead>
            <TableHead>Цена, ₽</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">Топливо не добавлено</TableCell>
            </TableRow>
          )}
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.fuel_type}</TableCell>
              <TableCell>
                {editingId === item.id ? (
                  <Input type="number" step="0.01" value={editingPrice} onChange={(e) => setEditingPrice(e.target.value)} className="w-28 h-8" />
                ) : (
                  item.price.toFixed(2)
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {editingId === item.id ? (
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleSave(item.id)}>
                      <Icon name="Check" size={14} />
                    </Button>
                  ) : (
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => { setEditingId(item.id); setEditingPrice(item.price.toString()); }}>
                      <Icon name="Pencil" size={14} />
                    </Button>
                  )}
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                    <Icon name="Trash2" size={14} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
