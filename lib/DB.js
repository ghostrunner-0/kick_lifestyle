import mongoose from "mongoose";
import { cache } from "react";
const MONGO_URL= process.env.MONGODB_URI;


let cached = global.mongoose
if(!cached){
    cached = global.mongoose={
        conn:null,
        Promise:null,
    }
}
export const connectDB = async()=>{
    if(cached.conn) return cached.conn;
    if(!cached.Promise){
        cached.Promise=mongoose.connect(MONGO_URL,{
            dbName:'KICK-LIFESTYLE',
            bufferCommands:false
        })
    }
    cached.conn = await cached.Promise;
    return cached.conn;
}