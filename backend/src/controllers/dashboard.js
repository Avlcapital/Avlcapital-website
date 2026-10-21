export function createDashboardController(service) {
  return { overview: async (_request, response, next) => { try { return response.json(await service.overview()) } catch (error) { return next(error) } } }
}
