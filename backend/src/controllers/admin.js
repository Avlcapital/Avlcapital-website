import { clearSessionCookie, sessionCookie } from '../middlewares/auth.js'

export function createAdminController(auth, { secureCookies = true } = {}) {
  return {
    async login(request, response, next) { try { const result = await auth.login(request.body?.email, request.body?.password); if (!result) return response.status(401).json({ error: 'invalid_credentials', message: 'Invalid email or password.' }); response.setHeader('Set-Cookie', sessionCookie(result.token, result.expiresAt, secureCookies)); return response.json({ admin: result.admin }) } catch (error) { return next(error) } },
    session: (request, response) => response.json({ admin: request.admin }),
    async logout(request, response, next) { try { await auth.logout(request.sessionToken); response.setHeader('Set-Cookie', clearSessionCookie(secureCookies)); return response.status(204).end() } catch (error) { return next(error) } },
    async create(request, response, next) { try { const result = await auth.createAdmin(request.body?.email, request.body?.password); if (!result.ok) return response.status(400).json({ error: 'invalid_admin', message: 'Unable to create administrator with those details.' }); return response.status(201).json({ admin: result.admin }) } catch (error) { return next(error) } },
    async list(_request, response, next) { try { return response.json(await auth.listAdmins()) } catch (error) { return next(error) } },
    async forgot(request, response, next) { try { await auth.requestReset(request.body?.email); return response.json({ message: 'If that account exists, a reset code has been sent.' }) } catch (error) { return next(error) } },
    async reset(request, response, next) { try { const ok = await auth.resetPassword(request.body?.email, request.body?.code, request.body?.password); return ok ? response.json({ message: 'Password reset complete.' }) : response.status(400).json({ error: 'invalid_reset', message: 'The reset request is invalid or expired.' }) } catch (error) { return next(error) } },
  }
}
