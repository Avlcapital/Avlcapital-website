import { randomUUID } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { validateConsultation } from '../validation.js'

const confirmation = (id) => ({ id, status: 'received', message: 'Your consultation enquiry has been received.' })
const serialize = (record) => ({ ...record, id: record._id?.toString(), _id: undefined })

export function createConsultationController(service, { maxPage = 10_000, maxPageSize = 100 } = {}) {
  return {
    async submit(request, response, next) { try { const { data, errors, valid } = validateConsultation(request.body); if (data.website) return response.status(201).json(confirmation(randomUUID())); if (!valid) return response.status(400).json({ error: 'validation_error', message: 'Please correct the highlighted fields.', fields: errors }); return response.status(201).json(confirmation(await service.create(data))) } catch (error) { return next(error) } },
    async list(request, response, next) { try { const page = Math.min(maxPage, Math.max(1, Number.parseInt(request.query.page, 10) || 1)); const pageSize = Math.min(maxPageSize, Math.max(1, Number.parseInt(request.query.pageSize, 10) || 20)); const result = await service.list({ page, pageSize }); return response.json({ ...result, items: result.items.map(serialize) }) } catch (error) { return next(error) } },
    async detail(request, response, next) { try { if (!ObjectId.isValid(request.params.id)) return response.status(400).json({ error: 'invalid_id', message: 'Invalid consultation identifier.' }); const item = await service.get(request.params.id); return item ? response.json(serialize(item)) : response.status(404).json({ error: 'not_found', message: 'Consultation not found.' }) } catch (error) { return next(error) } },
    async status(request, response, next) { try { if (!ObjectId.isValid(request.params.id)) return response.status(400).json({ error: 'invalid_id', message: 'Invalid consultation identifier.' }); if (typeof request.body?.read !== 'boolean') return response.status(400).json({ error: 'validation_error', message: 'Read status is required.' }); const item = await service.setRead(request.params.id, request.body.read); return item ? response.json(serialize(item)) : response.status(404).json({ error: 'not_found', message: 'Consultation not found.' }) } catch (error) { return next(error) } },
  }
}
