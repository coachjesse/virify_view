const healthCheck = (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  healthCheck,
};

