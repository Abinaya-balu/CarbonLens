import mongoose from 'mongoose';

/**
 * Connect to MongoDB.
 * @returns {Promise<mongoose.Connection>} Mongoose connection
 */
export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 15000,
  });

  return mongoose.connection;
}

