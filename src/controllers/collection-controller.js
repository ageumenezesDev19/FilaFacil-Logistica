import { priorities, statuses, ValidationError, NotFoundError } from '../domain/collection.js';
import { InputClosedError } from './terminal.js';

function parseInteger(text) {
  return /^\d+$/.test(text) ? Number(text) : NaN;
}

export async function runMenu(service, terminal) {
  async function choose(label, options) {
    const entries = Object.entries(options);
    terminal.write(`${label}:`);
    entries.forEach(([, text], index) => terminal.write(`${index + 1}. ${text}`));
    const index = parseInteger(await terminal.ask('Escolha: '));
    const entry = entries[index - 1];
    if (!entry) throw new ValidationError('Opção inválida.');
    return entry[0];
  }

  function display(collections) {
    if (!collections.length) {
      terminal.write('Nenhuma coleta encontrada.');
      return;
    }
    for (const collection of collections) {
      terminal.write(`
ID: ${collection.id}
Cliente: ${collection.customerName}
Endereço: ${collection.address}
Pacotes: ${collection.packageCount}
Prioridade: ${priorities[collection.priority]}
Status: ${statuses[collection.status]}
Criada em: ${collection.createdAt.toISOString()}`);
    }
  }

  terminal.write('FilaFácil Logística');
  while (true) {
    terminal.write(`
1. Cadastrar coleta
2. Listar coletas
3. Filtrar coletas
4. Atualizar status
5. Excluir coleta
0. Sair`);
    try {
      const action = await terminal.ask('Opção: ');
      if (action === '0') break;
      if (action === '1') {
        const customerName = await terminal.ask('Nome do cliente: ');
        const address = await terminal.ask('Endereço: ');
        const packageCount = parseInteger(await terminal.ask('Quantidade de pacotes: '));
        const priority = await choose('Prioridade', priorities);
        const collection = await service.create({ customerName, address, packageCount, priority });
        terminal.write(`Coleta cadastrada. ID: ${collection.id}`);
      } else if (action === '2') {
        display(await service.list());
      } else if (action === '3') {
        const filter = await choose('Filtrar por', { STATUS: 'Status', PRIORITY: 'Prioridade', NAME: 'Nome do cliente' });
        if (filter === 'STATUS') display(await service.filterByStatus(await choose('Status', statuses)));
        if (filter === 'PRIORITY') display(await service.filterByPriority(await choose('Prioridade', priorities)));
        if (filter === 'NAME') display(await service.filterByName(await terminal.ask('Parte do nome: ')));
      } else if (action === '4') {
        const id = parseInteger(await terminal.ask('ID da coleta: '));
        const status = await choose('Novo status', statuses);
        await service.updateStatus(id, status);
        terminal.write('Status atualizado.');
      } else if (action === '5') {
        const id = parseInteger(await terminal.ask('ID da coleta: '));
        display([await service.get(id)]);
        const answer = (await terminal.ask('Excluir permanentemente? (s/n): ')).toLowerCase();
        if (answer === 's') {
          await service.delete(id);
          terminal.write('Coleta excluída.');
        } else if (answer === 'n') terminal.write('Exclusão cancelada.');
        else throw new ValidationError('Confirmação inválida. Exclusão cancelada.');
      } else throw new ValidationError('Opção inválida.');
    } catch (error) {
      if (error instanceof InputClosedError) break;
      if (error instanceof ValidationError || error instanceof NotFoundError) terminal.write(error.message);
      else terminal.write('Não foi possível concluir a operação no banco. Nenhum sucesso foi confirmado. Tente novamente.');
    }
  }
  terminal.write('Até logo!');
}
