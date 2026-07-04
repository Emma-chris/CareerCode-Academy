import { query } from '../config/db';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: Date;
}

export interface ConversationUser {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  unread_count: number;
  last_message: string;
  last_message_at: Date;
}

export async function getConversations(userId: string): Promise<ConversationUser[]> {
  const sql = `
    WITH LastMessages AS (
      SELECT 
        CASE 
          WHEN sender_id = $1 THEN receiver_id 
          ELSE sender_id 
        END as other_user_id,
        content as last_message,
        created_at as last_message_at,
        ROW_NUMBER() OVER(
          PARTITION BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END 
          ORDER BY created_at DESC
        ) as rn
      FROM messages
      WHERE sender_id = $1 OR receiver_id = $1
    ),
    UnreadCounts AS (
      SELECT 
        sender_id as other_user_id, 
        COUNT(*) as unread_count 
      FROM messages 
      WHERE receiver_id = $1 AND is_read = false
      GROUP BY sender_id
    )
    SELECT 
      u.id, 
      u.name, 
      u.avatar, 
      u.role,
      lm.last_message,
      lm.last_message_at,
      COALESCE(uc.unread_count, 0)::int as unread_count
    FROM LastMessages lm
    JOIN users u ON u.id = lm.other_user_id
    LEFT JOIN UnreadCounts uc ON uc.other_user_id = u.id
    WHERE lm.rn = 1
    ORDER BY lm.last_message_at DESC
  `;
  
  const { rows } = await query(sql, [userId]);
  return rows;
}

export async function getMessagesBetween(userId1: string, userId2: string): Promise<Message[]> {
  const sql = `
    SELECT id, sender_id, receiver_id, content, is_read, created_at 
    FROM messages 
    WHERE (sender_id = $1 AND receiver_id = $2) 
       OR (sender_id = $2 AND receiver_id = $1)
    ORDER BY created_at ASC
  `;
  const { rows } = await query(sql, [userId1, userId2]);
  return rows;
}

export async function createMessage(senderId: string, receiverId: string, content: string): Promise<Message> {
  const sql = `
    INSERT INTO messages (sender_id, receiver_id, content) 
    VALUES ($1, $2, $3) 
    RETURNING *
  `;
  const { rows } = await query(sql, [senderId, receiverId, content]);
  return rows[0];
}

export async function markAsRead(receiverId: string, senderId: string): Promise<void> {
  const sql = `
    UPDATE messages 
    SET is_read = true 
    WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false
  `;
  await query(sql, [receiverId, senderId]);
}

export async function markAllAsRead(receiverId: string): Promise<void> {
  const sql = `
    UPDATE messages 
    SET is_read = true 
    WHERE receiver_id = $1 AND is_read = false
  `;
  await query(sql, [receiverId]);
}

export async function deleteMessage(messageId: string): Promise<void> {
  const sql = `
    DELETE FROM messages 
    WHERE id = $1
  `;
  await query(sql, [messageId]);
}
