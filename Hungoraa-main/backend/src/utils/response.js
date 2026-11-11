const successResponse = (res, statusCode = 200, message = 'Success', data = {}, meta = {}) => {
  const response = { success: true, message, data };
  if (Object.keys(meta).length > 0) response.meta = meta;
  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const paginatedResponse = (res, data, page, limit, total, message = 'Success') => {
  const totalPages = Math.ceil(total / limit);
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  });
};

module.exports = { successResponse, errorResponse, paginatedResponse };
