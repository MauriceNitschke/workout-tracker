export function notify(
  message: string,
  tone: 'success' | 'error' = 'success'
): void {
  window.dispatchEvent(
    new CustomEvent('training-os-notification', { detail: { message, tone } })
  );
}
