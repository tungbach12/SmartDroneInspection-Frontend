import { Box, Button, Stack, Typography } from '@mui/material';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../../api/contractApi';

interface CustomerWaitingQuoteStepProps {
  request: ServiceRequest;
  onOpenInbox: (requestId: string) => void;
}

export function CustomerWaitingQuoteStep({
  request,
  onOpenInbox,
}: CustomerWaitingQuoteStepProps) {
  const { locale } = useLocale();

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {locale === 'vi'
              ? 'Đang chờ Quản lý kiểm tra lịch và gửi báo giá.'
              : 'Awaiting the Manager to review the schedule and send a quote.'}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ChatOutlinedIcon fontSize="small" />}
          onClick={() => onOpenInbox(request.id)}
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            alignSelf: { xs: 'flex-start', sm: 'center' },
            flexShrink: 0,
          }}
        >
          Messages
        </Button>
      </Stack>
    </Box>
  );
}
