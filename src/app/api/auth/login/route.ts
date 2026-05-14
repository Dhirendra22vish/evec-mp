import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        if (password === process.env.ADMIN_SECRET) {
            // In a real app, set cookie or return session token
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
    }
}
