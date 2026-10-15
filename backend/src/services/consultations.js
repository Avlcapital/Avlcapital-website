export function createConsultationService(repository, now = () => new Date()) {
  if (!repository?.create) throw new TypeError('A consultation repository is required')
  return {
    async create(data) { const timestamp = now(); return repository.create({ name: data.name, phone: data.phone, email: data.email, solution: data.solution, message: data.message, consentedAt: timestamp, createdAt: timestamp }) },
    async list({ page, pageSize }) { const [items, total] = await Promise.all([repository.list({ page, pageSize }), repository.count()]); return { items, page, pageSize, total, pages: Math.ceil(total / pageSize) } },
    get: (id) => repository.findById(id),
    setRead: (id, read) => repository.setRead(id, read, now()),
  }
}
