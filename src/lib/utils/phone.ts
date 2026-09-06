/** Телефон для tel: ссылок (только цифры, с ведущей 7 если нужно). Безопасно для клиента и сервера. */
export function phoneToTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('7') || digits.startsWith('8')
    ? `tel:+${digits.replace(/^8/, '7')}`
    : `tel:+${digits}`;
}
