import express from 'express';
import { askQuestionAboutArticle } from '../controllers/chatbotController.js';

const router = express.Router();

router.post('/ask', askQuestionAboutArticle);

export default router;