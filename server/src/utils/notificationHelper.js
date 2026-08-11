const db = require('../config/db');

/**
 * Creates an in-app notification for a specific user
 * 
 * @param {number} userId - The user to receive the notification
 * @param {string} title - The title of the notification
 * @param {string} message - A short description
 * @param {string} type - 'info', 'success', 'warning', 'error'
 * @param {string} link - An optional route link (e.g. '/deals/1')
 */
const createNotification = async (userId, title, message, type = 'info', link = null) => {
  try {
    if (!userId) return; // Silent fail if no user provided

    const query = `
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [userId, title, message, type, link];

    await db.query(query, values);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

module.exports = {
  createNotification
};
