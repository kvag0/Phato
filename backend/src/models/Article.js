import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  source: {
    name: String,
    id: String,
    url: String
  },
  author: String,
  publishedAt: {
    type: Date,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['economy', 'politics', 'health', 'environment', 'technology', 'world', 'other'],
    required: true,
    index: true
  },
  content: String,
  description: String,
  imageUrl: String,
  analysis: {
    facts: {
      who: [String],
      what: String,
      when: String,
      where: [String],
      why: String,
      summary: String
    },
    narratives: [{
      perspective: {
        type: String,
        enum: ['left', 'center-left', 'center', 'center-right', 'right', 'neutral']
      },
      title: String,
      summary: String,
      emphasis: [String],
      interpretation: String
    }],
    analyzedAt: Date,
    geminiVersion: String
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  },
  tags: [String],
  language: {
    type: String,
    default: 'en'
  }
}, {
  timestamps: true
});

articleSchema.index({ publishedAt: -1 });
articleSchema.index({ category: 1, publishedAt: -1 });
articleSchema.index({ 'source.name': 1 });
articleSchema.index({ tags: 1 });

export default mongoose.model('Article', articleSchema);