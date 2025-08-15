import Article from '../models/Article.js';
import geminiAnalyzer from '../services/geminiAnalyzer.js';

// Este é um novo método que precisaremos de adicionar ao geminiAnalyzer.
// Por agora, vamos assumir que ele existe.
export const askQuestionAboutArticle = async (req, res) => {
  const { question, articleId } = req.body;

  if (!question || !articleId) {
    return res.status(400).json({ success: false, error: 'Question and articleId are required.' });
  }

  try {
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }

    // Futuramente, chamaremos um método específico do geminiAnalyzer aqui.
    // Por agora, vamos devolver uma resposta simulada.
    const simulatedResponse = `Esta é uma resposta simulada sobre "${article.title}" à sua pergunta: "${question}"`;

    res.json({ success: true, data: { answer: simulatedResponse } });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};