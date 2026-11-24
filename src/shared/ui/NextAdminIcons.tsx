import { useId, type SVGProps } from 'react';
import {
  GlassAiFindingsIcon,
  GlassBellIcon,
  GlassCatalogIcon,
  GlassChatIcon,
  GlassChecklistIcon,
  GlassChartsIcon,
  GlassChevronDownIcon,
  GlassContractIcon,
  GlassDashboardIcon,
  GlassDotsIcon,
  GlassMoonIcon,
  GlassPaymentIcon,
  GlassReportIcon,
  GlassScheduleIcon,
  GlassSearchIcon,
  GlassSidebarToggleIcon,
  GlassSunIcon,
  GlassTrendDownIcon,
  GlassTrendUpIcon,
  GlassUserIcon,
  GlassUsersIcon,
  GlassAssetIcon,
} from './GradientGlassIcons';

export function NextAdminLogoMark(props: SVGProps<SVGSVGElement>) {
  const gradId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      data-glass-icon="true"
      {...props}
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2DD4BF" />
        </linearGradient>
      </defs>
      <path
        d="M9.97 12.72A18 18 0 0 1 33.6 8.78L29.88 18A8.4 8.4 0 0 0 19.83 16.71Z"
        fill="#3B82F6"
      />
      <path
        d="M35.28 9.97A18 18 0 0 1 39.22 33.6L30 29.88A8.4 8.4 0 0 0 31.29 19.83Z"
        fill="#0EA5E9"
      />
      <path
        d="M38.03 35.28A18 18 0 0 1 14.4 39.22L18.12 30A8.4 8.4 0 0 0 28.17 31.29Z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M12.72 38.03A18 18 0 0 1 8.78 14.4L18 18.12A8.4 8.4 0 0 0 16.71 28.17Z"
        fill="#2B84EB"
      />
      <circle cx="24" cy="24" r="5.6" fill={`url(#${gradId})`} />
      <circle cx="24" cy="24" r="2.4" fill="#FFFFFF" />
    </svg>
  );
}

export function NextAdminSidebarToggleIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassSidebarToggleIcon size={18} {...props} />;
}

export function NextAdminHomeIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassDashboardIcon size={18} {...props} />;
}

export function NextAdminCalendarIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassScheduleIcon size={18} {...props} />;
}

export function NextAdminProfileIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassUserIcon size={18} {...props} />;
}

export function NextAdminTeamIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassUsersIcon size={18} {...props} />;
}

export function NextAdminTaskIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassChecklistIcon size={18} {...props} />;
}

export function NextAdminFormsIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassChatIcon size={18} {...props} />;
}

export function NextAdminTablesIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassAssetIcon size={18} {...props} />;
}

export function NextAdminPagesIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassReportIcon size={18} {...props} />;
}

export function NextAdminChartsIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassChartsIcon size={18} {...props} />;
}

export function NextAdminInvoiceIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassContractIcon size={18} {...props} />;
}

export function NextAdminSearchIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassSearchIcon size={20} {...props} />;
}

export function NextAdminMoonIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassMoonIcon size={20} {...props} />;
}

export function NextAdminSunIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassSunIcon size={20} {...props} />;
}

export function NextAdminBellIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassBellIcon size={20} {...props} />;
}

export function NextAdminChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassChevronDownIcon size={20} {...props} />;
}

export function NextAdminDotsIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassDotsIcon size={18} {...props} />;
}

export function NextAdminEyeDuotoneIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassAiFindingsIcon size={32} {...props} />;
}

export function NextAdminWalletDuotoneIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassPaymentIcon size={32} {...props} />;
}

export function NextAdminCubeDuotoneIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassCatalogIcon size={32} {...props} />;
}

export function NextAdminUsersDuotoneIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassUsersIcon size={32} {...props} />;
}

export function NextAdminTrendUpIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassTrendUpIcon size={16} {...props} />;
}

export function NextAdminTrendDownIcon(props: SVGProps<SVGSVGElement>) {
  return <GlassTrendDownIcon size={16} {...props} />;
}
