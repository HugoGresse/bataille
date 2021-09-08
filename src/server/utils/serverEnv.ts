export const PORT = parseInt(process.env.PORT as string) || 3001
export const ADMIN_KEY = process.env.ADMIN_KEY as string
export const ADMIN_USER = process.env.ADMIN_USER as string
export const ADMIN_PWD = process.env.ADMIN_PWD as string
export const isProduction = process.env.NODE_ENV === 'production'
