const cron = require('node-cron');
const db = require('../config/db');
const { createNotification } = require('../utils/notificationHelper');

const startNotificationJobs = () => {
  // Run every hour to check for overdue tasks and upcoming follow-ups
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('⏰ Running Notification Job (Overdue Tasks & Upcoming Follow-ups)...');
      
      const now = new Date().toISOString();
      const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // 1. Overdue Tasks (Tasks where due_date < now and status != Completed)
      // Note: We should ideally track if a notification was already sent to avoid spamming,
      // but for this phase, we just find them.
      const overdueTasksRes = await db.query(`
        SELECT id, title, assigned_to 
        FROM tasks 
        WHERE status != 'Completed' AND due_date < $1
      `, [now]);

      for (const task of overdueTasksRes.rows) {
        await createNotification(
          task.assigned_to,
          'Task Overdue',
          `Task "${task.title}" is overdue.`,
          'warning',
          '/tasks'
        );
      }

      // 2. Upcoming Follow-ups (Follow-ups where follow_up_date is between now and +24h)
      const upcomingFollowupsRes = await db.query(`
        SELECT id, title, user_id, follow_up_date
        FROM follow_ups
        WHERE follow_up_date > $1 AND follow_up_date <= $2
      `, [now, in24Hours]);

      for (const followUp of upcomingFollowupsRes.rows) {
        await createNotification(
          followUp.user_id,
          'Upcoming Follow-up',
          `You have a follow-up "${followUp.title}" scheduled for soon.`,
          'info',
          '/activities'
        );
      }
      
    } catch (err) {
      console.error('Error running notification cron job:', err);
    }
  });
};

module.exports = { startNotificationJobs };
