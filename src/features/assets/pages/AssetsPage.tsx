import { useState } from 'react';
import { Add } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { PageHeader } from '@/shared/ui/PageHeader';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { QueryState } from '@/shared/ui/QueryState';
import { useAssets } from '../hooks/useAssets';
import type { Asset } from '../api/assetApi';

const columns: DataTableColumn<Asset>[] = [
  { id: 'code', label: 'Code', width: 140, render: (asset) => asset.code },
  { id: 'name', label: 'Name', render: (asset) => asset.name },
  { id: 'address', label: 'Address', render: (asset) => asset.address ?? asset.region ?? '—' },
  {
    id: 'status',
    label: 'Status',
    width: 140,
    render: (asset) => <StatusChip status={asset.status} />,
  },
];

export function AssetsPage() {
  const [page] = useState(0);
  const { data, isLoading, error, refetch } = useAssets({
    page: page + 1,
    pageSize: 10,
  });

  const newAssetButton = (
    <Button variant="contained" startIcon={<Add />}>
      New asset
    </Button>
  );

  return (
    <Box>
      <PageHeader
        title="Assets"
        subtitle="Infrastructure assets registered for inspection"
        actions={newAssetButton}
      />
      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={Boolean(data && data.items.length === 0)}
        empty={(
          <EmptyState
            title="No assets registered"
            description="Add an infrastructure asset before requesting an inspection."
            action={newAssetButton}
          />
        )}
      >
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(asset) => asset.id}
          searchable
          searchPlaceholder="Search by name or code…"
          searchPredicate={(asset, query) =>
            asset.name.toLowerCase().includes(query) || asset.code.toLowerCase().includes(query)
          }
        />
      </QueryState>
    </Box>
  );
}

export default AssetsPage;
