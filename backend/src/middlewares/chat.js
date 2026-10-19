export const CHAT_COOKIE = 'avl_chat'

export const cookieValue = (request, name) => (request.headers.cookie || '')
  .split(';')
  .map((part) => part.trim().split('='))
  .find(([key]) => key === name)?.[1]

export const chatCookie = (token, secure = true) => `${CHAT_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure ? '; Secure' : ''}`
