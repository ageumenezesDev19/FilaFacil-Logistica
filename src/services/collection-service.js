import { priorities, statuses, normalizeName, ValidationError, NotFoundError } from '../domain/collection.js';

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${label} é obrigatório.`);
  }
  return value.trim();
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1 || value > 2147483647) {
    throw new ValidationError(`${label} deve ser um inteiro positivo de até 2147483647.`);
  }
  return value;
}

function validOption(value, options, label) {
  if (!Object.hasOwn(options, value)) {
    throw new ValidationError(`${label} inválido(a).`);
  }
  return value;
}

export function createCollectionService(repository) {
  async function get(id) {
    positiveInteger(id, 'ID');
    const collection = await repository.findById(id);
    if (!collection) throw new NotFoundError('Coleta não encontrada.');
    return collection;
  }

  return {
    create(input) {
      const customerName = requiredText(input.customerName, 'Nome do cliente');
      return repository.create({
        customerName,
        customerNameSearch: normalizeName(customerName),
        address: requiredText(input.address, 'Endereço'),
        packageCount: positiveInteger(input.packageCount, 'Quantidade de pacotes'),
        priority: validOption(input.priority, priorities, 'Prioridade'),
        status: 'PENDING',
      });
    },
    list() {
      return repository.list();
    },
    filterByStatus(status) {
      return repository.list({ status: validOption(status, statuses, 'Status') });
    },
    filterByPriority(priority) {
      return repository.list({ priority: validOption(priority, priorities, 'Prioridade') });
    },
    filterByName(name) {
      const term = normalizeName(requiredText(name, 'Nome para busca'));
      return repository.list({ customerNameSearch: { contains: term } });
    },
    get,
    async updateStatus(id, status) {
      validOption(status, statuses, 'Status');
      await get(id);
      return repository.updateStatus(id, status);
    },
    async delete(id) {
      await get(id);
      return repository.delete(id);
    },
  };
}
