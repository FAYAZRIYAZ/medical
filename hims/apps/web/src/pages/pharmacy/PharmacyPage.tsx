import { useState } from 'react';
import { Search, Package, AlertTriangle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/lib/utils';

interface Drug {
  _id: string;
  genericName: string;
  brandName: string;
  form: string;
  strength: string;
  schedule: string;
  gstRate: number;
  minStockLevel: number;
}

interface Batch {
  _id: string;
  drugId: { genericName: string; brandName: string; form: string; strength: string };
  batchNumber: string;
  quantity: number;
  soldQuantity: number;
  unitMrp: number;
  expiryDate: string;
}

interface LowStockItem {
  _id: string;
  totalAvailable: number;
  drug: { genericName: string; brandName: string; minStockLevel: number };
}

interface DispensingRecord {
  _id: string;
  patientId: { firstName: string; lastName: string; uhid: string } | null;
  items: { drugName: string; quantityDispensed: number; totalAmount: number }[];
  totalAmount: number;
  dispensedAt: string;
}

export function PharmacyPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: drugs, isLoading: drugsLoading } = useQuery({
    queryKey: ['pharmacy', 'drugs', debouncedSearch],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Drug[] }>('/pharmacy/drugs', {
        params: { q: debouncedSearch || undefined, limit: 50 },
      });
      return res.data.data;
    },
  });

  const { data: stockBatches, isLoading: stockLoading } = useQuery({
    queryKey: ['pharmacy', 'stock'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Batch[] }>('/pharmacy/stock');
      return res.data.data;
    },
  });

  const { data: dispensingRecords, isLoading: dispensingLoading } = useQuery({
    queryKey: ['pharmacy', 'dispensing'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: DispensingRecord[] }>('/pharmacy/dispensing', {
        params: { limit: 20 },
      });
      return res.data.data;
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ['pharmacy', 'low-stock'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: LowStockItem[] }>('/pharmacy/stock/low');
      return res.data.data;
    },
  });

  const drugList = drugs ?? [];
  const batches = stockBatches ?? [];
  const dispensing = dispensingRecords ?? [];
  const lowStockItems = lowStock ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy</h1>
          <p className="text-sm text-muted-foreground">Drug inventory and dispensing management</p>
        </div>
        {lowStockItems.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium border border-red-200">
            <AlertTriangle className="h-4 w-4" />
            {lowStockItems.length} low stock alert{lowStockItems.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Drug Catalog</TabsTrigger>
          <TabsTrigger value="stock">Stock Batches</TabsTrigger>
          <TabsTrigger value="dispensing">Dispensing History</TabsTrigger>
        </TabsList>

        {/* Drug Catalog */}
        <TabsContent value="inventory" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by brand or generic name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {drugsLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : drugList.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No drugs found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {drugList.map((drug) => (
                <Card key={drug._id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{drug.brandName}</p>
                        <Badge variant="outline" className="text-xs">{drug.form}</Badge>
                        <Badge variant="outline" className="text-xs">{drug.strength}</Badge>
                        <Badge variant="secondary" className="text-xs">Sch-{drug.schedule}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{drug.genericName} · GST {drug.gstRate}%</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Min. Stock</p>
                      <p className="text-sm font-semibold">{drug.minStockLevel} units</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stock Batches */}
        <TabsContent value="stock" className="mt-4">
          {stockLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : batches.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No stock batches found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {batches.map((batch) => {
                const available = batch.quantity - batch.soldQuantity;
                const isExpiringSoon = new Date(batch.expiryDate) < new Date(Date.now() + 90 * 24 * 3600 * 1000);
                const isLow = available < 100;
                return (
                  <Card key={batch._id} className={isLow ? 'border-red-200 bg-red-50/50' : ''}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{batch.drugId?.brandName}</p>
                          {isLow && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          {isExpiringSoon && <Badge variant="warning" className="text-xs">Expiring soon</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {batch.drugId?.genericName} · Batch: {batch.batchNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(batch.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                          {available} available
                        </p>
                        <p className="text-xs text-muted-foreground">MRP: {formatCurrency(batch.unitMrp)}</p>
                        <p className="text-xs text-muted-foreground">Sold: {batch.soldQuantity}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Dispensing History */}
        <TabsContent value="dispensing" className="mt-4">
          {dispensingLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : dispensing.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No dispensing records yet</p>
              <p className="text-sm text-muted-foreground mt-1">Records appear after prescriptions are dispensed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dispensing.map((record) => (
                <Card key={record._id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">
                        {record.patientId
                          ? `${record.patientId.firstName} ${record.patientId.lastName}`
                          : 'Walk-in Patient'}
                        {record.patientId?.uhid && (
                          <span className="text-xs text-muted-foreground ml-2">{record.patientId.uhid}</span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(record.items ?? []).slice(0, 3).map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {item.drugName} ×{item.quantityDispensed}
                          </Badge>
                        ))}
                        {(record.items ?? []).length > 3 && (
                          <Badge variant="outline" className="text-xs">+{record.items.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{formatCurrency(record.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.dispensedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
