import type { ErrorRequestHandler } from 'express'

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = 500
  const requestId = req.header('x-request-id') ?? null

  console.error('[error]', {
    method: req.method,
    path: req.originalUrl,
    requestId,
    message: err.message,
    stack: err.stack,
  })

  res.status(status).json({
    message: err.message || 'Internal server error',
    requestId,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  })
}

export default errorHandler
