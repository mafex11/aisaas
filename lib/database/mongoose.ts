import mongoose, {Mongoose} from 'mongoose';

const MONGODB_URL= process.env.MONGODB_URL;

interface MongooseConnection {

    conn: Mongoose | null;
    promise: Promise<Mongoose | null>;

}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: MongooseConnection =(global as any).mongoose
if (!cached)    {
    cached = {
        conn: null,
        promise: null
    }
}

export const connectToDatabase = async () => {
    if (cached.conn) return cached.conn;

    if (!MONGODB_URL) throw new Error('No MONGODB_URL found in environment variables');
    cached.promise= cached.promise ||mongoose.connect(MONGODB_URL, {dbName:'AiSaaS', bufferCommands: false

    })

cached.conn = await cached.promise;
return cached.conn;
}