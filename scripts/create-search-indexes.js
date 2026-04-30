/**
 * Script to create database indexes for optimized search performance
 * Run this once after deployment: node scripts/create-search-indexes.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI or MONGODB_URL is not defined in environment variables');
  console.error('💡 Make sure you have a .env file with MONGODB_URI or MONGODB_URL set');
  process.exit(1);
}

async function createIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const playlistsCollection = db.collection('playlists');

    console.log('\n📊 Creating indexes for playlists collection...');

    // Helper function to create index with error handling
    async function createIndexSafely(indexSpec, options, description) {
      try {
        console.log(`Creating ${description}...`);
        await playlistsCollection.createIndex(indexSpec, options);
        console.log(`✅ ${description} created`);
      } catch (error) {
        if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
          console.log(`⚠️  ${description} already exists (skipping)`);
        } else if (error.code === 86 || error.codeName === 'IndexKeySpecsConflict') {
          console.log(`⚠️  ${description} already exists with different options (skipping)`);
        } else {
          throw error;
        }
      }
    }

    // 1. Text index for search
    await createIndexSafely(
      { name: 'text', description: 'text' },
      { 
        name: 'playlist_text_search',
        weights: { name: 10, description: 5 },
        default_language: 'english'
      },
      'text index on name and description'
    );

    // 2. Compound index for public playlists
    await createIndexSafely(
      { isPublic: 1, createdAt: -1 },
      { name: 'public_playlists_sort' },
      'compound index on isPublic and createdAt'
    );

    // 3. Index for user queries (skip if exists with different name)
    await createIndexSafely(
      { userId: 1, createdAt: -1 },
      { name: 'user_playlists_sort' },
      'compound index on userId and createdAt'
    );

    // 4. Index for public playlist search
    await createIndexSafely(
      { isPublic: 1, name: 1 },
      { name: 'public_playlist_name' },
      'compound index on isPublic and name'
    );

    // List all indexes
    console.log('\n📋 Current indexes:');
    const indexes = await playlistsCollection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ All indexes created successfully!');
    console.log('🚀 Search performance should now be significantly improved');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

createIndexes();
