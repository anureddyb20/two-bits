import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET(){
  return NextResponse.json({coord: process.env.COORDINATOR_AGENT_ENDPOINT || null});
}