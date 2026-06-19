import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId')
  const pageToken = req.nextUrl.searchParams.get('pageToken') || ''
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return NextResponse.json({ items: [], error: 'no_api_key' })
  if (!videoId) return NextResponse.json({ items: [], error: 'no_video' })

  const url =
    `https://www.googleapis.com/youtube/v3/commentThreads` +
    `?part=snippet&videoId=${videoId}&maxResults=30&order=relevance` +
    `&pageToken=${pageToken}&key=${key}`

  try {
    const r = await fetch(url)
    const data = await r.json()
    if (data.error) {
      const reason =
        data.error?.errors?.[0]?.reason || data.error?.status || 'api_error'
      return NextResponse.json({ items: [], error: reason })
    }
    const items = (data.items || []).map((i: any) => {
      const c = i.snippet.topLevelComment.snippet
      return {
        id: i.snippet.topLevelComment.id,
        author: c.authorDisplayName,
        text: c.textDisplay,
        likes: c.likeCount,
      }
    })
    return NextResponse.json({ items, nextPageToken: data.nextPageToken || null })
  } catch (e: any) {
    return NextResponse.json({ items: [], error: String(e?.message || e) })
  }
}
