const clean = (record, type) => ({ id: record._id?.toString(), type, title: record.organization || record.name || record.email, subtitle: record.contactName || record.solution || record.email, status: record.status || (record.readAt ? 'read' : 'unread'), occurredAt: record.lastMessageAt || record.createdAt })

export function createDashboardService({ consultations, partners, chats, admins }) {
  return {
    async overview() {
      const sections = await Promise.allSettled([
        Promise.all([consultations.count({ read: 'unread' }), consultations.count(), consultations.recent(8)]),
        Promise.all([partners.count({ read: 'unread' }), partners.count(), partners.recent(8)]),
        Promise.all([chats.count({ status: 'open' }), chats.count(), chats.recent(8)]),
        admins.count(),
      ])
      const unavailable = []
      const take = (index, name, fallback) => sections[index].status === 'fulfilled' ? sections[index].value : (unavailable.push(name), fallback)
      const consultation = take(0, 'consultations', [null, null, []]); const partner = take(1, 'partners', [null, null, []]); const chat = take(2, 'chats', [null, null, []]); const adminCount = take(3, 'administrators', null)
      const activity = [...consultation[2].map((x) => clean(x, 'consultation')), ...partner[2].map((x) => clean(x, 'partner')), ...chat[2].map((x) => clean(x, 'chat'))].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, 8)
      return { counts: { unreadConsultations: consultation[0], totalConsultations: consultation[1], unreadPartners: partner[0], totalPartners: partner[1], openChats: chat[0], totalChats: chat[1], administrators: adminCount }, activity, unavailable }
    },
  }
}
