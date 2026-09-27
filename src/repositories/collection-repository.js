export function createCollectionRepository(database) {
  return {
    create(data) {
      return database.collection.create({ data });
    },
    async list(where = {}) {
      const collections = await database.collection.findMany({ where, orderBy: { id: 'asc' } });
      const name = where.customerNameSearch?.contains;
      // Prisma translates contains to LIKE, where % and _ are wildcards.
      // Narrow the database matches to literal substrings for customer-entered text.
      return name === undefined ? collections : collections.filter((collection) => collection.customerNameSearch.includes(name));
    },
    findById(id) {
      return database.collection.findUnique({ where: { id } });
    },
    updateStatus(id, status) {
      return database.collection.update({ where: { id }, data: { status } });
    },
    delete(id) {
      return database.collection.delete({ where: { id } });
    },
  };
}
