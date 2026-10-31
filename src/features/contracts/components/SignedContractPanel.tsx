import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { type ServiceRequest } from '../api/contractApi';
import { useDownloadSignedContract, useUploadSignedContract } from '../hooks/useContracts';

interface SignedContractPanelProps {
  request: ServiceRequest;
  manager: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function SignedContractPanel({
  request,
  manager,
  onChanged,
  onError,
}: SignedContractPanelProps) {
  const upload = useUploadSignedContract(request.id);
  const download = useDownloadSignedContract();
  const [file, setFile] = useState<File | null>(null);

  const submit = async () => {
    if (!file) {
      onError('Choose the signed contract scan (PDF, JPEG, or PNG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError('The signed contract scan must be 10 MB or smaller.');
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      onError('Choose a PDF, JPEG, or PNG signed contract scan.');
      return;
    }
    try {
      await upload.mutateAsync(file);
      setFile(null);
      onChanged();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to upload contract.';
      onError(msg);
    }
  };

  const downloadContract = async () => {
    try {
      const blob = await download.mutateAsync(request.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = request.contractFileName || 'signed-contract';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to download contract.';
      onError(msg);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          Paper contract evidence
        </Typography>

        {request.contractFileName ? (
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: 'success.50',
              borderColor: 'success.light',
            }}
          >
            <Stack spacing={2}>
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Signed scan recorded: {request.contractFileName} · {request.contractContentType} · {request.contractSizeBytes} bytes
              </Alert>
              <Box>
                <LoadingButton
                  variant="contained"
                  color="success"
                  startIcon={<FileDownloadOutlinedIcon />}
                  loading={download.isPending}
                  onClick={() => void downloadContract()}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Download signed contract
                </LoadingButton>
              </Box>
            </Stack>
          </Paper>
        ) : manager && request.status === 'ACCEPTED' ? (
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload the scan after both parties sign the paper contract offline. No online signature or payment is collected here.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              <Button component="label" variant="outlined" startIcon={<CloudUploadOutlinedIcon />} sx={{ borderRadius: 2 }}>
                {file?.name ?? 'Choose signed contract scan'}
                <input
                  hidden
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              <LoadingButton
                variant="contained"
                color="primary"
                loading={upload.isPending}
                disabled={!file}
                onClick={() => void submit()}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Upload signed scan
              </LoadingButton>
            </Stack>
          </Box>
        ) : (
          <Typography color="text.secondary">
            Customer acceptance is required before the Manager can upload contract evidence.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
