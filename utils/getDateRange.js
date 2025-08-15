function getDateRange(periodType) {
  const now = new Date();
  let startDate, endDate = now;

  switch (periodType) {
    case 'weekly':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarterly':
      const currentQuarter = Math.floor((now.getMonth()) / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = null; // No filter
  }

  return { startDate, endDate };
}

module.exports = getDateRange;