export function redirectToPayPalApproval(approvalUrl: string): void {
  window.location.assign(approvalUrl);
}
