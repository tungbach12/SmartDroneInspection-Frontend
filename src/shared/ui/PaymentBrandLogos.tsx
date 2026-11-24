import { Box } from '@mui/material';

/** Compact VNPay emblem rendered inside settlement cards and payment history views. */
export function VnPayLogoMark() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 96,
        height: 32,
        px: 1,
        borderRadius: '6px',
        bgcolor: '#FFFFFF',
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <svg width="78" height="20" viewBox="0 0 116 28" fill="none">
        <path d="M4 7L12.5 23H17L8.5 7H4Z" fill="#005BAA" />
        <path d="M12.5 23L21.5 5H26L17 23H12.5Z" fill="#ED1C24" />
        <text
          x="33"
          y="19.5"
          fill="#005BAA"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="15.5"
          fontWeight="800"
          letterSpacing="0.4"
        >
          VNPAY
        </text>
      </svg>
    </Box>
  );
}

/** Compact VietQR · SePay brand mark rendered alongside SePay QR payment/payout actions. */
export function SepayVietQrLogoMark() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 96,
        height: 32,
        px: 1,
        borderRadius: '6px',
        bgcolor: '#FFFFFF',
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <svg width="86" height="20" viewBox="0 0 144 28" fill="none">
        <rect x="2" y="5" width="7" height="7" rx="1.2" fill="#0B4EA2" />
        <rect x="11" y="5" width="7" height="7" rx="1.2" fill="#E11D48" />
        <rect x="2" y="14" width="7" height="7" rx="1.2" fill="#0B4EA2" />
        <rect x="12" y="15" width="5" height="5" rx="1" fill="#0B4EA2" />
        <text
          x="24"
          y="19"
          fill="#0B4EA2"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="13.5"
          fontWeight="800"
        >
          Viet
        </text>
        <text
          x="52"
          y="19"
          fill="#E11D48"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="13.5"
          fontWeight="800"
        >
          QR
        </text>
        <circle cx="80" cy="14" r="1.75" fill="#CBD5E1" />
        <text
          x="87"
          y="18.5"
          fill="#0284C7"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="12"
          fontWeight="700"
        >
          SePay
        </text>
      </svg>
    </Box>
  );
}
