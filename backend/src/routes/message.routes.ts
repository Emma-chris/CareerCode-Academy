import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as MessageModel from '../models/message';
import { io } from '../config/socket';
import { uploadSingle, getFileUrl } from '../middleware/upload';

const router = Router();

// GET /messages/conversations
router.get('/conversations', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const conversations = await MessageModel.getConversations(userId);
    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
});

// GET /messages/:userId
router.get('/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const otherUserId = req.params.userId;
    const messages = await MessageModel.getMessagesBetween(userId, otherUserId);
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// POST /messages
router.post('/', uploadSingle('attachment', 'messages'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const senderId = req.user!.userId;
    const { receiver_id, content } = req.body;
    let attachmentUrl: string | undefined;

    if (req.file) {
      attachmentUrl = getFileUrl(req.file) || undefined;
    }
    
    if (!receiver_id || (!content && !attachmentUrl)) {
      return res.status(400).json({ success: false, message: 'receiver_id and either content or attachment are required' });
    }

    const message = await MessageModel.createMessage(senderId, receiver_id, content || '', attachmentUrl);

    // Emit the message to the receiver via socket
    if (io) {
      io.to(receiver_id).emit('receive_message', message);
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

// PUT /messages/read
router.put('/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const receiverId = req.user!.userId;
    const { senderId } = req.body;
    
    if (!senderId) {
      return res.status(400).json({ success: false, message: 'senderId is required' });
    }

    await MessageModel.markAsRead(receiverId, senderId);
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    next(error);
  }
});

// PUT /messages/read-all
router.put('/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const receiverId = req.user!.userId;
    await MessageModel.markAllAsRead(receiverId);
    res.json({ success: true, message: 'All messages marked as read' });
  } catch (error) {
    next(error);
  }
});

// DELETE /messages/:messageId
router.delete('/:messageId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const messageId = req.params.messageId;
    await MessageModel.deleteMessage(messageId);
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
