import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { PageHeader } from '@/shared/ui/PageHeader';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { StatusChip } from '@/shared/ui/StatusChip';
import { QueryState } from '@/shared/ui/QueryState';
import { useAssets } from '../hooks/useAssets';
import type { Asset } from '../api/assetApi';

const columns: DataTableColumn<Asset>[] = [
  { id: 'code', label: 'Code', width: 140, render: (a) => a.code },
  { id: 'name', label: 'Name', render: (a) => a.name },
  { id: 'address', label: 'Address', render: (a) => a.address ?? a.region ?? '—' },
  {
    id: 'status',
    label: 'Status',
    width: 140,
    render: (a) => <StatusChip status={a.status} />,
  },
];

export function AssetsPage() {
  const [page] = useState(0);
  const { data, isLoading, error } = useAssets({
    page: page + 1,
    pageSize: 10,
  });

  return (
    <Box>
      <PageHeader
        title="Assets"
        subtitle="Infrastructure assets registered for inspection"
        actions={
          <Button variant="contained" startIcon={<Add />}>
            New Asset
          </Button>
        }
      />
      <QueryState isLoading={isLoading} error={error}>
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(a) => a.id}
          searchable
          searchPlaceholder="Search by name or code…"
          searchPredicate={(a, q) =>
            a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
          }
        />
      </QueryState>
    </Box>
  );
}

export default AssetsPage;
