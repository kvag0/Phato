import express from 'express';
import {
  getArticles,
  getArticleById,
  fetchAndStoreArticles,
  analyzeArticle,
  getCategories
} from '../controllers/articleController.js';

const router = express.Router();

router.get('/categories', getCategories);
router.get('/', getArticles);
router.get('/:id', getArticleById);
router.post('/fetch', fetchAndStoreArticles);
router.post('/:id/analyze', analyzeArticle);

export default router;