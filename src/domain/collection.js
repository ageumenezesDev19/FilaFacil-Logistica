export const priorities = { LOW: 'Baixa', NORMAL: 'Normal', HIGH: 'Alta' };
export const statuses = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
};

export class ValidationError extends Error {}
export class NotFoundError extends Error {}

export function normalizeName(name) {
  return name.normalize('NFC').toLowerCase();
}
