export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-GH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export function formatCurrency(amount) {
  return `GHS ${Number(amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

export function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  return phone;
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
