import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { database } from "@/lib/db";
import { ObjectId } from "mongodb";
const secret=()=>{
 const value=process.env.AUTH_SECRET;
 if(!value&&process.env.NODE_ENV==="production")throw new Error("AUTH_SECRET is required in production.");
 return new TextEncoder().encode(value||"development-only-change-this-secret");
};
export async function createSession(userId:string){return new SignJWT({sub:userId}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("30d").sign(secret());}
export async function currentUser(){try{const token=(await cookies()).get("session")?.value;if(!token)return null;const {payload}=await jwtVerify(token,secret());if(!payload.sub)return null;const db=await database();return db.collection("users").findOne({_id:new ObjectId(payload.sub)},{projection:{passwordHash:0}});}catch{return null;}}
export async function userId(){const user=await currentUser();return user?String(user._id):null;}
