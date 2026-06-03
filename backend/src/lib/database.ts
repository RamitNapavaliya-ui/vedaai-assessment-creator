import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vedaai';

  const isLocalhost = uri.includes('localhost') || uri.includes('127.0.0.1');

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: isLocalhost ? 5000 : 10000,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    if (isLocalhost) {
      console.error(`
❌ Could not connect to MongoDB at ${uri}

To fix this, choose ONE of:

  Option A — Docker (recommended, Docker Desktop is installed):
    Open Docker Desktop, wait for it to start, then run:
    docker run -d -p 27017:27017 --name mongo mongo:7

  Option B — MongoDB Atlas (free cloud, no install needed):
    1. Go to https://www.mongodb.com/atlas/database
    2. Create a free cluster
    3. Get your connection string
    4. Set MONGODB_URI=mongodb+srv://... in backend/.env

  Option C — Install VC++ Redistributable for mongodb-memory-server:
    https://aka.ms/vs/17/release/vc_redist.x64.exe
      `);
      process.exit(1);
    }
    throw err;
  }

  mongoose.connection.on('error', (e) => console.error('MongoDB error:', e));
}
