export function createPartnerService(repository, now = () => new Date()) {
  if (!repository?.create) throw new TypeError('A partner enquiry repository is required')
  return {
    async create(data) { const timestamp = now(); return repository.create({ contactName: data.contactName, organization: data.organization, role: data.role, phone: data.phone, email: data.email, partnerType: data.partnerType, location: data.location, stationCount: data.stationCount ? Number(data.stationCount) : null, interest: data.interest, consentedAt: timestamp, createdAt: timestamp }) },
    async list(query) { const [items, total] = await Promise.all([repository.list(query), repository.count(query)]); return { items, page: query.page, pageSize: query.pageSize, total, pages: Math.ceil(total / query.pageSize) } },
    get: (id) => repository.findById(id),
    setRead: (id, read) => repository.setRead(id, read, now()),
  }
}
