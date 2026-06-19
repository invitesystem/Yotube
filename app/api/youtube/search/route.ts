import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ items: [] })
  const key = process.env.YOUTUBE_API_KEY!
  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(q)}&key=${key}`
  const r = await fetch(url)
  const data = await r.json()
  const items = (data.items || []).map((i: any) => ({
    id: i.id.videoId,
    title: i.snippet.title,
    channel: i.snippet.channelTitle,
    thumb: i.snippet.thumbnails?.medium?.url || i.snippet.thumbnails?.default?.url,
  }))
  return NextResponse.json({ items })
}
