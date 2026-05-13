import mongoose from 'mongoose';

const MONGODB_PLAYLISTS_URL = process.env.MONGODB_PLAYLISTS_URL;

if (!MONGODB_PLAYLISTS_URL) {
    throw new Error(
        'Please define the MONGODB_PLAYLISTS_URL environment variable inside .env'
    );
}

/**
 * Separate cached connection for the `playlists` database.
 * Keeps genres / sections / spotify-playlists data isolated from the
 * main `jammify` database while reusing the same connection-pool pattern.
 */
let cached = global.mongoosePlaylists;

if (!cached) {
    cached = global.mongoosePlaylists = { conn: null, promise: null };
}

async function connectPlaylistsDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
        };

        cached.promise = mongoose
            .createConnection(MONGODB_PLAYLISTS_URL, opts)
            .asPromise();
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default connectPlaylistsDB;
